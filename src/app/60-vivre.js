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
      <div class="row" style="margin:14px 0">
        <a class="btn secondary" href="#/vivre/all">Gemischtes Quiz</a>
        <a class="btn secondary" href="#/vivre/fehler">🔥 Meine Fehler (${Object.keys(state.vmiss).filter((k) => VIVRE.some((q) => q.q === k)).length})</a>
      </div>
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
      qs.filter((x) => x.pick !== x.q.a).forEach((x) => { state.vmiss[x.q.q] = (state.vmiss[x.q.q] || 0) + 1; });
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
    const pool = cat === "fehler" ? VIVRE.filter((q) => state.vmiss[q.q]).sort((x, y) => state.vmiss[y.q] - state.vmiss[x.q])
      : cat === "all" ? VIVRE.filter((q) => official.includes(q.c)) : VIVRE.filter((q) => q.c === cat);
    if (!pool.length) {
      if (cat !== "fehler") return go("#/vivre");
      return render("Vivre ensemble", `<div class="card"><h2>Keine offenen Fehler 👍</h2><p>Hier sammeln sich die Fragen, die du im Quiz oder in der Prüfungssimulation falsch beantwortest. Jede richtige Antwort in dieser Runde streicht sie wieder.</p><a class="btn" href="#/vivre">Zur Übersicht</a></div>`);
    }
    const qs = (cat === "fehler" ? pool : shuffle(pool)).slice(0, 10);
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
          if (!ok) state.vmiss[q.q] = (state.vmiss[q.q] || 0) + 1;
          else if (cat === "fehler" && state.vmiss[q.q]) { state.vmiss[q.q]--; if (!state.vmiss[q.q]) delete state.vmiss[q.q]; }
          save();
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
