// Hörtraining für Zahlen, Uhrzeiten, Preise und Jahreszahlen.
// Jeder Eintrag: { key (Audiodatei), lb (gesprochener Text), show (Lösung in Ziffern), val (zum Sortieren) }
window.LUX_TRAIN = (() => {
  "use strict";
  const num = window.LUX_ME.num;
  const n100 = (n) => (n === 100 ? "honnert" : num(n));
  const hour = (h) => (h === 1 ? "eng" : h === 2 ? "zwou" : num(h)); // d'Auer ass weiblech: eng Auer, zwou Auer
  const pad = (n) => String(n).padStart(2, "0");

  const zuelen = [];
  for (let n = 1; n <= 100; n++) zuelen.push({ key: `n-${n}`, lb: n100(n), show: String(n), val: n });

  const auer = [];
  const clock = (h, m, lb) => auer.push({ key: `t-${pad(h)}${pad(m)}`, lb: `Et ass ${lb}.`, show: `${h}:${pad(m)}`, val: h * 60 + m });
  for (let h = 1; h <= 12; h++) {
    const next = h === 12 ? 1 : h + 1;
    clock(h, 0, `${hour(h)} Auer`);
    if (h < 3 || next < 3) continue; // Formen ohne "Auer" nur mit Stunden ab drei
    clock(h, 15, `Véierel op ${hour(h)}`);
    clock(h, 30, `hallwer ${hour(next)}`);
    clock(h, 45, `Véierel vir ${hour(next)}`);
    if (h % 3 === 0) {
      clock(h, 5, `fënnef op ${hour(h)}`);
      clock(h, 10, `zéng op ${hour(h)}`);
      clock(h, 20, `zwanzeg op ${hour(h)}`);
      clock(h, 40, `zwanzeg vir ${hour(next)}`);
      clock(h, 50, `zéng vir ${hour(next)}`);
      clock(h, 55, `fënnef vir ${hour(next)}`);
    }
  }
  // offizielle Angaben wie in Durchsagen
  [[6, 30], [7, 55], [8, 12], [9, 48], [11, 20], [13, 20], [14, 45], [15, 10], [16, 30], [17, 15], [18, 40], [19, 5], [20, 50], [21, 25], [22, 35], [23, 10]]
    .forEach(([h, m]) => auer.push({ key: `o-${pad(h)}${pad(m)}`, lb: `${num(h)} Auer ${num(m)}`, show: `${h}:${pad(m)} Auer`, val: h * 60 + m }));

  const praisser = [[2, 50], [3, 99], [4, 20], [5, 75], [7, 90], [9, 50], [12, 0], [14, 95], [15, 30], [18, 60], [19, 99], [21, 40], [24, 0], [25, 50],
    [29, 90], [33, 10], [35, 0], [42, 80], [45, 25], [49, 99], [55, 0], [58, 70], [63, 45], [67, 15], [72, 0], [75, 60], [80, 0], [84, 35], [90, 50], [99, 95]]
    .map(([e, c]) => ({ key: `p-${e}-${pad(c)}`, lb: `${num(e)} Euro${c ? " " + num(c) : ""}`, show: `${e},${pad(c)} €`, val: e * 100 + c }));

  const joren = [1965, 1972, 1980, 1984, 1989, 1990, 1995, 1998, 1999, 2000, 2003, 2005, 2008, 2010, 2012, 2015, 2016, 2018, 2019, 2020, 2022, 2023, 2024, 2025, 2026]
    .map((y) => ({ key: `y-${y}`, lb: (y < 2000 ? "nonzénghonnert" : "zweedausend") + (y % 100 ? num(y % 100) : ""), show: String(y), val: y }));

  return {
    sets: [
      { id: "zuelen", icon: "🔢", title: "Zahlen 1–100", items: zuelen },
      { id: "auer", icon: "🕒", title: "Uhrzeiten", items: auer },
      { id: "praisser", icon: "💶", title: "Preise", items: praisser },
      { id: "joren", icon: "📅", title: "Jahreszahlen", items: joren }
    ]
  };
})();
