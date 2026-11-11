(() => {
  "use strict";

  const D = window.LUX_DATA;
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

  // ---------- Speicher ----------
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && s.cards) return s;
    } catch (e) { /* ignorieren */ }
    return { cards: {}, days: [], quizBest: {}, reversed: false };
  }
  let state = load();
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* voll/privat */ }
  }
  const today = () => new Date().toISOString().slice(0, 10);
  function markActive() {
    const d = today();
    if (!state.days.includes(d)) { state.days.push(d); state.days = state.days.slice(-400); save(); }
  }
  function streak() {
    const set = new Set(state.days);
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
  function render(title, html) { $title.textContent = title; $view.innerHTML = html; window.scrollTo(0, 0); }
  function normalize(s) {
    return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[.,!?…;:()"“”]/g, "").replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
  }

  // Sprachausgabe nur, wenn das Gerät eine luxemburgische Stimme hat.
  let lbVoice = null;
  function findVoice() {
    if (!("speechSynthesis" in window)) return;
    lbVoice = speechSynthesis.getVoices().find((v) => /^lb/i.test(v.lang)) || null;
  }
  if ("speechSynthesis" in window) { findVoice(); speechSynthesis.onvoiceschanged = findVoice; }
  function speak(text) {
    if (!lbVoice) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/…/g, ""));
    u.voice = lbVoice; u.lang = lbVoice.lang; u.rate = 0.9;
    speechSynthesis.speak(u);
  }
  const speakBtn = (text) => lbVoice ? `<button class="btn secondary" data-speak="${esc(text)}" aria-label="Vorlesen">🔊</button>` : "";

  // ---------- Startseite ----------
  function viewHome() {
    const due = cards.filter(isDue).length;
    const known = cards.filter(learned).length;
    const seen = cards.filter((c) => !isNew(c)).length;
    const pct = Math.round((known / cards.length) * 100);
    render("Sproochentest Trainer", `
      <div class="card">
        <h2>Moien! 👋</h2>
        <p class="muted">Dein Ziel: der <b>Sproochentest</b> für die luxemburgische Staatsbürgerschaft –
        <b>Sprechen auf Niveau A2</b> und <b>Hörverstehen auf Niveau B1</b>.</p>
        <div class="stats">
          <div><b>${streak()}</b><small>Tage in Folge</small></div>
          <div><b>${due}</b><small>fällige Karten</small></div>
          <div><b>${known}</b><small>sicher gelernt</small></div>
        </div>
        <div class="bar" style="margin-top:12px"><i style="width:${pct}%"></i></div>
        <p class="muted">${pct}% des Wortschatzes sicher · ${seen} von ${cards.length} Karten gesehen</p>
        <a class="btn" style="width:100%" href="#/lernen/heute">${due ? `Jetzt ${due} ${due === 1 ? "Karte" : "Karten"} wiederholen` : "Tägliche Lerneinheit starten"}</a>
      </div>
      <h2>Dein Lernplan</h2>
      <div class="card">
        <ol style="margin:0;padding-left:20px">
          <li><b>Täglich 10–15 Min. Karten</b> – der Wortschatz ist die Basis.</li>
          <li><b>Grammatik</b> einmal durchlesen: sinn/hunn, Perfekt, n-Regel.</li>
          <li><b>Sprechen</b>: Fragen laut beantworten, dich aufnehmen, mit Musterantwort vergleichen.</li>
          <li><b>Verstehen</b>: Dialoge lesen und Fragen beantworten – dazu täglich luxemburgisches Radio hören.</li>
        </ol>
      </div>
      <div class="grid">
        <a class="tile" href="#/lernen"><div class="ico">🃏</div><b>Karteikarten</b><small>Wortschatz nach Themen</small></a>
        <a class="tile" href="#/quiz"><div class="ico">✅</div><b>Quiz</b><small>Wissen testen</small></a>
        <a class="tile" href="#/sprechen"><div class="ico">🎙️</div><b>Sprechen</b><small>Prüfungsfragen üben</small></a>
        <a class="tile" href="#/verstehen"><div class="ico">👂</div><b>Verstehen</b><small>Dialoge & Fragen</small></a>
        <a class="tile" href="#/grammatik"><div class="ico">📐</div><b>Grammatik</b><small>Das Nötigste für A2</small></a>
        <a class="tile" href="#/pruefung"><div class="ico">🎓</div><b>Die Prüfung</b><small>Ablauf & Tipps</small></a>
      </div>`);
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
      <label class="card" style="display:flex;gap:10px;align-items:center">
        <input type="checkbox" id="rev" ${state.reversed ? "checked" : ""}>
        <span>Richtung umkehren: Deutsch → Lëtzebuergesch<br><small class="muted">Schwieriger, aber besser fürs Sprechen</small></span>
      </label>
      <div class="grid">${tiles}</div>`);
    document.getElementById("rev").onchange = (e) => { state.reversed = e.target.checked; save(); };
  }

  function viewList(topicId) {
    const t = topicById[topicId];
    if (!t) return go("#/lernen");
    const items = cards.filter((c) => c.topic === topicId).map((c) => {
      const s = state.cards[c.id];
      return `<li><div><b>${esc(c.lb)}</b> ${s ? `<span class="box-badge">Box ${s.box}</span>` : ""}
        ${c.ex ? `<br><small class="muted"><i>${esc(c.ex)}</i></small>` : ""}</div><span>${esc(c.de)}</span></li>`;
    }).join("");
    render(t.title, `<div class="card"><p class="muted">${esc(t.de)}</p><ul class="wordlist">${items}</ul></div>
      <a class="btn" style="width:100%" href="#/lernen/${t.id}">Diese Karten lernen</a>`);
  }

  // ---------- Lernen: Karteikarten-Sitzung ----------
  function buildQueue(topicId) {
    const pool = topicId === "heute" ? cards : cards.filter((c) => c.topic === topicId);
    const due = shuffle(pool.filter(isDue));
    const fresh = pool.filter(isNew).slice(0, NEW_PER_SESSION); // neue Karten in Themenreihenfolge
    let q = due.concat(fresh);
    if (!q.length && topicId !== "heute") q = shuffle(pool).slice(0, 15); // freies Üben
    return q;
  }

  function viewFlash(topicId) {
    const t = topicById[topicId];
    if (topicId !== "heute" && !t) return go("#/lernen");
    const title = t ? t.title : "Tägliche Lerneinheit";
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
        markActive();
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
        <div class="card flash" id="flash">
          <div class="lang">${rev ? "Deutsch" : "Lëtzebuergesch"}</div>
          <div class="front">${esc(front)}</div>
          <div id="back" hidden>
            <div class="back">${esc(back)}</div>
            ${c.ex ? `<div class="ex">${esc(c.ex)}</div>` : ""}
          </div>
          <div class="hint" id="hint">Antippen zum Umdrehen</div>
        </div>
        <div class="row" id="answer" hidden>
          <button class="btn bad" id="no">✗ Nochmal</button>
          ${speakBtn(c.lb)}
          <button class="btn good" id="yes">✓ Gewusst</button>
        </div>`);
      const flip = () => {
        document.getElementById("back").hidden = false;
        document.getElementById("hint").hidden = true;
        document.getElementById("answer").hidden = false;
      };
      document.getElementById("flash").onclick = flip;
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
      } else {
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
        markActive();
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
          if (ok) score++;
          document.getElementById("f").hidden = true;
          document.getElementById("fb").innerHTML = `<div class="feedback ${ok ? "ok" : "no"}">${ok ? "✓ Richtig!" : "✗ Richtig wäre:"} <b>${esc(c.lb)}</b></div>
            <div class="row">${speakBtn(c.lb)}<button class="btn" id="nx">Weiter</button></div>`;
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
        <h2>${esc(toDe ? c.lb : c.de)}</h2>
        ${options.map((o) => `<button class="opt" data-id="${o.id}">${esc(o[field])}</button>`).join("")}
        <div id="fb"></div></div>`);
      $view.querySelectorAll(".opt").forEach((b) => {
        b.onclick = () => {
          const ok = b.dataset.id === c.id;
          if (ok) score++;
          $view.querySelectorAll(".opt").forEach((x) => {
            x.disabled = true;
            if (x.dataset.id === c.id) x.classList.add("right");
            else if (x === b) x.classList.add("wrong");
          });
          document.getElementById("fb").innerHTML = `<div class="row">${speakBtn(c.lb)}<button class="btn" id="nx">Weiter</button></div>`;
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
      <button class="btn red" style="width:100%" id="rnd">🎲 Zufällige Prüfungsfrage</button></div>
      ${D.speaking.map((s, i) => `<a class="tile" style="margin-bottom:8px" href="#/sprechen/${i}"><b>${esc(s.topic)}</b><small>${s.images ? `${s.images.length} Bilder · ` : ""}${s.questions.length} Fragen</small></a>`).join("")}`);
    document.getElementById("rnd").onclick = () => go(`#/sprechen/${Math.floor(Math.random() * D.speaking.length)}`);
  }

  let activeRec = null, activeTimer = null;
  function stopMedia() {
    if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
    if (activeRec && activeRec.state !== "inactive") activeRec.stop();
    activeRec = null;
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
    const canRec = !!(navigator.mediaDevices && window.MediaRecorder);
    render(s.topic, `
      ${img ? `<div class="card"><h3>Beschreibe dieses Bild</h3>
        <img class="scene" src="${img.src}" alt="${esc(img.alt)}">
        <a class="btn secondary" style="width:100%" href="#/sprechen/${idx}/${(imgIdx + 1) % s.images.length}">🔄 Anderes Bild (${imgIdx + 1}/${s.images.length})</a>
      </div>` : ""}
      <div class="card"><h3>Fragen der Prüfer</h3>
        <ul style="padding-left:20px;margin:0">${s.questions.map((q) => `<li style="margin-bottom:6px"><b>${esc(q)}</b></li>`).join("")}</ul>
      </div>
      <div class="card">
        <h3>Deine Antwort</h3>
        <p class="muted">Sprich 1–2 Minuten frei. Kurze, einfache Sätze reichen für A2!</p>
        <div class="timer" id="tm">0:00</div>
        <div class="row">
          ${canRec ? `<button class="btn red" id="rec">● Aufnehmen</button>` : `<button class="btn" id="tbtn">▶︎ Timer starten</button>`}
        </div>
        <div id="play"></div>
        ${canRec ? "" : `<p class="muted">Aufnahme wird von diesem Browser nicht unterstützt.</p>`}
      </div>
      <details class="card"><summary>Musterantwort anzeigen</summary>
        <p><b>${esc(model)}</b></p>
        ${speakBtn(model)}
        <p class="muted" style="margin-top:8px">${esc(modelDe)}</p>
      </details>
      <div class="row"><a class="btn secondary" href="#/sprechen">Alle Themen</a>
      <a class="btn secondary" href="#/sprechen/${(idx + 1) % D.speaking.length}">Nächstes Thema →</a></div>`);

    const tm = document.getElementById("tm");
    const startTimer = () => {
      const t0 = Date.now();
      tm.textContent = "0:00";
      activeTimer = setInterval(() => {
        const sec = Math.floor((Date.now() - t0) / 1000);
        tm.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
      }, 250);
    };

    if (!canRec) {
      const b = document.getElementById("tbtn");
      b.onclick = () => {
        if (activeTimer) { stopMedia(); b.textContent = "▶︎ Timer starten"; }
        else { startTimer(); b.textContent = "■ Stopp"; }
      };
      return;
    }

    const btn = document.getElementById("rec");
    btn.onclick = async () => {
      if (activeRec) { stopMedia(); return; }
      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch (e) { document.getElementById("play").innerHTML = `<p class="feedback no">Kein Mikrofonzugriff. Bitte in den Einstellungen erlauben.</p>`; return; }
      const type = ["audio/mp4", "audio/webm", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      const chunks = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (activeTimer) { clearInterval(activeTimer); activeTimer = null; }
        btn.innerHTML = "● Neu aufnehmen";
        const url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || type || "audio/webm" }));
        const p = document.getElementById("play");
        if (p) p.innerHTML = `<audio controls src="${url}"></audio><p class="muted">Hör dir zu: Verstehst du dich selbst? Hast du ganze Sätze benutzt?</p>`;
        markActive();
      };
      rec.start();
      activeRec = rec;
      startTimer();
      btn.innerHTML = `<span class="rec-dot"></span> Stopp`;
    };
  }

  // ---------- Verstehen ----------
  function viewDialogList() {
    render("Verstehen", `
      <div class="card"><p>Der Hörteil ist auf <b>Niveau B1</b> – also etwas schwerer als der Sprechteil.
      Typisch sind kurze Gespräche, Durchsagen und Radiomeldungen mit Multiple-Choice-Fragen.</p>
      <p class="muted">Tipp: Lies zuerst die Fragen, dann den Text. Für echtes Hörtraining zusätzlich täglich RTL Radio oder Radio 100,7 hören.</p></div>
      ${D.dialogues.map((d, i) => `<a class="tile" style="margin-bottom:8px" href="#/verstehen/${i}"><b>${esc(d.title)}</b><small>${d.questions.length} Fragen</small></a>`).join("")}`);
  }

  function viewDialog(idx) {
    const d = D.dialogues[idx];
    if (!d) return go("#/verstehen");
    const full = d.text.join(" ");
    render(d.title, `
      <div class="card">
        <p class="muted">Lies zuerst die Fragen, dann öffne den Text.</p>
        <details><summary><b>Text anzeigen</b></summary>
          <div style="margin-top:8px">${d.text.map((l) => `<p class="dialog-line">${esc(l)}</p>`).join("")}</div>
          ${speakBtn(full)}
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
          markActive();
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
          <li>den bestandenen <b>Sproochentest</b> (Luxemburgisch-Sprachtest) – <b>dafür ist diese App</b>,</li>
          <li>den Kurs bzw. die Prüfung <b>„Vivre ensemble au Grand-Duché de Luxembourg“</b> (Landeskunde, Geschichte, Institutionen – wird nicht auf Luxemburgisch geprüft).</li>
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
        <a class="tile" href="#/pruefung"><div class="ico">🎓</div><b>Die Prüfung</b><small>Ablauf, Tipps, Links</small></a>
      </div>
      <div class="card" style="margin-top:12px"><h3>Fortschritt</h3>
        <p class="muted">Dein Fortschritt wird nur auf diesem Gerät gespeichert.</p>
        <div class="row">
          <button class="btn secondary" id="exp">Sichern</button>
          <label class="btn secondary">Wiederherstellen<input type="file" id="imp" accept="application/json" hidden></label>
          <button class="btn bad" id="reset">Zurücksetzen</button>
        </div>
      </div>
      <p class="muted">Sprachausgabe: ${lbVoice ? "luxemburgische Stimme gefunden ✓" : "auf diesem Gerät keine luxemburgische Stimme verfügbar – nutze LOD.lu für die Aussprache."}</p>`);
    document.getElementById("exp").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state)], { type: "application/json" }));
      a.download = `sproochentest-fortschritt-${today()}.json`;
      a.click();
    };
    document.getElementById("imp").onchange = async (e) => {
      try {
        const s = JSON.parse(await e.target.files[0].text());
        if (!s.cards) throw new Error();
        state = Object.assign(load(), s); save(); alert("Fortschritt wiederhergestellt."); go("#/");
      } catch (err) { alert("Diese Datei konnte nicht gelesen werden."); }
    };
    document.getElementById("reset").onclick = () => {
      if (confirm("Wirklich den gesamten Lernfortschritt löschen?")) {
        state = { cards: {}, days: [], quizBest: {}, reversed: false }; save(); go("#/");
      }
    };
  }

  // ---------- Router ----------
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }
  function route() {
    stopMedia();
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const [a, b, c] = parts;
    const tab = { lernen: "lernen", liste: "lernen", quiz: "quiz", sprechen: "sprechen", verstehen: "mehr", grammatik: "mehr", pruefung: "mehr", mehr: "mehr" }[a] || "home";
    document.querySelectorAll(".tabs a").forEach((x) => x.classList.toggle("active", x.dataset.tab === tab));
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
      default: return viewHome();
    }
  }

  $view.addEventListener("click", (e) => {
    const b = e.target.closest("[data-speak]");
    if (b) { e.stopPropagation(); speak(b.dataset.speak); }
  });
  window.addEventListener("hashchange", route);
  route();

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
