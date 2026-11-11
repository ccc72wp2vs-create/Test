# Moien Lëtzebuerg 🇱🇺

Eine kleine Web-App zur Vorbereitung auf die **luxemburgische Staatsbürgerschaft**:

- **Sproochentest** (Schwerpunkt): mündlicher Ausdruck auf Niveau **A2**, Hörverstehen auf Niveau **B1**.
  Lesen und Schreiben werden nicht geprüft.
- **Vivre ensemble au Grand-Duché**: Übungsfragen zur Landeskunde.

## Funktionen

| Bereich | Inhalt |
|---|---|
| 🃏 **Karteikarten** | ca. 270 Wörter und Sätze in 13 Prüfungsthemen (Vorstellen, Familie, Wohnen, Arbeit, Alltag, Zahlen, Essen, Gesundheit, Freizeit, Verkehr, Wetter, Bildbeschreibung, Luxemburg). Mit Wiederholungssystem (Leitner-Boxen), das fällige Karten automatisch wieder vorlegt. Richtung umschaltbar (LB→DE / DE→LB). |
| ✅ **Quiz** | Multiple Choice in beide Richtungen und ein Schreibmodus (Akzentfehler werden verziehen) |
| 🎙️ **Sprechen** | Typische Prüfungsfragen pro Thema, zehn Bilder zur Bildbeschreibung, Aufnahmefunktion mit Timer und A2-Musterantworten mit Übersetzung |
| ⭐ **Meine Vorstellung** | Eigene Daten eintragen (Alter, Herkunft, Wohnort, Familie, Arbeit, Sprachen, Hobbys) – die App erstellt daraus die persönliche Vorstellung auf Luxemburgisch mit Übersetzung. Mit Auswendig-Modus, Druck/PDF und Export als Datei |
| 👂 **Verstehen** | 15 Hörtexte mit Multiple-Choice-Fragen: 5 kurze Alltagsdialoge (A2) und 10 längere Texte auf Prüfungsniveau B1 (Radio, Durchsagen, Telefonate, Gespräche) |
| 🗣️ **Echte Stimmen** | Lückentext zum Hören mit Beispielsätzen, die Muttersprachler für LOD.lu eingesprochen haben |
| 🧩 **Satzbau** | Wörter in die richtige Reihenfolge bringen: aus dem Deutschen übersetzen, nach Gehör bauen oder die eigene Vorstellung üben |
| 📅 **Wochenplan** | Prüfungstermin eintragen: Countdown, passendes Karten-Tempo und vier Aufgaben pro Tag zum Abhaken |
| 🔤 **Verben** | Die 30 wichtigsten Verben in Gegenwart und Perfekt, als Tabelle und als Quiz (Formen aus den LOD-Tabellen) |
| 🇱🇺 **Vivre ensemble** | 100 inoffizielle Übungsfragen, aufgebaut nach den drei offiziellen Prüfungsfächern (Grundrechte, Institutionen, Geschichte & Europa), plus Zusatzwissen. Prüfungssimulation mit 40 Fragen (10/20/10) in 60 Minuten, bestanden ab 28 |
| 🛂 **Lernpass** | Stempel für 19 Meilensteine, geschätzte Bereitschaft je Prüfungsteil (Sprechen, Hören, Vivre ensemble) und Wochenrückblick |
| 📝 **Prüfliste** | Alle luxemburgischen Texte der App auf einer druckbaren Seite, zum Gegenlesen durch eine Lehrkraft |
| ⏱️ **Prüfungssimulation** | Kompletter Durchlauf: 3 B1-Hörtexte, die höchstens zweimal abgespielt werden, danach Gespräch und Bildbeschreibung mit Aufnahme; Auswertung mit Lösungen, Musterantworten und Verlauf |
| 💬 **Rückfragen** | Typische Nachfragen der Prüfer, passend zu den eigenen Angaben, mit Audio, Übersetzung und Satzanfang |
| 🔢 **Zahlen & Uhrzeit** | Hörtraining für Zahlen 1–100, Uhrzeiten, Preise und Jahreszahlen mit verwechselbaren Antworten |
| 🔥 **Schwierige Wörter** | Sammelt automatisch die Wörter, die man oft falsch hatte, zum gezielten Üben |
| 🔊 **Aussprache** | Alle Vokabeln, Beispielsätze, Prüferfragen, Musterantworten und Dialoge lassen sich anhören (auch offline) |
| 📐 **Grammatik** | Nur das Nötige: Artikel, n-Regel, sinn/hunn, Perfekt, Modalverben, Possessivpronomen, Satzbau |
| 🎓 **Prüfung** | Ablauf, Tipps und Links (INL, LOD.lu, RTL, Guichet.lu) |

**Profil:** Beim ersten Start legt jeder auf dem eigenen Gerät sein Profil an (nur ein Name, keine Anmeldung). Der Fortschritt wird lokal im Browser gespeichert. Unter „Mehr“ kann er gesichert und wiederhergestellt werden.

## Design: „Luftpost & Löwe“

Die Oberfläche hat eine eigene Bildsprache, die sich aus dem Thema ergibt – Post, Pass und Wappen:

- **Papier und Tinte:** warmer Papierton mit Punktraster, dunkelblaue Konturen, Knöpfe und Kacheln mit hartem, versetztem Schatten zum „Drücken“.
- **Luftpost-Streifen** in Rot, Weiß und Blau als wiederkehrendes Band (Kopfzeile, Titelkarte, Fortschrittsbalken).
- **Eigenes Icon-Set** ([`js/ui.js`](js/ui.js)): rund 50 Icons mit Tintenkontur und leicht versetzter Farbfläche, wie ein Druck, der nicht ganz im Register sitzt. Emojis im Markup werden beim Rendern automatisch ersetzt.
- **Maskottchen:** der gekrönte rote Löwe aus dem Wappen, in drei Stimmungen; er blinzelt, begrüßt und feiert Ergebnisse.
- **Illustrationen:** Skyline der Stadt Luxemburg (Pont Adolphe, Kathedrale, Gëlle Fra, Bockfelsen), Bildkarten im Postkarten-Rahmen.
- **Lernkarte:** eine linierte Karteikarte auf einem Stapel, die sich in 3D umdreht; darunter die Lernstufen.
- **Stempel und Bewegung:** erledigte Aufgaben bekommen einen „gemaach“-Stempel, die Navigation hat einen wandernden Farbfleck, Antworten wackeln oder springen, bei Erfolgen fällt Konfetti. Wer im System „Bewegung reduzieren“ eingestellt hat, sieht keine Animationen.
- **Schriften:** *Fraunces* (Überschriften) und *Figtree* (Text), beide unter der SIL Open Font License und lokal in `fonts/` abgelegt, damit die App offline gleich aussieht.

## Entwicklung

- **Quellcode der App:** [`src/app/`](src/app) – nach Bereichen aufgeteilt (Kern, Startseite, Lernen, Sprechen/Hören, Vorstellung,
  Training, Vivre ensemble, Lernpass, Router). Die Teile sind Abschnitte einer gemeinsamen Funktion und werden zu `js/app.js`
  zusammengesetzt:
  ```bash
  node tools/build.js      # nach jeder Änderung in src/app/
  ```
- **Tests:** ein Durchlauftest prüft Daten, alle Seiten und die wichtigsten Abläufe in einem echten Browser.
  ```bash
  npm install && npx playwright install chromium   # einmalig
  npm test
  ```
- **Nach Änderungen an Dateien**, die offline verfügbar sein sollen, in `sw.js` die Versionsnummer von `CACHE` erhöhen.

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
- **Echte Stimmen (`audio/x-*.mp3`, `js/stemmen.js`):** Beispielsätze mit Aufnahmen aus LOD.lu, geholt mit
  `python3 tools/fetch_lod_sentences.py`.
- **Verben (`js/verben.js`):** Konjugationstabellen aus LOD.lu, geholt mit `python3 tools/fetch_lod_verbs.py`.
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
Sprechfragen (`speaking`), Hörtexte (`dialogues`) und Rückfragen (`followups`). Das Zahlen-Training entsteht in [`js/train.js`](js/train.js), die persönliche Vorstellung in [`js/me.js`](js/me.js). Neue Einträge erscheinen automatisch in der App.

> Hinweis: Termine, Gebühren und Bestehensgrenzen des Sproochentest bitte immer aktuell beim
> [INL](https://www.inll.lu) bzw. auf [Guichet.lu](https://guichet.public.lu) prüfen.
> Für die Aussprache ist [LOD.lu](https://lod.lu) (offizielles Wörterbuch mit Audio) ideal.
