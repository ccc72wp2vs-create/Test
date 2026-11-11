#!/usr/bin/env node
// Setzt js/app.js aus den Teilen in src/app/ zusammen.
// Die Teile sind Abschnitte EINER gemeinsamen Funktion (sie teilen sich Zustand und Hilfsfunktionen):
// 00-kern.js öffnet sie, 90-router.js schließt sie. Deshalb sind die Teile einzeln nicht lauffähig.
//
//   node tools/build.js          baut js/app.js
//   node tools/build.js --check  prüft nur, ob js/app.js aktuell ist (für Tests)
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), dir = path.join(root, "src", "app"), out = path.join(root, "js", "app.js");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort();
const built = "// Automatisch erzeugt aus src/app/*.js – dort ändern und `node tools/build.js` ausführen.\n" +
  files.map((f) => fs.readFileSync(path.join(dir, f), "utf8").replace(/\n+$/, "\n")).join("\n");
if (process.argv.includes("--check")) {
  if (fs.readFileSync(out, "utf8") !== built) { console.error("js/app.js ist nicht aktuell – bitte `node tools/build.js` ausführen."); process.exit(1); }
  console.log("js/app.js ist aktuell.");
} else {
  fs.writeFileSync(out, built);
  console.log(`js/app.js aus ${files.length} Teilen gebaut (${built.split("\n").length} Zeilen).`);
}
