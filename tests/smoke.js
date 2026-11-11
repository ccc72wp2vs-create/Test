#!/usr/bin/env node
// Durchlauftest: startet die App in einem Browser und spielt die wichtigsten Abläufe durch.
//   npm test        (vorher einmalig: npm install && npx playwright install chromium)
const http = require("http"), fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const ROOT = path.join(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".mp3": "audio/mpeg", ".png": "image/png", ".json": "application/json", ".webmanifest": "application/manifest+json", ".woff2": "font/woff2" };

let failed = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : "  → " + detail}`); if (!ok) failed++; };

// ---- Daten: zu jedem Eintrag gibt es Audio und Bilder ----
function checkData() {
  global.window = {};
  ["data", "me", "train", "stemmen", "verben", "vivre"].forEach((f) => require(path.join(ROOT, "js", f + ".js")));
  const D = window.LUX_DATA, keys = [];
  D.topics.forEach((t) => t.words.forEach((w, i) => { keys.push(`c-${t.id}-${i}`); if (w[2]) keys.push(`e-${t.id}-${i}`); }));
  D.speaking.forEach((s, i) => { s.questions.forEach((q, j) => keys.push(`sq-${i}-${j}`)); if (s.images) s.images.forEach((im, k) => keys.push(`sm-${i}-${k}`)); else keys.push(`sm-${i}`); });
  D.dialogues.forEach((d, i) => keys.push(`d-${i}`));
  D.followups.forEach((f) => keys.push(`fq-${f.id}`));
  window.LUX_TRAIN.sets.forEach((s) => s.items.forEach((it) => keys.push(it.key)));
  window.LUX_VOICES.forEach((v) => keys.push(v.key));
  const missing = keys.filter((k) => !fs.existsSync(path.join(ROOT, "audio", k + ".mp3")));
  check(`Audio vorhanden (${keys.length} Dateien)`, !missing.length, missing.slice(0, 5).join(", "));
  const imgs = D.speaking.flatMap((s) => (s.images || []).map((im) => im.src));
  check(`Szenenbilder vorhanden (${imgs.length})`, imgs.every((f) => fs.existsSync(path.join(ROOT, f))));
  check("Hörtexte: jede Frage hat genau eine gültige Lösung", D.dialogues.every((d) => d.questions.every((q) => q.options.length === 3 && q.a >= 0 && q.a < 3)));
  const V = window.LUX_VIVRE, E = window.LUX_VIVRE_EXAM;
  check("Vivre ensemble: genug Fragen je Prüfungsfach", E.parts.every(([c, n]) => V.filter((q) => q.c === c).length >= n));
  check("Service Worker listet nur vorhandene Dateien", [...fs.readFileSync(path.join(ROOT, "sw.js"), "utf8").matchAll(/^\s+"([^"]+\.[a-z0-9]+)",?$/gm)].every((m) => fs.existsSync(path.join(ROOT, m[1]))));
}

(async () => {
  checkData();
  const server = http.createServer((req, res) => {
    let file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }).listen(0);
  const U = `http://localhost:${server.address().port}/`;
  const browser = await chromium.launch({ args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream", "--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block", permissions: ["microphone"] });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => r.status() >= 400 && errors.push(r.status() + " " + r.url()));
  p.on("dialog", (d) => d.accept());
  const go = async (hash) => { await p.goto(U + "#/" + hash); await p.waitForTimeout(150); };
  const text = (sel) => p.textContent(sel);
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem("sproochentest-v1") || "{}"));

  try {
    // Erster Start und Profil
    await p.goto(U);
    check("Erster Start zeigt die Willkommensseite", (await text("#page-title")) === "Willkommen");
    await p.fill("#myname", "Testerin"); await p.click("#nameform button"); await p.waitForTimeout(150);
    check("Profil angelegt, Startseite begrüßt mit Namen", (await text(".hero-title")).includes("Testerin"));

    // Alle Seiten laden, ohne Fehler und ohne übrig gebliebene Emojis
    const routes = ["", "lernen", "liste/famill", "quiz", "sprechen", "sprechen/0", "sprechen/6/3", "ich", "ich/daten", "ich/froen", "verstehen", "verstehen/5", "grammatik", "pruefung",
      "mehr", "profil", "schwer", "zuelen", "simulation", "stemmen", "satzbau", "verben", "verben/2", "vivre", "vivre/fehler", "pruefliste", "pass"];
    const emoji = [];
    for (const r of routes) {
      await go(r);
      const left = await p.evaluate(() => [...document.querySelectorAll("#view *:not(option)")].filter((el) => !el.closest(".checklist")).flatMap((el) => [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.nodeValue)).join(" ").match(/[\u{1F300}-\u{1FAFF}\u{2300}-\u{23FF}]/gu));
      if (left) emoji.push(r + ":" + left.join(""));
    }
    check(`${routes.length} Seiten laden ohne Fehler`, !errors.length, errors.slice(0, 3).join(" | "));
    check("Keine Emojis mehr im Text (eigenes Icon-Set)", !emoji.length, emoji.join(" "));

    // Karteikarten
    await go("lernen/famill");
    await p.click("#flash .front"); await p.waitForTimeout(100);
    check("Lernkarte dreht sich um", await p.$eval("#flash", (e) => e.classList.contains("flipped")));
    await p.click("#yes"); await p.waitForTimeout(60); await p.click("#flash .front"); await p.click("#no"); await p.waitForTimeout(60);
    const s1 = await state();
    check("Fortschritt und Fehlerzähler werden gespeichert", s1.cards["famill-0"].box === 1 && s1.miss["famill-1"] === 1 && s1.log && Object.values(s1.log)[0].n === 2);

    // Quiz
    await go("quiz/lb-de/zuelen");
    for (let k = 0; k < 10; k++) { await p.click(".opt >> nth=0"); await p.click("#nx"); }
    check("Quiz läuft bis zum Ergebnis", /von 10 richtig/.test(await text("main")));

    // Hörtext
    await go("verstehen/0");
    for (const [q, o] of [[0, 0], [1, 1], [2, 2]]) await p.click(`.opt[data-q="${q}"][data-o="${o}"]`);
    check("Hörtext wird ausgewertet", /3 von 3 richtig/.test(await text("#res")));

    // Zahlen
    await go("zuelen/zuelen");
    let fourDistinct = true;
    for (let k = 0; k < 10; k++) { const o = await p.$$eval(".opt", (x) => x.map((e) => e.textContent)); if (o.length !== 4 || new Set(o).size !== 4) fourDistinct = false; await p.click(".opt >> nth=0"); await p.click("#nx"); }
    check("Zahlen-Training: vier verschiedene Antworten je Aufgabe", fourDistinct);

    // Satzbau: richtige Lösung wird erkannt
    await go("satzbau/de");
    const target = await p.evaluate((de) => { for (const t of window.LUX_DATA.topics) for (const w of t.words) if (w[1] === de) return w[0]; }, await text("main h2"));
    for (const word of target.split(" ")) { const i = await p.$$eval("#pool .word", (x, w) => x.findIndex((e) => e.textContent === w), word); await p.click(`#pool .word >> nth=${i}`); }
    await p.click("#chk");
    check("Satzbau erkennt den richtigen Satz", /Richtig!/.test(await text(".feedback")));

    // Verben
    await go("verben/perfekt");
    let optsOk = true;
    for (let k = 0; k < 10; k++) { const o = await p.$$eval(".opt", (x) => x.map((e) => e.textContent)); if (o.length < 3 || new Set(o).size !== o.length) optsOk = false; await p.click(".opt >> nth=0"); await p.click("#nx"); }
    check("Verben-Quiz: mindestens drei verschiedene Antworten", optsOk);

    // Sprechen mit Aufnahme
    await go("sprechen/1");
    await p.click("#recbox button"); await p.waitForTimeout(600); await p.click("#recbox button"); await p.waitForTimeout(400);
    check("Aufnahme funktioniert und wird gezählt", (await p.$("#recbox audio")) !== null && (await state()).recs === 1);

    // Meine Vorstellung
    await go("ich/daten");
    await p.fill("[name=age]", "35"); await p.selectOption("[name=country]", "Portugal"); await p.selectOption("[name=status]", "bestuet");
    await p.click("#meform button[type=submit]"); await p.waitForTimeout(150);
    const sents = await p.$$eval(".sent .lb", (x) => x.map((e) => e.textContent));
    check("Persönliche Vorstellung wird erzeugt", sents.includes("Ech si fënnefandrësseg Joer al.") && sents.includes("Ech kommen aus Portugal."), sents.join(" "));

    // Vivre ensemble: Prüfungssimulation
    await go("vivre/examen");
    const cats = {};
    for (let k = 0; k < 40; k++) {
      const c = (await text(".lang")).trim(); cats[c] = (cats[c] || 0) + 1;
      const a = await p.evaluate((q) => window.LUX_VIVRE.find((v) => v.q === q).a, await text("main h2"));
      await p.click(`.opt[data-k="${k < 28 ? a : (a + 1) % 3}"]`);
      if (k < 39) await p.click("#nx");
    }
    check("Vivre-Prüfung: Verteilung 10/20/10", cats["Grundrechte"] === 10 && cats["Institutionen"] === 20 && cats["Geschichte & Europa"] === 10, JSON.stringify(cats));
    await p.click("#fin"); await p.waitForTimeout(200);
    check("Vivre-Prüfung: 28 von 40 gilt als bestanden", /Bestanden/.test(await text("main h2")) && /28 von 40/.test(await text("main")));
    await go("vivre/fehler");
    check("Falsche Vivre-Antworten landen in „Meine Fehler“", (await p.$(".opt")) !== null && Object.keys((await state()).vmiss).length === 12);

    // Lernpass
    await go("pass");
    const stamps = await p.$$eval(".pstamp.on", (x) => x.length);
    check("Lernpass zeigt verdiente Stempel und Bereitschaft", stamps >= 4 && (await p.$$eval(".meter", (x) => x.length)) === 3, "Stempel: " + stamps);

    // Sichern/Neuladen: Zustand bleibt erhalten
    await p.reload(); await p.waitForTimeout(200);
    check("Fortschritt übersteht einen Neustart", (await text("#who")).includes("Testerin") && (await state()).cards["famill-0"] !== undefined);
    check("Keine Fehler in der Browser-Konsole", !errors.length, errors.slice(0, 3).join(" | "));
  } catch (e) {
    check("Test abgebrochen", false, e.message.split("\n")[0]);
  }
  await browser.close(); server.close();
  console.log(failed ? `\n${failed} Prüfung(en) fehlgeschlagen.` : "\nAlle Prüfungen bestanden.");
  process.exit(failed ? 1 : 0);
})();
