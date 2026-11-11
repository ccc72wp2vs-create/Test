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
      texts.forEach((di) => { if (!state.heard.includes(di)) state.heard.push(di); });
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
