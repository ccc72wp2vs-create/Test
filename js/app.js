(() => {
  "use strict";

  const D = window.LUX_DATA;
  const ME = window.LUX_ME;
  const TRAIN = window.LUX_TRAIN;
  const VOICES = window.LUX_VOICES || []; // echte Aufnahmen von LOD.lu
  const VERBS = window.LUX_VERBS || [];   // Konjugation aus den LOD-Tabellen
  const VIVRE = window.LUX_VIVRE || [];
  const UI = window.LUX_UI; // Icons, Maskottchen, Illustrationen
  const VIVRE_EXAM = window.LUX_VIVRE_EXAM || { parts: [], minutes: 60, pass: 28 };
  const $view = document.getElementById("view");
  const $title = document.getElementById("page-title");
  const STORE_KEY = "sproochentest-v1";
  const DAY = 86400000;
  // Leitner-Boxen: Tage bis zur nächsten Wiederholung
  const INTERVALS = [0, 1, 2, 4, 8, 16, 32];
  const NEW_PER_SESSION = 10;

  // ---------- Daten aufbereiten ----------
  const cards = [];
  D.topics.forEach((t) => {
    t.words.forEach((w, i) => {
      cards.push({ id: `${t.id}-${i}`, topic: t.id, lb: w[0], de: w[1], ex: w[2] || "" });
    });
  });
  const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
  const topicById = Object.fromEntries(D.topics.map((t) => [t.id, t]));

  // ---------- Speicher & Profile ----------
  // Jedes Profil hat seinen eigenen Lernstand. Das erste Profil nutzt den ursprünglichen
  // Speicherplatz, damit vorhandener Fortschritt erhalten bleibt.
  const PROFILES_KEY = "sproochentest-profiles";
  const storeKey = (id) => (id === "p1" ? STORE_KEY : `${STORE_KEY}:${id}`);
  const emptyState = () => ({ cards: {}, days: [], quizBest: {}, reversed: false, miss: {}, sims: [], done: {}, examDate: "" });
  function loadProfiles() {
    try {
      const p = JSON.parse(localStorage.getItem(PROFILES_KEY));
      if (p && Array.isArray(p.list) && p.list.length) {
        if (!p.list.some((x) => x.id === p.active)) p.active = p.list[0].id;
        return p;
      }
    } catch (e) { /* ignorieren */ }
    return { active: "p1", list: [{ id: "p1", name: "" }] };
  }
  let profiles = loadProfiles();
  const activeProfile = () => profiles.list.find((x) => x.id === profiles.active);
  function saveProfiles() {
    try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles)); } catch (e) { /* voll/privat */ }
  }
  function load(id = profiles.active) {
    try {
      const s = JSON.parse(localStorage.getItem(storeKey(id)));
      if (s && s.cards) return Object.assign(emptyState(), s);
    } catch (e) { /* ignorieren */ }
    return emptyState();
  }
  let state = load();
  function save() {
    try { localStorage.setItem(storeKey(profiles.active), JSON.stringify(state)); } catch (e) { /* voll/privat */ }
  }
  function switchProfile(id) {
    profiles.active = id;
    saveProfiles();
    state = load();
  }
  const today = () => new Date().toISOString().slice(0, 10);
  // Merkt den Lerntag und, falls angegeben, welche Aufgabe des Tagesplans erledigt wurde.
  function markActive(kind) {
    const d = today();
    if (!state.days.includes(d)) { state.days.push(d); state.days = state.days.slice(-400); }
    if (kind) {
      const t = state.done[d] || (state.done[d] = {});
      t[kind] = true;
      if (kind === "sim") { t.heieren = true; t.schwatzen = true; }
      Object.keys(state.done).sort().slice(0, -30).forEach((k) => delete state.done[k]); // nur die letzten 30 Tage behalten
    }
    save();
  }
  function streak(s = state) {
    const set = new Set(s.days);
    let n = 0;
    const d = new Date();
    if (!set.has(today())) d.setDate(d.getDate() - 1); // heute noch nicht gelernt → Serie zählt bis gestern
    while (set.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  // ---------- Hilfen ----------
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const isDue = (c) => { const s = state.cards[c.id]; return s && s.due <= Date.now(); };
  const isNew = (c) => !state.cards[c.id];
  const learned = (c) => { const s = state.cards[c.id]; return s && s.box >= 3; };
  function render(title, html) {
    $title.textContent = title;
    $view.innerHTML = html;
    UI.decorate($view);                 // Emojis im Markup durch das eigene Icon-Set ersetzen
    $view.classList.remove("enter");    // Einblend-Animation neu starten
    void $view.offsetWidth;
    $view.classList.add("enter");
    window.scrollTo(0, 0);
  }
  // Auch nachträglich eingefügte Inhalte (Feedback, Buttons) bekommen die Icons
  new MutationObserver((list) => list.forEach((m) => m.addedNodes.forEach((n) => UI.decorate(n.nodeType === 1 ? n : n.parentElement))))
    .observe($view, { childList: true, subtree: true });
  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[.,!?…;:()"“”]/g, "").replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  }

  // Aussprache: vorab erzeugte Audiodateien (audio/<key>.mp3), siehe tools/gen_audio.py
  const player = new Audio();
  let playingBtn = null;
  function stopAudio() {
    player.pause();
    if (playingBtn) { playingBtn.classList.remove("playing"); playingBtn = null; }
  }
  function play(key, btn) {
    const same = playingBtn === btn;
    stopAudio();
    if (same) return; // zweiter Tipp = Stopp
    player.src = `audio/${key}.mp3`;
    playingBtn = btn;
    btn.classList.add("playing");
    player.play().catch(stopAudio);
  }
  player.onended = stopAudio;
  const audioBtn = (key, label) => `<button type="button" class="snd${label ? " wide" : ""}" data-audio="${key}" aria-label="Aussprache anhören">🔊${label ? " " + label : ""}</button>`;
  function audioKeys() {
    const keys = [];
    cards.forEach((c) => { keys.push(`c-${c.id}`); if (c.ex) keys.push(`e-${c.id}`); });
    D.speaking.forEach((s, i) => {
      s.questions.forEach((q, j) => keys.push(`sq-${i}-${j}`));
      if (s.images) s.images.forEach((im, k) => keys.push(`sm-${i}-${k}`)); else keys.push(`sm-${i}`);
    });
    D.dialogues.forEach((d, i) => keys.push(`d-${i}`));
    D.followups.forEach((f) => keys.push(`fq-${f.id}`));
    TRAIN.sets.forEach((s) => s.items.forEach((it) => keys.push(it.key)));
    VOICES.forEach((v) => keys.push(v.key));
    return keys;
  }

  // ---------- Wochenplan ----------
  const daysLeft = () => (state.examDate ? Math.ceil((new Date(state.examDate + "T00:00:00") - new Date(today() + "T00:00:00")) / DAY) : null);
  // So viele neue Karten pro Tag, dass bis eine Woche vor der Prüfung alles einmal gesehen ist (zwischen 5 und 25)
  function newPerDay() {
    const left = daysLeft(), unseen = cards.filter(isNew).length;
    if (left === null || left <= 7) return left === null ? NEW_PER_SESSION : 25;
    return Math.max(5, Math.min(25, Math.ceil(unseen / (left - 7))));
  }
  function todayPlan() {
    const wd = new Date().getDay(); // 0 = Sonntag
    const doy = Math.floor(Date.now() / DAY);
    const b1 = D.dialogues.map((d, i) => i).filter((i) => D.dialogues[i].level === "B1");
    const talk = D.speaking[doy % D.speaking.length];
    const listen = [
      ["Prüfungssimulation", "#/simulation"], ["B1-Hörtext: " + D.dialogues[b1[doy % b1.length]].title, "#/verstehen/" + b1[doy % b1.length]], ["Echte Stimmen", "#/stemmen"],
      ["Zahlen & Uhrzeit", "#/zuelen"], ["B1-Hörtext: " + D.dialogues[b1[doy % b1.length]].title, "#/verstehen/" + b1[doy % b1.length]], ["Echte Stimmen", "#/stemmen"], ["Zahlen & Uhrzeit", "#/zuelen"]
    ][wd];
    const extra = [["Rückfragen üben", "#/ich/froen"], ["Satzbau", "#/satzbau"], ["Verben", "#/verben"], ["Quiz", "#/quiz"], ["Satzbau", "#/satzbau"], ["Verben", "#/verben"], ["Quiz", "#/quiz"]][wd];
    const due = cards.filter(isDue).length, fresh = Math.min(newPerDay(), cards.filter(isNew).length);
    return [
      { k: "karten", ico: "🃏", t: `Karten: ${due} wiederholen, ${fresh} neue`, href: "#/lernen/heute" },
      { k: wd === 0 ? "sim" : "heieren", ico: "👂", t: listen[0], href: listen[1] },
      { k: "schwatzen", ico: "🎙️", t: `Sprechen: ${talk.topic}`, href: "#/sprechen/" + (doy % D.speaking.length) },
      { k: wd === 0 ? "schwatzen" : "uebung", ico: "🧩", t: extra[0], href: extra[1] }
    ];
  }
  function planCard() {
    const left = daysLeft(), done = state.done[today()] || {}, plan = todayPlan();
    const n = plan.filter((x) => done[x.k]).length;
    const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * DAY); const key = d.toISOString().slice(0, 10);
      return `<span class="day${state.days.includes(key) ? " on" : ""}${key === today() ? " now" : ""}">${"SMDMDFS"[d.getUTCDay()]}</span>`; }).join("");
    const head = left === null
      ? `<form id="examform" class="row" style="align-items:flex-end"><label class="field" style="margin:0"><span>Wann ist deine Prüfung?</span><input type="date" id="examdate" min="${today()}"></label><button class="btn" type="submit" style="flex:0 0 auto">Speichern</button></form>
         <p class="muted" style="margin-top:6px">Mit Termin rechnet die App aus, wie viele neue Karten du pro Tag brauchst.</p>`
      : `<p style="margin-bottom:6px"><b>${left > 1 ? `Noch ${left} Tage bis zur Prüfung` : left === 1 ? "Morgen ist deine Prüfung – viel Erfolg! 🍀" : left === 0 ? "Heute ist deine Prüfung – vill Gléck! 🍀" : "Dein Prüfungstermin ist vorbei."}</b>
           <a href="#/profil" class="muted" style="font-size:.85rem"> ändern</a></p>
         ${left > 7 ? `<p class="muted">Tempo: ${newPerDay()} neue Karten pro Tag, dann hast du eine Woche vor der Prüfung alles gesehen.</p>` : left >= 0 ? `<p class="muted">Letzte Woche: wiederholen, Simulation machen, deine Vorstellung laut üben.</p>` : ""}`;
    return `<div class="card"><h2>Heute dran <small class="muted" style="font-weight:400">${n} von ${plan.length}</small></h2>
      ${plan.map((x) => `<a class="task${done[x.k] ? " ok" : ""}" href="${x.href}"><span>${done[x.k] ? "✅" : x.ico}</span><b>${esc(x.t)}</b><i>›</i></a>`).join("")}
      <div class="week">${week}</div>${head}</div>`;
  }

  // ---------- Startseite ----------
  function viewHome() {
    const due = cards.filter(isDue).length;
    const known = cards.filter(learned).length;
    const seen = cards.filter((c) => !isNew(c)).length;
    const pct = Math.round((known / cards.length) * 100);
    render("Moien Lëtzebuerg", `
      <section class="hero">
        <div class="hero-head">
          <div>
            <p class="eyebrow">Dein Lernpass</p>
            <h2 class="hero-title">Moien${activeProfile().name ? ",<br>" + esc(activeProfile().name) : ""}!</h2>
            <p class="hero-sub">Dein Weg zur luxemburgischen Staatsbürgerschaft.</p>
          </div>
          <div class="ring" style="--p:${pct}" title="${pct}% des Wortschatzes sicher gelernt">
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-bg" cx="60" cy="60" r="54"/><circle class="ring-fg" cx="60" cy="60" r="54"/></svg>
            ${UI.lion()}
            <span class="ring-pct">${pct}%</span>
          </div>
        </div>
        <div class="stats">
          <div><b>${streak()}</b><small>Tage in Folge</small></div>
          <div><b>${due}</b><small>fällige Karten</small></div>
          <div><b>${known}</b><small>sicher gelernt</small></div>
        </div>
        <p class="hero-note">${pct}% des Wortschatzes sicher · ${seen} von ${cards.length} Karten gesehen</p>
        <a class="btn red hero-cta" href="#/lernen/heute">${due ? `Jetzt ${due} ${due === 1 ? "Karte" : "Karten"} wiederholen` : "Tägliche Lerneinheit starten"}</a>
        ${UI.skyline}
      </section>
      ${planCard()}
      <div class="grid">
        <a class="tile" href="#/lernen"><div class="ico">🃏</div><b>Karteikarten</b><small>Wortschatz nach Themen</small></a>
        <a class="tile" href="#/quiz"><div class="ico">✅</div><b>Quiz</b><small>Wissen testen</small></a>
        <a class="tile" href="#/sprechen"><div class="ico">🎙️</div><b>Sprechen</b><small>Prüfungsfragen üben</small></a>
        <a class="tile" href="#/ich"><div class="ico">⭐</div><b>Meine Vorstellung</b><small>Persönlicher Text</small></a>
        <a class="tile" href="#/verstehen"><div class="ico">👂</div><b>Verstehen</b><small>Dialoge & Fragen</small></a>
        <a class="tile" href="#/grammatik"><div class="ico">📐</div><b>Grammatik</b><small>Das Nötigste für A2</small></a>
        <a class="tile" href="#/stemmen"><div class="ico">🗣️</div><b>Echte Stimmen</b><small>Sätze von Muttersprachlern</small></a>
        <a class="tile" href="#/satzbau"><div class="ico">🧩</div><b>Satzbau</b><small>Sätze zusammensetzen</small></a>
        <a class="tile" href="#/zuelen"><div class="ico">🔢</div><b>Zahlen & Uhrzeit</b><small>Hörtraining</small></a>
        <a class="tile" href="#/simulation"><div class="ico">⏱️</div><b>Prüfungssimulation</b><small>${state.sims.length ? `Zuletzt: Hören ${state.sims[state.sims.length - 1].r}/${state.sims[state.sims.length - 1].t}` : "Kompletter Durchlauf"}</small></a>
        <a class="tile" href="#/verben"><div class="ico">🔤</div><b>Verben</b><small>Gegenwart & Perfekt</small></a>
        <a class="tile" href="#/vivre"><div class="ico">🇱🇺</div><b>Vivre ensemble</b><small>Landeskunde-Quiz</small></a>
        <a class="tile" href="#/pruefung"><div class="ico">🎓</div><b>Die Prüfung</b><small>Ablauf & Tipps</small></a>
      </div>`);
    const ef = document.getElementById("examform");
    if (ef) ef.onsubmit = (e) => { e.preventDefault(); const v = document.getElementById("examdate").value; if (v) { state.examDate = v; save(); route(); } };
  }

  // ---------- Profile ----------
  const cleanName = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 20);
  // Erster Start: Profil anlegen
  function viewWelcome() {
    render("Willkommen", `
      <div class="card welcome">
        <div class="welcome-art">${UI.lion("frou")}${UI.skyline}</div>
        <h2>Moien!</h2>
        <p><b>Moien Lëtzebuerg</b> bereitet dich auf die luxemburgische Staatsbürgerschaft vor: Luxemburgisch für den <b>Sproochentest</b> und Landeskunde für <b>„Vivre ensemble“</b>.</p>
        <h3>Erstelle dein Profil</h3>
        <form id="nameform">
          <input type="text" id="myname" maxlength="20" placeholder="Wie heißt du?" aria-label="Dein Name" required>
          <button class="btn" type="submit" style="width:100%">Los geht's</button>
        </form>
        <p class="muted" style="margin-top:10px">Dein Profil und dein Lernfortschritt werden nur auf diesem Gerät gespeichert – ohne Anmeldung und ohne Konto.</p>
      </div>`);
    document.getElementById("nameform").onsubmit = (e) => {
      e.preventDefault();
      const name = cleanName(document.getElementById("myname").value);
      if (name) { activeProfile().name = name; saveProfiles(); route(); }
    };
  }

  function viewProfile() {
    const me = activeProfile();
    const known = cards.filter(learned).length;
    // Falls auf dem Gerät noch weitere Profile aus einer früheren Version liegen, bleiben sie erreichbar.
    const others = profiles.list.filter((p) => p.id !== me.id).map((p) => `<div class="card profile">
        <div class="who"><span class="avatar">${esc((p.name || "?").charAt(0).toUpperCase())}</span>
          <div><b>${esc(p.name || "Ohne Namen")}</b><br><small class="muted">${Object.keys(load(p.id).cards).length} Karten gesehen</small></div></div>
        <div class="row"><button class="btn secondary" data-act="use" data-id="${p.id}">Wechseln</button>
          <button class="btn secondary" data-act="del" data-id="${p.id}">Löschen</button></div></div>`).join("");
    render("Mein Profil", `
      <div class="card profile active">
        <div class="who"><span class="avatar">${esc(me.name.charAt(0).toUpperCase())}</span>
          <div><b>${esc(me.name)}</b><br><small class="muted">Profil auf diesem Gerät</small></div></div>
        <div class="stats">
          <div><b>${streak()}</b><small>Tage in Folge</small></div>
          <div><b>${Object.keys(state.cards).length}</b><small>Karten gesehen</small></div>
          <div><b>${known}</b><small>sicher gelernt</small></div>
        </div>
        <p class="muted" style="margin-top:10px">${state.days.length} Lerntage insgesamt</p>
        <form id="examform2" class="row" style="align-items:flex-end;margin-bottom:10px">
          <label class="field" style="margin:0"><span>Prüfungstermin</span><input type="date" id="examdate2" value="${esc(state.examDate || "")}"></label>
          <button class="btn secondary" type="submit" style="flex:0 0 auto">Speichern</button>
        </form>
        <form id="renameform" class="row">
          <input type="text" id="myname" maxlength="20" value="${esc(me.name)}" style="flex:2;margin:0" aria-label="Dein Name">
          <button class="btn secondary" type="submit">Name ändern</button>
        </form>
      </div>
      <a class="tile star" style="margin-bottom:12px" href="#/ich"><b>⭐ Meine Vorstellung</b><small>${state.me ? "Persönlichen Text ansehen oder Daten ändern" : "Alter, Arbeit, Familie eintragen und persönlichen Text erstellen"}</small></a>
      <p class="muted">Dein Profil und dein Fortschritt liegen nur auf diesem Gerät. Unter <a href="#/mehr">Mehr</a> kannst du den Fortschritt sichern, z. B. bevor du das Handy wechselst.</p>
      ${others ? `<h2>Weitere Profile auf diesem Gerät</h2>${others}` : ""}`);
    document.getElementById("examform2").onsubmit = (e) => { e.preventDefault(); state.examDate = document.getElementById("examdate2").value || ""; save(); go("#/"); };
    document.getElementById("renameform").onsubmit = (e) => {
      e.preventDefault();
      const name = cleanName(document.getElementById("myname").value);
      if (name) { me.name = name; saveProfiles(); route(); }
    };
    $view.querySelectorAll("[data-act]").forEach((b) => {
      b.onclick = () => {
        const p = profiles.list.find((x) => x.id === b.dataset.id);
        if (b.dataset.act === "use") { switchProfile(p.id); return go("#/"); }
        if (confirm(`Profil „${p.name || "Ohne Namen"}“ mit dem gesamten Lernfortschritt löschen?`)) {
          try { localStorage.removeItem(storeKey(p.id)); } catch (err) { /* ignorieren */ }
          profiles.list = profiles.list.filter((x) => x.id !== p.id);
          saveProfiles();
          route();
        }
      };
    });
  }

  // ---------- Lernen: Themenübersicht ----------
  function viewTopics() {
    const tiles = D.topics.map((t) => {
      const tc = cards.filter((c) => c.topic === t.id);
      const k = tc.filter(learned).length;
      const due = tc.filter(isDue).length;
      return `<div class="tile">
        <div class="ico">${t.icon}</div><b>${esc(t.title)}</b><small>${esc(t.de)}</small>
        <div class="bar"><i style="width:${Math.round((k / tc.length) * 100)}%"></i></div>
        <small>${k}/${tc.length} sicher${due ? ` · ${due} fällig` : ""}</small>
        <div class="row" style="margin-top:8px">
          <a class="btn" style="padding:8px" href="#/lernen/${t.id}">Lernen</a>
          <a class="btn secondary" style="padding:8px" href="#/liste/${t.id}">Liste</a>
        </div></div>`;
    }).join("");
    render("Karteikarten", `
      <a class="btn" style="width:100%;margin-bottom:12px" href="#/lernen/heute">▶︎ Tägliche Lerneinheit (alle Themen)</a>
      <div class="row" style="margin-bottom:12px">
        <a class="btn secondary" href="#/schwer">🔥 Schwierige Wörter (${hardCards().length})</a>
        <a class="btn secondary" href="#/zuelen">🔢 Zahlen & Uhrzeit</a>
      </div>
      <div class="row" style="margin-bottom:12px">
        <a class="btn secondary" href="#/satzbau">🧩 Satzbau</a>
        <a class="btn secondary" href="#/verben">🔤 Verben</a>
      </div>
      <label class="card" style="display:flex;gap:10px;align-items:center">
        <input type="checkbox" id="rev" ${state.reversed ? "checked" : ""}>
        <span>Richtung umkehren: Deutsch → Lëtzebuergesch<br><small class="muted">Schwieriger, aber besser fürs Sprechen</small></span>
      </label>
      <div class="grid">${tiles}</div>`);
    document.getElementById("rev").onchange = (e) => { state.reversed = e.target.checked; save(); };
  }

  function viewHard() {
    const hard = hardCards();
    if (!hard.length) {
      return render("Schwierige Wörter", `<div class="card"><h2>Noch nichts gesammelt 👍</h2>
        <p>Hier landen automatisch die Wörter, die du bei den Karteikarten mit „Nochmal“ markierst oder im Quiz falsch beantwortest.</p>
        <a class="btn" href="#/lernen">Zu den Karteikarten</a></div>`);
    }
    render("Schwierige Wörter", `
      <p class="muted">Diese Wörter hattest du am häufigsten falsch. Jedes „Gewusst“ in der Übung senkt den Zähler; bei null verschwindet das Wort aus der Liste.</p>
      <a class="btn" style="width:100%;margin-bottom:12px" href="#/lernen/schwer">▶︎ Diese Wörter üben (${Math.min(hard.length, 20)})</a>
      <div class="card"><ul class="wordlist">${hard.map((c) => `<li><div>${audioBtn(`c-${c.id}`)} <b>${esc(c.lb)}</b> <span class="box-badge">${state.miss[c.id]}× falsch</span></div><span>${esc(c.de)}</span></li>`).join("")}</ul></div>`);
  }

  function viewList(topicId) {
    const t = topicById[topicId];
    if (!t) return go("#/lernen");
    const items = cards.filter((c) => c.topic === topicId).map((c) => {
      const s = state.cards[c.id];
      return `<li><div>${audioBtn(`c-${c.id}`)} <b>${esc(c.lb)}</b> ${s ? `<span class="box-badge">Box ${s.box}</span>` : ""}
        ${c.ex ? `<br><small class="muted"><i>${esc(c.ex)}</i></small>` : ""}</div><span>${esc(c.de)}</span></li>`;
    }).join("");
    render(t.title, `<div class="card"><p class="muted">${esc(t.de)}</p><ul class="wordlist">${items}</ul></div>
      <a class="btn" style="width:100%" href="#/lernen/${t.id}">Diese Karten lernen</a>`);
  }

  // ---------- Lernen: Karteikarten-Sitzung ----------
  // Fehlerzähler pro Karte: steigt bei "Nochmal" und falschen Quiz-Antworten, sinkt beim Üben
  function missed(c) { state.miss[c.id] = (state.miss[c.id] || 0) + 1; save(); }
  const hardCards = () => cards.filter((c) => state.miss[c.id] > 0).sort((x, y) => state.miss[y.id] - state.miss[x.id]);

  function buildQueue(topicId) {
    if (topicId === "schwer") return hardCards().slice(0, 20);
    const pool = topicId === "heute" ? cards : cards.filter((c) => c.topic === topicId);
    const due = shuffle(pool.filter(isDue));
    const fresh = pool.filter(isNew).slice(0, topicId === "heute" ? newPerDay() : NEW_PER_SESSION); // neue Karten in Themenreihenfolge
    let q = due.concat(fresh);
    if (!q.length && topicId !== "heute") q = shuffle(pool).slice(0, 15); // freies Üben
    return q;
  }

  function viewFlash(topicId) {
    const t = topicById[topicId];
    if (topicId !== "heute" && topicId !== "schwer" && !t) return go("#/lernen");
    const title = t ? t.title : topicId === "schwer" ? "Schwierige Wörter" : "Tägliche Lerneinheit";
    const queue = buildQueue(topicId);
    let done = 0, right = 0;
    const total = queue.length;

    if (!total) {
      return render(title, `<div class="card"><h2>Alles erledigt! 🎉</h2>
        <p>Für heute ist nichts mehr fällig. Komm morgen wieder – oder übe ein Thema frei.</p>
        <a class="btn" href="#/lernen">Zu den Themen</a></div>`);
    }

    function next() {
      if (!queue.length) {
        markActive("karten");
        return render(title, `<div class="card"><h2>Gutt gemaach! 👏</h2>
          <p>${total} Karten bearbeitet, ${right} beim ersten Mal gewusst.</p>
          <div class="row"><a class="btn" href="#/">Start</a><a class="btn secondary" href="#/quiz">Zum Quiz</a></div></div>`);
      }
      const c = queue[0];
      const rev = state.reversed;
      const front = rev ? c.de : c.lb;
      const back = rev ? c.lb : c.de;
      render(title, `
        <div class="bar"><i style="width:${Math.round((done / total) * 100)}%"></i></div>
        <p class="muted">${done} / ${total} · ${isNew(c) ? "neu" : "Wiederholung"}</p>
        <div class="flash" id="flash" role="button" tabindex="0" aria-label="Karte umdrehen">
          <div class="flash-inner">
            <div class="face front">
              <span class="tab-label">${esc((topicById[c.topic] || {}).title || "")}</span>
              <div class="lang">${rev ? "Deutsch" : "Lëtzebuergesch"}</div>
              <div class="fword">${esc(front)}</div>
              ${rev ? "" : audioBtn(`c-${c.id}`)}
              <div class="hint">Antippen zum Umdrehen</div>
            </div>
            <div class="face back">
              <span class="tab-label">${esc((topicById[c.topic] || {}).title || "")}</span>
              <div class="lang">${rev ? "Lëtzebuergesch" : "Deutsch"}</div>
              <div class="fword">${esc(back)}</div>
              <div class="word-small">${esc(front)}</div>
              ${rev ? audioBtn(`c-${c.id}`) : ""}
              ${c.ex ? `<div class="ex">${esc(c.ex)} ${audioBtn(`e-${c.id}`)}</div>` : ""}
            </div>
          </div>
        </div>
        <div class="boxes" title="Lernstufe dieser Karte">${Array.from({ length: INTERVALS.length - 1 }, (_, k) => `<i class="${k < ((state.cards[c.id] || {}).box || 0) ? "on" : ""}"></i>`).join("")}</div>
        <div class="row" id="answer" hidden>
          <button class="btn bad" id="no">✗ Nochmal</button>
          <button class="btn good" id="yes">✓ Gewusst</button>
        </div>`);
      const flip = (e) => {
        if (e.target.closest("[data-audio]")) return; // Lautsprecher dreht die Karte nicht um
        document.getElementById("flash").classList.toggle("flipped");
        document.getElementById("answer").hidden = false;
      };
      document.getElementById("flash").onclick = flip;
      document.getElementById("flash").onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip(e); } };
      document.getElementById("yes").onclick = () => grade(c, true);
      document.getElementById("no").onclick = () => grade(c, false);
    }

    function grade(c, ok) {
      const s = state.cards[c.id] || { box: 0, due: 0, firstTry: true };
      queue.shift();
      if (ok) {
        if (s.firstTry !== false) right++;
        s.box = Math.min(s.box + 1, INTERVALS.length - 1);
        s.due = Date.now() + INTERVALS[s.box] * DAY - 3600000; // 1h Puffer, damit "morgen" wirklich morgen fällig ist
        delete s.firstTry;
        done++;
        if (topicId === "schwer" && state.miss[c.id]) { state.miss[c.id]--; if (!state.miss[c.id]) delete state.miss[c.id]; }
      } else {
        state.miss[c.id] = (state.miss[c.id] || 0) + 1;
        s.box = 0;
        s.due = 0;
        s.firstTry = false;
        queue.splice(Math.min(3, queue.length), 0, c); // kommt gleich nochmal
      }
      state.cards[c.id] = s;
      save();
      next();
    }
    next();
  }

  // ---------- Quiz ----------
  function viewQuizMenu() {
    const opts = D.topics.map((t) => `<option value="${t.id}">${t.icon} ${esc(t.title)}</option>`).join("");
    render("Quiz", `
      <div class="card">
        <h3>Thema</h3>
        <select id="qt" style="width:100%;padding:10px;font:inherit;border-radius:10px;margin-bottom:12px">
          <option value="all">Alle Themen</option>${opts}
        </select>
        <h3>Modus</h3>
        <div class="grid">
          <button class="tile" data-mode="lb-de"><div class="ico">🇱🇺→🇩🇪</div><b>Verstehen</b><small>Was bedeutet das?</small></button>
          <button class="tile" data-mode="de-lb"><div class="ico">🇩🇪→🇱🇺</div><b>Wiedererkennen</b><small>Wie sagt man das?</small></button>
          <button class="tile" data-mode="type"><div class="ico">⌨️</div><b>Schreiben</b><small>Selbst eintippen</small></button>
        </div>
      </div>
      <p class="muted">Ein Quiz hat 10 Fragen. Rechtschreibfehler bei Akzenten (é, ë, ä) werden beim Schreiben verziehen.</p>`);
    $view.querySelectorAll("[data-mode]").forEach((b) => {
      b.onclick = () => go(`#/quiz/${b.dataset.mode}/${document.getElementById("qt").value}`);
    });
  }

  function viewQuiz(mode, topicId) {
    const pool = topicId === "all" ? cards : cards.filter((c) => c.topic === topicId);
    if (pool.length < 4 || !["lb-de", "de-lb", "type"].includes(mode)) return go("#/quiz");
    const qs = shuffle(pool).slice(0, 10);
    let i = 0, score = 0;
    const key = `${mode}/${topicId}`;

    function ask() {
      if (i >= qs.length) {
        markActive("uebung");
        const best = Math.max(score, state.quizBest[key] || 0);
        state.quizBest[key] = best; save();
        render("Quiz", `<div class="card"><h2>${score >= 8 ? "Super! 🎉" : score >= 5 ? "Gutt! 👍" : "Weider üben! 💪"}</h2>
          <p>${score} von ${qs.length} richtig. Bestwert: ${best}/${qs.length}</p>
          <div class="row"><button class="btn" id="again">Nochmal</button><a class="btn secondary" href="#/quiz">Anderes Quiz</a></div></div>`);
        document.getElementById("again").onclick = () => { i = 0; score = 0; qs.splice(0, qs.length, ...shuffle(pool).slice(0, 10)); ask(); };
        return;
      }
      const c = qs[i];
      const head = `<div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div><p class="muted">Frage ${i + 1} / ${qs.length} · ${score} richtig</p>`;

      if (mode === "type") {
        render("Quiz – Schreiben", `${head}
          <div class="card"><div class="lang">Auf Lëtzebuergesch:</div><h2>${esc(c.de)}</h2>
          <form id="f"><input type="text" id="inp" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Antwort eintippen">
          <div class="row"><button class="btn secondary" type="button" id="skip">Weiß nicht</button><button class="btn" type="submit">Prüfen</button></div></form>
          <div id="fb"></div></div>`);
        const inp = document.getElementById("inp");
        inp.focus();
        const finish = (given) => {
          const ok = given !== null && normalize(given) === normalize(c.lb);
          if (ok) score++; else missed(c);
          document.getElementById("f").hidden = true;
          document.getElementById("fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Richtig wäre:"} <b>${esc(c.lb)}</b></div>
            <div class="row" style="align-items:center">${audioBtn(`c-${c.id}`, "Anhören")}<button class="btn" id="nx">Weiter</button></div>`;
          document.getElementById("nx").onclick = () => { i++; ask(); };
          document.getElementById("nx").focus();
        };
        document.getElementById("f").onsubmit = (e) => { e.preventDefault(); if (inp.value.trim()) finish(inp.value); };
        document.getElementById("skip").onclick = () => finish(null);
        return;
      }

      const toDe = mode === "lb-de";
      const field = toDe ? "de" : "lb";
      const distractors = shuffle(cards.filter((x) => x.id !== c.id && x[field] !== c[field] && (x.topic === c.topic || Math.random() < 0.15))).slice(0, 3);
      const options = shuffle([c, ...distractors]);
      render("Quiz", `${head}
        <div class="card"><div class="lang">${toDe ? "Was bedeutet:" : "Wie sagt man auf Lëtzebuergesch:"}</div>
        <h2>${esc(toDe ? c.lb : c.de)} ${toDe ? audioBtn(`c-${c.id}`) : ""}</h2>
        ${options.map((o) => `<button class="opt" data-id="${o.id}">${esc(o[field])}</button>`).join("")}
        <div id="fb"></div></div>`);
      $view.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          const ok = b.dataset.id === c.id;
          if (ok) score++; else missed(c);
          $view.querySelectorAll(".opt").forEach((x) => {
            x.disabled = true;
            if (x.dataset.id === c.id) x.classList.add("right");
            else if (x === b) x.classList.add("wrong");
          });
          document.getElementById("fb").innerHTML = `<div class="row" style="align-items:center">${toDe ? "" : audioBtn(`c-${c.id}`, "Anhören")}<button class="btn" id="nx">Weiter</button></div>`;
          document.getElementById("nx").onclick = () => { i++; ask(); };
        };
      });
    }
    ask();
  }

  // ---------- Sprechen ----------
  function viewSpeakList() {
    render("Sprechen üben", `
      <div class="card"><p>Im Sprechteil unterhalten sich die Prüfer mit dir über <b>alltägliche Themen</b>
      und du beschreibst ein <b>Bild</b>. Übe so: Frage lesen → laut antworten (am besten aufnehmen) → mit der Musterantwort vergleichen.</p>
      <div class="row"><a class="btn" href="#/sprechen/${D.speaking.findIndex((s) => s.images)}">🖼️ Bild beschreiben</a>
      <button class="btn red" id="rnd">🎲 Zufallsthema</button></div>
      <p class="muted" style="margin:10px 0 0">Ein Bild gibt es nur bei „Bild beschreiwen“ – bei den anderen Themen antwortest du frei auf die Fragen. Mit 🔊 hörst du die Aussprache.</p></div>
      <a class="tile star" style="margin-bottom:8px" href="#/ich"><b>⭐ Meine Vorstellung</b><small>${state.me ? "Dein persönlicher Text zum Auswendiglernen" : "Eigene Daten eintragen und persönlichen Text erstellen"}</small></a>
      ${D.speaking.map((s, i) => `<a class="tile" style="margin-bottom:8px" href="#/sprechen/${i}"><b>${s.images ? "🖼️ " : ""}${esc(s.topic)}</b><small>${s.images ? `${s.images.length} Bilder · ` : ""}${s.questions.length} Fragen</small></a>`).join("")}`);
    document.getElementById("rnd").onclick = () => go(`#/sprechen/${Math.floor(Math.random() * D.speaking.length)}`);
  }

  let activeRec = null, activeTimer = null;
  function stopMedia() {
    if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
    if (activeRec && activeRec.state !== "inactive") activeRec.stop();
    activeRec = null;
  }

  // Aufnahme mit Timer in ein Element einbauen. onDone(url) wird nach jeder Aufnahme aufgerufen.
  function mountRecorder(box, onDone) {
    const canRec = !!(navigator.mediaDevices && window.MediaRecorder);
    box.innerHTML = `<div class="timer">0:00</div>
      <div class="row"><button type="button" class="btn ${canRec ? "red" : ""}">${canRec ? "● Aufnehmen" : "▶︎ Timer starten"}</button></div>
      <div class="recplay"></div>${canRec ? "" : `<p class="muted">Aufnahme wird von diesem Browser nicht unterstützt.</p>`}`;
    const tm = box.querySelector(".timer"), btn = box.querySelector("button"), out = box.querySelector(".recplay");
    const startTimer = () => {
      const t0 = Date.now();
      tm.textContent = "0:00";
      activeTimer = setInterval(() => {
        const sec = Math.floor((Date.now() - t0) / 1000);
        tm.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      }, 250);
    };
    if (!canRec) {
      btn.onclick = () => {
        if (activeTimer) { stopMedia(); btn.textContent = "▶︎ Timer starten"; }
        else { startTimer(); btn.textContent = "■ Stopp"; }
      };
      return;
    }
    btn.onclick = async () => {
      if (activeRec) { stopMedia(); return; }
      stopAudio();
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { out.innerHTML = `<p class="feedback no">Kein Mikrofonzugriff. Bitte in den Einstellungen erlauben.</p>`; return; }
      const type = ["audio/mp4", "audio/webm", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
        btn.innerHTML = "● Neu aufnehmen";
        const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || type || "audio/webm" }));
        if (out.isConnected) out.innerHTML = `<audio controls src="${url}"></audio><p class="muted">Hör dir zu: Verstehst du dich selbst? Hast du ganze Sätze benutzt?</p>`;
        markActive("schwatzen");
        if (onDone) onDone(url);
      };
      rec.start();
      activeRec = rec;
      startTimer();
      btn.innerHTML = `<span class="rec-dot"></span> Stopp`;
    };
  }

  function viewSpeak(idx, imgIdx) {
    const s = D.speaking[idx];
    if (!s) return go("#/sprechen");
    // Bildbeschreibung: ein Bild auswählen (zufällig, wenn keines in der Adresse steht)
    let img = null;
    if (s.images) {
      if (!s.images[imgIdx]) imgIdx = Math.floor(Math.random() * s.images.length);
      img = s.images[imgIdx];
    }
    const model = img ? img.model : s.model;
    const modelDe = img ? img.de : s.de;
    render(s.topic, `
      ${img ? `<div class="card"><h3>Beschreibe dieses Bild</h3>
        <img class="scene" src="${img.src}" alt="${esc(img.alt)}">
        <a class="btn secondary" style="width:100%" href="#/sprechen/${idx}/${(imgIdx + 1) % s.images.length}">🔄 Anderes Bild (${imgIdx + 1}/${s.images.length})</a>
      </div>` : ""}
      <div class="card"><h3>Fragen der Prüfer</h3>
        <ul style="padding-left:20px;margin:0">${s.questions.map((q, j) => `<li style="margin-bottom:6px"><b>${esc(q)}</b> ${audioBtn(`sq-${idx}-${j}`)}</li>`).join("")}</ul>
      </div>
      <div class="card">
        <h3>Deine Antwort</h3>
        <p class="muted">Sprich 1–2 Minuten frei. Kurze, einfache Sätze reichen für A2!</p>
        <div id="recbox"></div>
      </div>
      ${idx === 0 ? (mySentences().length
        ? `<details class="card"><summary>⭐ Meine persönliche Vorstellung anzeigen</summary><p><b>${esc(mySentences().map((x) => x.lb).join(" "))}</b></p><a href="#/ich">Zum Lernmodus</a></details>`
        : `<a class="tile star" style="margin-bottom:12px" href="#/ich"><b>⭐ Meine Vorstellung</b><small>Erstelle deinen persönlichen Text statt der Musterantwort</small></a>`) : ""}
      <details class="card"><summary>Musterantwort anzeigen</summary>
        <p><b>${esc(model)}</b></p>
        ${audioBtn(img ? `sm-${idx}-${imgIdx}` : `sm-${idx}`, "Musterantwort anhören")}
        <p class="muted" style="margin-top:8px">${esc(modelDe)}</p>
      </details>
      <div class="row"><a class="btn secondary" href="#/sprechen">Alle Themen</a>
      <a class="btn secondary" href="#/sprechen/${(idx + 1) % D.speaking.length}">Nächstes Thema →</a></div>`);

    mountRecorder(document.getElementById("recbox"));
  }

  // ---------- Verstehen ----------
  function viewDialogList() {
    render("Verstehen", `
      <div class="card"><p>Der Hörteil ist auf <b>Niveau B1</b> – also etwas schwerer als der Sprechteil.
      Typisch sind kurze Gespräche, Durchsagen und Radiomeldungen mit Multiple-Choice-Fragen.</p>
      <p class="muted">Tipp: Lies zuerst die Fragen, dann höre den Text. Die Stimme hier ist computererzeugt – höre zusätzlich täglich RTL Radio oder Radio 100,7, um dich an echte Sprecher zu gewöhnen.</p></div>
      <a class="btn red" style="width:100%;margin-bottom:8px" href="#/simulation">🎓 Prüfungssimulation starten</a>
      ${VOICES.length >= 8 ? `<a class="btn" style="width:100%;margin-bottom:12px" href="#/stemmen">🗣️ Echte Stimmen: ${VOICES.length} Sätze von Muttersprachlern</a>` : ""}
      ${D.dialogues.map((d, i) => `<a class="tile" style="margin-bottom:8px" href="#/verstehen/${i}"><b>${esc(d.title)}</b> <span class="box-badge">${d.level || "A2"}</span><small>${d.questions.length} Fragen</small></a>`).join("")}`);
  }

  function viewDialog(idx) {
    const d = D.dialogues[idx];
    if (!d) return go("#/verstehen");
    render(d.title, `
      <div class="card">
        <p class="muted">Wie in der Prüfung: Lies zuerst die Fragen, dann höre den Text (am besten zweimal) – ohne mitzulesen.</p>
        ${audioBtn(`d-${idx}`, "Text anhören")}
        <details style="margin-top:12px"><summary><b>Text mitlesen</b></summary>
          <div style="margin-top:8px">${d.text.map((l) => `<p class="dialog-line">${esc(l)}</p>`).join("")}</div>
        </details>
      </div>
      ${d.questions.map((q, qi) => `<div class="card"><h3>${qi + 1}. ${esc(q.q)}</h3>
        ${q.options.map((o, oi) => `<button class="opt" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join("")}</div>`).join("")}
      <div id="res"></div>
      <div class="row"><a class="btn secondary" href="#/verstehen">Alle Texte</a>
      <a class="btn secondary" href="#/verstehen/${(idx + 1) % D.dialogues.length}">Nächster Text →</a></div>`);
    let answered = 0, right = 0;
    $view.querySelectorAll(".opt").forEach((b) => {
      b.onclick = () => {
        const q = d.questions[+b.dataset.q];
        const group = $view.querySelectorAll(`.opt[data-q="${b.dataset.q}"]`);
        group.forEach((x) => {
          x.disabled = true;
          if (+x.dataset.o === q.a) x.classList.add("right");
          else if (x === b) x.classList.add("wrong");
        });
        answered++;
        if (+b.dataset.o === q.a) right++;
        if (answered === d.questions.length) {
          markActive("heieren");
          document.getElementById("res").innerHTML = `<div class="feedback ${right === answered ? "ok" : "no"}">${right} von ${answered} richtig.</div>`;
        }
      };
    });
  }

  // ---------- Grammatik ----------
  function viewGrammar() {
    render("Grammatik", `<p class="muted">Nur das, was du für A2 wirklich brauchst.</p>
      ${D.grammar.map((g, i) => `<details class="card" ${i === 0 ? "open" : ""}><summary>${esc(g.title)}</summary>${g.body}</details>`).join("")}`);
  }

  // ---------- Prüfung ----------
  function viewExam() {
    render("Die Prüfung", `
      <div class="card"><h3>🎓 Was du für die Staatsbürgerschaft brauchst</h3>
        <p>Für die Einbürgerung (<i>naturalisation</i>) brauchst du u. a.:</p>
        <ol style="padding-left:20px">
          <li>den bestandenen <b>Sproochentest</b> (Luxemburgisch-Sprachtest) – <b>der Schwerpunkt dieser App</b>,</li>
          <li>den Kurs bzw. die Prüfung <b>„Vivre ensemble au Grand-Duché de Luxembourg“</b> (Grundrechte, Institutionen, Geschichte und Europa – als 24-Stunden-Kurs oder als Prüfung mit 40 Fragen, nicht auf Luxemburgisch). <a href="#/vivre">Zum Übungsquiz</a></li>
        </ol>
      </div>
      <div class="card"><h3>📋 Aufbau des Sproochentest</h3>
        <table>
          <tr><th>Teil</th><th>Niveau</th><th>Inhalt</th></tr>
          <tr><td>Mündlicher Ausdruck</td><td><b>A2</b></td><td>Gespräch mit Prüfern über Alltagsthemen (du, Familie, Arbeit, Wohnen, Freizeit …) und Bildbeschreibung</td></tr>
          <tr><td>Hörverstehen</td><td><b>B1</b></td><td>Hörtexte (Gespräche, Durchsagen, Radio) mit Multiple-Choice-Fragen</td></tr>
        </table>
        <p class="muted">Lesen und Schreiben werden <b>nicht</b> geprüft. Organisiert wird der Test vom <b>Institut national des langues (INL)</b>.
        Termine, Anmeldung, Gebühren und genaue Bestehensgrenzen ändern sich gelegentlich – bitte immer aktuell beim INL nachsehen.</p>
      </div>
      <div class="card"><h3>💡 Tipps für den Sprechteil</h3>
        <ul style="padding-left:20px">
          <li>Einfache, vollständige Sätze sind besser als komplizierte mit vielen Fehlern.</li>
          <li>Bereite eine <b>Selbstvorstellung</b> auswendig vor (Name, Herkunft, Familie, Arbeit, Wohnort, warum Luxemburgisch).</li>
          <li>Übe das <b>Perfekt</b>: „Leschte Weekend hunn ech …“ – Fragen nach der Vergangenheit kommen sicher.</li>
          <li>Wenn du nicht verstehst: <b>„Kënnt Dir dat widderhuelen, wann ech gelift?“</b> – das ist erlaubt!</li>
          <li>Lieber etwas sagen als schweigen. Erzähle von dir, mach Beispiele.</li>
        </ul>
      </div>
      <div class="card"><h3>🔗 Nützliche Quellen</h3>
        <ul style="padding-left:20px">
          <li><a href="https://www.inll.lu" target="_blank" rel="noopener">INL – Institut national des langues</a> (Anmeldung, Beispielprüfungen)</li>
          <li><a href="https://lod.lu" target="_blank" rel="noopener">LOD.lu</a> – offizielles Wörterbuch mit Aussprache</li>
          <li><a href="https://www.rtl.lu" target="_blank" rel="noopener">RTL.lu</a> – Nachrichten, Radio & Videos auf Luxemburgisch</li>
          <li><a href="https://guichet.public.lu" target="_blank" rel="noopener">Guichet.lu</a> – offizielle Infos zur Einbürgerung</li>
        </ul>
      </div>`);
  }

  // ---------- Mehr ----------
  function viewMore() {
    render("Mehr", `
      <div class="grid">
        <a class="tile" href="#/verstehen"><div class="ico">👂</div><b>Verstehen</b><small>Dialoge & Fragen</small></a>
        <a class="tile" href="#/grammatik"><div class="ico">📐</div><b>Grammatik</b><small>Das Nötigste für A2</small></a>
        <a class="tile" href="#/simulation"><div class="ico">⏱️</div><b>Prüfungssimulation</b><small>Kompletter Durchlauf</small></a>
        <a class="tile" href="#/zuelen"><div class="ico">🔢</div><b>Zahlen & Uhrzeit</b><small>Hörtraining</small></a>
        <a class="tile" href="#/schwer"><div class="ico">🔥</div><b>Schwierige Wörter</b><small>${hardCards().length} gesammelt</small></a>
        <a class="tile" href="#/stemmen"><div class="ico">🗣️</div><b>Echte Stimmen</b><small>Sätze von Muttersprachlern</small></a>
        <a class="tile" href="#/satzbau"><div class="ico">🧩</div><b>Satzbau</b><small>Sätze zusammensetzen</small></a>
        <a class="tile" href="#/verben"><div class="ico">🔤</div><b>Verben</b><small>Gegenwart & Perfekt</small></a>
        <a class="tile" href="#/vivre"><div class="ico">🇱🇺</div><b>Vivre ensemble</b><small>Landeskunde-Quiz</small></a>
        <a class="tile" href="#/pruefliste"><div class="ico">📝</div><b>Prüfliste</b><small>Alle Texte zum Gegenlesen</small></a>
        <a class="tile" href="#/pruefung"><div class="ico">🎓</div><b>Die Prüfung</b><small>Ablauf, Tipps, Links</small></a>
        <a class="tile" href="#/profil"><div class="ico">👤</div><b>Mein Profil</b><small>${esc(activeProfile().name)}</small></a>
      </div>
      <div class="card" style="margin-top:12px"><h3>Fortschritt${activeProfile().name ? " von " + esc(activeProfile().name) : ""}</h3>
        <p class="muted">Der Fortschritt wird nur auf diesem Gerät gespeichert. Mit „Sichern“ erhältst du eine Datei, die du auf einem neuen Gerät wiederherstellen kannst.</p>
        <div class="row">
          <button class="btn secondary" id="exp">Sichern</button>
          <label class="btn secondary">Wiederherstellen<input type="file" id="imp" accept="application/json" hidden></label>
          <button class="btn bad" id="reset">Zurücksetzen</button>
        </div>
      </div>
      <div class="card"><h3>Aussprache offline</h3>
        <p class="muted">Die Audiodateien (ca. 11 MB) werden beim ersten Anhören gespeichert. Hier kannst du alle auf einmal laden, damit die Aussprache auch ohne Internet funktioniert.</p>
        <button class="btn secondary" id="dl" style="width:100%">Alle Audios herunterladen</button>
      </div>
      <p class="muted">Einzelne Wörter hörst du als <b>echte Aufnahmen</b> aus dem <a href="https://lod.lu" target="_blank" rel="noopener">Lëtzebuerger Online Dictionnaire (LOD.lu)</a> des Zenter fir d'Lëtzebuerger Sprooch (CC0).
      Ganze Sätze, Musterantworten und Hörtexte spricht eine computererzeugte luxemburgische Stimme (Piper „MaryLux“) – gut verständlich, aber nicht perfekt.</p>`);
    document.getElementById("dl").onclick = async (e) => {
      const b = e.target, keys = audioKeys();
      b.disabled = true;
      let ok = 0;
      for (let n = 0; n < keys.length; n += 6) {
        const res = await Promise.all(keys.slice(n, n + 6).map((k) => fetch(`audio/${k}.mp3`).then((r) => r.ok && r.blob().then(() => true)).catch(() => false)));
        ok += res.filter(Boolean).length;
        b.textContent = `Lade … ${Math.min(n + 6, keys.length)} / ${keys.length}`;
      }
      b.textContent = ok === keys.length ? "✓ Alle Audios gespeichert" : `${ok} von ${keys.length} geladen – bitte mit Internet erneut versuchen`;
      b.disabled = ok === keys.length;
    };
    document.getElementById("exp").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: "application/json" }));
      a.download = `moien-letzebuerg-fortschritt-${today()}.json`;
      a.click();
    };
    document.getElementById("imp").onchange = async (e) => {
      try {
        const s = JSON.parse(await e.target.files[0].text());
        if (!s.cards) throw new Error();
        state = Object.assign(emptyState(), s); save(); alert("Fortschritt wiederhergestellt."); go("#/");
      } catch (err) { alert("Diese Datei konnte nicht gelesen werden."); }
    };
    document.getElementById("reset").onclick = () => {
      if (confirm("Wirklich den gesamten Lernfortschritt löschen?")) {
        state = emptyState(); save(); go("#/");
      }
    };
  }

  // ---------- Meine Vorstellung ----------
  const mySentences = () => (state.me ? ME.build(Object.assign({ name: activeProfile().name }, state.me)) : []);

  function viewMe() {
    const sents = mySentences();
    if (!sents.length) {
      return render("Meine Vorstellung", `<div class="card">
        <h2>Deine persönliche Vorstellung ⭐</h2>
        <p>Im Sprechteil wirst du fast sicher nach dir selbst gefragt: Name, Herkunft, Familie, Arbeit, Wohnort.</p>
        <p>Trag hier deine Daten ein – die App baut daraus <b>deinen eigenen Text auf Luxemburgisch</b> mit Übersetzung. Den kannst du auswendig lernen, ausdrucken oder als Datei speichern.</p>
        <a class="btn" style="width:100%" href="#/ich/daten">Meine Daten eintragen</a></div>`);
    }
    const hide = !!state.meHide;
    render("Meine Vorstellung", `
      <div class="card noprint">
        <label style="display:flex;gap:10px;align-items:center">
          <input type="checkbox" id="hide" ${hide ? "checked" : ""}>
          <span><b>Auswendig-Modus</b><br><small class="muted">Luxemburgisch verdecken – erst selbst sagen, dann antippen zum Prüfen</small></span>
        </label>
      </div>
      <div class="card" id="mytext">
        <h2 class="printonly">Meng Virstellung – ${esc(activeProfile().name)}</h2>
        ${sents.map((s) => `<div class="sent${hide ? " hide" : ""}"><div class="lb">${esc(s.lb)}</div><div class="de">${esc(s.de)}</div></div>`).join("")}
      </div>
      <div class="card noprint">
        <div class="row">
          <button class="btn" id="file">📄 Als Datei speichern</button>
          <button class="btn secondary" id="print">🖨️ Drucken / PDF</button>
        </div>
        <div class="row" style="margin-top:8px">
          <a class="btn secondary" href="#/ich/daten">✏️ Daten ändern</a>
          <a class="btn secondary" href="#/sprechen/0">🎙️ Aufnehmen</a>
        </div>
        <a class="btn red" style="width:100%;margin-top:8px" href="#/ich/froen">💬 Rückfragen der Prüfer üben</a>
      </div>
      <p class="muted noprint">Der Text wird automatisch aus geprüften Bausteinen zusammengesetzt. Lass ihn trotzdem einmal von einer Lehrkraft oder einem Muttersprachler gegenlesen – und ergänze dort, was dich besonders macht. Für diesen Text gibt es keine Aussprache-Aufnahme; die einzelnen Wörter kannst du auf LOD.lu anhören.</p>`);
    document.getElementById("hide").onchange = (e) => { state.meHide = e.target.checked; save(); route(); };
    $view.querySelectorAll(".sent").forEach((el) => { el.onclick = () => el.classList.toggle("hide", false); });
    document.getElementById("print").onclick = () => window.print();
    document.getElementById("file").onclick = () => {
      const name = activeProfile().name;
      const html = `<!doctype html><html lang="lb"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Meng Virstellung – ${esc(name)}</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:24px auto;padding:0 16px;line-height:1.5;color:#1c2430}
h1{font-size:1.4rem;border-bottom:3px solid #00a1de;padding-bottom:6px}h2{font-size:1.05rem;margin-top:28px}
.s{margin:0 0 14px}.lb{font-size:1.15rem;font-weight:600}.de{color:#5f6b7a}.full{background:#f4f6f8;padding:12px 14px;border-radius:8px;font-size:1.1rem}
small{color:#5f6b7a}</style></head><body>
<h1>Meng Virstellung – ${esc(name)}</h1>
<p><small>Meine Vorstellung für den Sproochentest · Sprechen, Niveau A2</small></p>
<h2>Satz für Satz</h2>
${sents.map((s) => `<p class="s"><span class="lb">${esc(s.lb)}</span><br><span class="de">${esc(s.de)}</span></p>`).join("\n")}
<h2>Der ganze Text zum Auswendiglernen</h2>
<p class="full">${esc(sents.map((s) => s.lb).join(" "))}</p>
<h2>Tipps</h2>
<ul><li>Lerne zwei bis drei Sätze pro Tag und wiederhole die alten.</li><li>Sprich laut und nimm dich auf.</li>
<li>Die Prüfer stellen Rückfragen – übe auch, einzelne Sätze frei zu variieren.</li></ul>
</body></html>`;
      const fname = "meng-virstellung.html";
      let file = null;
      try { file = new File([html], fname, { type: "text/html" }); } catch (err) { /* alter Browser */ }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "Meng Virstellung" }).catch(() => {});
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(new Blob([html], { type: "text/html" }));
        link.download = fname;
        link.click();
      }
    };
  }

  function viewMeForm() {
    const d = Object.assign({ name: activeProfile().name, langs: [], hobbies: [], likes: [], reasons: [] }, state.me);
    const text = (k, label, ph, extra = "") => `<label class="field"><span>${label}</span><input type="text" name="${k}" value="${esc(d[k] || "")}" placeholder="${esc(ph || "")}" maxlength="40" ${extra}></label>`;
    const number = (k, label, max) => `<label class="field"><span>${label}</span><input type="number" name="${k}" value="${esc(d[k] === undefined ? "" : d[k])}" min="0" max="${max}" inputmode="numeric"></label>`;
    const select = (k, label, opts) => `<label class="field"><span>${label}</span><select name="${k}"><option value="">– keine Angabe –</option>${opts.map(([v, t]) => `<option value="${esc(v)}" ${d[k] === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></label>`;
    const checks = (k, label, opts) => `<fieldset class="field"><legend>${label}</legend><div class="chips">${opts.map(([v, t]) => `<label><input type="checkbox" name="${k}" value="${esc(v)}" ${(d[k] || []).includes(v) ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div></fieldset>`;
    render("Meine Daten", `
      <p class="muted">Fülle aus, was auf dich zutrifft – alles ist freiwillig und bleibt auf diesem Gerät. Leere Felder werden im Text einfach weggelassen.</p>
      <form id="meform">
        <div class="card"><h3>Über mich</h3>
          ${text("name", "Name", "Vor- und Nachname")}
          ${number("age", "Alter", 99)}
          ${select("country", "Herkunftsland", ME.COUNTRIES.map((c) => [c[0], c[2].replace(/^(der|den|dem) /, "")]))}
          ${text("countryOther", "Anderes Land (falls nicht in der Liste)", "auf Luxemburgisch oder Deutsch")}
        </div>
        <div class="card"><h3>Wohnen</h3>
          ${text("town", "Wohnort", "z. B. Esch, Diekirch, Luxemburg")}
          ${number("years", "Seit wie vielen Jahren in Luxemburg?", 99)}
          ${select("home", "Ich wohne …", ME.HOME)}
          ${select("livesWith", "… mit wem?", ME.WITH)}
        </div>
        <div class="card"><h3>Familie</h3>
          ${select("status", "Beziehungsstatus", ME.STATUS)}
          ${select("kids", "Kinder", [["yes", "Ich habe Kinder"], ["none", "Ich habe keine Kinder"]])}
          <div class="row">${number("sons", "Söhne", 9)}${number("daughters", "Töchter", 9)}</div>
        </div>
        <div class="card"><h3>Arbeit</h3>
          ${select("work", "Situation", ME.WORK)}
          ${text("job", "Beruf (luxemburgisch oder französisch)", "z. B. Verkeeferin, Infirmier, Comptabel", 'list="jobs"')}
          <datalist id="jobs">${ME.JOBS.map((j) => `<option value="${esc(j)}">`).join("")}</datalist>
          ${text("employer", "Arbeitgeber", "z. B. Cactus, enger Bank, der Gemeng")}
          ${text("workplace", "Arbeitsort", "z. B. Kirchberg, Luxemburg")}
        </div>
        <div class="card"><h3>Sprachen</h3>
          ${select("mother", "Muttersprache", ME.LANGS)}
          ${checks("langs", "Ich spreche außerdem", ME.LANGS)}
        </div>
        <div class="card"><h3>Freizeit & Luxemburg</h3>
          ${checks("hobbies", "Hobbys", ME.HOBBIES)}
          ${checks("likes", "Was gefällt dir in Luxemburg?", ME.LIKES)}
          ${checks("reasons", "Warum lernst du Luxemburgisch?", ME.REASONS)}
        </div>
        <button class="btn" type="submit" style="width:100%">Vorstellung erstellen</button>
      </form>`);
    document.getElementById("meform").onsubmit = (e) => {
      e.preventDefault();
      const fd = new FormData(e.target), me = {};
      ["name", "age", "country", "countryOther", "town", "years", "home", "livesWith", "status", "kids", "sons", "daughters", "work", "job", "employer", "workplace", "mother"]
        .forEach((k) => { const v = String(fd.get(k) || "").replace(/\s+/g, " ").trim(); if (v) me[k] = v; });
      ["langs", "hobbies", "likes", "reasons"].forEach((k) => { me[k] = fd.getAll(k); });
      if (me.kids === "none") { delete me.sons; delete me.daughters; }
      state.me = me;
      save();
      go("#/ich");
    };
  }

  // ---------- Rückfragen zur Vorstellung ----------
  function myFollowups() {
    const d = state.me || {};
    const has = {
      always: true, country: !!(d.country || d.countryOther), kids: d.kids !== "none" && !!(+d.sons || +d.daughters || d.kids === "yes"),
      partner: ["bestuet", "partner", "partnerin"].includes(d.status), work: d.work === "schaffen", town: !!(d.town || d.home),
      hobbies: (d.hobbies || []).length > 0, langs: !!d.mother || (d.langs || []).length > 0
    };
    return D.followups.filter((f) => has[f.when]);
  }

  function viewFollowups(id) {
    const list = myFollowups();
    const f = list.find((x) => x.id === id) || list[Math.floor(Math.random() * list.length)];
    const next = list[(list.indexOf(f) + 1) % list.length];
    render("Rückfragen", `
      <p class="muted">Nach deiner Vorstellung haken die Prüfer nach. ${state.me ? "Die Fragen passen zu deinen Angaben." : `Trag unter <a href="#/ich/daten">Meine Daten</a> deine Angaben ein, dann kommen passende Fragen dazu.`}</p>
      <div class="card">
        <div class="lang">Frage ${list.indexOf(f) + 1} von ${list.length}</div>
        <h2>${esc(f.q)} ${audioBtn(`fq-${f.id}`)}</h2>
        <details><summary>Übersetzung & Satzanfang</summary>
          <p class="muted" style="margin-top:8px">${esc(f.de)}</p>
          <p class="ex">${esc(f.start)}</p></details>
      </div>
      <div class="card"><h3>Deine Antwort</h3>
        <p class="muted">Antworte in zwei bis drei ganzen Sätzen.</p>
        <div id="recbox"></div></div>
      <div class="row"><a class="btn secondary" href="#/ich">Meine Vorstellung</a>
        <a class="btn" href="#/ich/froen/${next.id}">Nächste Frage →</a></div>
      <details class="card" style="margin-top:12px"><summary>Alle ${list.length} Fragen</summary>
        <ul class="wordlist">${list.map((x) => `<li><div>${audioBtn(`fq-${x.id}`)} <a href="#/ich/froen/${x.id}"><b>${esc(x.q)}</b></a></div></li>`).join("")}</ul></details>`);
    mountRecorder(document.getElementById("recbox"));
  }

  // ---------- Zahlen, Uhrzeiten, Preise ----------
  function viewNumbersMenu() {
    render("Zahlen & Uhrzeit", `
      <div class="card"><p>Im Hörteil kommen ständig Zahlen, Uhrzeiten und Preise vor – und genau danach wird gefragt.
      Hier hörst du eine Angabe und wählst die richtige aus.</p>
      <p class="muted">Achtung: Wie im Deutschen kommt die Einerstelle zuerst – „fënnefandrësseg“ ist 35, nicht 53.</p></div>
      <div class="grid">${TRAIN.sets.map((s) => `<a class="tile" href="#/zuelen/${s.id}"><div class="ico">${s.icon}</div><b>${esc(s.title)}</b>
        <small>${state.quizBest["zuelen/" + s.id] !== undefined ? `Bestwert ${state.quizBest["zuelen/" + s.id]}/10` : `${s.items.length} Aufgaben`}</small></a>`).join("")}</div>`);
  }

  function viewNumbers(setId) {
    const set = TRAIN.sets.find((s) => s.id === setId);
    if (!set) return go("#/zuelen");
    const qs = shuffle(set.items).slice(0, 10);
    let i = 0, score = 0;
    // Verwechselbare Antworten: Zahlendreher und Nachbarn
    function options(it) {
      const others = set.items.filter((x) => x.show !== it.show);
      const flip = others.find((x) => x.show.replace(/\D/g, "") === it.show.replace(/\D/g, "").split("").reverse().join(""));
      const near = others.slice().sort((x, y) => Math.abs(x.val - it.val) - Math.abs(y.val - it.val)).slice(0, 8);
      const picked = [];
      if (flip) picked.push(flip);
      shuffle(near).forEach((x) => { if (picked.length < 3 && !picked.includes(x)) picked.push(x); });
      return shuffle([it, ...picked]);
    }
    function ask(autoplay) {
      if (i >= qs.length) {
        markActive("heieren");
        const key = "zuelen/" + set.id;
        state.quizBest[key] = Math.max(score, state.quizBest[key] || 0); save();
        render(set.title, `<div class="card"><h2>${score >= 8 ? "Super! 🎉" : score >= 5 ? "Gutt! 👍" : "Weider üben! 💪"}</h2>
          <p>${score} von ${qs.length} richtig. Bestwert: ${state.quizBest[key]}/10</p>
          <div class="row"><a class="btn" href="#/zuelen/${set.id}" id="again">Nochmal</a><a class="btn secondary" href="#/zuelen">Andere Übung</a></div></div>`);
        document.getElementById("again").onclick = (e) => { e.preventDefault(); route(); };
        return;
      }
      const it = qs[i];
      render(set.title, `<div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
        <p class="muted">Aufgabe ${i + 1} / ${qs.length} · ${score} richtig</p>
        <div class="card" style="text-align:center"><div class="lang">Was hörst du?</div>
          <p>${audioBtn(it.key, "Anhören")}</p>
          <div class="grid two">${options(it).map((o) => `<button class="opt big" data-k="${o.key}">${esc(o.show)}</button>`).join("")}</div>
          <div id="fb"></div></div>`);
      const snd = $view.querySelector(".snd");
      if (autoplay) play(it.key, snd);
      $view.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          const ok = b.dataset.k === it.key;
          if (ok) score++;
          $view.querySelectorAll(".opt").forEach((x) => {
            x.disabled = true;
            if (x.dataset.k === it.key) x.classList.add("right"); else if (x === b) x.classList.add("wrong");
          });
          document.getElementById("fb").innerHTML = `<p style="margin-top:8px"><b>${esc(it.lb)}</b></p><button class="btn" id="nx" style="width:100%">Weiter</button>`;
          document.getElementById("nx").onclick = () => { i++; ask(true); };
        };
      });
    }
    ask(false);
  }

  // ---------- Prüfungssimulation ----------
  function viewSim() {
    const b1 = D.dialogues.map((d, i) => i).filter((i) => D.dialogues[i].level === "B1");
    const texts = shuffle(b1).slice(0, 3);
    const imgTopic = D.speaking.findIndex((s) => s.images);
    const talkIdx = shuffle(D.speaking.map((s, i) => i).filter((i) => i !== imgTopic))[0];
    const imgIdx = Math.floor(Math.random() * D.speaking[imgTopic].images.length);
    const answers = texts.map((t) => D.dialogues[t].questions.map(() => -1));
    const recs = {};

    function intro() {
      render("Prüfungssimulation", `
        <div class="card"><h2>Prüfungssimulation 🎓</h2>
          <p>Ein kompletter Durchlauf wie am Prüfungstag, ca. 15 Minuten:</p>
          <ol style="padding-left:20px">
            <li><b>Hörverstehen:</b> 3 Texte auf Niveau B1. Jeden Text kannst du <b>höchstens zweimal</b> hören, mitlesen geht nicht.</li>
            <li><b>Sprechen:</b> Fragen zu einem Alltagsthema und eine Bildbeschreibung. Du nimmst dich auf und bewertest dich danach selbst.</li>
          </ol>
          <p class="muted">Such dir einen ruhigen Ort und beantworte alles ohne Hilfe. Das ist eine Übung – Ablauf, Dauer und Bewertung der echten Prüfung legt das INL fest.</p>
          <button class="btn red" id="go" style="width:100%">Simulation starten</button>
        </div>
        ${state.sims.length ? `<div class="card"><h3>Bisherige Durchläufe</h3><ul class="wordlist">${state.sims.slice().reverse().map((s) =>
          `<li><div>${esc(s.d.split("-").reverse().join("."))}</div><span>Hören ${s.r}/${s.t} · ${Math.round((s.r / s.t) * 100)} %</span></li>`).join("")}</ul></div>` : ""}`);
      document.getElementById("go").onclick = () => listen(0);
    }

    function listen(n) {
      const di = texts[n], d = D.dialogues[di];
      let left = 2, playing = false;
      render("Simulation · Hören", `
        <div class="bar"><i style="width:${(n / 5) * 100}%"></i></div>
        <p class="muted">Teil 1 · Text ${n + 1} von ${texts.length}</p>
        <div class="card"><p class="muted">Lies zuerst die Fragen. Dann höre den Text.</p>
          <button class="btn" id="pl" style="width:100%">▶︎ Text anhören (noch 2×)</button></div>
        ${d.questions.map((q, qi) => `<div class="card"><h3>${qi + 1}. ${esc(q.q)}</h3>
          ${q.options.map((o, oi) => `<button class="opt" data-q="${qi}" data-o="${oi}">${esc(o)}</button>`).join("")}</div>`).join("")}
        <button class="btn" id="nx" style="width:100%">${n + 1 < texts.length ? "Nächster Text →" : "Weiter zum Sprechen →"}</button>`);
      const pl = document.getElementById("pl");
      const label = () => { pl.textContent = left ? `▶︎ Text anhören (noch ${left}×)` : "Text wurde zweimal gehört"; pl.disabled = !left; };
      pl.onclick = () => {
        if (playing || !left) return;
        stopAudio();
        playing = true; left--;
        pl.disabled = true; pl.textContent = "🔊 Text läuft …";
        player.src = `audio/d-${di}.mp3`;
        const done = () => { playing = false; player.removeEventListener("ended", done); player.removeEventListener("error", done); if (pl.isConnected) label(); };
        player.addEventListener("ended", done); player.addEventListener("error", done);
        player.play().catch(done);
      };
      $view.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          $view.querySelectorAll(`.opt[data-q="${b.dataset.q}"]`).forEach((x) => x.classList.toggle("sel", x === b));
          answers[n][+b.dataset.q] = +b.dataset.o;
        };
      });
      document.getElementById("nx").onclick = () => { stopAudio(); n + 1 < texts.length ? listen(n + 1) : talk(); };
    }

    function talk() {
      const s = D.speaking[talkIdx];
      render("Simulation · Sprechen", `
        <div class="bar"><i style="width:60%"></i></div>
        <p class="muted">Teil 2 · Gespräch zum Thema „${esc(s.topic)}“</p>
        <div class="card"><h3>Fragen der Prüfer</h3>
          <p class="muted">Höre die Fragen an und beantworte alle nacheinander in einer Aufnahme (1–2 Minuten).</p>
          <ul style="padding-left:20px;margin:0">${s.questions.map((q, j) => `<li style="margin-bottom:6px"><b>${esc(q)}</b> ${audioBtn(`sq-${talkIdx}-${j}`)}</li>`).join("")}</ul></div>
        <div class="card"><h3>Deine Antwort</h3><div id="recbox"></div></div>
        <button class="btn" id="nx" style="width:100%">Weiter zur Bildbeschreibung →</button>`);
      mountRecorder(document.getElementById("recbox"), (url) => { recs.talk = url; });
      document.getElementById("nx").onclick = () => { stopMedia(); stopAudio(); picture(); };
    }

    function picture() {
      const img = D.speaking[imgTopic].images[imgIdx];
      render("Simulation · Sprechen", `
        <div class="bar"><i style="width:80%"></i></div>
        <p class="muted">Teil 2 · Bildbeschreibung</p>
        <div class="card"><h3>Beschreibe dieses Bild</h3>
          <img class="scene" src="${img.src}" alt="${esc(img.alt)}">
          <p class="muted">Was siehst du? Was machen die Leute? Wie ist das Wetter? Machst du das auch? (ca. 1 Minute)</p>
          <div id="recbox"></div></div>
        <button class="btn red" id="nx" style="width:100%">Simulation beenden und auswerten</button>`);
      mountRecorder(document.getElementById("recbox"), (url) => { recs.pic = url; });
      document.getElementById("nx").onclick = () => { stopMedia(); result(); };
    }

    function result() {
      let right = 0, total = 0;
      const blocks = texts.map((di, n) => {
        const d = D.dialogues[di];
        const rows = d.questions.map((q, qi) => {
          const ok = answers[n][qi] === q.a; total++; if (ok) right++;
          return `<li><div>${ok ? "✅" : "❌"} ${esc(q.q)}${ok ? "" : `<br><small class="muted">Richtig: ${esc(q.options[q.a])}${answers[n][qi] >= 0 ? ` · deine Antwort: ${esc(q.options[answers[n][qi]])}` : " · nicht beantwortet"}</small>`}</div></li>`;
        }).join("");
        return `<div class="card"><h3>${esc(d.title)}</h3><ul class="wordlist">${rows}</ul>
          <details style="margin-top:8px"><summary>Text nachlesen und nochmal hören</summary>
            <div style="margin:8px 0">${d.text.map((l) => `<p class="dialog-line">${esc(l)}</p>`).join("")}</div>${audioBtn(`d-${di}`, "Anhören")}</details></div>`;
      }).join("");
      const pct = Math.round((right / total) * 100);
      state.sims.push({ d: today(), r: right, t: total });
      state.sims = state.sims.slice(-20);
      save(); markActive("sim");
      const s = D.speaking[talkIdx], img = D.speaking[imgTopic].images[imgIdx];
      const check = ["Ich habe auf alle Fragen geantwortet.", "Ich habe ganze Sätze benutzt.", "Ich habe ohne lange Pausen gesprochen.", "Ich habe auch die Vergangenheit benutzt (Ech hunn … / Ech sinn …).", "Beim Bild habe ich Ort, Personen, Tätigkeiten und Wetter genannt."];
      render("Simulation · Ergebnis", `
        <div class="card"><h2>Hörverstehen: ${right} von ${total} (${pct} %)</h2>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <p>${pct >= 75 ? "Sehr gut – auf diesem Niveau bist du für den Hörteil gut vorbereitet. 🎉" : pct >= 50 ? "Solide Basis. Übe weiter mit den B1-Texten und dem Zahlen-Training." : "Der Hörteil braucht noch Übung: täglich einen B1-Text hören und zusätzlich Radio."}</p>
          <p class="muted">Die offizielle Bestehensgrenze legt das INL fest – nimm den Wert als Orientierung.</p></div>
        ${blocks}
        <div class="card"><h2>Sprechen: Selbsteinschätzung</h2>
          ${recs.talk ? `<p><b>Gespräch „${esc(s.topic)}“</b></p><audio controls src="${recs.talk}"></audio>` : `<p class="muted">Gespräch: keine Aufnahme.</p>`}
          <details style="margin:8px 0 14px"><summary>Musterantwort vergleichen</summary><p style="margin-top:8px"><b>${esc(s.model)}</b></p>${audioBtn(`sm-${talkIdx}`, "Anhören")}<p class="muted" style="margin-top:8px">${esc(s.de)}</p></details>
          ${recs.pic ? `<p><b>Bildbeschreibung</b></p><audio controls src="${recs.pic}"></audio>` : `<p class="muted">Bildbeschreibung: keine Aufnahme.</p>`}
          <details style="margin:8px 0 14px"><summary>Musterantwort vergleichen</summary><p style="margin-top:8px"><b>${esc(img.model)}</b></p>${audioBtn(`sm-${imgTopic}-${imgIdx}`, "Anhören")}<p class="muted" style="margin-top:8px">${esc(img.de)}</p></details>
          <h3>Hör dir deine Aufnahmen an und hake ab:</h3>
          ${check.map((c) => `<label style="display:flex;gap:10px;margin-bottom:8px"><input type="checkbox"><span>${c}</span></label>`).join("")}
        </div>
        <div class="row"><a class="btn" href="#/simulation" id="again">Neue Simulation</a><a class="btn secondary" href="#/">Start</a></div>`);
      document.getElementById("again").onclick = (e) => { e.preventDefault(); route(); };
    }
    intro();
  }

  // ---------- Echte Stimmen: Lückentext zum Hören ----------
  const capFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  // LOD trennt "d'" als eigenes Wort ab – beim Zusammensetzen wieder anhängen: d' Vakanz → d'Vakanz
  const voiceText = (v, gap) => capFirst(v.t.map((w, i) => (gap && i === v.hw ? "_____" : w)).join(" ").replace(/(['’]) /g, "$1")) + ".";

  function viewVoices() {
    if (VOICES.length < 8) return go("#/verstehen");
    const qs = shuffle(VOICES).slice(0, 10);
    let i = 0, score = 0;
    function ask(autoplay) {
      if (i >= qs.length) {
        markActive("heieren");
        state.quizBest.stemmen = Math.max(score, state.quizBest.stemmen || 0); save();
        render("Echte Stimmen", `<div class="card"><h2>${score >= 8 ? "Super! 🎉" : score >= 5 ? "Gutt! 👍" : "Weider üben! 💪"}</h2>
          <p>${score} von ${qs.length} richtig. Bestwert: ${state.quizBest.stemmen}/10</p>
          <div class="row"><a class="btn" href="#/stemmen" id="again">Nochmal</a><a class="btn secondary" href="#/verstehen">Zurück</a></div></div>`);
        document.getElementById("again").onclick = (e) => { e.preventDefault(); route(); };
        return;
      }
      const v = qs[i], word = v.t[v.hw];
      const upper = /^[A-ZÄÉËÖÜ]/.test(word);
      // falsche Antworten: Stichwörter anderer Sätze mit gleicher Groß-/Kleinschreibung …
      // … bevorzugt ähnlich klingende: gleicher Anfangsbuchstabe, ähnliche Länge
      const close = (w) => (w[0].toLowerCase() === word[0].toLowerCase() ? 0 : 3) + Math.abs(w.length - word.length);
      const pool = [...new Set(VOICES.map((x) => x.t[x.hw]))].filter((w) => w !== word && /^[A-ZÄÉËÖÜ]/.test(w) === upper);
      const others = shuffle(pool.sort((x, y) => close(x) - close(y)).slice(0, 7)).slice(0, 3);
      render("Echte Stimmen", `<div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
        <p class="muted">Satz ${i + 1} / ${qs.length} · ${score} richtig</p>
        <div class="card"><div class="lang">Höre den Satz. Welches Wort fehlt?</div>
          <p style="text-align:center">${audioBtn(v.key, "Anhören")}</p>
          <h2 id="gap">${esc(voiceText(v, true))}</h2>
          ${shuffle([word, ...others]).map((o) => `<button class="opt" data-w="${esc(o)}">${esc(o)}</button>`).join("")}
          <div id="fb"></div></div>`);
      if (autoplay) play(v.key, $view.querySelector(".snd"));
      $view.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          const ok = b.dataset.w === word;
          if (ok) score++;
          $view.querySelectorAll(".opt").forEach((x) => {
            x.disabled = true;
            if (x.dataset.w === word) x.classList.add("right"); else if (x === b) x.classList.add("wrong");
          });
          document.getElementById("gap").textContent = voiceText(v);
          document.getElementById("fb").innerHTML = `<p class="muted">${esc(v.lemma)} = ${esc(v.de)}</p><button class="btn" id="nx" style="width:100%">Weiter</button>`;
          document.getElementById("nx").onclick = () => { i++; ask(true); };
        };
      });
    }
    ask(false);
  }

  // ---------- Satzbau ----------
  const buildSources = {
    de: () => cards.filter((c) => !/[…/]/.test(c.lb) && c.lb.split(" ").length >= 4 && c.lb.split(" ").length <= 9)
      .map((c) => ({ words: c.lb.split(" "), de: c.de, audio: `c-${c.id}` })),
    lauschteren: () => VOICES.map((v) => ({ words: voiceText(v).split(" "), audio: v.key, note: `${v.lemma} = ${v.de}`, listen: true })),
    ech: () => mySentences().filter((s) => s.lb.split(" ").length >= 4 && s.lb.split(" ").length <= 10).map((s) => ({ words: s.lb.split(" "), de: s.de }))
  };

  function viewBuildMenu() {
    const n = { de: buildSources.de().length, lauschteren: buildSources.lauschteren().length, ech: buildSources.ech().length };
    render("Satzbau", `
      <div class="card"><p>Tippe die Wörter in der richtigen Reihenfolge an. So übst du den Satzbau, den du beim Sprechen brauchst –
      vor allem die Stellung des Verbs.</p></div>
      <div class="grid">
        <a class="tile" href="#/satzbau/de"><div class="ico">🇩🇪→🇱🇺</div><b>Übersetzen</b><small>Deutscher Satz → auf Luxemburgisch bauen (${n.de} Sätze)</small></a>
        ${n.lauschteren ? `<a class="tile" href="#/satzbau/lauschteren"><div class="ico">👂</div><b>Hören & bauen</b><small>Echte Aufnahme hören und Satz zusammensetzen (${n.lauschteren} Sätze)</small></a>` : ""}
        <a class="tile" href="${n.ech ? "#/satzbau/ech" : "#/ich"}"><div class="ico">⭐</div><b>Meine Vorstellung</b><small>${n.ech ? `Deine eigenen Sätze bauen (${n.ech})` : "Erst eigene Daten eintragen"}</small></a>
      </div>`);
  }

  function viewBuild(mode) {
    if (!buildSources[mode]) return go("#/satzbau");
    const all = buildSources[mode]();
    if (!all.length) return go("#/satzbau");
    const qs = shuffle(all).slice(0, 8);
    let i = 0, score = 0;
    function ask(autoplay) {
      if (i >= qs.length) {
        markActive("uebung");
        render("Satzbau", `<div class="card"><h2>${score >= qs.length - 1 ? "Super! 🎉" : score >= qs.length / 2 ? "Gutt! 👍" : "Weider üben! 💪"}</h2>
          <p>${score} von ${qs.length} Sätzen auf Anhieb richtig.</p>
          <div class="row"><a class="btn" href="#/satzbau/${mode}" id="again">Nochmal</a><a class="btn secondary" href="#/satzbau">Andere Übung</a></div></div>`);
        document.getElementById("again").onclick = (e) => { e.preventDefault(); route(); };
        return;
      }
      const q = qs[i], target = q.words.join(" ");
      let pool = shuffle(q.words.map((w, k) => ({ w, k })));
      if (pool.map((x) => x.w).join(" ") === target) pool.reverse(); // nicht schon fertig sortiert anbieten
      const picked = [];
      render("Satzbau", `<div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
        <p class="muted">Satz ${i + 1} / ${qs.length} · ${score} richtig</p>
        <div class="card">
          ${q.listen ? `<div class="lang">Höre den Satz und baue ihn nach</div><p style="text-align:center">${audioBtn(q.audio, "Anhören")}</p>`
            : `<div class="lang">Auf Lëtzebuergesch:</div><h2>${esc(q.de)}</h2>`}
          <div class="build" id="ans" aria-label="Dein Satz"></div>
          <div class="build pool" id="pool" aria-label="Wörter"></div>
          <div class="row"><button class="btn secondary" id="skip">Lösung zeigen</button><button class="btn" id="chk" disabled>Prüfen</button></div>
          <div id="fb"></div></div>`);
      if (autoplay && q.listen) play(q.audio, $view.querySelector(".snd"));
      const ans = document.getElementById("ans"), pl = document.getElementById("pool"), chk = document.getElementById("chk");
      const draw = () => {
        ans.innerHTML = picked.map((x, n) => `<button class="word" data-n="${n}">${esc(x.w)}</button>`).join("") || `<span class="muted">Wörter antippen …</span>`;
        pl.innerHTML = pool.map((x, n) => `<button class="word" data-n="${n}">${esc(x.w)}</button>`).join("");
        chk.disabled = pool.length > 0;
        ans.querySelectorAll(".word").forEach((b) => { b.onclick = () => { pool.push(picked.splice(+b.dataset.n, 1)[0]); draw(); }; });
        pl.querySelectorAll(".word").forEach((b) => { b.onclick = () => { picked.push(pool.splice(+b.dataset.n, 1)[0]); draw(); }; });
      };
      const finish = (ok) => {
        if (ok) score++;
        $view.querySelectorAll(".word, #chk, #skip").forEach((x) => { x.disabled = true; });
        document.getElementById("fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Richtig wäre:"} <b>${esc(target)}</b>${q.note ? `<br><small>${esc(q.note)}</small>` : ""}</div>
          <div class="row" style="align-items:center">${q.audio ? audioBtn(q.audio, "Anhören") : ""}<button class="btn" id="nx">Weiter</button></div>`;
        document.getElementById("nx").onclick = () => { i++; ask(true); };
      };
      chk.onclick = () => finish(picked.map((x) => x.w).join(" ") === target);
      document.getElementById("skip").onclick = () => finish(false);
      draw();
    }
    ask(false);
  }

  // ---------- Prüfliste zum Gegenlesen ----------
  function viewChecklist() {
    const box = `<td class="chk">☐</td>`;
    const row = (lb, de, mark) => `<tr>${box}<td><b>${esc(lb)}</b>${mark ? ' <span class="box-badge">LOD ✓</span>' : ""}</td><td>${esc(de || "")}</td></tr>`;
    const draw = (lod) => {
      const sample = ME.build({ name: "Ana Silva", age: 35, country: "Portugal", years: 10, town: "Esch", home: "appartement", livesWith: "famill", status: "bestuet",
        sons: 1, daughters: 2, work: "schaffen", job: "Verkeeferin", employer: "Cactus", workplace: "Luxemburg", mother: "Portugisesch", langs: ["Franséisch", "Englesch"],
        hobbies: ME.HOBBIES.map((h) => h[0]), likes: ME.LIKES.map((l) => l[0]), reasons: ME.REASONS.map((r) => r[0]) })
        .concat(ME.STATUS.map((s) => ({ lb: s[2], de: s[3] })), ME.build({ work: "sichen" }), ME.build({ work: "pensioun" }), ME.build({ work: "studium" }), ME.build({ work: "doheem" }), ME.build({ kids: "none" }), ME.build({ sons: 2 }));
      render("Prüfliste", `
        <div class="card noprint"><h2>Prüfliste zum Gegenlesen 📝</h2>
          <p>Hier stehen <b>alle luxemburgischen Texte der App</b> auf einer Seite. Drucke sie aus (oder speichere sie als PDF) und gib sie einer Lehrkraft oder einem Muttersprachler zum Korrigieren.</p>
          <p class="muted">Wörter mit „LOD ✓“ stimmen in der Schreibweise mit dem offiziellen Wörterbuch LOD.lu überein und müssen nicht geprüft werden.</p>
          <button class="btn" id="print" style="width:100%">🖨️ Drucken / als PDF speichern</button></div>
        <div class="checklist">
          <h2 class="printonly">Moien Lëtzebuerg – Prüfliste</h2>
          <p class="printonly">Bitte Fehler direkt im Text korrigieren und die Zeile ankreuzen. Merci villmools!</p>
          <h2>1. Vokabeln und Sätze</h2>
          ${D.topics.map((t) => `<h3>${esc(t.title)} – ${esc(t.de)}</h3><table>${t.words.map((w, i) =>
            row(w[0], w[1], lod && lod[`c-${t.id}-${i}`]) + (w[2] ? row(w[2], "(Beispielsatz)") : "")).join("")}</table>`).join("")}
          <h2>2. Sprechen: Fragen und Musterantworten</h2>
          ${D.speaking.map((s) => `<h3>${esc(s.topic)}</h3><table>${s.questions.map((q) => row(q, "")).join("")}
            ${(s.images || [s]).map((m) => row(m.model, m.de)).join("")}</table>`).join("")}
          <h2>3. Rückfragen</h2>
          <table>${D.followups.map((f) => row(f.q, f.de) + row(f.start, "(Satzanfang)")).join("")}</table>
          <h2>4. Hörtexte</h2>
          ${D.dialogues.map((d) => `<h3>${esc(d.title)} (${d.level || "A2"})</h3><table>${d.text.map((l) => row(l, "")).join("")}
            ${d.questions.map((q) => row(q.q + " — " + q.options.join(" / "), "(Frage)")).join("")}</table>`).join("")}
          <h2>5. Bausteine der persönlichen Vorstellung</h2>
          <table>${sample.map((s) => row(s.lb, s.de)).join("")}
</table>
          <h2>6. Zahlen, Uhrzeiten, Preise, Jahre (Auswahl)</h2>
          <table>${TRAIN.sets.map((s) => s.items.filter((x, i) => i % Math.ceil(s.items.length / 14) === 0).map((x) => row(x.lb, x.show)).join("")).join("")}</table>
          <h2>7. Grammatik</h2>
          ${D.grammar.map((g) => `<h3>${esc(g.title)}</h3>${g.body}`).join("")}
        </div>`);
      document.getElementById("print").onclick = () => window.print();
    };
    draw(null);
    fetch("audio/lod-quellen.json").then((r) => (r.ok ? r.json() : null)).then((lod) => { if (lod && location.hash === "#/pruefliste") draw(lod); }).catch(() => {});
  }

  // ---------- Verben ----------
  const PERSONS = ["ech", "du", "hien / si", "mir", "dir", "si (Plural)"];
  const noPerfect = (v) => ["wëllen", "kënnen", "mussen", "brauchen"].includes(v.inf);
  const nRule = (word, next) => (/^[aeiouäëéöüyndtzh]/i.test(next) ? word : word.replace(/nn?$/, ""));

  function viewVerbsMenu() {
    render("Verben", `
      <div class="card"><p>Die 30 wichtigsten Verben für die Prüfung. Alle Formen stammen aus den Tabellen von LOD.lu.</p>
        <div class="row"><a class="btn" href="#/verben/elo">Gegenwart üben</a><a class="btn" href="#/verben/perfekt">Perfekt üben</a></div></div>
      <div class="card"><h3>Alle Verben</h3><ul class="wordlist">${VERBS.map((v, i) => `<li><div><a href="#/verben/${i}"><b>${esc(v.inf)}</b></a></div><span>${esc(v.de)}</span></li>`).join("")}</ul></div>`);
  }

  function viewVerb(i) {
    const v = VERBS[i];
    if (!v) return go("#/verben");
    render(v.inf, `
      <div class="card"><h2>${esc(v.inf)} <small class="muted" style="font-weight:400">${esc(v.de)}</small></h2>
        <table><tr><th></th><th>Gegenwart</th>${noPerfect(v) ? "" : "<th>Perfekt</th>"}</tr>
        ${PERSONS.map((p, k) => `<tr><td>${p}</td><td><b>${esc(v.pres[k])}</b></td>${noPerfect(v) ? "" : `<td>${esc(v.perf[k])}</td>`}</tr>`).join("")}</table>
        ${noPerfect(v) ? `<p class="muted">Bei diesem Verb benutzt man für die Vergangenheit meist das Präteritum.</p>` : `<p class="muted">Perfekt mit <b>${esc(v.aux)}</b>, Partizip: <b>${esc(v.pp)}</b></p>`}
        <p class="muted">Quelle: <a href="https://lod.lu/artikel/${esc(v.lod)}" target="_blank" rel="noopener">LOD.lu</a></p></div>
      <div class="row"><a class="btn secondary" href="#/verben/${(i + VERBS.length - 1) % VERBS.length}">← Zurück</a><a class="btn secondary" href="#/verben">Alle</a><a class="btn secondary" href="#/verben/${(i + 1) % VERBS.length}">Weiter →</a></div>`);
  }

  function viewVerbQuiz(mode) {
    const perfect = mode === "perfekt";
    const pool = VERBS.filter((v) => !perfect || !noPerfect(v));
    const sinn = VERBS.find((v) => v.inf === "sinn"), hunn = VERBS.find((v) => v.inf === "hunn");
    if (pool.length < 5 || !sinn || !hunn) return go("#/verben");
    const qs = shuffle(pool).slice(0, 10).map((v) => ({ v, p: Math.floor(Math.random() * 6) }));
    let i = 0, score = 0;
    function ask() {
      if (i >= qs.length) {
        markActive("uebung");
        const key = "verben/" + mode;
        state.quizBest[key] = Math.max(score, state.quizBest[key] || 0); save();
        render("Verben", `<div class="card"><h2>${score >= 8 ? "Super! 🎉" : score >= 5 ? "Gutt! 👍" : "Weider üben! 💪"}</h2>
          <p>${score} von ${qs.length} richtig. Bestwert: ${state.quizBest[key]}/10</p>
          <div class="row"><a class="btn" href="#/verben/${mode}" id="again">Nochmal</a><a class="btn secondary" href="#/verben">Zur Übersicht</a></div></div>`);
        document.getElementById("again").onclick = (e) => { e.preventDefault(); route(); };
        return;
      }
      const { v, p } = qs[i];
      let right, opts;
      if (perfect) {
        right = v.perf[p];
        const other = (v.aux === "sinn" ? hunn : sinn).pres[p];
        opts = [right, `${nRule(other, v.pp)} ${v.pp}`, `${nRule((v.aux === "sinn" ? sinn : hunn).pres[p], v.inf)} ${v.inf}`];
      } else {
        right = v.pres[p];
        opts = [right, ...shuffle([...new Set(v.pres)].filter((f) => f !== right)).slice(0, 3)];
        if (opts.length < 3) opts.push(v.inf === right ? v.pp : v.inf);
      }
      opts = [...new Set(opts)];
      if (opts.length < 3) opts.push(perfect ? `${right.split(" ")[0]} ${v.pres[2]}` : v.pp); // z. B. bei "gesinn": Partizip = Infinitiv
      opts = shuffle([...new Set(opts)]);
      render(perfect ? "Verben · Perfekt" : "Verben · Gegenwart", `<div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
        <p class="muted">Aufgabe ${i + 1} / ${qs.length} · ${score} richtig</p>
        <div class="card"><div class="lang">${esc(v.inf)} = ${esc(v.de)} · ${perfect ? "Perfekt" : "Gegenwart"}</div>
          <h2>${PERSONS[p]} _____</h2>
          ${opts.map((o) => `<button class="opt" data-o="${esc(o)}">${esc(o)}</button>`).join("")}
          <div id="fb"></div></div>`);
      $view.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          const ok = b.dataset.o === right;
          if (ok) score++;
          $view.querySelectorAll(".opt").forEach((x) => {
            x.disabled = true;
            if (x.dataset.o === right) x.classList.add("right"); else if (x === b) x.classList.add("wrong");
          });
          document.getElementById("fb").innerHTML = `<div class="row" style="align-items:center"><a class="btn secondary" href="#/verben/${VERBS.indexOf(v)}">Tabelle</a><button class="btn" id="nx">Weiter</button></div>`;
          document.getElementById("nx").onclick = () => { i++; ask(); };
        };
      });
    }
    ask();
  }

  // ---------- Vivre ensemble ----------
  function viewVivreMenu() {
    const official = VIVRE_EXAM.parts.map((x) => x[0]);
    const tile = (c, sub) => `<a class="tile" href="#/vivre/${encodeURIComponent(c)}"><b>${esc(c)}</b>
      <small>${sub} · ${VIVRE.filter((q) => q.c === c).length} Übungsfragen${state.quizBest["vivre/" + c] !== undefined ? ` · Bestwert ${state.quizBest["vivre/" + c]}/10` : ""}</small></a>`;
    const extra = [...new Set(VIVRE.map((q) => q.c))].filter((c) => !official.includes(c));
    const total = VIVRE_EXAM.parts.reduce((n, x) => n + x[1], 0);
    render("Vivre ensemble", `
      <div class="card"><h2>Vivre ensemble au Grand-Duché 🇱🇺</h2>
        <p>Neben dem Sproochentest brauchst du für die Einbürgerung das Zertifikat „Vivre ensemble“. Du bekommst es entweder durch den
        <b>24-Stunden-Kurs</b> oder durch die <b>Prüfung</b> ohne Kurs.</p>
        <table><tr><th>Prüfungsfach</th><th>Kurs</th><th>Fragen</th></tr>
          <tr><td>Grundrechte der Bürger</td><td>6 Std.</td><td>10</td></tr>
          <tr><td>Staatliche und kommunale Institutionen</td><td>12 Std.</td><td>20</td></tr>
          <tr><td>Geschichte Luxemburgs und europäische Integration</td><td>6 Std.</td><td>10</td></tr></table>
        <p class="muted">Die Prüfung ist ein Multiple-Choice-Test am Computer: ${total} Fragen in ${VIVRE_EXAM.minutes} Minuten, bestanden ab ${VIVRE_EXAM.pass} richtigen Antworten.
        Kurs und Prüfung sind kostenlos. Aktuelle Angaben und Anmeldung: <a href="https://men.public.lu/fr/systeme-educatif/formation-adultes/integration-nationalite/cours-examen.html" target="_blank" rel="noopener">men.public.lu</a>.</p>
        <a class="btn red" style="width:100%" href="#/vivre/examen">⏱️ Prüfung simulieren (${total} Fragen, ${VIVRE_EXAM.minutes} Min.)</a>
        ${state.vivreSims && state.vivreSims.length ? `<p class="muted" style="margin-top:8px">Letzter Durchlauf: ${state.vivreSims[state.vivreSims.length - 1].r}/${total} am ${esc(state.vivreSims[state.vivreSims.length - 1].d.split("-").reverse().join("."))}</p>` : ""}
      </div>
      <h2>Nach Fächern üben</h2>
      <div class="grid">${VIVRE_EXAM.parts.map(([c, n]) => tile(c, `${n} von ${total} Prüfungsfragen`)).join("")}</div>
      <a class="btn secondary" style="width:100%;margin:12px 0" href="#/vivre/all">Gemischtes Quiz aus den drei Fächern (10 Fragen)</a>
      ${extra.length ? `<h2>Zusatzwissen</h2><div class="grid">${extra.map((c) => tile(c, "kein Prüfungsfach")).join("")}</div>` : ""}
      <div class="card" style="margin-top:12px"><p class="muted" style="margin:0"><b>Wichtig:</b> Die echten Prüfungsfragen sind nicht öffentlich. Diese ${VIVRE.length} Fragen sind inoffizielles
      Übungsmaterial (Stand 2026), aufgebaut nach den drei offiziellen Fächern. Sie ersetzen weder den Kurs noch die offiziellen Unterlagen; Zahlen und Personen können sich ändern.</p></div>`);
  }

  // Prüfungssimulation: Verteilung, Zeit und Bestehensgrenze wie in der offiziellen Prüfung
  function viewVivreExam() {
    const qs = [];
    VIVRE_EXAM.parts.forEach(([c, n]) => shuffle(VIVRE.filter((q) => q.c === c)).slice(0, n).forEach((q) => qs.push({ q, order: shuffle(q.o.map((t, k) => k)), pick: -1 })));
    if (!qs.length) return go("#/vivre");
    const end = Date.now() + VIVRE_EXAM.minutes * 60000;
    let i = 0;
    const clock = () => { const s = Math.max(0, Math.round((end - Date.now()) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
    function show() {
      const x = qs[i];
      render("Vivre ensemble · Prüfung", `<div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
        <p class="muted">Frage ${i + 1} / ${qs.length} · ${qs.filter((y) => y.pick >= 0).length} beantwortet · ⏱️ <span id="clk">${clock()}</span></p>
        <div class="card"><div class="lang">${esc(x.q.c)}</div><h2>${esc(x.q.q)}</h2>
          ${x.order.map((k) => `<button class="opt${x.pick === k ? " sel" : ""}" data-k="${k}">${esc(x.q.o[k])}</button>`).join("")}</div>
        <div class="row"><button class="btn secondary" id="pv" ${i ? "" : "disabled"}>← Zurück</button>
          ${i + 1 < qs.length ? `<button class="btn" id="nx">Weiter →</button>` : `<button class="btn red" id="fin">Abgeben</button>`}</div>
        ${i + 1 < qs.length ? `<button class="btn secondary" id="fin" style="width:100%;margin-top:8px">Vorzeitig abgeben</button>` : ""}`);
      $view.querySelectorAll(".opt").forEach((b) => { b.onclick = () => { x.pick = +b.dataset.k; $view.querySelectorAll(".opt").forEach((o) => o.classList.toggle("sel", o === b)); }; });
      document.getElementById("pv").onclick = () => { i--; show(); };
      const nx = document.getElementById("nx"); if (nx) nx.onclick = () => { i++; show(); };
      document.getElementById("fin").onclick = () => {
        const open = qs.filter((y) => y.pick < 0).length;
        if (!open || confirm(`${open} Fragen sind noch nicht beantwortet. Trotzdem abgeben?`)) finish(false);
      };
    }
    function finish(timeout) {
      stopMedia();
      const right = qs.filter((x) => x.pick === x.q.a).length, ok = right >= VIVRE_EXAM.pass;
      state.vivreSims = (state.vivreSims || []).concat([{ d: today(), r: right }]).slice(-20);
      save(); markActive();
      const per = VIVRE_EXAM.parts.map(([c, n]) => `<li><div>${esc(c)}</div><span>${qs.filter((x) => x.q.c === c && x.pick === x.q.a).length} / ${n}</span></li>`).join("");
      const wrong = qs.filter((x) => x.pick !== x.q.a);
      render("Vivre ensemble · Ergebnis", `
        <div class="card"><h2>${ok ? "Bestanden! 🎉" : "Noch nicht bestanden"}</h2>
          <p><b>${right} von ${qs.length}</b> richtig – nötig sind ${VIVRE_EXAM.pass}.${timeout ? " Die Zeit war abgelaufen." : ""}</p>
          <div class="bar"><i style="width:${(right / qs.length) * 100}%"></i></div>
          <ul class="wordlist">${per}</ul>
          <p class="muted" style="margin-top:8px">Übungsergebnis mit inoffiziellen Fragen – es sagt nur ungefähr, wie gut du vorbereitet bist.</p></div>
        ${wrong.length ? `<h2>Zum Nachlesen (${wrong.length})</h2>${wrong.map((x) => `<div class="card"><div class="lang">${esc(x.q.c)}</div><p><b>${esc(x.q.q)}</b></p>
          <p>✅ ${esc(x.q.o[x.q.a])}${x.pick >= 0 ? `<br><span class="muted">❌ deine Antwort: ${esc(x.q.o[x.pick])}</span>` : `<br><span class="muted">nicht beantwortet</span>`}</p>
          <p class="muted" style="margin:0">${esc(x.q.i)}</p></div>`).join("")}` : ""}
        <div class="row"><a class="btn" href="#/vivre/examen" id="again">Neue Prüfung</a><a class="btn secondary" href="#/vivre">Übersicht</a></div>`);
      document.getElementById("again").onclick = (e) => { e.preventDefault(); route(); };
    }
    // Uhr läuft weiter, auch beim Blättern; bei Ablauf wird automatisch abgegeben
    activeTimer = setInterval(() => {
      const el = document.getElementById("clk");
      if (el) el.textContent = clock();
      if (Date.now() >= end) finish(true);
    }, 1000);
    show();
  }

  function viewVivre(cat) {
    cat = decodeURIComponent(cat);
    const official = VIVRE_EXAM.parts.map((x) => x[0]);
    const pool = cat === "all" ? VIVRE.filter((q) => official.includes(q.c)) : VIVRE.filter((q) => q.c === cat);
    if (!pool.length) return go("#/vivre");
    const qs = shuffle(pool).slice(0, 10);
    let i = 0, score = 0;
    function ask() {
      if (i >= qs.length) {
        markActive();
        const key = "vivre/" + cat;
        state.quizBest[key] = Math.max(score, state.quizBest[key] || 0); save();
        render("Vivre ensemble", `<div class="card"><h2>${score >= qs.length * 0.8 ? "Super! 🎉" : score >= qs.length / 2 ? "Gutt! 👍" : "Weider üben! 💪"}</h2>
          <p>${score} von ${qs.length} richtig.</p>
          <div class="row"><a class="btn" href="#/vivre/${encodeURIComponent(cat)}" id="again">Nochmal</a><a class="btn secondary" href="#/vivre">Übersicht</a></div></div>`);
        document.getElementById("again").onclick = (e) => { e.preventDefault(); route(); };
        return;
      }
      const q = qs[i];
      const order = shuffle(q.o.map((t, k) => k));
      render("Vivre ensemble", `<div class="bar"><i style="width:${(i / qs.length) * 100}%"></i></div>
        <p class="muted">Frage ${i + 1} / ${qs.length} · ${score} richtig</p>
        <div class="card"><div class="lang">${esc(q.c)}</div><h2>${esc(q.q)}</h2>
          ${order.map((k) => `<button class="opt" data-k="${k}">${esc(q.o[k])}</button>`).join("")}
          <div id="fb"></div></div>`);
      $view.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          const ok = +b.dataset.k === q.a;
          if (ok) score++;
          $view.querySelectorAll(".opt").forEach((x) => {
            x.disabled = true;
            if (+x.dataset.k === q.a) x.classList.add("right"); else if (x === b) x.classList.add("wrong");
          });
          document.getElementById("fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${esc(q.i)}</div><button class="btn" id="nx" style="width:100%">Weiter</button>`;
          document.getElementById("nx").onclick = () => { i++; ask(); };
        };
      });
    }
    ask();
  }

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
  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
