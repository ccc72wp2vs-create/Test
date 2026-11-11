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
