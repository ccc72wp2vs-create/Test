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
      const wasNew = !state.cards[c.id];
      const s = state.cards[c.id] || { box: 0, due: 0, firstTry: true };
      const day = state.log[today()] || (state.log[today()] = { n: 0, neu: 0 }); // für den Wochenrückblick
      day.n++; if (wasNew) day.neu++;
      Object.keys(state.log).sort().slice(0, -60).forEach((k) => delete state.log[k]);
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
          <button class="tile" data-mode="lb-de"><div class="ico pair">🇱🇺→🇩🇪</div><b>Verstehen</b><small>Was bedeutet das?</small></button>
          <button class="tile" data-mode="de-lb"><div class="ico pair">🇩🇪→🇱🇺</div><b>Wiedererkennen</b><small>Wie sagt man das?</small></button>
          <button class="tile" data-mode="type"><div class="ico">✏️</div><b>Schreiben</b><small>Selbst eintippen</small></button>
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
