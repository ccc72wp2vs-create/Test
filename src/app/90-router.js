  // ---------- Router ----------
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    stopMedia();
    stopAudio();
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const [a, b, c] = parts;
    const tab = { lernen: "lernen", liste: "lernen", quiz: "quiz", sprechen: "sprechen", verstehen: "mehr", grammatik: "mehr", pruefung: "mehr", mehr: "mehr", profil: "mehr", ich: "sprechen", schwer: "lernen", zuelen: "lernen", simulation: "mehr", stemmen: "mehr", satzbau: "lernen", pruefliste: "mehr", verben: "lernen", vivre: "mehr" }[a] || "home";
    const who = document.getElementById("who");
    who.innerHTML = `<span class="who-av">${esc((activeProfile().name || "?").charAt(0).toUpperCase())}</span>${esc(activeProfile().name || "Profil")}`;
    document.querySelector(".tabs").style.setProperty("--tab", ["home", "lernen", "quiz", "sprechen", "mehr"].indexOf(tab));
    document.querySelectorAll(".tabs a").forEach((x) => x.classList.toggle("active", x.dataset.tab === tab));
    if (!activeProfile().name) { who.hidden = true; return viewWelcome(); } // erster Start
    who.hidden = false;
    switch (a) {
      case undefined: return viewHome();
      case "lernen": return b ? viewFlash(b) : viewTopics();
      case "liste": return viewList(b);
      case "quiz": return b ? viewQuiz(b, c || "all") : viewQuizMenu();
      case "sprechen": return b !== undefined ? viewSpeak(+b, c === undefined ? -1 : +c) : viewSpeakList();
      case "verstehen": return b !== undefined ? viewDialog(+b) : viewDialogList();
      case "grammatik": return viewGrammar();
      case "pruefung": return viewExam();
      case "mehr": return viewMore();
      case "profil": return viewProfile();
      case "ich": return b === "daten" ? viewMeForm() : b === "froen" ? viewFollowups(c) : viewMe();
      case "schwer": return viewHard();
      case "zuelen": return b ? viewNumbers(b) : viewNumbersMenu();
      case "simulation": return viewSim();
      case "stemmen": return viewVoices();
      case "satzbau": return b ? viewBuild(b) : viewBuildMenu();
      case "pruefliste": return viewChecklist();
      case "pass": return viewPass();
      case "verben": return !b ? viewVerbsMenu() : /^\d+$/.test(b) ? viewVerb(+b) : viewVerbQuiz(b);
      case "vivre": return !b ? viewVivreMenu() : b === "examen" ? viewVivreExam() : viewVivre(b);
      default: return viewHome();
    }
  }

  // Kopfzeile und Navigation mit dem Icon-Set bestücken
  document.getElementById("crest").innerHTML = UI.lion();
  document.querySelectorAll("[data-ic]").forEach((el) => { el.innerHTML = UI.icon(el.dataset.ic); });

  $view.addEventListener("click", (e) => {
    const b = e.target.closest("[data-audio]");
    if (b) play(b.dataset.audio, b);
  });
  checkStamps(false);
  window.addEventListener("hashchange", route);
  route();

  // ---------- Updates ----------
  // Eine neue Version wird im Hintergrund geladen und wartet. Dann erscheint oben der Hinweis mit "Aktualisieren".
  let swReg = null;
  function showUpdate(worker) {
    if (document.querySelector(".update")) return;
    const bar = document.createElement("div");
    bar.className = "update"; bar.setAttribute("role", "status");
    bar.innerHTML = `<span class="update-ic">${UI.icon("refresh")}</span><span><b>Neue Version</b><small>Fortschritt bleibt erhalten</small></span>
      <button class="btn red" id="upd-now">Aktualisieren</button><button class="update-x" id="upd-later" aria-label="Später">${UI.icon("cross")}</button>`;
    document.body.appendChild(bar);
    document.getElementById("upd-later").onclick = () => bar.remove();
    document.getElementById("upd-now").onclick = (e) => { e.target.disabled = true; e.target.textContent = "Lädt …"; worker.postMessage("update-now"); };
  }
  function watch(reg) {
    swReg = reg;
    const offer = () => { if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting); };
    offer();
    // Eine Installation kann schon laufen, bevor wir hier ankommen – deshalb beide Fälle beobachten
    const track = (w) => { if (w) w.addEventListener("statechange", () => { if (w.state === "installed") offer(); }); };
    track(reg.installing);
    reg.addEventListener("updatefound", () => track(reg.installing));
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    // Sobald die neue Version übernimmt, einmal neu laden – aber nicht beim allerersten Start
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloading) { reloading = true; location.reload(); } });
    navigator.serviceWorker.register("sw.js").then(watch).catch(() => {});
    // Auf dem Home-Bildschirm bleibt die App oft tagelang offen: bei jeder Rückkehr nach Updates sehen
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && swReg) swReg.update().catch(() => {}); });
  }
  window.LUX_CHECK_UPDATE = () => (swReg ? swReg.update().then(() => !!(swReg.waiting || swReg.installing)) : Promise.resolve(false));
})();
