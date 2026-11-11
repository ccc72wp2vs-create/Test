// Persönliche Vorstellung: setzt aus den eigenen Angaben einen luxemburgischen Text zusammen.
// Wörter und Formen sind gegen LOD.lu geprüft; die Sätze entstehen aus festen Bausteinen.
window.LUX_ME = (() => {
  "use strict";

  // n-Regel: -n fällt weg, außer vor Vokal und vor n, d, t, z, h
  const keepsN = (next) => /^[aeiouäëéèêöüy'ndtzh]/i.test(next || "");
  const nr = (word, next) => (keepsN(next) ? word : word.replace(/nn?$/, ""));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  const UNITS = ["", "een", "zwee", "dräi", "véier", "fënnef", "sechs", "siwen", "aacht", "néng"];
  const TEENS = ["zéng", "eelef", "zwielef", "dräizéng", "véierzéng", "fofzéng", "siechzéng", "siwwenzéng", "uechtzéng", "nonzéng"];
  const TENS = ["", "", "zwanzeg", "drësseg", "véierzeg", "fofzeg", "sechzeg", "siwwenzeg", "achtzeg", "nonzeg"];
  function num(n) {
    n = Math.floor(Number(n));
    if (!(n >= 1 && n <= 99)) return String(n);
    if (n === 1) return "eent";
    if (n < 10) return UNITS[n];
    if (n < 20) return TEENS[n - 10];
    const t = TENS[Math.floor(n / 10)], u = n % 10;
    return u ? UNITS[u] + nr("an", t) + t : t;
  }
  // Liste mit "an" verbinden: A, B an C
  function join(items) {
    if (items.length < 2) return items.join("");
    const last = items[items.length - 1];
    return items.slice(0, -1).join(", ") + " " + nr("an", last) + " " + last;
  }
  const joinDe = (items) => (items.length < 2 ? items.join("") : items.slice(0, -1).join(", ") + " und " + items[items.length - 1]);

  const COUNTRIES = [
    ["Däitschland", "aus Däitschland", "Deutschland"], ["Frankräich", "aus Frankräich", "Frankreich"],
    ["Belsch", "aus der Belsch", "Belgien"], ["Portugal", "aus Portugal", "Portugal"],
    ["Italien", "aus Italien", "Italien"], ["Spuenien", "aus Spuenien", "Spanien"],
    ["Holland", "aus Holland", "den Niederlanden"], ["England", "aus England", "England"],
    ["Irland", "aus Irland", "Irland"], ["Éisträich", "aus Éisträich", "Österreich"],
    ["Schwäiz", "aus der Schwäiz", "der Schweiz"], ["Polen", "aus Polen", "Polen"],
    ["Rumänien", "aus Rumänien", "Rumänien"], ["Bulgarien", "aus Bulgarien", "Bulgarien"],
    ["Ungarn", "aus Ungarn", "Ungarn"], ["Griicheland", "aus Griicheland", "Griechenland"],
    ["Kroatien", "aus Kroatien", "Kroatien"], ["Serbien", "aus Serbien", "Serbien"],
    ["Bosnien-Herzegowina", "aus Bosnien-Herzegowina", "Bosnien-Herzegowina"], ["Montenegro", "aus Montenegro", "Montenegro"],
    ["Albanien", "aus Albanien", "Albanien"], ["Kosovo", "aus dem Kosovo", "dem Kosovo"],
    ["Ukrain", "aus der Ukrain", "der Ukraine"], ["Russland", "aus Russland", "Russland"],
    ["Tierkei", "aus der Tierkei", "der Türkei"], ["Syrien", "aus Syrien", "Syrien"],
    ["Iran", "aus dem Iran", "dem Iran"], ["Irak", "aus dem Irak", "dem Irak"],
    ["Afghanistan", "aus Afghanistan", "Afghanistan"], ["Eritrea", "aus Eritrea", "Eritrea"],
    ["Marokko", "aus Marokko", "Marokko"], ["Tunesien", "aus Tunesien", "Tunesien"],
    ["Algerien", "aus Algerien", "Algerien"], ["Cap Vert", "aus dem Cap Vert", "Kap Verde"],
    ["Brasilien", "aus Brasilien", "Brasilien"], ["USA", "aus den USA", "den USA"],
    ["China", "aus China", "China"], ["Indien", "aus Indien", "Indien"]
  ];
  const LANGS = [
    ["Däitsch", "Deutsch"], ["Franséisch", "Französisch"], ["Englesch", "Englisch"], ["Portugisesch", "Portugiesisch"],
    ["Italieenesch", "Italienisch"], ["Spuenesch", "Spanisch"], ["Hollännesch", "Niederländisch"], ["Polnesch", "Polnisch"],
    ["Russesch", "Russisch"], ["Tierkesch", "Türkisch"], ["Arabesch", "Arabisch"]
  ];
  const STATUS = [
    ["bestuet", "verheiratet", "Ech si bestuet.", "Ich bin verheiratet."],
    ["partner", "in Partnerschaft (mit Partner)", "Ech liewe mat mengem Partner zesummen.", "Ich lebe mit meinem Partner zusammen."],
    ["partnerin", "in Partnerschaft (mit Partnerin)", "Ech liewe mat menger Partnerin zesummen.", "Ich lebe mit meiner Partnerin zusammen."],
    ["ledeg", "ledig", "Ech si celibataire.", "Ich bin ledig."],
    ["gescheet", "geschieden", "Ech si gescheet.", "Ich bin geschieden."],
    ["wittmann", "verwitwet (Mann)", "Ech si Wittmann.", "Ich bin Witwer."],
    ["wittfra", "verwitwet (Frau)", "Ech si Wittfra.", "Ich bin Witwe."]
  ];
  const HOME = [["appartement", "in einer Wohnung", "an engem Appartement", "in einer Wohnung"], ["haus", "in einem Haus", "an engem Haus", "in einem Haus"]];
  const WITH = [
    ["eleng", "allein", "eleng", "allein"], ["famill", "mit meiner Familie", "mat menger Famill", "mit meiner Familie"],
    ["mann", "mit meinem Mann", "mat mengem Mann", "mit meinem Mann"], ["fra", "mit meiner Frau", "mat menger Fra", "mit meiner Frau"],
    ["partner", "mit meinem Partner", "mat mengem Partner", "mit meinem Partner"], ["partnerin", "mit meiner Partnerin", "mat menger Partnerin", "mit meiner Partnerin"],
    ["elteren", "mit meinen Eltern", "mat mengen Elteren", "mit meinen Eltern"]
  ];
  const WORK = [
    ["schaffen", "Ich arbeite"], ["sichen", "Ich suche Arbeit"], ["pensioun", "Ich bin in Rente"],
    ["studium", "Ich studiere"], ["doheem", "Ich bin zu Hause (Familie)"]
  ];
  const JOBS = ["Verkeefer", "Verkeeferin", "Infirmier", "Infirmière", "Krankeschwëster", "Enseignant", "Léierin", "Educateur", "Kach", "Kächen",
    "Serveur", "Chauffer", "Comptabel", "Sekretärin", "Employé", "Fonctionnaire", "Informatiker", "Ingenieur", "Dokter", "Doktesch",
    "Handwierker", "Bauaarbechter", "Mecanicien", "Coiffer", "Botzfra"];
  const HOBBIES = [
    ["liesen", "Lesen", "ech liese gär", "ich lese gern"], ["kachen", "Kochen", "ech kache gär", "ich koche gern"],
    ["spadseieren", "Spazierengehen", "ech gi gär spadséieren", "ich gehe gern spazieren"], ["wanderen", "Wandern", "ech gi gär wanderen", "ich gehe gern wandern"],
    ["velo", "Radfahren", "ech fuere gär Vëlo", "ich fahre gern Fahrrad"], ["schwammen", "Schwimmen", "ech schwamme gär", "ich schwimme gern"],
    ["sport", "Sport", "ech maache gär Sport", "ich mache gern Sport"], ["fussball", "Fußball", "ech spille gär Fussball", "ich spiele gern Fußball"],
    ["musek", "Musik hören", "ech lauschtere gär Musek", "ich höre gern Musik"], ["filmer", "Filme", "ech kucke gär Filmer", "ich schaue gern Filme"],
    ["reesen", "Reisen", "ech reese gär", "ich reise gern"], ["frenn", "Freunde treffen", "ech treffe gär meng Frënn", "ich treffe gern meine Freunde"],
    ["gaart", "Garten", "ech schaffe gär am Gaart", "ich arbeite gern im Garten"], ["danzen", "Tanzen", "ech danze gär", "ich tanze gern"],
    ["sangen", "Singen", "ech sange gär", "ich singe gern"]
  ];
  const REASONS = [
    ["nat", "für die Staatsbürgerschaft", "well ech d'Lëtzebuerger Nationalitéit wëll kréien", "weil ich die luxemburgische Staatsangehörigkeit bekommen möchte"],
    ["doheem", "ich bin hier zu Hause", "well ech hei doheem sinn", "weil ich hier zu Hause bin"],
    ["leit", "um mit den Leuten zu sprechen", "well ech mat de Leit Lëtzebuergesch wëll schwätzen", "weil ich mit den Leuten Luxemburgisch sprechen möchte"],
    ["kanner", "meine Kinder gehen hier zur Schule", "well meng Kanner hei an d'Schoul ginn", "weil meine Kinder hier zur Schule gehen"],
    ["aarbecht", "für die Arbeit", "well ech et fir meng Aarbecht brauch", "weil ich es für meine Arbeit brauche"]
  ];
  const LIKES = [
    ["natur", "die Natur", "d'Natur", "die Natur"], ["leit", "die Leute", "d'Leit", "die Leute"],
    ["sproochen", "die vielen Sprachen", "déi vill Sproochen", "die vielen Sprachen"],
    ["secherheet", "die Sicherheit", "d'Sécherheet", "die Sicherheit"], ["aarbecht", "meine Arbeit", "meng Aarbecht", "meine Arbeit"]
  ];
  const pick = (list, id) => list.find((x) => x[0] === id);
  const picks = (list, ids) => (ids || []).map((id) => pick(list, id)).filter(Boolean);
  const isCity = (s) => /^(luxemburg|lëtzebuerg|luxembourg)([- ]?(stadt|stad|ville))?$/i.test(s) || /^(d'|an der )?stad$/i.test(s);

  // Liefert die Sätze der Vorstellung: [{ lb, de }]
  function build(d) {
    const out = [];
    const add = (lb, de) => out.push({ lb, de });
    const t = (k) => String(d[k] || "").replace(/\s+/g, " ").trim();
    const n = (k) => { const v = parseInt(d[k], 10); return v >= 0 && v <= 99 ? v : null; };

    if (t("name")) add(`Moien! Ech heeschen ${t("name")}.`, `Hallo! Ich heiße ${t("name")}.`);
    const age = n("age");
    if (age) add(`Ech ${nr("sinn", num(age))} ${num(age)} Joer al.`, `Ich bin ${age} Jahre alt.`);

    const c = pick(COUNTRIES, d.country);
    if (c) add(`Ech kommen ${c[1]}.`, `Ich komme aus ${c[2]}.`);
    else if (t("countryOther")) add(`Ech kommen aus ${t("countryOther")}.`, `Ich komme aus ${t("countryOther")}.`);

    const years = n("years"), town = t("town");
    const where = town ? (isCity(town) ? "an der Stad" : `zu ${town}`) : "";
    const whereDe = town ? (isCity(town) ? "in der Stadt Luxemburg" : `in ${town}`) : "";
    if (years) {
      const since = years === 1 ? "zënter engem Joer" : `zënter ${num(years)} Joer`;
      const sinceDe = years === 1 ? "seit einem Jahr" : `seit ${years} Jahren`;
      add(`Ech wunnen ${since} zu Lëtzebuerg${where ? ", " + where : ""}.`, `Ich wohne ${sinceDe} in Luxemburg${whereDe ? ", " + whereDe : ""}.`);
    } else if (where) add(`Ech wunnen ${where}.`, `Ich wohne ${whereDe}.`);

    const home = pick(HOME, d.home), wth = pick(WITH, d.livesWith);
    if (home || wth) {
      const parts = [home && home[2], wth && wth[2]].filter(Boolean);
      add(`Ech ${nr("wunnen", parts[0])} ${parts.join(" ")}.`, `Ich wohne ${[home && home[3], wth && wth[3]].filter(Boolean).join(" ")}.`);
    }

    const st = pick(STATUS, d.status);
    if (st) add(st[2], st[3]);

    const sons = n("sons") || 0, daughters = n("daughters") || 0, kids = sons + daughters;
    if (d.kids === "none") add("Ech hu keng Kanner.", "Ich habe keine Kinder.");
    else if (kids) {
      const s = sons === 1 ? "e Jong" : sons === 2 ? "zwéi Jongen" : sons ? `${num(sons)} Jongen` : "";
      const g = daughters === 1 ? "eng Duechter" : daughters === 2 ? "zwou Duechteren" : daughters ? `${num(daughters)} Duechteren` : "";
      const sDe = sons === 1 ? "einen Sohn" : sons ? `${sons} Söhne` : "";
      const gDe = daughters === 1 ? "eine Tochter" : daughters ? `${daughters} Töchter` : "";
      const total = kids === 1 ? "ee Kand" : `${num(kids)} Kanner`;
      add(`Ech ${nr("hunn", total)} ${total}, ${join([s, g].filter(Boolean))}.`,
        `Ich habe ${kids === 1 ? "ein Kind" : kids + " Kinder"}, ${joinDe([sDe, gDe].filter(Boolean))}.`);
    }

    const job = t("job"), emp = t("employer"), wp = t("workplace");
    if (d.work === "schaffen" && (job || emp || wp)) {
      const parts = [job && `als ${job}`, emp && `bei ${emp}`, wp && (isCity(wp) ? "an der Stad" : `zu ${wp}`)].filter(Boolean);
      const partsDe = [job && `als ${job}`, emp && `bei ${emp}`, wp && (isCity(wp) ? "in der Stadt Luxemburg" : `in ${wp}`)].filter(Boolean);
      add(`Ech ${nr("schaffen", parts[0])} ${parts.join(" ")}.`, `Ich arbeite ${partsDe.join(" ")}.`);
    } else if (d.work === "sichen") add("Ech sichen am Moment eng Aarbecht.", "Ich suche im Moment eine Arbeit.");
    else if (d.work === "pensioun") add("Ech sinn an der Pensioun.", "Ich bin in Rente.");
    else if (d.work === "studium") add("Ech studéieren.", "Ich studiere.");
    else if (d.work === "doheem") add("Ech sinn doheem a këmmere mech ëm meng Famill.", "Ich bin zu Hause und kümmere mich um meine Familie.");

    const mother = pick(LANGS, d.mother);
    const langs = picks(LANGS, d.langs).filter((l) => !mother || l[0] !== mother[0]);
    if (mother) add(`Meng Mammesprooch ass ${mother[0]}.`, `Meine Muttersprache ist ${mother[1]}.`);
    if (langs.length) {
      const first = mother ? "och" : langs[0][0];
      add(`Ech ${nr("schwätzen", first)} ${mother ? "och " : ""}${join(langs.map((l) => l[0]))}.`,
        `Ich spreche ${mother ? "auch " : ""}${joinDe(langs.map((l) => l[1]))}.`);
    }

    const hob = picks(HOBBIES, d.hobbies);
    if (hob.length) add(cap(join(hob.map((h) => h[2]))) + ".", cap(joinDe(hob.map((h) => h[3]))) + ".");

    const likes = picks(LIKES, d.likes);
    if (likes.length) add(`Ech hu Lëtzebuerg gär, besonnesch ${join(likes.map((l) => l[2]))}.`, `Ich mag Luxemburg, besonders ${joinDe(likes.map((l) => l[3]))}.`);

    const rs = picks(REASONS, d.reasons);
    if (rs.length) add(`Ech léiere Lëtzebuergesch, ${rs.map((r) => r[2]).join(" a ")}.`, `Ich lerne Luxemburgisch, ${rs.map((r) => r[3]).join(" und ")}.`);
    return out;
  }

  return { build, num, COUNTRIES, LANGS, STATUS, HOME, WITH, WORK, JOBS, HOBBIES, REASONS, LIKES };
})();
