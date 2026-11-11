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
  const emptyState = () => ({ cards: {}, days: [], quizBest: {}, reversed: false, miss: {}, sims: [], done: {}, examDate: "", recs: 0, heard: [], vmiss: {}, log: {}, stamps: [] });
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
    checkStamps(true);
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
