#!/usr/bin/env python3
"""Ersetzt die Computerstimme bei Einzelwörtern durch echte Aufnahmen von LOD.lu.

Quelle: Lëtzebuerger Online Dictionnaire (https://lod.lu), Zenter fir d'Lëtzebuerger
Sprooch, Lizenz CC0 (https://data.public.lu, "LOD - Public API").

Für jede Karte, die nur aus einem Wort (mit Artikel) oder aus mehreren durch " / "
getrennten Wörtern besteht, wird der passende LOD-Eintrag gesucht. Die LOD-Aufnahme
enthält oft auch Pluralformen ("Famill, Famillen"); es wird nur das Grundwort behalten.
Karten ohne exakten Treffer behalten die Computerstimme (tools/gen_audio.py).

Aufruf:  python3 tools/fetch_lod_audio.py     (benötigt node und ffmpeg)
"""
import json, os, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "audio")
API = "https://lod.lu/api/lb/"
ARTICLE = re.compile(r"^(d'|de |den |e |en |eng )")

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

def parse(part):
    """'d'Famill' -> ('Famill', True); None, wenn es kein Einzelwort ist."""
    part = part.strip().rstrip("!?.")
    m = ARTICLE.match(part)
    word = part[m.end():] if m else part
    return (word, bool(m)) if word and " " not in word and "…" not in word else None

def lookup(word, noun):
    res = json.loads(get(API + "search?" + urllib.parse.urlencode({"query": word, "lang": "lb"})))["results"]
    hits = [r for r in res if r["word_lb"] == word] or [r for r in res if r["word_lb"].lower() == word.lower()]
    if noun:
        hits = [r for r in hits if r["pos"].startswith(("SUBST", "NP"))]  # Nomen oder Eigenname
    return hits[0]["article_id"] if hits else None

def lemma_clip(entry_id, dst_wav):
    e = json.loads(get(API + "entry/" + entry_id))["entry"]
    url = (e.get("audioFiles") or {}).get("aac")
    if not url:
        return False
    with tempfile.NamedTemporaryFile(suffix=".m4a") as f:
        f.write(get(url)); f.flush()
        # Pausen >= 0,3 s trennen die Wortformen bzw. sind Stille am Rand. Kürzere Lücken
        # (z. B. beim "p" in "Apel") gehören zum Wort und dürfen nicht geschnitten werden.
        log = subprocess.run(["ffmpeg", "-i", f.name, "-af", "silencedetect=noise=-35dB:d=0.06", "-f", "null", "-"],
                             capture_output=True, text=True).stderr
        sil = [(float(a), float(b)) for a, b in re.findall(r"silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)", log)]
        start = max(0.0, sil[0][1] - 0.05) if sil and sil[0][0] < 0.02 else 0.0
        ends = [a for a, b in sil if a > start + 0.15 and b - a >= 0.3]
        cmd = ["ffmpeg", "-loglevel", "error", "-y", "-i", f.name, "-ss", f"{start:.3f}"]
        if ends:
            cmd += ["-to", f"{ends[0] + 0.12:.3f}"]
        elif "," in (e.get("audioString") or ""):
            return False                                   # mehrere Formen, aber keine Pause gefunden
        subprocess.run(cmd + ["-ac", "1", "-ar", "22050", dst_wav], check=True)
    return True

def main():
    js = "global.window={};require(process.argv[1]);console.log(JSON.stringify(window.LUX_DATA))"
    d = json.loads(subprocess.check_output(["node", "-e", js, os.path.join(ROOT, "js", "data.js")]))
    done, tmp = {}, tempfile.mkdtemp()
    src = os.path.join(OUT, "lod-quellen.json")
    old = json.load(open(src, encoding="utf-8")) if os.path.exists(src) else {}
    for t in d["topics"]:
        for i, w in enumerate(t["words"]):
            parts = [parse(p) for p in w[0].split(" / ")]
            if not all(parts):
                continue
            key = f"c-{t['id']}-{i}"
            if old.get(key, {}).get("text") == w[0] and os.path.exists(os.path.join(OUT, key + ".mp3")):
                done[key] = old[key]; continue             # schon vorhanden und Text unverändert
            ids, wavs = [], []
            for n, (word, noun) in enumerate(parts):
                eid = lookup(word, noun)
                wav = os.path.join(tmp, f"{t['id']}-{i}-{n}.wav")
                time.sleep(0.15)
                if not eid or not lemma_clip(eid, wav):
                    break
                ids.append(eid); wavs.append(wav)
            if len(wavs) != len(parts):
                print("  kein Treffer:", w[0]); continue
            lst = os.path.join(tmp, "list.txt")
            gap = os.path.join(tmp, "gap.wav")
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", "0.45", gap], check=True)
            with open(lst, "w") as f:
                f.write(f"file '{gap}'\n".join(f"file '{x}'\n" for x in wavs))
            # LOD-Aufnahmen sind leiser als die Computerstimme: Spitzenpegel auf -1 dB anheben
            log = subprocess.run(["ffmpeg", "-f", "concat", "-safe", "0", "-i", lst, "-af", "volumedetect", "-f", "null", "-"],
                                 capture_output=True, text=True).stderr
            gain = -1.0 - float(re.search(r"max_volume: ([-\d.]+) dB", log).group(1))
            subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst,
                            "-af", f"volume={gain:.1f}dB", "-codec:a", "libmp3lame", "-b:a", "48k",
                            os.path.join(OUT, key + ".mp3")], check=True)
            done[key] = {"text": w[0], "lod": ids}
            print("ok", w[0], ids)
    with open(os.path.join(OUT, "lod-quellen.json"), "w", encoding="utf-8") as f:
        json.dump(done, f, ensure_ascii=False, indent=1)
    print(len(done), "Karten mit LOD-Aufnahme")

if __name__ == "__main__":
    main()
