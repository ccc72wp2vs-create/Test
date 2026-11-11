#!/usr/bin/env python3
"""Bringt die Szenenbilder (img/*.svg) in den Zeichenstil der App: Tintenkontur und Markenfarben.

Einmalig angewendet; erneutes Ausführen ändert nichts mehr (erkennbar am Attribut data-style).
"""
import glob, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
INK = "#1B2440"
COLORS = {
    # Markenfarben
    "#ed2939": "#D7263D", "#e53935": "#D7263D", "#e23b3b": "#D7263D", "#c0392b": "#D7263D", "#c2185b": "#D7263D", "#b5533c": "#D7263D",
    "#1e63a8": "#1C9BD7", "#00a1de": "#1C9BD7", "#7fc8f0": "#8FD0EE",
    "#f2a900": "#F2B33D", "#ffd23f": "#F2B33D", "#f39c12": "#F2B33D",
    "#3f9b52": "#2E9E6B", "#2e7d5b": "#2E9E6B", "#43a047": "#2E9E6B", "#4caf50": "#2E9E6B",
    "#34495e": INK, "#37474f": INK, "#222222": INK, "#222": INK, "#333": INK, "#444": INK, "#2f5d50": "#1F5A4B",
    # Papiertöne für Hintergründe
    "#bfe3f7": "#DDF0F9", "#c9c2b4": "#EADFC8", "#8fd18a": "#BFE6C8", "#f6ead7": "#FFFBF3", "#b98b5e": "#E0BF85", "#aebccb": "#D3DEE8",
    "#6b7480": "#9AA3B8", "#b9b9b9": "#E9E2D0", "#8d99a6": "#C3CBD9", "#e8f1f5": "#EEF6F9", "#b9c7cf": "#DCE5EA", "#f1ede4": "#F5EFE3",
    "#9c8f7a": "#D3C3A2", "#f3dcc0": "#FBE9CF", "#7a4a3a": "#C98D62", "#f4f6f8": "#F5EFE3", "#cfd6dd": "#E4DAC6", "#fbf3dc": "#FFF6DC",
    "#c9a66b": "#E0BF85", "#eef4e6": "#EDF6E8", "#e3e8ee": "#FFFFFF", "#5f6b7a": "#7C86A0",
}

def restyle(svg):
    if "data-style" in svg:
        return svg
    for old, new in COLORS.items():
        svg = re.sub(re.escape(old) + r"(?![0-9a-fA-F])", new, svg, flags=re.I)
    svg = svg.replace("<text ", '<text stroke="none" ')
    head, body = re.match(r"(<svg[^>]*>)(.*)</svg>\s*$", svg, re.S).groups()
    head = head[:-1] + ' data-style="luftpost">'
    return (f'{head}\n<g stroke="{INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">{body}</g>\n'
            f'<rect x="1" y="1" width="398" height="258" fill="none" stroke="{INK}" stroke-width="2"/>\n</svg>\n')

for path in sorted(glob.glob(os.path.join(ROOT, "img", "*.svg"))):
    src = open(path, encoding="utf-8").read()
    out = restyle(src)
    if out != src:
        open(path, "w", encoding="utf-8").write(out)
        print("neu:", os.path.basename(path))
