// Designsprache "Luftpost & Löwe": eigenes Icon-Set, Maskottchen, Illustrationen und kleine Effekte.
// Die Icons sind zweifarbig mit leicht versetzter Farbfläche – wie ein Druck, bei dem die Farbe nicht ganz im Register sitzt.
window.LUX_UI = (() => {
  "use strict";
  const svg = (fill, stroke) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${fill ? `<g class="ic-f">${fill}</g>` : ""}<g class="ic-s">${stroke || fill}</g></svg>`;
  const P = (d) => `<path d="${d}"/>`;
  const both = (shape) => svg(shape, shape);

  const ICONS = {
    home: svg(P("M4 11l8-7 8 7v8.500H4z"), P("M3.500 11.500L12 4l8.500 7.500M5.500 10v9.500h13V10M10 19.500v-5h4v5")),
    cards: svg(`<rect x="7" y="5.500" width="12" height="14" rx="2"/>`, `<rect x="6.500" y="5" width="12" height="14" rx="2"/>` + P("M4 8v9.500a2 2 0 0 0 2 2M10 9.500h5M10 13h3")),
    quiz: svg(`<circle cx="12" cy="12" r="8.500"/>`, `<circle cx="12" cy="12" r="8.500"/>` + P("M8 12.500l2.800 2.800L16.200 9")),
    mic: svg(`<rect x="9" y="3" width="6" height="11" rx="3"/>`, `<rect x="9" y="3" width="6" height="11" rx="3"/>` + P("M5.500 11.500a6.500 6.500 0 0 0 13 0M12 18v3M9 21h6")),
    more: svg(`<rect x="4" y="5" width="5" height="15" rx="1"/><rect x="10.500" y="8" width="4.500" height="12" rx="1"/>`, `<rect x="4" y="5" width="5" height="15" rx="1"/><rect x="10.500" y="8" width="4.500" height="12" rx="1"/>` + P("M16.500 9.500l3.300-.900 2.400 10-3.300.900zM5.500 9h2M12 11.500h1.500")),
    ear: svg(P("M7 10a5.500 5.500 0 0 1 11 0c0 3-2.500 3.600-2.500 6.500a3.200 3.200 0 0 1-6 1.300z"), P("M7 10a5.500 5.500 0 0 1 11 0c0 3-2.500 3.600-2.500 6.500a3.200 3.200 0 0 1-6 1.300M10 10.500a2.600 2.600 0 0 1 5-.600c.300 1.300-1.200 1.800-1.600 3M3.200 8c-.700 1.600-.700 3.400 0 5")),
    ruler: svg(P("M4 15L15 4l5 5L9 20z"), P("M4 15L15 4l5 5L9 20zM8 11l1.800 1.800M11 8l1.800 1.800M14 5l1.800 1.800")),
    cap: svg(P("M2.500 9.500L12 5l9.500 4.500L12 14z"), P("M2.500 9.500L12 5l9.500 4.500L12 14zM6.500 12v4.200c1.500 1.400 3.400 2 5.500 2s4-.600 5.500-2V12M21.500 9.500V15")),
    numbers: svg(`<rect x="4" y="4" width="16" height="16" rx="3"/>`, `<rect x="4" y="4" width="16" height="16" rx="3"/>` + P("M8 9.500l1.500-1V15M12.500 9.200c.300-1 2.800-1.200 2.900.500.100 1.400-2.900 2.700-2.900 5.300h3.200")),
    timer: svg(`<circle cx="12" cy="13.500" r="7.500"/>`, `<circle cx="12" cy="13.500" r="7.500"/>` + P("M12 13.500V9.500M10 3h4M12 3v3M18.500 7l1-1")),
    star: both(P("M12 3.500l2.600 5.400 5.900.800-4.300 4.100 1 5.900L12 16.900l-5.200 2.800 1-5.900L3.500 9.700l5.900-.800z")),
    voices: svg(P("M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"), P("M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM19.500 9.500H20a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2v2.500L17 18h-4M6.500 9.500h.010M9.500 9.500h.010M12.500 9.500h.010")),
    puzzle: both(P("M5 8h4.200a2 2 0 1 1 3.600 0H17v4.200a2 2 0 1 1 0 3.600V20H5z")),
    verbs: svg(`<rect x="3" y="5" width="18" height="14" rx="3"/>`, `<rect x="3" y="5" width="18" height="14" rx="3"/>` + P("M6.500 15.500l2.500-7 2.500 7M7.400 13.200h3.200M17.500 11.500v4M17.500 13.600a1.900 1.900 0 1 0 0 .100")),
    flame: both(P("M12 3c.500 3 4.500 4.800 4.500 9.500a4.500 4.500 0 0 1-9 0c0-1.600.700-2.800 1.600-3.700.200 1.300.900 2 1.700 2.200C10.200 8.500 10.800 5.500 12 3z")),
    list: svg(`<rect x="5" y="4" width="14" height="17" rx="2"/>`, `<rect x="5" y="4" width="14" height="17" rx="2"/>` + P("M9 3h6v3H9zM8.500 11l1.200 1.200 2-2.200M14 11.200h2M8.500 15.500l1.200 1.200 2-2.200M14 15.700h2")),
    picture: svg(`<rect x="3.500" y="5" width="17" height="14" rx="2"/>`, `<rect x="3.500" y="5" width="17" height="14" rx="2"/><circle cx="15.500" cy="9.500" r="1.500"/>` + P("M3.500 16l4.500-4.500 3.500 3.500 2.500-2.500 6.500 6.500")),
    user: both(`<circle cx="12" cy="8.500" r="4"/>` + P("M4.500 20a7.500 7.500 0 0 1 15 0z")),
    speaker: svg(P("M4 9.500h3.500L12 6v12l-4.500-3.500H4z"), P("M4 9.500h3.500L12 6v12l-4.500-3.500H4zM15.500 9.500a3.500 3.500 0 0 1 0 5M18 7a7 7 0 0 1 0 10")),
    play: both(P("M8 5.500v13l10.500-6.500z")),
    rec: both(`<circle cx="12" cy="12" r="6"/>`),
    stop: both(`<rect x="7" y="7" width="10" height="10" rx="2"/>`),
    dice: svg(`<rect x="4" y="4" width="16" height="16" rx="4"/>`, `<rect x="4" y="4" width="16" height="16" rx="4"/>` + P("M8.500 8.500h.010M15.500 15.500h.010M12 12h.010M15.500 8.500h.010M8.500 15.500h.010")),
    refresh: svg("", P("M19.500 12a7.500 7.500 0 1 1-2.300-5.400M19.500 4.500v4h-4")),
    pencil: svg(P("M5 19l1-4L16 5l3 3L9 18z"), P("M5 19l1-4L16 5l3 3L9 18zM14 7l3 3")),
    chat: svg(P("M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 3.500V17H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z"), P("M4 5h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8l-5 3.500V17H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM7 9.500h10M7 13h6")),
    file: svg(P("M6 3h8l5 5v13H6z"), P("M6 3h8l5 5v13H6zM14 3v5h5M9 13h7M9 16.500h5")),
    print: svg(`<rect x="4" y="9" width="16" height="8" rx="2"/>`, `<rect x="4" y="9" width="16" height="8" rx="2"/>` + P("M7 9V4h10v5M7 14h10v6H7z")),
    spark: svg(P("M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800z"), P("M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 15.500v3M17.500 17h3M5 16.500v2M4 17.500h2")),
    hello: svg(`<circle cx="12" cy="12" r="8.500"/>`, `<circle cx="12" cy="12" r="8.500"/>` + P("M8.500 13.500a4 4 0 0 0 7 0M9 9.500h.010M15 9.500h.010")),
    clover: svg(`<circle cx="9" cy="8.500" r="3.200"/><circle cx="15" cy="8.500" r="3.200"/><circle cx="9" cy="14.500" r="3.200"/><circle cx="15" cy="14.500" r="3.200"/>`, `<circle cx="9" cy="8.500" r="3.200"/><circle cx="15" cy="8.500" r="3.200"/><circle cx="9" cy="14.500" r="3.200"/><circle cx="15" cy="14.500" r="3.200"/>` + P("M12.500 12.500c2 2 3.500 4.500 4.500 8")),
    calendar: svg(`<rect x="4" y="6" width="16" height="14" rx="2"/>`, `<rect x="4" y="6" width="16" height="14" rx="2"/>` + P("M4 10.500h16M8 4v4M16 4v4M8 14h2M12.500 14h2")),
    euro: svg(`<circle cx="12" cy="12" r="8.500"/>`, `<circle cx="12" cy="12" r="8.500"/>` + P("M15 8.800a4.200 4.200 0 1 0 0 6.400M7 11h6M7 13.500h5")),
    clock: svg(`<circle cx="12" cy="12" r="8.500"/>`, `<circle cx="12" cy="12" r="8.500"/>` + P("M12 7.500V12l3 2")),
    briefcase: svg(`<rect x="3.500" y="8" width="17" height="11" rx="2"/>`, `<rect x="3.500" y="8" width="17" height="11" rx="2"/>` + P("M9 8V6a1.500 1.500 0 0 1 1.500-1.500h3A1.500 1.500 0 0 1 15 6v2M3.500 13h17")),
    family: svg(`<circle cx="8" cy="8" r="3"/><circle cx="16.500" cy="9.500" r="2.300"/>`, `<circle cx="8" cy="8" r="3"/><circle cx="16.500" cy="9.500" r="2.300"/>` + P("M2.500 19.500a5.500 5.500 0 0 1 11 0M14.500 19.500a3.500 3.500 0 0 1 7 0")),
    basket: svg(P("M4 10h16l-1.700 9H5.700z"), P("M4 10h16l-1.700 9H5.700zM8.500 10L11 4.500M15.500 10L13 4.500M9 13.500V16M12 13.500V16M15 13.500V16")),
    health: svg(P("M12 20s-7.500-4.300-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.700-7.500 10-7.500 10z"), P("M12 20s-7.500-4.300-7.500-10A4.300 4.300 0 0 1 12 7.500 4.300 4.300 0 0 1 19.500 10c0 5.700-7.500 10-7.500 10zM12 10.500v4M10 12.500h4")),
    bike: svg(`<circle cx="6" cy="16" r="3.500"/><circle cx="18" cy="16" r="3.500"/>`, `<circle cx="6" cy="16" r="3.500"/><circle cx="18" cy="16" r="3.500"/>` + P("M6 16l3.500-7h5l3.500 7M9.500 9L12 16M13 6.500h2.500")),
    bus: svg(`<rect x="4" y="4.500" width="16" height="13" rx="3"/>`, `<rect x="4" y="4.500" width="16" height="13" rx="3"/>` + P("M4 11.500h16M8 20v-2.500M16 20v-2.500M7.500 14.500h.010M16.500 14.500h.010")),
    weather: svg(`<circle cx="9" cy="9" r="3.500"/>`, `<circle cx="9" cy="9" r="3.500"/>` + P("M9 2.500V4M2.500 9H4M4.500 4.500l1 1M8 19.500h9a3.500 3.500 0 0 0 .300-7 5 5 0 0 0-9.300 1.500A2.800 2.800 0 0 0 8 19.500z")),
    bulb: svg(P("M8.500 14.500a6 6 0 1 1 7 0V17h-7z"), P("M8.500 14.500a6 6 0 1 1 7 0V17h-7zM9.500 20.500h5")),
    link: svg("", P("M10 14a4 4 0 0 0 5.700 0l3-3a4 4 0 0 0-5.700-5.700l-1 1M14 10a4 4 0 0 0-5.700 0l-3 3a4 4 0 0 0 5.700 5.700l1-1")),
    tick: svg("", P("M5 12.500l4.500 4.500L19 7.500")),
    cross: svg("", P("M6.500 6.500l11 11M17.500 6.500l-11 11")),
    flaglu: `<svg class="ic flag" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.500" y="5" width="19" height="14" rx="2.500" fill="#fff"/><path d="M2.500 7.500A2.500 2.500 0 0 1 5 5h14a2.500 2.500 0 0 1 2.500 2.500v2.200h-19z" fill="#D7263D"/><path d="M2.500 14.300h19v2.200A2.500 2.500 0 0 1 19 19H5a2.500 2.500 0 0 1-2.500-2.500z" fill="#1C9BD7"/><rect x="2.500" y="5" width="19" height="14" rx="2.500" fill="none" stroke="currentColor" stroke-width="1.500"/></svg>`,
    flagde: `<svg class="ic flag" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.500" y="5" width="19" height="14" rx="2.500" fill="#D7263D"/><path d="M2.500 7.500A2.500 2.500 0 0 1 5 5h14a2.500 2.500 0 0 1 2.500 2.500v2.200h-19z" fill="#1B2440"/><path d="M2.500 14.300h19v2.200A2.500 2.500 0 0 1 19 19H5a2.500 2.500 0 0 1-2.500-2.500z" fill="#F2B33D"/><rect x="2.500" y="5" width="19" height="14" rx="2.500" fill="none" stroke="currentColor" stroke-width="1.500"/></svg>`
  };
  const icon = (name) => ICONS[name] || "";
  const okBadge = `<span class="badge-ok">${ICONS.tick}</span>`, noBadge = `<span class="badge-no">${ICONS.cross}</span>`;

  // ----- Maskottchen: der gekrönte rote Löwe aus dem Wappen -----
  function lion(mood) {
    const scallops = Array.from({ length: 12 }, (_, k) => { const a = (k / 12) * Math.PI * 2; return `<circle cx="${(60 + 41 * Math.cos(a)).toFixed(1)}" cy="${(66 + 41 * Math.sin(a)).toFixed(1)}" r="11.500"/>`; }).join("");
    const eyes = mood === "frou"
      ? `<path d="M44 64q5-7 10 0M66 64q5-7 10 0" fill="none" stroke="#1B2440" stroke-width="3" stroke-linecap="round"/>`
      : `<g class="lion-eyes"><circle cx="49" cy="63" r="3.600" fill="#1B2440"/><circle cx="71" cy="63" r="3.600" fill="#1B2440"/><circle cx="50.200" cy="61.800" r="1.100" fill="#fff"/><circle cx="72.200" cy="61.800" r="1.100" fill="#fff"/></g>`;
    const brows = mood === "staark" ? `<path d="M43 56l9 3M77 56l-9 3" stroke="#1B2440" stroke-width="2.600" stroke-linecap="round"/>` : "";
    const mouth = mood === "frou"
      ? `<path d="M52 80q8 11 16 0z" fill="#8E1524" stroke="#1B2440" stroke-width="2" stroke-linejoin="round"/><path d="M56 85q4 3 8 0" fill="#F2B33D"/>`
      : `<path d="M60 78v3M60 81c-2 3.500-6.500 3.500-7.500 0M60 81c2 3.500 6.500 3.500 7.500 0" fill="none" stroke="#1B2440" stroke-width="2.200" stroke-linecap="round"/>`;
    return `<svg class="lion${mood ? " lion-" + mood : ""}" viewBox="0 0 124 124" role="img" aria-label="Löwe mit Krone">
      <g class="lion-tail"><path d="M92 100c16 4 24-8 18-20" fill="none" stroke="#B51D32" stroke-width="5" stroke-linecap="round"/><circle cx="109" cy="77" r="6.500" fill="#D7263D"/></g>
      <g fill="#D7263D"><circle cx="60" cy="66" r="40"/>${scallops}</g>
      <circle cx="32" cy="38" r="9" fill="#D7263D"/><circle cx="88" cy="38" r="9" fill="#D7263D"/><circle cx="32" cy="38" r="4.500" fill="#F2B33D"/><circle cx="88" cy="38" r="4.500" fill="#F2B33D"/>
      <ellipse cx="60" cy="68" rx="29" ry="27" fill="#F7C873" stroke="#1B2440" stroke-width="2.200"/>
      <ellipse cx="60" cy="79" rx="14" ry="10" fill="#FFF3DA"/>
      <circle cx="40" cy="74" r="4.500" fill="#D7263D" opacity=".28"/><circle cx="80" cy="74" r="4.500" fill="#D7263D" opacity=".28"/>
      ${brows}${eyes}
      <path d="M55.500 72h9l-4.500 5.500z" fill="#1B2440" stroke="#1B2440" stroke-width="2" stroke-linejoin="round"/>${mouth}
      <g class="lion-crown"><path d="M42 33l3-17 8 9.500L60 11l7 14.500 8-9.500 3 17z" fill="#F2B33D" stroke="#1B2440" stroke-width="2.200" stroke-linejoin="round"/>
      <circle cx="45" cy="15" r="2.600" fill="#D7263D" stroke="#1B2440" stroke-width="1.500"/><circle cx="60" cy="10" r="2.600" fill="#1C9BD7" stroke="#1B2440" stroke-width="1.500"/><circle cx="75" cy="15" r="2.600" fill="#D7263D" stroke="#1B2440" stroke-width="1.500"/></g>
    </svg>`;
  }

  // ----- Illustration: Skyline der Stadt Luxemburg (Pont Adolphe, Kathedrale, Gëlle Fra, Bockfelsen) -----
  const skyline = `<svg class="skyline" viewBox="0 0 360 112" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <circle cx="304" cy="30" r="15" fill="#F2B33D"/><g fill="#fff" opacity=".9"><rect x="36" y="18" width="46" height="11" rx="5.500"/><rect x="54" y="11" width="30" height="11" rx="5.500"/><rect x="212" y="12" width="40" height="10" rx="5"/></g>
    <path d="M0 96Q60 62 130 84T260 74t100 14v24H0z" fill="#1C9BD7" opacity=".16"/>
    <g stroke="#1B2440" stroke-width="1.600" stroke-linejoin="round" stroke-linecap="round">
      <g fill="#EAD9B8"><path d="M-4 58h160v8H-4z"/><path d="M16 100V66h14v34zM124 100V66h14v34z"/><path d="M30 100c0-26 18-34 47-34s47 8 47 34" fill="none"/><path d="M40 100c0-20 14-26 37-26s37 6 37 26" fill="none" opacity=".5"/><path d="M46 66v12M58 66v6M96 66v6M108 66v12" fill="none"/></g>
      <g><path d="M176 100V60h40v40z" fill="#EAD9B8"/><path d="M180 60l4-32 4 32zM192 60l4-46 4 46zM204 60l4-32 4 32z" fill="#1B2440"/><path d="M184 100V82a4 4 0 0 1 8 0v18M200 100V82a4 4 0 0 1 8 0v18" fill="#FFFBF3"/><circle cx="196" cy="70" r="3" fill="#D7263D"/></g>
      <g><path d="M238 100l2.500-50h7l2.500 50z" fill="#FFFBF3"/><path d="M233 100h22v-5h-22z" fill="#EAD9B8"/><path d="M244 50v-9M240.500 44.500h7" fill="none" stroke="#F2B33D" stroke-width="3.200"/><circle cx="244" cy="37.500" r="2.800" fill="#F2B33D"/></g>
      <g><path d="M268 100c2-22 12-34 30-36l48 4c8 8 12 20 14 32z" fill="#D9C7A3"/><path d="M284 86h6M300 78h7M318 84h6M332 76h6M306 92h6" fill="none" stroke-width="3.200"/><path d="M308 64V46h14v19z" fill="#EAD9B8"/><path d="M305 46l10-12 10 12z" fill="#D7263D"/></g>
      <g fill="#2E9E6B"><circle cx="164" cy="88" r="8"/><circle cx="226" cy="90" r="6.500"/><circle cx="262" cy="92" r="6"/></g><path d="M164 96v4M226 96.500v3.500M262 98v2" fill="none"/>
      <path d="M-4 100h368" fill="none"/>
    </g>
    <path d="M0 100h360v12H0z" fill="#2E9E6B" opacity=".22"/>
  </svg>`;

  // ----- Emojis im bestehenden Markup durch eigene Icons ersetzen -----
  const MAP = {
    "🏠": "home", "🃏": "cards", "🎙": "mic", "📚": "more", "👂": "ear", "📐": "ruler", "🎓": "cap", "🔢": "numbers", "⏱": "timer", "⭐": "star",
    "🗣": "voices", "🧩": "puzzle", "🔤": "verbs", "🇱🇺": "flaglu", "🇩🇪": "flagde", "🔥": "flame", "📝": "list", "📋": "list", "🖼": "picture", "👤": "user",
    "🔊": "speaker", "▶": "play", "●": "rec", "■": "stop", "🎲": "dice", "🔄": "refresh", "✏": "pencil", "💬": "chat", "📄": "file", "🖨": "print",
    "🎉": "spark", "👍": "hello", "💪": "flame", "👏": "spark", "👋": "hello", "🍀": "clover", "📅": "calendar", "💶": "euro", "🕒": "clock", "💼": "briefcase",
    "👨‍👩‍👧": "family", "🛒": "basket", "🩺": "health", "🚴": "bike", "🚌": "bus", "🌦": "weather", "💡": "bulb", "🔗": "link", "✓": "tick", "✗": "cross"
  };
  const HTML = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [k, ICONS[v]]));
  HTML["✅"] = okBadge; HTML["❌"] = noBadge;
  const MOOD = { "🎉": "frou", "👏": "frou", "👍": "", "💪": "staark" }; // in Überschriften wird daraus der Löwe
  const RE = new RegExp("(" + Object.keys(HTML).sort((a, b) => b.length - a.length).join("|") + ")[\\uFE0E\\uFE0F]?", "g");

  function decorate(root) {
    if (!root || root.nodeType !== 1) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n = walker.nextNode(); n; n = walker.nextNode()) { RE.lastIndex = 0; if (RE.test(n.nodeValue)) hits.push(n); }
    hits.forEach((n) => {
      const el = n.parentElement;
      if (!el || el.closest("svg, .checklist")) return;
      if (el.closest("option, select, textarea")) { n.nodeValue = n.nodeValue.replace(RE, "").trim(); return; }
      const head = el.closest("h2");
      const moodKey = head && Object.keys(MOOD).find((k) => n.nodeValue.includes(k));
      if (head && moodKey && head.parentElement && !head.parentElement.querySelector(":scope > .mascot")) {
        n.nodeValue = n.nodeValue.replace(RE, "").trimEnd();
        head.insertAdjacentHTML("beforebegin", `<div class="mascot">${lion(MOOD[moodKey])}</div>`);
        if (moodKey === "🎉") confetti();
        return;
      }
      const span = document.createElement("span");
      span.innerHTML = n.nodeValue.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])).replace(RE, (m, k) => HTML[k]);
      n.replaceWith(...span.childNodes);
    });
  }

  // ----- Konfetti in den Landesfarben -----
  function confetti() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.querySelector(".confetti")) return;
    const box = document.createElement("div");
    box.className = "confetti";
    const colors = ["#D7263D", "#1C9BD7", "#F2B33D", "#FFFBF3", "#2E9E6B"];
    box.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${colors[i % 5]};animation-delay:${(i % 9) * 60}ms;--dx:${((i * 53) % 120) - 60}px;--rot:${(i * 97) % 720}deg;${i % 3 ? "" : "border-radius:50%;"}"></i>`).join("");
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 2600);
  }

  return { icon, lion, skyline, decorate, confetti };
})();
