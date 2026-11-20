#!/usr/bin/env python3
"""Generates the illustrated balloon invitation backdrops in public/templates/*.svg.

Every file is a self-contained 1080x1500 SVG (no external refs, no text, no foreignObject) so the same-origin canvas
renderer can drawImage() it without tainting. Layout contract with lib/wedding.ts `art`: illustration lives in the
header (y 30-480); an opaque text panel occupies x 80-1000, y 500-1400 and the card text is typeset inside it.
Run: python3 scripts/generate-template-art.py
"""
import math, os, random

W, H = 1080, 1500
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "templates")
os.makedirs(OUT, exist_ok=True)


class Svg:
    def __init__(self):
        self.defs, self.body, self.n = [], [], 0

    def add(self, s): self.body.append(s)

    def grad(self, stops, kind="linear", **kw):
        self.n += 1
        gid = f"g{self.n}"
        attrs = " ".join(f'{k}="{v}"' for k, v in kw.items())
        tag = "linearGradient" if kind == "linear" else "radialGradient"
        st = "".join(f'<stop offset="{o}" stop-color="{c}"' + (f' stop-opacity="{a}"' if a is not None else "") + "/>" for o, c, a in [(s + (None,))[:3] if len(s) == 2 else s for s in stops])
        self.defs.append(f'<{tag} id="{gid}" {attrs}>{st}</{tag}>')
        return f"url(#{gid})"

    def out(self, name):
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">\n<defs>{"".join(self.defs)}</defs>\n' + "\n".join(self.body) + "\n</svg>\n"
        with open(os.path.join(OUT, name + ".svg"), "w") as f: f.write(svg)
        print(name, len(svg) // 1024, "KB")


def gold(s):
    return s.grad([(0, "#7A5712"), (0.25, "#E8C65A"), (0.5, "#FFF1B0"), (0.75, "#C99A2E"), (1, "#7A5712")], x1="0", y1="0", x2="1", y2="1")


def frame(s, g, panel_fill, panel_stroke=None, rx=36, dark=False):
    """Gold double border around the card + the opaque text panel."""
    s.add(f'<rect x="26" y="26" width="{W-52}" height="{H-52}" rx="18" fill="none" stroke="{g}" stroke-width="12"/>')
    s.add(f'<rect x="50" y="50" width="{W-100}" height="{H-100}" rx="10" fill="none" stroke="{g}" stroke-width="2.5"/>')
    for x, y in [(50, 50), (W - 50, 50), (50, H - 50), (W - 50, H - 50)]:
        s.add(f'<circle cx="{x}" cy="{y}" r="14" fill="{g}"/><circle cx="{x}" cy="{y}" r="6" fill="{panel_fill}"/>')
    s.add(f'<rect x="80" y="500" width="920" height="900" rx="{rx}" fill="{panel_fill}" fill-opacity="0.97" stroke="{panel_stroke or g}" stroke-width="3.5"/>')
    s.add(f'<rect x="96" y="516" width="888" height="868" rx="{rx-12}" fill="none" stroke="{g}" stroke-width="1.5" stroke-opacity="0.8"/>')


def divider(s, g, y=480, x=540):
    s.add(f'<path d="M{x-210} {y} H{x-30} M{x+30} {y} H{x+210}" stroke="{g}" stroke-width="3"/>')
    s.add(f'<path d="M{x} {y-14} L{x+14} {y} L{x} {y+14} L{x-14} {y} Z" fill="{g}"/>')
    for dx in (-52, 52): s.add(f'<circle cx="{x+dx}" cy="{y}" r="5" fill="{g}"/>')


def sparkle(s, x, y, r, fill):
    s.add(f'<path d="M{x} {y-r} Q{x+r*0.14} {y-r*0.14} {x+r} {y} Q{x+r*0.14} {y+r*0.14} {x} {y+r} Q{x-r*0.14} {y+r*0.14} {x-r} {y} Q{x-r*0.14} {y-r*0.14} {x} {y-r}Z" fill="{fill}"/>')


# ───────────────────────────── Balloons ─────────────────────────────
def balloon(s, cx, cy, rx, ry, light, base, dark, tilt=0, string=True):
    gid = s.grad([(0, light), (0.45, base), (1, dark)], kind="radial", cx="0.34", cy="0.3", r="0.85")
    s.add(f'<g transform="rotate({tilt} {cx} {cy})">')
    if string:
        s.add(f'<path d="M{cx} {cy+ry+9} C{cx-14} {cy+ry+50} {cx+16} {cy+ry+86} {cx} {cy+ry+130}" stroke="#B9A57A" stroke-width="2.2" fill="none" opacity="0.8"/>')
    s.add(f'<path d="M{cx} {cy-ry} C{cx+rx*1.08} {cy-ry} {cx+rx*1.08} {cy+ry*0.72} {cx} {cy+ry} C{cx-rx*1.08} {cy+ry*0.72} {cx-rx*1.08} {cy-ry} {cx} {cy-ry}Z" fill="{gid}"/>')
    s.add(f'<path d="M{cx-7} {cy+ry+11} L{cx} {cy+ry-1} L{cx+7} {cy+ry+11}Z" fill="{dark}"/>')
    s.add(f'<ellipse cx="{cx-rx*0.38}" cy="{cy-ry*0.45}" rx="{rx*0.16}" ry="{ry*0.28}" fill="#FFFFFF" opacity="0.6" transform="rotate(24 {cx-rx*0.38} {cy-ry*0.45})"/>')
    s.add(f'<ellipse cx="{cx+rx*0.5}" cy="{cy+ry*0.2}" rx="{rx*0.07}" ry="{ry*0.14}" fill="#FFFFFF" opacity="0.28"/>')
    s.add('</g>')


def confetti(s, seed, n, palette, box):
    r = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        x, y, c = r.randint(x0, x1), r.randint(y0, y1), r.choice(palette)
        k = r.random()
        if k < 0.4: s.add(f'<circle cx="{x}" cy="{y}" r="{r.randint(3,7)}" fill="{c}"/>')
        elif k < 0.8: s.add(f'<rect x="{x}" y="{y}" width="{r.randint(6,14)}" height="{r.randint(4,8)}" fill="{c}" transform="rotate({r.randint(0,180)} {x} {y})"/>')
        else: sparkle(s, x, y, r.randint(6, 11), c)


def balloon_luxury():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#FFF6EA"),(0.55,"#F7E6D4"),(1,"#EBD5BC")], x1="0", y1="0", x2="0", y2="1")}"/>')
    glow = s.grad([(0, "#FFFFFF", 0.9), (1, "#FFF6EA", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<ellipse cx="540" cy="260" rx="420" ry="230" fill="{glow}"/>')
    pal = {"gold": ("#FFF0A8", "#E3B84A", "#9A6B12"), "champ": ("#FFF8EA", "#EBD3AE", "#B8956A"), "blush": ("#FFE6E8", "#F0B4BC", "#C9707F"), "rose": ("#FFD7D2", "#E8968F", "#B5514D"), "ivory": ("#FFFFFF", "#F1ECE2", "#C8BFAE"), "mauve": ("#F3DCE8", "#D8A5C0", "#9B5C80")}
    # left cluster
    for (x, y, rx, ry, k, t) in [(150, 250, 74, 92, "gold", -10), (255, 190, 62, 78, "blush", 8), (110, 130, 56, 70, "champ", -6), (225, 330, 60, 76, "ivory", 6), (310, 290, 54, 68, "rose", 12), (62, 330, 50, 64, "mauve", -14)]:
        balloon(s, x, y, rx, ry, *pal[k], tilt=t)
    # right cluster
    for (x, y, rx, ry, k, t) in [(930, 250, 74, 92, "champ", 10), (825, 190, 62, 78, "gold", -8), (970, 130, 56, 70, "blush", 6), (855, 330, 60, 76, "rose", -6), (770, 290, 54, 68, "ivory", -12), (1018, 330, 50, 64, "gold", 14)]:
        balloon(s, x, y, rx, ry, *pal[k], tilt=t)
    # centre number-free medallion
    s.add(f'<circle cx="540" cy="262" r="118" fill="#FFFFFF" fill-opacity="0.7" stroke="{g}" stroke-width="5"/><circle cx="540" cy="262" r="102" fill="none" stroke="{g}" stroke-width="1.8"/>')
    for i in range(16):
        s.add(f'<g transform="translate(540 262) rotate({i*22.5})"><path d="M0 -118 L7 -132 L0 -146 L-7 -132Z" fill="{g}"/></g>')
    sparkle(s, 540, 262, 70, "#E3B84A"); sparkle(s, 540, 262, 36, "#FFF5C8")
    for x, y, r in [(470, 200, 12), (610, 322, 12), (610, 200, 9), (470, 322, 9)]: sparkle(s, x, y, r, "#E3B84A")
    # ribbons
    for sx, d in [(150, 1), (930, -1)]:
        s.add(f'<path d="M{sx} 410 C{sx+60*d} 440 {sx-20*d} 460 {sx+50*d} 490" stroke="{g}" stroke-width="4" fill="none"/><path d="M{sx+40*d} 400 C{sx+100*d} 430 {sx+10*d} 462 {sx+80*d} 490" stroke="#F0B4BC" stroke-width="3" fill="none"/>')
    confetti(s, 4, 70, ["#E3B84A", "#F0B4BC", "#FFFFFF", "#D8A5C0", "#EBD3AE"], (70, 70, 1010, 450))
    divider(s, g)
    frame(s, g, "#FFFAF2")
    s.out("balloon-luxury")


def cloud(s, x, y, sc, fill="#FFFFFF"):
    s.add(f'<g transform="translate({x} {y}) scale({sc})" fill="{fill}"><circle cx="0" cy="0" r="34"/><circle cx="38" cy="-16" r="42"/><circle cx="84" cy="-2" r="34"/><circle cx="46" cy="10" r="36"/><rect x="-20" y="4" width="130" height="36" rx="18"/></g>')


def balloon_kids():
    s = Svg(); g = s.grad([(0, "#F58AA4"), (0.5, "#FFD166"), (1, "#6EC6F0")], x1="0", y1="0", x2="1", y2="0")
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#BDE6FB"),(0.6,"#E6F4FF"),(1,"#FFEFF6")], x1="0", y1="0", x2="0", y2="1")}"/>')
    # bunting
    s.add('<path d="M50 78 Q540 168 1030 78" stroke="#8A7BB5" stroke-width="3" fill="none"/>')
    flags = ["#F2778B", "#FFB84D", "#FFE066", "#7BD389", "#6EC6F0", "#B197FC"]
    for i in range(14):
        t = (i + 0.5) / 14; x = 50 + 980 * t; y = 78 + math.sin(t * math.pi) * 66 * 1.0 + 0
        s.add(f'<path d="M{x-24} {y-3} L{x+24} {y-3} L{x} {y+50}Z" fill="{flags[i%6]}" stroke="#FFFFFF" stroke-width="2.5"/>')
    # sun + rainbow
    for i, c in enumerate(["#F2778B", "#FFB84D", "#FFE066", "#7BD389", "#6EC6F0", "#B197FC"]):
        s.add(f'<path d="M{200-i*0} 480 A340 340 0 0 1 880 480" transform="translate(0 0)" stroke="none" fill="none"/>')
    for i, c in enumerate(["#F2778B", "#FFB84D", "#FFE066", "#7BD389", "#6EC6F0", "#B197FC"]):
        r = 230 - i * 20
        s.add(f'<path d="M{540-r} 470 A{r} {r} 0 0 1 {540+r} 470" stroke="{c}" stroke-width="22" fill="none" opacity="0.95"/>')
    cloud(s, 290, 470, 1.4); cloud(s, 700, 470, 1.4); cloud(s, 470, 470, 0.9, "#F4FAFF")
    # balloons
    pal = [("#FFD0DA", "#F2778B", "#C94560"), ("#FFE3B8", "#FFB84D", "#D98412"), ("#FFF8B8", "#FFE066", "#D1B000"), ("#CFF5D6", "#7BD389", "#3E9E52"), ("#CDEBFF", "#6EC6F0", "#2D8FC4"), ("#E3D8FF", "#B197FC", "#7757D1")]
    for (x, y, rx, ry, k, t) in [(130, 270, 58, 74, 0, -10), (225, 215, 52, 66, 4, 8), (92, 170, 46, 60, 2, -6), (200, 335, 50, 64, 3, 6), (950, 270, 58, 74, 4, 10), (855, 215, 52, 66, 1, -8), (990, 170, 46, 60, 5, 6), (880, 335, 50, 64, 0, -6)]:
        balloon(s, x, y, rx, ry, *pal[k], tilt=t)
    # stars + smiling sun
    sun = s.grad([(0, "#FFF3A8"), (1, "#FFC93C")], kind="radial", cx="0.4", cy="0.35", r="0.7")
    for i in range(12):
        s.add(f'<g transform="translate(540 150) rotate({i*30})"><path d="M0 -62 L9 -84 L-9 -84Z" fill="#FFC93C"/></g>')
    s.add(f'<circle cx="540" cy="150" r="52" fill="{sun}"/><circle cx="523" cy="140" r="6" fill="#5A3A1A"/><circle cx="557" cy="140" r="6" fill="#5A3A1A"/><path d="M518 162 Q540 184 562 162" stroke="#5A3A1A" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="508" cy="158" r="8" fill="#FFA0A8" opacity="0.7"/><circle cx="572" cy="158" r="8" fill="#FFA0A8" opacity="0.7"/>')
    r = random.Random(12)
    for _ in range(26): sparkle(s, r.randint(300, 780), r.randint(190, 400), r.randint(8, 16), r.choice(["#FFE066", "#FFFFFF", "#F2778B", "#B197FC"]))
    confetti(s, 8, 50, ["#F2778B", "#FFB84D", "#FFE066", "#7BD389", "#6EC6F0", "#B197FC"], (70, 200, 1010, 450))
    # scalloped divider
    for i in range(0, 14): s.add(f'<circle cx="{110+i*67}" cy="486" r="18" fill="{flags[i%6]}"/>')
    frame(s, g, "#FFFFFF", panel_stroke="#B197FC", rx=48)
    s.out("balloon-kids")


if __name__ == "__main__":
    for fn in (balloon_luxury, balloon_kids): fn()
