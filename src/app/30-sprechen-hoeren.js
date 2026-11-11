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
        state.recs = (state.recs || 0) + 1; save();
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
          if (!state.heard.includes(idx)) state.heard.push(idx);
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
