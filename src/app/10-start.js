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
      <a class="passlink" href="#/pass"><span class="passlink-ic">${UI.icon("star")}</span><span><b>Mein Lernpass</b><small>${earnedStamps().length} von ${STAMPS.length} Stempeln · Bereitschaft · Wochenrückblick</small></span><i>›</i></a>
      <h2>Sproochentest</h2>
      <div class="grid">
        <a class="tile" href="#/lernen"><div class="ico">🃏</div><b>Karteikarten</b><small>Wortschatz nach Themen</small></a>
        <a class="tile" href="#/sprechen"><div class="ico">🎙️</div><b>Sprechen</b><small>Prüfungsfragen & Bilder</small></a>
        <a class="tile" href="#/verstehen"><div class="ico">👂</div><b>Verstehen</b><small>Hörtexte A2 & B1</small></a>
        <a class="tile" href="#/ich"><div class="ico">⭐</div><b>Meine Vorstellung</b><small>Persönlicher Text</small></a>
        <a class="tile" href="#/simulation"><div class="ico">⏱️</div><b>Prüfungssimulation</b><small>${state.sims.length ? `Zuletzt: Hören ${state.sims[state.sims.length - 1].r}/${state.sims[state.sims.length - 1].t}` : "Kompletter Durchlauf"}</small></a>
        <a class="tile" href="#/quiz"><div class="ico">✅</div><b>Quiz</b><small>Wortschatz testen</small></a>
      </div>
      <h2>Vivre ensemble</h2>
      <div class="grid">
        <a class="tile" href="#/vivre"><div class="ico">🇱🇺</div><b>Landeskunde</b><small>${VIVRE.length} Übungsfragen in drei Fächern</small></a>
        <a class="tile" href="#/vivre/examen"><div class="ico">🎓</div><b>Prüfung simulieren</b><small>${state.vivreSims && state.vivreSims.length ? `Zuletzt: ${state.vivreSims[state.vivreSims.length - 1].r}/40` : "40 Fragen in 60 Minuten"}</small></a>
      </div>
      <details class="more-tools"><summary>Mehr Übungen & Nachschlagen</summary>
        <div class="grid">
          <a class="tile" href="#/stemmen"><div class="ico">🗣️</div><b>Echte Stimmen</b><small>Sätze von Muttersprachlern</small></a>
          <a class="tile" href="#/satzbau"><div class="ico">🧩</div><b>Satzbau</b><small>Sätze zusammensetzen</small></a>
          <a class="tile" href="#/zuelen"><div class="ico">🔢</div><b>Zahlen & Uhrzeit</b><small>Hörtraining</small></a>
          <a class="tile" href="#/verben"><div class="ico">🔤</div><b>Verben</b><small>Gegenwart & Perfekt</small></a>
          <a class="tile" href="#/grammatik"><div class="ico">📐</div><b>Grammatik</b><small>Das Nötigste für A2</small></a>
          <a class="tile" href="#/pruefung"><div class="ico">📋</div><b>Die Prüfung</b><small>Ablauf & Tipps</small></a>
        </div>
      </details>`);
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
      <a class="tile star" style="margin-bottom:12px" href="#/pass"><b>⭐ Mein Lernpass</b><small>Stempel, Bereitschaft und Wochenrückblick</small></a>
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
