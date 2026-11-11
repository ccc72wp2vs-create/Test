# Sproochentest Trainer 🇱🇺

Eine kleine Web-App zum Luxemburgischlernen. Sie ist gezielt auf den **Sproochentest** für die
luxemburgische Staatsbürgerschaft ausgerichtet:

- **Mündlicher Ausdruck:** Niveau **A2**
- **Hörverstehen:** Niveau **B1**
- Lesen und Schreiben werden nicht geprüft

## Funktionen

| Bereich | Inhalt |
|---|---|
| 🃏 **Karteikarten** | ca. 270 Wörter und Sätze in 13 Prüfungsthemen (Vorstellen, Familie, Wohnen, Arbeit, Alltag, Zahlen, Essen, Gesundheit, Freizeit, Verkehr, Wetter, Bildbeschreibung, Luxemburg). Mit Wiederholungssystem (Leitner-Boxen), das fällige Karten automatisch wieder vorlegt. Richtung umschaltbar (LB→DE / DE→LB). |
| ✅ **Quiz** | Multiple Choice in beide Richtungen und ein Schreibmodus (Akzentfehler werden verziehen) |
| 🎙️ **Sprechen** | Typische Prüfungsfragen pro Thema, vier Bilder zur Bildbeschreibung, Aufnahmefunktion mit Timer und A2-Musterantworten mit Übersetzung |
| 👂 **Verstehen** | Kurze Dialoge und Durchsagen (Arzt, Bäckerei, Bahnhof, Wetter, Gemeinde) zum Anhören, mit Multiple-Choice-Fragen |
| 🔊 **Aussprache** | Alle Vokabeln, Beispielsätze, Prüferfragen, Musterantworten und Dialoge lassen sich anhören (auch offline) |
| 📐 **Grammatik** | Nur das Nötige: Artikel, n-Regel, sinn/hunn, Perfekt, Modalverben, Possessivpronomen, Satzbau |
| 🎓 **Prüfung** | Ablauf, Tipps und Links (INL, LOD.lu, RTL, Guichet.lu) |

Der Fortschritt wird lokal im Browser gespeichert. Unter „Mehr“ kann er gesichert und wiederhergestellt werden.

## Benutzen

Die App ist reines HTML/CSS/JavaScript, ohne Build-Schritt und ohne Abhängigkeiten.

**Lokal:**
```bash
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

**Aufs Handy (empfohlen):** Repository-Einstellungen → *Pages* → Branch auswählen → Speichern.
Danach die GitHub-Pages-Adresse in Safari/Chrome öffnen und **„Zum Home-Bildschirm“** wählen.
Die App funktioniert dann wie eine normale App, auch offline.

## Aussprache (Audio)

- **Einzelne Wörter:** echte Aufnahmen aus dem [Lëtzebuerger Online Dictionnaire (LOD.lu)](https://lod.lu) des
  Zenter fir d'Lëtzebuerger Sprooch, Lizenz CC0. Welche Karte welchen LOD-Eintrag nutzt, steht in
  [`audio/lod-quellen.json`](audio/lod-quellen.json).
- **Sätze, Musterantworten, Hörtexte:** computererzeugt mit [Piper](https://github.com/OHF-Voice/piper1-gpl) und der
  luxemburgischen Stimme *MaryLux* (Datensatz [marylux-data](https://github.com/marytts/marylux-data), CC BY-NC-SA 4.0,
  also nur für nicht-kommerzielle Nutzung). Nicht fehlerfrei; im Zweifel gilt LOD.lu.

Nach Änderungen an `js/data.js` die Audios neu erzeugen (erst Computerstimme, dann LOD-Aufnahmen darüber):
```bash
pip install piper-tts
python3 tools/gen_audio.py /pfad/zu/lb_LU-marylux-medium.onnx
python3 tools/fetch_lod_audio.py
```
Danach in `sw.js` die Versionsnummer von `AUDIO` erhöhen, damit Geräte die neuen Dateien laden.

## Inhalte erweitern

Alle Lerninhalte stehen in [`js/data.js`](js/data.js): Vokabeln (`topics`), Grammatik (`grammar`),
Sprechfragen (`speaking`) und Verstehenstexte (`dialogues`). Neue Einträge erscheinen automatisch in der App.

> Hinweis: Termine, Gebühren und Bestehensgrenzen des Sproochentest bitte immer aktuell beim
> [INL](https://www.inll.lu) bzw. auf [Guichet.lu](https://guichet.public.lu) prüfen.
> Für die Aussprache ist [LOD.lu](https://lod.lu) (offizielles Wörterbuch mit Audio) ideal.
