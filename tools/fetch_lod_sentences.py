#!/usr/bin/env python3
"""Holt echte, von Menschen gesprochene Beispielsätze von LOD.lu für das Hörtraining.

Quelle: Lëtzebuerger Online Dictionnaire (https://lod.lu), Zenter fir d'Lëtzebuerger Sprooch.
Für jeden LOD-Eintrag, der schon für die Vokabel-Aufnahmen genutzt wird (audio/lod-quellen.json),
wird ein kurzer Beispielsatz mit Aufnahme ausgewählt. Ergebnis: js/stemmen.js und audio/x-*.mp3.

Aufruf:  python3 tools/fetch_lod_sentences.py     (benötigt ffmpeg)
"""
import json, os, re, subprocess, tempfile, time, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "audio")
API = "https://lod.lu/api/lb/entry/"

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (language-learning app builder)"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except OSError:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)

def candidates(entry):
    """Alle brauchbaren Beispielsätze eines Eintrags: (tokens, index des Stichworts, deutsch, audio-url)."""
    for ms in entry.get("microStructures", []):
        for gu in ms.get("grammaticalUnits", []):
            for m in gu.get("meanings", []):
                de = [p["content"] for p in (m.get("targetLanguages", {}).get("de", {}).get("parts") or []) if p.get("type") == "translation"]
                for ex in m.get("examples", []):
                    parts = ex.get("parts", [])
                    url = (ex.get("audioFiles") or {}).get("aac")
                    if not url or len(parts) != 1 or parts[0].get("type") != "text":
                        continue
                    toks = parts[0].get("parts", [])
                    if not all(t.get("type") in ("word", "inflectedHeadword") and re.fullmatch(r"[\w'’-]+", t.get("content", "")) for t in toks):
                        continue
                    hw = [i for i, t in enumerate(toks) if t["type"] == "inflectedHeadword"]
                    if len(hw) != 1 or not 4 <= len(toks) <= 8 or not de:
                        continue
                    yield [t["content"] for t in toks], hw[0], de[0], url

def main():
    src = json.load(open(os.path.join(OUT, "lod-quellen.json"), encoding="utf-8"))
    ids = sorted({i for v in src.values() for i in v["lod"]})
    out = []
    for eid in ids:
        entry = json.loads(get(API + eid))["entry"]
        cands = sorted(candidates(entry), key=lambda c: abs(len(c[0]) - 6))   # am liebsten ca. 6 Wörter
        time.sleep(0.1)
        if not cands:
            continue
        toks, hw, de, url = cands[0]
        key = "x-" + eid.lower()
        dst = os.path.join(OUT, key + ".mp3")
        if not os.path.exists(dst):
            with tempfile.NamedTemporaryFile(suffix=".m4a") as f:
                f.write(get(url)); f.flush()
                log = subprocess.run(["ffmpeg", "-i", f.name, "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
                gain = -1.0 - float(re.search(r"max_volume: ([-\d.]+) dB", log).group(1))
                subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", f.name, "-af", f"volume={gain:.1f}dB", "-ac", "1", "-ar", "22050",
                                "-codec:a", "libmp3lame", "-b:a", "48k", dst], check=True)
        out.append({"key": key, "t": toks, "hw": hw, "lemma": entry["lemma"], "de": de})
        print(key, " ".join(toks), "|", de, flush=True)
    with open(os.path.join(ROOT, "js", "stemmen.js"), "w", encoding="utf-8") as f:
        f.write("// Automatisch erzeugt von tools/fetch_lod_sentences.py – nicht von Hand ändern.\n"
                "// Beispielsätze mit menschlichen Aufnahmen aus dem Lëtzebuerger Online Dictionnaire (lod.lu).\n"
                "// key = Audiodatei, t = Wörter, hw = Position des Stichworts, de = Bedeutung des Stichworts\n"
                "window.LUX_VOICES = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
    print(len(out), "Sätze")

if __name__ == "__main__":
    main()
