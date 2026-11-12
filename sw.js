// Service Worker: macht die App offline nutzbar und liefert Updates kontrolliert aus.
//
// VERSION wird von tools/build.js aus dem Inhalt aller App-Dateien berechnet. Ändert sich eine Datei,
// ändert sich diese Zeile – daran erkennt der Browser eine neue Version. Die neue Version wird im
// Hintergrund vollständig geladen und wartet dann; die App zeigt den Hinweis "Neue Version verfügbar".
// Erst nach dem Tippen auf "Aktualisieren" (oder nach dem vollständigen Schließen der App) wird sie aktiv.
const VERSION = "dfc76f93";
const CACHE = "moien-app-" + VERSION;
const AUDIO = "sproochentest-audio-v2"; // bleibt bei App-Updates erhalten
const FILES = [
  "./",
  "index.html",
  "css/style.css",
  "fonts/fraunces.woff2",
  "fonts/figtree.woff2",
  "js/ui.js",
  "js/data.js",
  "js/me.js",
  "js/train.js",
  "js/stemmen.js",
  "js/verben.js",
  "js/vivre.js",
  "js/version.js",
  "js/app.js",
  "manifest.webmanifest",
  "img/maart.svg",
  "img/park.svg",
  "img/iessen.svg",
  "img/arret.svg",
  "img/dokter.svg",
  "img/buro.svg",
  "img/restaurant.svg",
  "img/supermarche.svg",
  "img/schoul.svg",
  "img/kichen.svg",
  "icons/icon.svg",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (e) => {
  // { cache: "reload" } umgeht den Browser-Zwischenspeicher, damit wirklich die neuen Dateien geholt werden
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: "reload" })))));
});

self.addEventListener("message", (e) => {
  if (e.data === "update-now") self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== AUDIO).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Audio: Cache zuerst. Safari fragt Audio in Teilstücken an (Range) – die schneiden wir selbst zu.
async function audioResponse(req) {
  const cache = await caches.open(AUDIO);
  let res = await cache.match(req.url);
  if (!res) {
    res = await fetch(req.url);
    if (res.status !== 200) return res;
    await cache.put(req.url, res.clone());
  }
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get("range") || "");
  if (!m) return res;
  const buf = await res.arrayBuffer();
  const start = +m[1];
  const end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes"
    }
  });
}

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  if (url.pathname.includes("/audio/")) return e.respondWith(audioResponse(e.request));
  // App-Dateien: immer aus dem Cache dieser Version, damit alle Dateien zusammenpassen. Nur was dort fehlt, kommt aus dem Netz.
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true })).then((hit) => hit || fetch(e.request)));
});
