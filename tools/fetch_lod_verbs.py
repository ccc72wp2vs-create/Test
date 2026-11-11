#!/usr/bin/env python3
"""Holt die Konjugation der wichtigsten Verben von LOD.lu und schreibt js/verben.js.

Quelle: Lëtzebuerger Online Dictionnaire (https://lod.lu), Zenter fir d'Lëtzebuerger Sprooch, CC0.
Aufruf:  python3 tools/fetch_lod_verbs.py
"""
import json, os, time, urllib.parse, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = "https://lod.lu/api/lb/"
VERBS = [("sinn", "sein"), ("hunn", "haben"), ("goen", "gehen"), ("kommen", "kommen"), ("maachen", "machen"), ("schaffen", "arbeiten"),
         ("wunnen", "wohnen"), ("schwätzen", "sprechen"), ("heeschen", "heißen"), ("iessen", "essen"), ("drénken", "trinken"), ("kafen", "kaufen"),
         ("fueren", "fahren"), ("gesinn", "sehen"), ("kucken", "schauen"), ("liesen", "lesen"), ("léieren", "lernen"), ("verstoen", "verstehen"),
         ("soen", "sagen"), ("wëssen", "wissen"), ("huelen", "nehmen"), ("ginn", "geben"), ("fannen", "finden"), ("hëllefen", "helfen"),
         ("brauchen", "brauchen"), ("bleiwen", "bleiben"), ("schlofen", "schlafen"), ("wëllen", "wollen"), ("kënnen", "können"), ("mussen", "müssen")]

def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (language-learning app builder)"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except OSError:
            if attempt == 4:
                raise
            time.sleep(2 ** attempt)

import re
# bei Varianten ("gaangen / gaang") die erste nehmen, Reflexivpronomen in Klammern ("hunn (mech)") weglassen
first = lambda s: re.sub(r"\s+", " ", re.sub(r"\(.*?\)", "", s.split(" / ")[0])).strip()

def main():
    out = []
    for lemma, de in VERBS:
        res = get(API + "search?" + urllib.parse.urlencode({"query": lemma, "lang": "lb"}))["results"]
        hits = [r for r in res if r["word_lb"] == lemma and r["pos"].startswith("VRB")]
        table = None
        for h in hits:                             # bei Homonymen den ersten Eintrag mit Tabelle nehmen
            t = (get(API + "entry/" + h["article_id"])["entry"].get("tables") or {}).get("verbConjugation")
            time.sleep(0.1)
            if t and t.get("indicative", {}).get("present"):
                table, eid = t, h["article_id"]
                break
        if not table:
            print("  keine Tabelle:", lemma); continue
        ind = table["indicative"]
        out.append({"inf": lemma, "de": de, "lod": eid, "aux": table["auxiliaryVerb"], "pp": first(table["pastParticiple"]),
                    "pres": [first(ind["present"][f"p{i}"]) for i in range(1, 7)],
                    "perf": [first(ind["presentPerfect"][f"p{i}"]) for i in range(1, 7)]})
        # n-Regel nach dem Weglassen der Klammer wiederherstellen: "hunn gehat" -> "hu gehat"
        keep = lambda nxt: nxt[0].lower() in "aeiouäëéöüyndtzh"
        out[-1]["perf"] = [(a if keep(b) else re.sub(r"nn?$", "", a)) + " " + b for a, b in (x.split(" ", 1) for x in out[-1]["perf"])]
        print(lemma, out[-1]["pres"][:3], "|", out[-1]["perf"][0], "|", out[-1]["perf"][2])
    with open(os.path.join(ROOT, "js", "verben.js"), "w", encoding="utf-8") as f:
        f.write("// Automatisch erzeugt von tools/fetch_lod_verbs.py – nicht von Hand ändern.\n"
                "// Konjugation aus dem Lëtzebuerger Online Dictionnaire (lod.lu). pres/perf: ech, du, hien/si/hatt, mir, dir, si\n"
                "window.LUX_VERBS = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
    print(len(out), "Verben")

if __name__ == "__main__":
    main()
