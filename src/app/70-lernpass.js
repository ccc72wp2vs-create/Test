  // ---------- Lernpass: Stempel, Bereitschaft, Wochenrückblick ----------
  const best = (prefix) => Math.max(0, ...Object.keys(state.quizBest).filter((k) => k.startsWith(prefix)).map((k) => state.quizBest[k]));
  function longestStreak() {
    const days = [...new Set(state.days)].sort();
    let run = 0, max = 0, prev = null;
    days.forEach((d) => { const t = new Date(d + "T00:00:00Z").getTime(); run = prev !== null && t - prev === DAY ? run + 1 : 1; max = Math.max(max, run); prev = t; });
    return max;
  }
  const b1Texts = () => D.dialogues.map((d, i) => i).filter((i) => D.dialogues[i].level === "B1");
  const STAMPS = [
    { id: "start", ic: "cards", t: "Erste Karte", s: "Los geht's", ok: () => Object.keys(state.cards).length >= 1 },
    { id: "w50", ic: "cards", t: "50 Wörter", s: "gesehen", ok: () => Object.keys(state.cards).length >= 50 },
    { id: "w150", ic: "cards", t: "150 Wörter", s: "gesehen", ok: () => Object.keys(state.cards).length >= 150 },
    { id: "wall", ic: "star", t: "Alle Wörter", s: "gesehen", ok: () => cards.every((c) => state.cards[c.id]) },
    { id: "k50", ic: "quiz", t: "50 sicher", s: "gelernt", ok: () => cards.filter(learned).length >= 50 },
    { id: "k150", ic: "quiz", t: "150 sicher", s: "gelernt", ok: () => cards.filter(learned).length >= 150 },
    { id: "d3", ic: "flame", t: "3 Tage", s: "in Folge", ok: () => longestStreak() >= 3 },
    { id: "d7", ic: "flame", t: "7 Tage", s: "in Folge", ok: () => longestStreak() >= 7 },
    { id: "d30", ic: "calendar", t: "30 Lerntage", s: "Ausdauer", ok: () => new Set(state.days).size >= 30 },
    { id: "ich", ic: "user", t: "Vorstellung", s: "erstellt", ok: () => !!state.me },
    { id: "rec1", ic: "mic", t: "Erste Aufnahme", s: "Mut", ok: () => state.recs >= 1 },
    { id: "rec10", ic: "mic", t: "10 Aufnahmen", s: "Sprechen", ok: () => state.recs >= 10 },
    { id: "b1", ic: "ear", t: "Alle B1-Texte", s: "gehört", ok: () => b1Texts().every((i) => state.heard.includes(i)) },
    { id: "stem", ic: "voices", t: "Gutes Ohr", s: "Echte Stimmen 8/10", ok: () => (state.quizBest.stemmen || 0) >= 8 },
    { id: "zuel", ic: "numbers", t: "Zahlen-Profi", s: "8/10", ok: () => best("zuelen/") >= 8 },
    { id: "verb", ic: "verbs", t: "Verben-Profi", s: "8/10", ok: () => best("verben/") >= 8 },
    { id: "sim1", ic: "timer", t: "Simulation", s: "erster Durchlauf", ok: () => state.sims.length >= 1 },
    { id: "sim75", ic: "cap", t: "Hören 75 %", s: "in der Simulation", ok: () => state.sims.some((x) => x.r / x.t >= 0.75) },
    { id: "viv", ic: "flaglu", t: "Vivre ensemble", s: "bestanden", ok: () => (state.vivreSims || []).some((x) => x.r >= VIVRE_EXAM.pass) }
  ];
  const earnedStamps = () => STAMPS.filter((x) => x.ok()).map((x) => x.id);
  // Neue Stempel merken und – wenn gewünscht – kurz melden
  function checkStamps(announce) {
    const fresh = earnedStamps().filter((id) => !state.stamps.includes(id));
    if (!fresh.length) return;
    state.stamps = state.stamps.concat(fresh);
    save();
    if (!announce) return;
    const st = STAMPS.find((x) => x.id === fresh[0]);
    const el = document.createElement("a");
    el.className = "toast"; el.href = "#/pass";
    el.innerHTML = `<span class="pstamp on">${UI.icon(st.ic)}</span><span><b>Neuer Stempel im Lernpass</b><small>${esc(st.t)}${fresh.length > 1 ? ` und ${fresh.length - 1} weitere` : ""}</small></span>`;
    document.querySelectorAll(".toast").forEach((x) => x.remove());
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4600);
  }
  // Grobe Schätzung, wie weit die Vorbereitung je Prüfungsteil ist (0–100)
  function readiness() {
    const known = cards.filter(learned).length / cards.length;
    const lastSims = state.sims.slice(-3), simAvg = lastSims.length ? lastSims.reduce((n, x) => n + x.r / x.t, 0) / lastSims.length : 0;
    const b1 = b1Texts(), heard = b1.filter((i) => state.heard.includes(i)).length / b1.length;
    const viv = state.vivreSims && state.vivreSims.length ? state.vivreSims[state.vivreSims.length - 1].r / 40 : 0;
    const vivCats = VIVRE_EXAM.parts.reduce((n, x) => n + Math.min(10, state.quizBest["vivre/" + x[0]] || 0) / 10, 0) / (VIVRE_EXAM.parts.length || 1);
    const pct = (x) => Math.round(Math.min(1, x) * 100);
    return [
      { t: "Sprechen (A2)", ic: "mic", v: pct(0.5 * known + (state.me ? 0.15 : 0) + 0.2 * Math.min(state.recs, 10) / 10 + 0.15 * Math.min(state.sims.length, 3) / 3), hint: "Wortschatz, eigene Vorstellung, Aufnahmen, Simulationen" },
      { t: "Hörverstehen (B1)", ic: "ear", v: pct(0.5 * simAvg + 0.3 * heard + 0.2 * ((state.quizBest.stemmen || 0) + best("zuelen/")) / 20), hint: "Simulationen, B1-Texte, Echte Stimmen, Zahlen" },
      { t: "Vivre ensemble", ic: "flaglu", v: pct(0.6 * viv + 0.4 * vivCats), hint: "letzte Prüfungssimulation und Bestwerte je Fach" }
    ];
  }

  function viewPass() {
    checkStamps(false);
    const me = activeProfile(), have = earnedStamps(), left = daysLeft();
    const mrz = ("P<LUX" + me.name.toUpperCase().normalize("NFD").replace(/[^A-Z]/g, "<") + "<".repeat(40)).slice(0, 30);
    const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(Date.now() - (6 - i) * DAY), key = d.toISOString().slice(0, 10); return { key, wd: "SMDMDFS"[d.getUTCDay()], log: state.log[key] || { n: 0, neu: 0 }, done: Object.keys(state.done[key] || {}).length, on: state.days.includes(key) }; });
    const maxN = Math.max(10, ...week.map((x) => x.log.n));
    const sum = (f) => week.reduce((n, x) => n + f(x), 0);
    render("Mein Lernpass", `
      <section class="passport">
        <div class="passport-head"><span>Lëtzebuerg · Lernpass</span><span>${have.length}/${STAMPS.length}</span></div>
        <div class="passport-body">
          <div class="passport-photo">${UI.lion()}</div>
          <dl>
            <dt>Name</dt><dd>${esc(me.name)}</dd>
            <dt>Prüfung</dt><dd>${state.examDate ? esc(state.examDate.split("-").reverse().join(".")) + (left >= 0 ? ` · noch ${left} ${left === 1 ? "Tag" : "Tage"}` : "") : `<a href="#/profil">Termin eintragen</a>`}</dd>
            <dt>Längste Serie</dt><dd>${longestStreak()} ${longestStreak() === 1 ? "Tag" : "Tage"}</dd>
          </dl>
        </div>
        <div class="mrz">${esc(mrz)}<br>${esc(("MOIEN<LETZEBUERG<<" + String(have.length).padStart(2, "0") + "<STEMPEL" + "<".repeat(30)).slice(0, 30))}</div>
      </section>
      <div class="card"><h2>Wie bereit bin ich?</h2>
        ${readiness().map((r) => `<div class="meter"><div class="meter-top"><span>${UI.icon(r.ic)} <b>${r.t}</b></span><b>${r.v} %</b></div>
          <div class="bar"><i style="width:${r.v}%"></i></div><small class="muted">${r.hint}</small></div>`).join("")}
        <p class="muted" style="margin-top:10px">Eine grobe Schätzung aus deinen Übungsdaten – keine Vorhersage des Prüfungsergebnisses.</p></div>
      <h2>Stempel</h2>
      <div class="stamps">${STAMPS.map((x, i) => { const on = have.includes(x.id); return `<div class="pstamp-slot"><span class="pstamp${on ? " on c" + (i % 3) : ""}" style="--tilt:${((i * 37) % 17) - 8}deg">${UI.icon(x.ic)}</span><b>${esc(x.t)}</b><small>${esc(x.s)}</small></div>`; }).join("")}</div>
      <div class="card" style="margin-top:18px"><h2>Wochenrückblick</h2>
        <div class="chart">${week.map((x) => `<div class="chart-col${x.on ? " on" : ""}"><span>${x.log.n || ""}</span><i style="height:${Math.round((x.log.n / maxN) * 100)}%"></i><b>${x.wd}</b></div>`).join("")}</div>
        <div class="stats">
          <div><b>${sum((x) => (x.on ? 1 : 0))}</b><small>Lerntage</small></div>
          <div><b>${sum((x) => x.log.n)}</b><small>Karten geübt</small></div>
          <div><b>${sum((x) => x.log.neu)}</b><small>neue Wörter</small></div>
        </div>
        <p class="muted" style="margin-top:10px">${sum((x) => x.done)} Tagesaufgaben erledigt in den letzten 7 Tagen.</p>
        ${state.sims.length ? `<h3 style="margin-top:14px">Hören in der Simulation</h3><ul class="wordlist">${state.sims.slice(-5).reverse().map((x) => `<li><div>${esc(x.d.split("-").reverse().join("."))}</div><span>${x.r}/${x.t} · ${Math.round((x.r / x.t) * 100)} %</span></li>`).join("")}</ul>` : ""}
        ${state.vivreSims && state.vivreSims.length ? `<h3 style="margin-top:14px">Vivre ensemble</h3><ul class="wordlist">${state.vivreSims.slice(-5).reverse().map((x) => `<li><div>${esc(x.d.split("-").reverse().join("."))}</div><span>${x.r}/40 ${x.r >= VIVRE_EXAM.pass ? "✅" : ""}</span></li>`).join("")}</ul>` : ""}
      </div>`);
  }
