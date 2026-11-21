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


# ───────────────────────────── Inauguration (ഉദ്ഘാടനം) ─────────────────────────────
def garland(s, y0, depth, n=27, sway=0.0):
    """Marigold toran across the top of the header (alternating orange / amber blooms with leaf tips)."""
    for i in range(n):
        x = 70 + i * 36.15; y = y0 + math.sin(i / (n - 1) * math.pi) * depth
        s.add(f'<ellipse cx="{x:.0f}" cy="{y+16:.0f}" rx="6" ry="14" fill="#3E8A42" transform="rotate({(i%2)*20-10} {x:.0f} {y+16:.0f})"/>')
        s.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="14" fill="{"#F59F00" if i % 2 else "#E8590C"}"/><circle cx="{x:.0f}" cy="{y:.0f}" r="5.5" fill="#FFE066"/>')


def inaug_nilavilakku():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#FFF9EA"),(0.6,"#F7E6C0"),(1,"#EBD3A0")], x1="0", y1="0", x2="0", y2="1")}"/>')
    glow = s.grad([(0, "#FFE9A8", 0.95), (0.55, "#FFC85A", 0.45), (1, "#FFF9EA", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<circle cx="540" cy="260" r="250" fill="{glow}"/>')
    for x in (100, 980):  # kasavu pillars
        s.add(f'<rect x="{x-14}" y="60" width="28" height="420" fill="{g}"/>' + "".join(f'<path d="M{x-14} {90+k*38} l14 -9 l14 9 l-14 9Z" fill="#8C1C2B"/>' for k in range(10)))
    # nilavilakku: stem, rings, tray, arms, flames
    s.add(f'<ellipse cx="540" cy="452" rx="92" ry="16" fill="{g}" stroke="#7A5712" stroke-width="2.5"/><path d="M470 452 Q540 396 610 452Z" fill="{g}" stroke="#7A5712" stroke-width="2.5"/>')
    s.add(f'<rect x="530" y="250" width="20" height="170" rx="6" fill="{g}" stroke="#7A5712" stroke-width="2"/>')
    for yy in (270, 320, 372): s.add(f'<ellipse cx="540" cy="{yy}" rx="{26 if yy==320 else 20}" ry="7" fill="{g}" stroke="#7A5712" stroke-width="2"/>')
    s.add(f'<path d="M388 292 Q540 340 692 292" stroke="{g}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M448 240 Q540 276 632 240" stroke="{g}" stroke-width="8" fill="none" stroke-linecap="round"/>')
    for (fx, fy, sc) in [(540, 214, 1.15), (448, 224, 1), (632, 224, 1), (388, 276, 0.95), (692, 276, 0.95)]:
        s.add(f'<ellipse cx="{fx}" cy="{fy+4}" rx="16" ry="6" fill="{g}" stroke="#7A5712" stroke-width="2"/>')
        s.add(f'<g transform="translate({fx} {fy-8}) scale({sc})"><ellipse cx="0" cy="-14" rx="22" ry="38" fill="#FFB020" opacity="0.35"/><path d="M0 -44 C13 -26 12 -10 0 -2 C-12 -10 -13 -26 0 -44Z" fill="#FF9F0A"/><path d="M0 -34 C6 -24 6 -14 0 -8 C-6 -14 -6 -24 0 -34Z" fill="#FFF3A0"/></g>')
    # jasmine strings + marigold toran
    for gx in (190, 890):
        for i in range(18): s.add(f'<circle cx="{gx}" cy="{110+i*18}" r="7" fill="#FFFFFF" stroke="#E9DFC0" stroke-width="1.2"/>')
    garland(s, 66, 34)
    r = random.Random(21)
    for _ in range(36): sparkle(s, r.randint(160, 920), r.randint(120, 440), r.randint(3, 6), "#FFD36A")
    divider(s, g); frame(s, g, "#FFF8E8", panel_stroke="#8C1C2B")
    s.out("inaug-nilavilakku")


def inaug_ribbon():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#5A0A18"),(0.5,"#8E1328"),(1,"#4A0814")], x1="0", y1="0", x2="0", y2="1")}"/>')
    drape = s.grad([(0, "#6E0F20"), (0.5, "#B3213A"), (1, "#5A0A18")], x1="0", y1="0", x2="1", y2="0")
    for x0, sg in ((60, 1), (1020, -1)):  # velvet curtains with folds and tassels
        s.add(f'<path d="M{x0} 60 Q{x0+sg*150} 200 {x0+sg*70} 480 L{x0} 480Z" fill="{drape}"/>')
        for k in range(4): s.add(f'<path d="M{x0+sg*(20+k*28)} 70 Q{x0+sg*(70+k*26)} 260 {x0+sg*(30+k*14)} 478" stroke="#3A0610" stroke-width="3" fill="none" opacity="0.5"/>')
        s.add(f'<path d="M{x0+sg*70} 440 l{sg*-10} 40 h{sg*20}Z" fill="{g}"/><circle cx="{x0+sg*70}" cy="436" r="9" fill="{g}"/>')
    s.add(f'<path d="M250 480 V270 Q250 120 540 100 Q830 120 830 270 V480" fill="none" stroke="{g}" stroke-width="12"/><path d="M276 480 V272 Q276 142 540 124 Q804 142 804 272 V480" fill="none" stroke="{g}" stroke-width="2.5" opacity="0.8"/>')
    rg = s.grad([(0, "#FF5468"), (0.5, "#D01E3A"), (1, "#8E0F24")], x1="0", y1="0", x2="0", y2="1")
    s.add(f'<path d="M110 330 H970 V392 H110Z" fill="{rg}" stroke="{g}" stroke-width="3"/><path d="M110 340 H970 M110 382 H970" stroke="{g}" stroke-width="2" opacity="0.8"/>')
    s.add(f'<path d="M110 330 l-34 31 l34 31Z M970 330 l34 31 l-34 31Z" fill="#B3213A" stroke="{g}" stroke-width="3"/>')
    s.add(f'<path d="M540 361 C470 290 420 306 430 350 C440 392 500 372 540 361Z M540 361 C610 290 660 306 650 350 C640 392 580 372 540 361Z" fill="{rg}" stroke="{g}" stroke-width="3"/><path d="M540 361 L505 430 L535 410Z M540 361 L575 430 L545 410Z" fill="#B3213A" stroke="{g}" stroke-width="3"/><circle cx="540" cy="361" r="20" fill="{g}"/>')
    # scissors
    s.add(f'<g transform="translate(762 214) rotate(-28)" fill="none" stroke="{g}" stroke-width="7" stroke-linecap="round"><ellipse cx="-34" cy="64" rx="22" ry="30"/><ellipse cx="34" cy="64" rx="22" ry="30"/><path d="M-26 36 L38 -86 M26 36 L-38 -86" stroke-width="9"/><circle cx="0" cy="8" r="6" fill="{g}"/></g>')
    r = random.Random(33)
    for _ in range(60): sparkle(s, r.randint(80, 1000), r.randint(70, 470), r.randint(3, 9), "#FFD98A")
    for i in range(0, 27):
        x = 70 + i * 36.15; s.add(f'<path d="M{x-12} 60 q12 22 24 0Z" fill="{g}"/>')
    divider(s, g); frame(s, g, "#FFF6E6", panel_stroke="#8E1328")
    s.out("inaug-ribbon-arch")


def inaug_showroom():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#0C1815"),(0.55,"#14302A"),(1,"#09110F")], x1="0", y1="0", x2="0", y2="1")}"/>')
    # art-deco sunburst fan from the lower middle of the header
    for i in range(-9, 10):
        a = math.radians(-90 + i * 8.5); x1, y1 = 540 + math.cos(a) * 120, 470 + math.sin(a) * 120; x2, y2 = 540 + math.cos(a) * 420, 470 + math.sin(a) * 420
        s.add(f'<path d="M{x1:.0f} {y1:.0f} L{x2:.0f} {y2:.0f}" stroke="{g}" stroke-width="{3 if i % 2 == 0 else 1.5}" opacity="{0.9 if i % 2 == 0 else 0.5}"/>')
    for rad in (130, 220, 320, 410): s.add(f'<path d="M{540-rad} 470 A{rad} {rad} 0 0 1 {540+rad} 470" fill="none" stroke="{g}" stroke-width="2.5" opacity="0.75"/>')
    # faceted gem
    gem = s.grad([(0, "#E8FFF6"), (0.5, "#53D1A5"), (1, "#0F7A5A")], x1="0", y1="0", x2="1", y2="1")
    s.add(f'<path d="M470 210 L610 210 L660 262 L540 392 L420 262Z" fill="{gem}" stroke="{g}" stroke-width="5"/>')
    s.add(f'<path d="M420 262 H660 M470 210 L500 262 L540 392 M610 210 L580 262 L540 392 M500 262 L540 210 L580 262" fill="none" stroke="#FFFFFF" stroke-width="2.2" opacity="0.8"/><path d="M500 262 L540 210 L580 262Z" fill="#FFFFFF" opacity="0.35"/>')
    for x in (110, 970):
        s.add(f'<rect x="{x-9}" y="64" width="18" height="404" fill="{g}"/>' + "".join(f'<path d="M{x-9} {96+k*44} h18 l-9 12Z" fill="#0C1815"/>' for k in range(9)))
    for x, y in ((250, 140), (830, 140), (330, 80), (750, 80)): s.add(f'<path d="M{x} {y-24} L{x+14} {y} L{x} {y+24} L{x-14} {y}Z" fill="{g}"/>')
    r = random.Random(41)
    for _ in range(46): sparkle(s, r.randint(160, 920), r.randint(90, 300), r.randint(2, 6), "#F6E3A1")
    divider(s, g, y=482); frame(s, g, "#0F1D19", panel_stroke="#E3BE5C", rx=22)
    s.out("inaug-showroom-gold")


def inaug_cafe():
    s = Svg(); c = "#B5532B"; g = s.grad([(0, "#9A3F1C"), (0.5, "#E8935E"), (1, "#9A3F1C")], x1="0", y1="0", x2="1", y2="1")
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#F6DCC4"),(0.6,"#EFC7A2"),(1,"#E4AE85")], x1="0", y1="0", x2="0", y2="1")}"/>')
    # striped awning with scalloped edge
    for i in range(12):
        x = 56 + i * 80.5; s.add(f'<path d="M{x} 62 h80.5 v78 a40.25 28 0 0 1 -80.5 0Z" fill="{"#C2603A" if i % 2 == 0 else "#FFF4E4"}"/>')
    s.add('<rect x="56" y="54" width="968" height="14" rx="4" fill="#8A3A1C"/>')
    # string lights
    s.add('<path d="M70 180 Q300 250 540 190 Q780 130 1010 200" stroke="#7A4A2B" stroke-width="2.5" fill="none"/>')
    for i in range(11):
        t = i / 10; x = 70 + t * 940; y = 180 + (math.sin(t * math.pi) * 40 if t < 0.5 else 0) + (1 - abs(t - 0.5) * 2) * 22
        s.add(f'<circle cx="{x:.0f}" cy="{y+14:.0f}" r="22" fill="#FFE9A8" opacity="0.5"/><circle cx="{x:.0f}" cy="{y+14:.0f}" r="9" fill="#FFD36A" stroke="#C2603A" stroke-width="1.5"/>')
    # botanical leaves both sides
    def leaf(x, y, rot, sc, col):
        s.add(f'<g transform="translate({x} {y}) rotate({rot}) scale({sc})"><path d="M0 0 C60 -30 110 -120 0 -210 C-110 -120 -60 -30 0 0Z" fill="{col}"/><path d="M0 0 V-200" stroke="#2E5B36" stroke-width="3"/>' + "".join(f'<path d="M0 {-30-k*30} q{28 if k%2 else -28} -10 {44 if k%2 else -44} -34" stroke="#2E5B36" stroke-width="2" fill="none"/>' for k in range(5)) + '</g>')
    for x, sg in ((120, 1), (960, -1)):
        leaf(x, 470, sg * -18, 1.0, "#4E8A55"); leaf(x + sg * 60, 470, sg * 20, 0.85, "#6BA36A"); leaf(x - sg * 38, 470, sg * -52, 0.7, "#3E7347")
    # coffee cup
    s.add('<ellipse cx="540" cy="440" rx="120" ry="20" fill="#C77F54" opacity="0.5"/>')
    s.add('<path d="M440 300 H640 V380 Q640 440 540 440 Q440 440 440 380Z" fill="#FFF4E4" stroke="#8A3A1C" stroke-width="5"/><path d="M640 322 q62 4 52 44 q-8 36 -56 28" fill="none" stroke="#8A3A1C" stroke-width="12" stroke-linecap="round"/><path d="M440 340 H640" stroke="#C2603A" stroke-width="10"/>')
    s.add('<ellipse cx="540" cy="300" rx="100" ry="16" fill="#6B3A1E"/><ellipse cx="540" cy="300" rx="80" ry="10" fill="#9A5A32"/>')
    for dx in (-36, 0, 36): s.add(f'<path d="M{540+dx} 270 q-18 -30 0 -56 q18 -26 0 -56" stroke="#FFF4E4" stroke-width="7" fill="none" stroke-linecap="round" opacity="0.9"/>')
    gd = "#C2603A"; s.add(f'<path d="M330 482 H750" stroke="{gd}" stroke-width="3"/><circle cx="540" cy="482" r="7" fill="{gd}"/>')
    frame(s, g, "#FFF6EA", panel_stroke="#C2603A", rx=44)
    s.out("inaug-cafe-launch")


def inaug_corporate():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#0A1840"),(0.6,"#13306A"),(1,"#081331")], x1="0", y1="0", x2="0", y2="1")}"/>')
    sky = s.grad([(0, "#2B4F9A", 0.5), (1, "#0A1840", 0)], kind="radial", cx="0.5", cy="1", r="0.9")
    s.add(f'<rect x="60" y="60" width="960" height="420" fill="{sky}"/>')
    # skyline of buildings with lit windows
    bld = [(130, 150, 90), (225, 100, 130), (360, 60, 190), (555, 120, 150), (710, 90, 110), (825, 140, 100), (200, 40, 60)]
    r = random.Random(7)
    for x, w, h in bld:
        top = 470 - h * 2.1
        s.add(f'<rect x="{x}" y="{top:.0f}" width="{w}" height="{470-top:.0f}" fill="#0B2152" stroke="{g}" stroke-width="2"/>')
        for wy in range(int(top) + 14, 456, 22):
            for wx in range(x + 10, x + w - 10, 20):
                if r.random() > 0.35: s.add(f'<rect x="{wx}" y="{wy}" width="9" height="12" fill="{"#F6D77A" if r.random() > 0.3 else "#8FA8E0"}"/>')
    s.add(f'<path d="M80 470 H1000" stroke="{g}" stroke-width="4"/>')
    for x in (84, 996):  # architectural columns
        s.add(f'<rect x="{x-16}" y="70" width="32" height="400" fill="#F3E3B6" stroke="{g}" stroke-width="3"/>' + "".join(f'<path d="M{x-8+k*8} 84 V460" stroke="#B89B4F" stroke-width="1.6"/>' for k in range(3)) + f'<rect x="{x-24}" y="62" width="48" height="16" fill="{g}"/><rect x="{x-24}" y="462" width="48" height="16" fill="{g}"/>')
    # ribbon + bow at the entrance
    rg = s.grad([(0, "#F7E7B0"), (0.5, "#D9B65A"), (1, "#9A7B2C")], x1="0", y1="0", x2="0", y2="1")
    s.add(f'<path d="M110 420 H970 V446 H110Z" fill="{rg}"/><path d="M540 433 C500 392 470 402 476 428 C482 452 520 442 540 433Z M540 433 C580 392 610 402 604 428 C598 452 560 442 540 433Z" fill="{rg}" stroke="#7A5E1C" stroke-width="2"/><circle cx="540" cy="433" r="11" fill="#7A5E1C"/>')
    for x, y in ((200, 90), (880, 96), (330, 70), (750, 66)): sparkle(s, x, y, 12, "#F6E3A1")
    divider(s, g, y=484); frame(s, g, "#FBF8F0", panel_stroke="#10224A", rx=20)
    s.out("inaug-corporate-navy")


# ───────────────────────────── Festivals & Greetings ─────────────────────────────
def _burst(s, cx, cy, r0, r1, n, col, w=3, dots=True):
    for i in range(n):
        a = i * 2 * math.pi / n
        s.add(f'<path d="M{cx+math.cos(a)*r0:.0f} {cy+math.sin(a)*r0:.0f} L{cx+math.cos(a)*r1:.0f} {cy+math.sin(a)*r1:.0f}" stroke="{col}" stroke-width="{w}" stroke-linecap="round"/>')
        if dots: s.add(f'<circle cx="{cx+math.cos(a)*(r1+14):.0f}" cy="{cy+math.sin(a)*(r1+14):.0f}" r="{w*0.9:.1f}" fill="{col}"/>')


def fest_onam():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#FFFBEF"),(0.6,"#F8E9C4"),(1,"#EBD59A")], x1="0", y1="0", x2="0", y2="1")}"/>')
    for x0, sg in ((0, 1), (W, -1)):  # banana-leaf fronds
        for k in range(4): s.add(f'<path d="M{x0} {90+k*95} Q{x0+sg*150} {70+k*95} {x0+sg*220} {150+k*95} Q{x0+sg*120} {140+k*95} {x0} {120+k*95}Z" fill="{["#3E8A42","#4FA050","#2F7A38","#5BAE5A"][k]}" opacity="0.9"/>')
    # pookkalam: concentric rings of petals
    cx, cy = 540, 262
    rings = [(196, "#E8590C", 20), (162, "#FFD43B", 18), (128, "#FFFFFF", 16), (96, "#C2185B", 14), (66, "#FFB020", 12)]
    for rad, col, n in rings:
        for i in range(n):
            a = i * 2 * math.pi / n
            s.add(f'<ellipse cx="{cx+math.cos(a)*rad:.1f}" cy="{cy+math.sin(a)*rad:.1f}" rx="{rad*0.17:.1f}" ry="{rad*0.1:.1f}" fill="{col}" transform="rotate({math.degrees(a):.0f} {cx+math.cos(a)*rad:.1f} {cy+math.sin(a)*rad:.1f})"/>')
    s.add(f'<circle cx="{cx}" cy="{cy}" r="38" fill="#FF8F00"/><circle cx="{cx}" cy="{cy}" r="20" fill="#FFE066"/>')
    s.add(f'<circle cx="{cx}" cy="{cy}" r="218" fill="none" stroke="{g}" stroke-width="5"/><circle cx="{cx}" cy="{cy}" r="228" fill="none" stroke="{g}" stroke-width="1.5"/>')
    # kasavu bands top and bottom of the header
    for y0 in (62, 470):
        s.add(f'<rect x="56" y="{y0}" width="{W-112}" height="18" fill="{g}"/>' + "".join(f'<path d="M{70+i*36.15} {y0+2} l18 7 l-18 7 l-18 -7Z" fill="#8C1C2B"/>' for i in range(27)))
    for x in (130, 950): sparkle(s, x, 330, 16, "#FFB020")
    divider(s, g, y=482); frame(s, g, "#FFF9EA", panel_stroke="#A56A00")
    s.out("fest-onam")


def fest_vishu():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#FFFCEC"),(0.6,"#FBEFB8"),(1,"#F1DC84")], x1="0", y1="0", x2="0", y2="1")}"/>')
    glow = s.grad([(0, "#FFF4B0", 0.95), (1, "#FFFCEC", 0)], kind="radial", cx="0.5", cy="0.55", r="0.5")
    s.add(f'<circle cx="540" cy="290" r="240" fill="{glow}"/>')
    # hanging konna (cassia) flower clusters
    r = random.Random(14)
    for x0, sg in ((120, 1), (960, -1)):
        for k in range(3):
            bx = x0 + sg * k * 62; s.add(f'<path d="M{bx} 60 Q{bx+sg*30} 150 {bx+sg*10} 330" stroke="#6B8E23" stroke-width="4" fill="none"/>')
            for j in range(26):
                t = j / 25; y = 110 + t * 230; x = bx + sg * (30 * math.sin(t * 2.2)) + r.randint(-14, 14)
                s.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r.randint(9,15)}" fill="{"#FFC107" if j % 3 else "#FFD54F"}" stroke="#E6A100" stroke-width="1"/>')
    # lamp + uruli with the vishukkani
    s.add(f'<rect x="531" y="190" width="18" height="190" rx="6" fill="{g}" stroke="#7A5712" stroke-width="2"/>')
    s.add(f'<path d="M470 196 Q540 232 610 196" stroke="{g}" stroke-width="9" fill="none" stroke-linecap="round"/>')
    for fx in (470, 540, 610):
        s.add(f'<ellipse cx="{fx}" cy="204" rx="15" ry="5" fill="{g}" stroke="#7A5712" stroke-width="2"/><ellipse cx="{fx}" cy="168" rx="20" ry="34" fill="#FFB020" opacity="0.35"/><path d="M{fx} 142 C{fx+11} 160 {fx+10} 176 {fx} 184 C{fx-10} 176 {fx-11} 160 {fx} 142Z" fill="#FF9F0A"/><path d="M{fx} 152 C{fx+5} 162 {fx+5} 172 {fx} 178 C{fx-5} 172 {fx-5} 162 {fx} 152Z" fill="#FFF3A0"/>')
    s.add(f'<path d="M388 388 Q540 336 692 388 L670 456 Q540 486 410 456Z" fill="{g}" stroke="#7A5712" stroke-width="3"/><ellipse cx="540" cy="384" rx="152" ry="26" fill="#C98A1E" stroke="#7A5712" stroke-width="3"/>')
    for (fx, fy, col) in [(470, 364, "#E8590C"), (520, 352, "#FFC107"), (570, 356, "#6BA36A"), (615, 366, "#F2778B"), (545, 372, "#FFD54F")]:
        s.add(f'<circle cx="{fx}" cy="{fy}" r="24" fill="{col}" stroke="#fff" stroke-width="1.5" opacity="0.95"/>')
    s.add(f'<circle cx="700" cy="330" r="34" fill="#E8F1F5" stroke="{g}" stroke-width="6"/><path d="M684 316 q10 -8 22 -2" stroke="#fff" stroke-width="4" fill="none"/>')  # kannadi (mirror)
    for x, y in ((330, 120), (760, 130), (240, 300), (840, 290)): sparkle(s, x, y, 12, "#E6A100")
    divider(s, g, y=486); frame(s, g, "#FFFBEA", panel_stroke="#B07A00")
    s.out("fest-vishu")


def fest_christmas():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#6E0A18"),(0.55,"#A01A2C"),(1,"#4A0812")], x1="0", y1="0", x2="0", y2="1")}"/>')
    r = random.Random(25)
    for _ in range(90): s.add(f'<circle cx="{r.randint(60,1020)}" cy="{r.randint(64,470)}" r="{r.choice([2,3,4,5])}" fill="#FFFFFF" opacity="{r.uniform(0.5,0.95):.2f}"/>')
    pine = s.grad([(0, "#2E8B4B"), (1, "#10502A")], x1="0", y1="0", x2="0", y2="1")
    for (w, y0) in ((330, 370), (270, 292), (210, 218), (150, 150)):
        s.add(f'<path d="M540 {y0-100} L{540+w/2} {y0+20} Q540 {y0+50} {540-w/2} {y0+20}Z" fill="{pine}" stroke="#0D4020" stroke-width="3"/>')
    s.add(f'<rect x="518" y="414" width="44" height="52" fill="#6B3A1E"/>')
    s.add(f'<path d="M540 36 L552 74 L592 74 L560 98 L572 136 L540 112 L508 136 L520 98 L488 74 L528 74Z" fill="{g}" stroke="#7A5712" stroke-width="2.5"/><circle cx="540" cy="86" r="52" fill="#FFE9A0" opacity="0.25"/>')
    for (bx, by, col) in [(470, 380, "#E53950"), (600, 392, "#E3BE5C"), (520, 300, "#E3BE5C"), (580, 250, "#E53950"), (492, 232, "#FFFFFF"), (545, 175, "#E53950"), (430, 410, "#4F8FE0"), (660, 420, "#E53950")]:
        s.add(f'<circle cx="{bx}" cy="{by}" r="17" fill="{col}" stroke="#fff" stroke-width="1.5"/><path d="M{bx-6} {by-16} h12 v-7 h-12Z" fill="{g}"/><ellipse cx="{bx-5}" cy="{by-5}" rx="4" ry="6" fill="#fff" opacity="0.55"/>')
    for x0, sg in ((110, 1), (970, -1)):  # holly sprigs
        for k in range(3): s.add(f'<ellipse cx="{x0+sg*k*34}" cy="{410+k*8}" rx="30" ry="12" fill="#2E8B4B" transform="rotate({sg*(-30+k*30)} {x0+sg*k*34} {410+k*8})"/>')
        for k in range(3): s.add(f'<circle cx="{x0+sg*(14+k*16)}" cy="{398+k*6}" r="8" fill="#E53950"/>')
    divider(s, g, y=486); frame(s, g, "#FFF8F0", panel_stroke="#A01A2C")
    s.out("fest-christmas")


def fest_newyear():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#0B1638"),(0.6,"#13265C"),(1,"#070E26")], x1="0", y1="0", x2="0", y2="1")}"/>')
    r = random.Random(31)
    for (cx, cy, rad, col) in [(540, 215, 150, "#F6D77A"), (250, 170, 100, "#FFFFFF"), (830, 160, 105, "#F08CA8"), (400, 370, 70, "#8FB8FF"), (700, 360, 78, "#F6D77A")]:
        _burst(s, cx, cy, rad * 0.25, rad, 24, col, 3.2)
        for j in range(18): a = r.random() * 6.28; rr = r.uniform(rad * 0.3, rad * 0.95); s.add(f'<circle cx="{cx+math.cos(a)*rr:.0f}" cy="{cy+math.sin(a)*rr:.0f}" r="{r.uniform(1.5,3.5):.1f}" fill="{col}" opacity="0.8"/>')
        s.add(f'<circle cx="{cx}" cy="{cy}" r="{rad*0.12:.0f}" fill="{col}"/>')
    for _ in range(70): sparkle(s, r.randint(80, 1000), r.randint(70, 470), r.randint(2, 7), "#F6E3A1")
    # city line
    for x, w, h in ((90, 70, 70), (170, 54, 110), (240, 80, 60), (340, 60, 90), (720, 70, 100), (800, 56, 70), (870, 80, 120), (960, 40, 60)):
        s.add(f'<rect x="{x}" y="{470-h}" width="{w}" height="{h}" fill="#050B1E"/>')
    divider(s, g, y=484); frame(s, g, "#0E1B3F", panel_stroke="#E3BE5C", rx=24)
    s.out("fest-newyear")


def fest_eid():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#04241C"),(0.55,"#0B5D4B"),(1,"#052F26")], x1="0", y1="0", x2="0", y2="1")}"/>')
    r = random.Random(41)
    for _ in range(60): sparkle(s, r.randint(70, 1010), r.randint(70, 340), r.randint(2, 6), "#F6E3A1")
    glow = s.grad([(0, "#FFE9A0", 0.7), (1, "#0B5D4B", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<circle cx="540" cy="215" r="200" fill="{glow}"/>')
    s.add(f'<circle cx="540" cy="215" r="124" fill="{g}"/><circle cx="582" cy="190" r="106" fill="#0B5D4B"/>')
    s.add(f'<path d="M624 150 L636 188 L676 188 L644 212 L656 250 L624 226 L592 250 L604 212 L572 188 L612 188Z" fill="{g}" stroke="#7A5712" stroke-width="2"/>')
    for x, y, sc in ((130, 70, 0.85), (950, 70, 0.85), (260, 70, 0.6), (820, 70, 0.6)):  # fanoos
        glow2 = s.grad([(0, "#FFE9A0", 0.95), (1, "#FFB43A", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
        s.add(f'<g transform="translate({x} {y}) scale({sc})"><path d="M0 -30 V10" stroke="{g}" stroke-width="3"/><circle cx="0" cy="110" r="84" fill="{glow2}"/><path d="M-14 10 H14 L22 26 H-22Z" fill="{g}"/><path d="M-22 26 Q-46 62 -38 100 Q-30 140 -16 158 H16 Q30 140 38 100 Q46 62 22 26Z" fill="#FFD36A" fill-opacity="0.55" stroke="{g}" stroke-width="3.5"/><path d="M0 26 V158 M-22 26 Q-8 90 -16 158 M22 26 Q8 90 16 158" stroke="{g}" stroke-width="2.2" fill="none"/><path d="M0 60 C10 78 9 92 0 98 C-9 92 -10 78 0 60Z" fill="#FFF3B0"/><path d="M-18 158 H18 L10 174 H-10Z" fill="{g}"/></g>')
    # mosque silhouette
    sil = "#042A21"
    s.add(f'<path d="M0 470 V420 H160 V380 Q160 350 190 350 Q220 350 220 380 V420 H330 Q330 330 400 320 Q470 330 470 420 H610 Q610 330 680 320 Q750 330 750 420 H860 V380 Q860 350 890 350 Q920 350 920 380 V420 H1080 V470Z" fill="{sil}"/>')
    for x in (190, 890): s.add(f'<rect x="{x-9}" y="296" width="18" height="60" fill="{sil}"/><path d="M{x-12} 296 Q{x} 268 {x+12} 296Z" fill="{sil}"/>')
    divider(s, g, y=486); frame(s, g, "#073B2E", panel_stroke="#E8C766", rx=40)
    s.out("fest-eid")


def fest_diwali():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#4A0A18"),(0.55,"#7A1428"),(1,"#3A0813")], x1="0", y1="0", x2="0", y2="1")}"/>')
    r = random.Random(52)
    for _ in range(80): sparkle(s, r.randint(70, 1010), r.randint(66, 330), r.randint(2, 7), "#FFD98A")
    # string lights
    s.add('<path d="M70 96 Q300 160 540 100 Q780 40 1010 110" stroke="#C99A2E" stroke-width="2.5" fill="none"/>')
    for i in range(14):
        t = i / 13; x = 70 + t * 940; y = 96 + (math.sin(t * math.pi * 2) * 40 + t * 14)
        s.add(f'<circle cx="{x:.0f}" cy="{y+12:.0f}" r="20" fill="#FFD36A" opacity="0.4"/><circle cx="{x:.0f}" cy="{y+12:.0f}" r="8" fill="{["#FFC107","#FF7043","#FFE082"][i%3]}"/>')
    # rangoli
    cx, cy = 540, 300
    for rad, col, n in ((170, "#E8590C", 16), (136, "#FFD43B", 16), (104, "#C2185B", 12), (74, "#FFFFFF", 12)):
        for i in range(n):
            a = i * 2 * math.pi / n
            s.add(f'<ellipse cx="{cx+math.cos(a)*rad:.1f}" cy="{cy+math.sin(a)*rad:.1f}" rx="{rad*0.2:.1f}" ry="{rad*0.1:.1f}" fill="{col}" opacity="0.9" transform="rotate({math.degrees(a):.0f} {cx+math.cos(a)*rad:.1f} {cy+math.sin(a)*rad:.1f})"/>')
    glow = s.grad([(0, "#FFE9A0", 0.95), (1, "#7A1428", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<circle cx="{cx}" cy="{cy-10}" r="150" fill="{glow}"/>')
    def diya(x, y, sc):
        s.add(f'<g transform="translate({x} {y}) scale({sc})"><ellipse cx="0" cy="-26" rx="26" ry="46" fill="#FFB020" opacity="0.4"/><path d="M0 -62 C16 -38 14 -18 0 -8 C-14 -18 -16 -38 0 -62Z" fill="#FF9F0A"/><path d="M0 -48 C7 -36 7 -24 0 -16 C-7 -24 -7 -36 0 -48Z" fill="#FFF3A0"/><path d="M-52 0 Q0 52 52 0 Q30 8 0 8 Q-30 8 -52 0Z" fill="{g}" stroke="#7A5712" stroke-width="2.5"/><ellipse cx="0" cy="0" rx="52" ry="9" fill="#E3A82C" stroke="#7A5712" stroke-width="2.5"/><path d="M-12 -2 Q0 4 12 -2" stroke="#7A5712" stroke-width="2" fill="none"/></g>')
    diya(540, 322, 1.7)
    for x in (110, 230, 850, 970): diya(x, 440, 0.8)
    divider(s, g, y=486); frame(s, g, "#FFF6E4", panel_stroke="#9A1B2E")
    s.out("fest-diwali")


if __name__ == "__main__":
    for fn in (balloon_luxury, balloon_kids, inaug_nilavilakku, inaug_ribbon, inaug_showroom, inaug_cafe, inaug_corporate, fest_onam, fest_vishu, fest_christmas, fest_newyear, fest_eid, fest_diwali): fn()
