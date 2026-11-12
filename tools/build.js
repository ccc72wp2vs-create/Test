#!/usr/bin/env node
// Setzt js/app.js aus den Teilen in src/app/ zusammen.
// Die Teile sind Abschnitte EINER gemeinsamen Funktion (sie teilen sich Zustand und Hilfsfunktionen):
// 00-kern.js öffnet sie, 90-router.js schließt sie. Deshalb sind die Teile einzeln nicht lauffähig.
//
// Außerdem berechnet das Skript die Versionskennung der App (siehe unten) – deshalb nach JEDER Änderung
// an App-Dateien ausführen, auch wenn nur CSS, Daten oder Bilder geändert wurden.
//
//   node tools/build.js          baut js/app.js und aktualisiert die Version
//   node tools/build.js --check  prüft nur, ob js/app.js aktuell ist (für Tests)
const fs = require("fs"), path = require("path");
const root = path.join(__dirname, ".."), dir = path.join(root, "src", "app"), out = path.join(root, "js", "app.js");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort();
const built = "// Automatisch erzeugt aus src/app/*.js – dort ändern und `node tools/build.js` ausführen.\n" +
  files.map((f) => fs.readFileSync(path.join(dir, f), "utf8").replace(/\n+$/, "\n")).join("\n");

// Versionskennung: Prüfsumme über alle Dateien, die der Service Worker offline bereithält.
// Sie steht in sw.js (damit der Browser Updates erkennt) und in js/version.js (für die Anzeige in der App).
const crypto = require("crypto");
const swPath = path.join(root, "sw.js"), verPath = path.join(root, "js", "version.js");
function version(appJs) {
  const sw = fs.readFileSync(swPath, "utf8");
  const list = [...sw.slice(sw.indexOf("const FILES = ["), sw.indexOf("];")).matchAll(/"([^"]+\.[a-z0-9]+)"/g)].map((m) => m[1]).filter((f) => f !== "js/version.js");
  const h = crypto.createHash("sha1");
  list.forEach((f) => h.update(f).update(f === "js/app.js" ? appJs : fs.readFileSync(path.join(root, f))));
  h.update(sw.replace(/const VERSION = "[^"]*";/, ""));
  return h.digest("hex").slice(0, 8);
}
const id = version(built);
const swNow = fs.readFileSync(swPath, "utf8");
const verNow = fs.existsSync(verPath) ? fs.readFileSync(verPath, "utf8") : "";

if (process.argv.includes("--check")) {
  const ok = fs.readFileSync(out, "utf8") === built && swNow.includes(`const VERSION = "${id}";`) && verNow.includes(`"${id}"`);
  if (!ok) { console.error("js/app.js oder die Versionskennung ist nicht aktuell – bitte `node tools/build.js` ausführen."); process.exit(1); }
  console.log(`js/app.js ist aktuell (Version ${id}).`);
} else {
  fs.writeFileSync(out, built);
  if (!verNow.includes(`"${id}"`)) {
    fs.writeFileSync(verPath, `// Automatisch erzeugt von tools/build.js\nwindow.LUX_VERSION = { id: "${id}", date: "${new Date().toISOString().slice(0, 10)}" };\n`);
    fs.writeFileSync(swPath, swNow.replace(/const VERSION = "[^"]*";/, `const VERSION = "${id}";`));
  }
  console.log(`js/app.js aus ${files.length} Teilen gebaut (${built.split("\n").length} Zeilen), Version ${id}.`);
}
