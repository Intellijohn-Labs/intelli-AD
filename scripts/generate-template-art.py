#!/usr/bin/env python3
"""Generates the illustrated devotional / balloon invitation backdrops in public/templates/*.svg.

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


def lotus(s, cx, cy, scale=1.0, petal="#F8B6C8", edge="#D9486E", n=9, spread=150, length=110):
    s.add(f'<g transform="translate({cx} {cy}) scale({scale})">')
    for i in range(n):
        a = -spread / 2 + spread * i / (n - 1)
        L = length * (1 - abs(a) / (spread * 1.6))
        s.add(f'<g transform="rotate({a})"><path d="M0 0 C{L*0.34} {-L*0.3} {L*0.28} {-L*0.8} 0 {-L} C{-L*0.28} {-L*0.8} {-L*0.34} {-L*0.3} 0 0Z" fill="{petal}" stroke="{edge}" stroke-width="2.2"/><path d="M0 -6 Q0 {-L*0.5} 0 {-L*0.92}" stroke="{edge}" stroke-width="1.2" fill="none" opacity="0.6"/></g>')
    s.add('</g>')


def feather(s, x, y, rot=0, sc=1.0):
    """Peacock feather: curved stem, barbs and a layered eye."""
    s.add(f'<g transform="translate({x} {y}) rotate({rot}) scale({sc})">')
    s.add('<path d="M0 120 Q-14 40 0 -70" stroke="#3E7B3A" stroke-width="3.5" fill="none"/>')
    for i in range(22):
        t = i / 21; py = 110 - t * 170
        s.add(f'<path d="M0 {py} q-26 {-10-t*8} -34 {-26}" stroke="#2E8B57" stroke-width="1.4" fill="none"/><path d="M0 {py} q26 {-10-t*8} 34 {-26}" stroke="#2E8B57" stroke-width="1.4" fill="none"/>')
    s.add('<ellipse cx="0" cy="-70" rx="34" ry="46" fill="#1E8A6B"/><ellipse cx="0" cy="-70" rx="26" ry="37" fill="#E8C65A"/><ellipse cx="0" cy="-70" rx="19" ry="28" fill="#1B4F9C"/><ellipse cx="0" cy="-72" rx="11" ry="17" fill="#0E8B8B"/><ellipse cx="0" cy="-74" rx="5" ry="9" fill="#0B2A5C"/>')
    s.add('</g>')


def sparkle(s, x, y, r, fill):
    s.add(f'<path d="M{x} {y-r} Q{x+r*0.14} {y-r*0.14} {x+r} {y} Q{x+r*0.14} {y+r*0.14} {x} {y+r} Q{x-r*0.14} {y+r*0.14} {x-r} {y} Q{x-r*0.14} {y-r*0.14} {x} {y-r}Z" fill="{fill}"/>')


# ───────────────────────────── 1. Radha Krishna Divine Gold ─────────────────────────────
def radha_krishna():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#5A0F2A"),(0.55,"#8E1B3A"),(1,"#4A0B22")], x1="0", y1="0", x2="0", y2="1")}"/>')
    # gold-dust sky
    r = random.Random(3)
    for _ in range(70): sparkle(s, r.randint(70, 1010), r.randint(70, 470), r.randint(3, 8), "#F6DC8A")
    # halo
    halo = s.grad([(0, "#FFE9A8", 0.95), (0.55, "#F2B84B", 0.55), (1, "#8E1B3A", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<circle cx="540" cy="270" r="235" fill="{halo}"/>')
    for rad, w, op in [(200, 5, 1), (214, 1.5, 1), (172, 2, 0.7)]:
        s.add(f'<circle cx="540" cy="270" r="{rad}" fill="none" stroke="{g}" stroke-width="{w}" opacity="{op}"/>')
    for i in range(24):
        a = i * 15
        s.add(f'<g transform="translate(540 270) rotate({a})"><path d="M0 -214 L9 -232 L0 -250 L-9 -232Z" fill="{g}"/></g>')
    # lotus bed
    lotus(s, 540, 468, 1.5, "#FFD9E4", "#D9486E", n=11, spread=170, length=120)
    lotus(s, 540, 470, 1.0, "#FFF0F4", "#C2306A", n=9, spread=140, length=100)
    # peacock feathers behind
    feather(s, 330, 345, -22, 1.05); feather(s, 750, 345, 22, 1.05)
    # Krishna (left) — blue skin, yellow dhoti, crown with feather, flute
    s.add('<g>')
    s.add('<path d="M452 460 L438 300 Q440 262 478 258 Q520 262 520 300 L506 460Z" fill="#F2B705"/><path d="M452 460 L440 340 H512 L506 460Z" fill="#E09D00"/>')  # dhoti
    s.add('<path d="M444 300 Q478 330 514 296 L520 330 Q480 350 440 332Z" fill="#2F5FA8"/>')  # torso
    s.add('<path d="M440 292 Q430 330 462 352 L470 340 Q448 322 452 296Z" fill="#2F5FA8"/>')
    s.add('<circle cx="479" cy="226" r="40" fill="#3A6CB8"/>')  # head
    s.add('<path d="M440 222 Q442 180 479 178 Q518 180 518 222 Q500 200 479 200 Q458 200 440 222Z" fill="#1B2A5A"/>')  # hair
    s.add(f'<path d="M444 196 L452 160 L466 184 L479 150 L492 184 L506 160 L514 196Z" fill="{g}"/>')  # crown
    s.add('<circle cx="479" cy="168" r="6" fill="#D9486E"/>')
    s.add('<ellipse cx="492" cy="152" rx="9" ry="20" fill="#1E8A6B" transform="rotate(18 492 152)"/><ellipse cx="493" cy="150" rx="4" ry="9" fill="#1B4F9C" transform="rotate(18 493 150)"/>')
    s.add('<path d="M466 232 q8 6 16 0" stroke="#7A1B2A" stroke-width="3" fill="none"/><circle cx="466" cy="218" r="3.2" fill="#0B1020"/><circle cx="492" cy="218" r="3.2" fill="#0B1020"/><path d="M474 204 h10" stroke="#E04B3A" stroke-width="3"/>')
    s.add(f'<path d="M444 300 Q479 360 514 300" stroke="{g}" stroke-width="4" fill="none"/><path d="M450 312 Q479 372 508 312" stroke="#fff" stroke-width="3" stroke-dasharray="2 6" fill="none"/>')  # garland
    s.add(f'<rect x="466" y="268" width="160" height="9" rx="4.5" fill="#B9770E" transform="rotate(-14 466 268)"/><circle cx="470" cy="288" r="0" fill="{g}"/>')  # flute
    s.add('</g>')
    # Radha (right)
    s.add('<g>')
    s.add('<path d="M560 462 Q548 330 575 292 H640 Q668 330 654 462Z" fill="#C2185B"/>')
    s.add(f'<path d="M560 462 Q554 420 560 400 H654 Q660 420 654 462Z" fill="#E8447E"/><path d="M562 420 H652" stroke="{g}" stroke-width="3"/><path d="M560 440 H654" stroke="{g}" stroke-width="2" stroke-dasharray="6 5"/>')
    s.add('<path d="M570 300 Q607 330 646 298 L650 335 Q608 350 566 334Z" fill="#F4A6C0"/>')
    s.add('<circle cx="607" cy="256" r="37" fill="#EDBB94"/>')
    s.add('<path d="M568 252 Q568 208 607 206 Q648 208 646 252 Q630 228 607 228 Q584 228 568 252Z" fill="#1A0F14"/><path d="M646 238 Q668 290 650 360" stroke="#1A0F14" stroke-width="10" fill="none" stroke-linecap="round"/>')
    s.add('<path d="M556 270 Q540 330 580 360 L600 296Z" fill="#F7C6D8" opacity="0.92"/>')  # dupatta
    s.add(f'<path d="M590 206 q17 -18 34 0" stroke="{g}" stroke-width="5" fill="none"/><circle cx="607" cy="204" r="6" fill="{g}"/><circle cx="607" cy="238" r="3" fill="#D6204E"/>')
    s.add('<circle cx="594" cy="250" r="3" fill="#2B1A12"/><circle cx="620" cy="250" r="3" fill="#2B1A12"/><path d="M596 268 q11 7 22 0" stroke="#B3334F" stroke-width="3" fill="none"/>')
    s.add(f'<circle cx="573" cy="268" r="5" fill="{g}"/><circle cx="641" cy="268" r="5" fill="{g}"/>')
    s.add('</g>')
    # garland of marigolds across the frame top
    for i in range(0, 27):
        x = 70 + i * 36.15; y = 78 + math.sin(i / 26 * math.pi) * 26
        s.add(f'<circle cx="{x}" cy="{y:.1f}" r="13" fill="{"#F59F00" if i % 2 else "#E8590C"}"/><circle cx="{x}" cy="{y:.1f}" r="5" fill="#FFE066"/>')
    divider(s, g)
    frame(s, g, "#FFF7E6")
    s.out("radha-krishna")


# ───────────────────────────── 2. Sree Ganapathy Auspicious ─────────────────────────────
def lamp(s, x, y, sc, g):
    s.add(f'<g transform="translate({x} {y}) scale({sc})">')
    s.add('<ellipse cx="0" cy="-8" rx="20" ry="46" fill="#FFB020" opacity="0.35"/>')
    s.add('<path d="M0 -62 C14 -40 12 -22 0 -14 C-12 -22 -14 -40 0 -62Z" fill="#FFB400"/><path d="M0 -50 C7 -38 6 -26 0 -20 C-6 -26 -7 -38 0 -50Z" fill="#FFF2A0"/>')
    s.add(f'<path d="M-52 -12 Q0 24 52 -12 L40 -6 Q0 20 -40 -6Z" fill="{g}" stroke="#7A5712" stroke-width="2"/><ellipse cx="0" cy="-12" rx="52" ry="6" fill="{g}" stroke="#7A5712" stroke-width="2"/>')
    s.add(f'<rect x="-4" y="6" width="8" height="60" fill="{g}"/><ellipse cx="0" cy="26" rx="14" ry="6" fill="{g}"/><ellipse cx="0" cy="48" rx="18" ry="7" fill="{g}"/>')
    s.add(f'<path d="M-44 130 Q-30 70 0 66 Q30 70 44 130Z" fill="{g}" stroke="#7A5712" stroke-width="2"/><ellipse cx="0" cy="130" rx="50" ry="8" fill="{g}" stroke="#7A5712" stroke-width="2"/>')
    s.add('</g>')


def ganapathy():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#7A1010"),(0.5,"#B3350F"),(1,"#5A0A0A")], x1="0", y1="0", x2="0", y2="1")}"/>')
    glow = s.grad([(0, "#FFE7A0", 1), (0.5, "#FFB43A", 0.6), (1, "#B3350F", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<circle cx="540" cy="255" r="250" fill="{glow}"/>')
    s.add(f'<circle cx="540" cy="255" r="205" fill="none" stroke="{g}" stroke-width="5"/><circle cx="540" cy="255" r="218" fill="none" stroke="{g}" stroke-width="1.5"/>')
    # Ganesha — big ears, head, trunk, tusks, crown
    s.add('<ellipse cx="408" cy="262" rx="82" ry="108" fill="#E0792A" stroke="#7A2E08" stroke-width="3"/><ellipse cx="408" cy="262" rx="58" ry="84" fill="#F6A55A"/>')
    s.add('<ellipse cx="672" cy="262" rx="82" ry="108" fill="#E0792A" stroke="#7A2E08" stroke-width="3"/><ellipse cx="672" cy="262" rx="58" ry="84" fill="#F6A55A"/>')
    s.add('<path d="M420 430 Q540 520 660 430 L650 330 H430Z" fill="#E0792A" stroke="#7A2E08" stroke-width="3"/>')  # body
    s.add(f'<path d="M455 392 Q540 440 625 392" stroke="{g}" stroke-width="8" fill="none"/><circle cx="540" cy="430" r="10" fill="#D6204E" stroke="{g}" stroke-width="3"/>')
    s.add('<ellipse cx="540" cy="250" rx="112" ry="124" fill="#F08A32" stroke="#7A2E08" stroke-width="3"/>')
    s.add(f'<path d="M450 160 Q540 60 630 160 L612 118 L586 146 L564 96 L540 136 L516 96 L494 146 L468 118Z" fill="{g}" stroke="#7A5712" stroke-width="2.5"/><circle cx="540" cy="140" r="12" fill="#D6204E"/><circle cx="500" cy="152" r="6" fill="#18A0C8"/><circle cx="580" cy="152" r="6" fill="#18A0C8"/>')
    s.add('<path d="M512 196 Q540 178 568 196" stroke="#C8201E" stroke-width="7" fill="none"/><path d="M540 168 V210" stroke="#FFF2C4" stroke-width="5"/>')  # tilak
    s.add('<ellipse cx="500" cy="236" rx="15" ry="10" fill="#FFF8E6"/><ellipse cx="580" cy="236" rx="15" ry="10" fill="#FFF8E6"/><circle cx="502" cy="237" r="7" fill="#1A0F14"/><circle cx="578" cy="237" r="7" fill="#1A0F14"/><path d="M482 220 Q500 210 518 220 M562 220 Q580 210 598 220" stroke="#4A1A06" stroke-width="4" fill="none"/>')
    s.add('<path d="M540 250 C520 300 500 350 540 392 C566 420 600 410 604 380 C594 392 578 392 566 376 C550 352 560 300 540 250Z" fill="#F4994A" stroke="#7A2E08" stroke-width="3"/>')  # trunk
    for i in range(6):
        s.add(f'<path d="M{526+i*3} {290+i*14} q14 6 24 0" stroke="#B85A18" stroke-width="2" fill="none"/>')
    s.add('<path d="M500 330 Q470 370 478 398 Q492 372 516 344Z" fill="#FFF6DA" stroke="#B89A5A" stroke-width="2"/><path d="M580 330 Q610 370 602 398 Q588 372 564 344Z" fill="#FFF6DA" stroke="#B89A5A" stroke-width="2"/>')
    # brass lamps + marigold garlands
    lamp(s, 160, 335, 1.1, g); lamp(s, 920, 335, 1.1, g)
    for gx in (160, 920):
        for i in range(7):
            a = i / 6 * math.pi; s.add(f'<circle cx="{gx+math.cos(a)*34:.0f}" cy="{240-math.sin(a)*34:.0f}" r="9" fill="{"#F59F00" if i%2 else "#E8590C"}"/>')
    for i in range(0, 27):
        x = 70 + i * 36.15; y = 78 + math.sin(i / 26 * math.pi) * 34
        s.add(f'<circle cx="{x}" cy="{y:.1f}" r="14" fill="{"#F59F00" if i % 2 else "#E8590C"}"/><circle cx="{x}" cy="{y:.1f}" r="5.5" fill="#FFE066"/>')
    r = random.Random(5)
    for _ in range(40): sparkle(s, r.randint(80, 1000), r.randint(110, 460), r.randint(3, 7), "#FFE7A0")
    divider(s, g)
    frame(s, g, "#FFF6E2")
    s.out("ganapathy-gold")


# ───────────────────────────── 3. Guruvayoorappan Temple Grace ─────────────────────────────
def guruvayoor():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#FFF8E6"),(1,"#F1DDAE")], x1="0", y1="0", x2="0", y2="1")}"/>')
    # kasavu band top + sides
    for y0, h in [(66, 26), (100, 8)]:
        s.add(f'<rect x="56" y="{y0}" width="{W-112}" height="{h}" fill="{g}"/>')
    for i in range(0, 27):
        s.add(f'<path d="M{70+i*36.15} 92 l18 -12 l18 12 l-18 12Z" fill="#8C1C2B"/>')
    # temple gable (Kerala sloping roof)
    s.add('<path d="M170 170 L540 62 L910 170 L880 178 L540 92 L200 178Z" fill="#7A3E1B"/>')
    s.add(f'<path d="M210 200 L540 100 L870 200Z" fill="#B8651F"/><path d="M210 200 L540 100 L870 200" stroke="{g}" stroke-width="5" fill="none"/>')
    for i in range(14):
        s.add(f'<path d="M{250+i*45} {198-i*0} L{540+(250+i*45-540)*0.55} {132}" stroke="#8C4A12" stroke-width="2" opacity="0.5"/>')
    s.add(f'<circle cx="540" cy="124" r="15" fill="{g}"/><path d="M540 109 V86" stroke="{g}" stroke-width="4"/><circle cx="540" cy="82" r="6" fill="{g}"/>')
    # inner sanctum arch
    s.add(f'<path d="M280 470 V280 Q280 200 540 190 Q800 200 800 280 V470Z" fill="{s.grad([(0,"#3A0F12"),(1,"#7A1D12")], x1="0", y1="0", x2="0", y2="1")}" stroke="{g}" stroke-width="6"/>')
    aura = s.grad([(0, "#FFD680", 0.9), (1, "#7A1D12", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<circle cx="540" cy="320" r="170" fill="{aura}"/>')
    # Guruvayoorappan — dark face, crown, feather, sandal tilak, jasmine garlands
    s.add('<path d="M470 470 Q468 380 540 372 Q612 380 610 470Z" fill="#12182E"/>')
    s.add('<circle cx="540" cy="318" r="56" fill="#1C2547"/>')
    s.add(f'<path d="M476 300 Q476 244 540 238 Q604 244 604 300 Q580 272 540 272 Q500 272 476 300Z" fill="#0B1020"/>')
    s.add(f'<path d="M488 262 L498 218 L518 248 L540 206 L562 248 L582 218 L592 262Z" fill="{g}" stroke="#7A5712" stroke-width="2"/><circle cx="540" cy="226" r="8" fill="#D6204E"/>')
    s.add('<path d="M560 214 Q600 150 566 108" stroke="#3E7B3A" stroke-width="4" fill="none"/><ellipse cx="566" cy="96" rx="20" ry="28" fill="#1E8A6B"/><ellipse cx="566" cy="96" rx="14" ry="21" fill="#E8C65A"/><ellipse cx="566" cy="96" rx="9" ry="14" fill="#1B4F9C"/><ellipse cx="566" cy="94" rx="4" ry="7" fill="#0B2A5C"/>')
    s.add('<path d="M526 278 q14 -10 28 0" stroke="#F5E3B0" stroke-width="5" fill="none"/><circle cx="540" cy="292" r="4" fill="#FFEFC0"/>')
    s.add('<ellipse cx="518" cy="312" rx="11" ry="7" fill="#FFFFFF"/><ellipse cx="562" cy="312" rx="11" ry="7" fill="#FFFFFF"/><circle cx="519" cy="312" r="5" fill="#0B1020"/><circle cx="561" cy="312" r="5" fill="#0B1020"/><path d="M504 298 q14 -8 28 0 M548 298 q14 -8 28 0" stroke="#050810" stroke-width="3.5" fill="none"/><path d="M524 342 q16 10 32 0" stroke="#E04B5A" stroke-width="4" fill="none"/>')
    s.add(f'<circle cx="486" cy="326" r="8" fill="{g}"/><circle cx="594" cy="326" r="8" fill="{g}"/>')
    for i in range(15):  # jasmine mala
        a = i / 14 * math.pi; x = 482 + (596 - 482) * i / 14; y = 372 + math.sin(a) * 62
        s.add(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="9" fill="#FFFFFF" stroke="#E9DFC0" stroke-width="1.5"/><circle cx="{x:.0f}" cy="{y:.0f}" r="2.5" fill="#F2D77A"/>')
    s.add(f'<path d="M478 380 Q540 450 602 380" stroke="{g}" stroke-width="5" fill="none"/>')
    # lamps either side with jasmine strings
    lamp(s, 205, 335, 0.95, g); lamp(s, 875, 335, 0.95, g)
    for gx in (130, 950):
        for i in range(16):
            y = 240 + i * 14; s.add(f'<circle cx="{gx}" cy="{y}" r="7" fill="#FFFFFF" stroke="#E9DFC0" stroke-width="1.2"/>')
    # kasavu strip under arch
    s.add(f'<rect x="56" y="{470}" width="{W-112}" height="14" fill="{g}"/>')
    divider(s, g, y=486)
    frame(s, g, "#FFFAEE", panel_stroke="#8C1C2B")
    s.out("guruvayoor-krishna")


# ───────────────────────────── 4. Sacred Blessing Dove & Cross ─────────────────────────────
def christian():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#EAF1FA"),(0.5,"#FBFCFF"),(1,"#EEE9DA")], x1="0", y1="0", x2="0", y2="1")}"/>')
    rays = s.grad([(0, "#FFF6C8", 0.95), (1, "#FFFFFF", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<circle cx="540" cy="262" r="270" fill="{rays}"/>')
    for i in range(18):
        s.add(f'<g transform="translate(540 262) rotate({i*20})"><path d="M-9 -222 L0 -330 L9 -222Z" fill="#F3D98B" opacity="0.5"/></g>')
    s.add('<g transform="translate(0 24)">')
    # rose window
    cols = ["#3A5FB0", "#B3283D", "#2E8B57", "#E0A526", "#7A3FA0", "#1E94B3"]
    for i in range(12):
        a0 = i * 30 - 90; a1 = a0 + 30
        x0, y0 = 540 + 168 * math.cos(math.radians(a0)), 262 + 168 * math.sin(math.radians(a0))
        x1, y1 = 540 + 168 * math.cos(math.radians(a1)), 262 + 168 * math.sin(math.radians(a1))
        s.add(f'<path d="M540 262 L{x0:.1f} {y0:.1f} A168 168 0 0 1 {x1:.1f} {y1:.1f}Z" fill="{cols[i%6]}" fill-opacity="0.82"/>')
    for i in range(12):
        s.add(f'<g transform="translate(540 262) rotate({i*30})"><path d="M0 -62 Q16 -112 0 -150 Q-16 -112 0 -62Z" fill="#FFFFFF" fill-opacity="0.35" stroke="{g}" stroke-width="2"/></g>')
    for rad, w in [(168, 8), (118, 3), (62, 4)]:
        s.add(f'<circle cx="540" cy="262" r="{rad}" fill="none" stroke="{g}" stroke-width="{w}"/>')
    s.add('<circle cx="540" cy="262" r="58" fill="#FFF9E6"/>')
    s.add(f'<rect x="528" y="214" width="24" height="96" rx="4" fill="{g}" stroke="#7A5712" stroke-width="2"/><rect x="500" y="242" width="80" height="24" rx="4" fill="{g}" stroke="#7A5712" stroke-width="2"/>')
    s.add('</g>')
    # dove
    s.add('<g transform="translate(540 92)">')
    s.add('<path d="M-6 6 C-70 -40 -150 -34 -190 6 C-140 -2 -96 14 -64 34 C-40 44 -16 34 -6 6Z" fill="#FFFFFF" stroke="#C8D2E4" stroke-width="2.5"/><path d="M6 6 C70 -40 150 -34 190 6 C140 -2 96 14 64 34 C40 44 16 34 6 6Z" fill="#FFFFFF" stroke="#C8D2E4" stroke-width="2.5"/>')
    for i in range(5):
        s.add(f'<path d="M{-30-i*28} {10-i*2} q-14 14 -30 18 M{30+i*28} {10-i*2} q14 14 30 18" stroke="#C8D2E4" stroke-width="2" fill="none"/>')
    s.add('<ellipse cx="0" cy="26" rx="26" ry="34" fill="#FFFFFF" stroke="#C8D2E4" stroke-width="2.5"/><circle cx="0" cy="-12" r="18" fill="#FFFFFF" stroke="#C8D2E4" stroke-width="2.5"/><path d="M-4 -12 l-16 4 l16 4Z" fill="#E8A53A"/><circle cx="-6" cy="-16" r="2.6" fill="#1A1A2A"/>')
    s.add('<path d="M-10 56 L0 92 L10 56Z" fill="#FFFFFF" stroke="#C8D2E4" stroke-width="2.5"/>')
    s.add('<path d="M-14 -10 q-34 14 -30 36" stroke="#3E7B3A" stroke-width="3.5" fill="none"/><ellipse cx="-30" cy="6" rx="7" ry="3.6" fill="#4C9A4A" transform="rotate(-30 -30 6)"/><ellipse cx="-40" cy="20" rx="7" ry="3.6" fill="#4C9A4A" transform="rotate(10 -40 20)"/>')
    s.add('</g>')
    # lilies both sides
    def lily(x, y, rot, sc):
        s.add(f'<g transform="translate({x} {y}) rotate({rot}) scale({sc})"><path d="M0 0 Q-8 -90 -4 -160" stroke="#3E7B3A" stroke-width="5" fill="none"/>')
        s.add('<path d="M0 -10 Q-60 -40 -78 -92 Q-30 -64 -2 -34Z" fill="#4C9A4A"/><path d="M2 -26 Q56 -56 72 -110 Q28 -78 4 -44Z" fill="#3E8A42"/>')
        for a in (-50, -25, 0, 25, 50):
            s.add(f'<g transform="translate(-4 -160) rotate({a})"><path d="M0 0 Q-22 -44 0 -86 Q22 -44 0 0Z" fill="#FFFFFF" stroke="#CFC8B0" stroke-width="2"/></g>')
        for a in (-18, 0, 18):
            s.add(f'<g transform="translate(-4 -160) rotate({a})"><path d="M0 0 V-52" stroke="#C99A2E" stroke-width="2.5"/><circle cx="0" cy="-54" r="4.5" fill="#E0A526"/></g>')
        s.add('</g>')
    lily(125, 478, -8, 1.0); lily(955, 478, 8, 1.0); lily(205, 482, 12, 0.72); lily(875, 482, -12, 0.72)
    divider(s, g)
    frame(s, g, "#FFFFFF", panel_stroke="#B08D3C")
    s.out("christian-devotional")


# ───────────────────────────── 5. Masjid & Golden Lanterns ─────────────────────────────
def fanoos(s, x, y, sc, g):
    glow = s.grad([(0, "#FFE9A0", 0.95), (1, "#FFB43A", 0)], kind="radial", cx="0.5", cy="0.5", r="0.5")
    s.add(f'<g transform="translate({x} {y}) scale({sc})"><path d="M0 -150 V-82" stroke="{g}" stroke-width="3"/><circle cx="0" cy="-8" r="84" fill="{glow}"/>')
    s.add(f'<path d="M-14 -82 H14 L22 -66 H-22Z" fill="{g}"/><path d="M-22 -66 Q-46 -30 -38 6 Q-30 40 -16 58 H16 Q30 40 38 6 Q46 -30 22 -66Z" fill="#FFD36A" fill-opacity="0.55" stroke="{g}" stroke-width="3.5"/>')
    s.add(f'<path d="M-22 -66 Q-8 -20 -16 58 M22 -66 Q8 -20 16 58 M0 -66 V58" stroke="{g}" stroke-width="2.2" fill="none"/><path d="M0 -40 C10 -22 9 -8 0 -2 C-9 -8 -10 -22 0 -40Z" fill="#FFF3B0"/>')
    s.add(f'<path d="M-18 58 H18 L10 74 H-10Z" fill="{g}"/><circle cx="0" cy="80" r="5" fill="{g}"/></g>')


def islamic():
    s = Svg(); g = gold(s)
    s.add(f'<rect width="{W}" height="{H}" fill="{s.grad([(0,"#04241C"),(0.55,"#0B5D4B"),(1,"#052F26")], x1="0", y1="0", x2="0", y2="1")}"/>')
    r = random.Random(9)
    for _ in range(60): sparkle(s, r.randint(70, 1010), r.randint(70, 330), r.randint(2, 6), "#F6E3A1")
    # moon
    s.add(f'<circle cx="540" cy="136" r="54" fill="{g}"/><circle cx="562" cy="124" r="48" fill="#06382E"/>')
    sparkle(s, 600, 98, 15, "#FFF1B0")
    # mosque: minarets + domes on a hill
    def minaret(x, h):
        s.add(f'<rect x="{x-17}" y="{470-h}" width="34" height="{h}" fill="#E8D7A0" stroke="{g}" stroke-width="2.5"/><rect x="{x-26}" y="{470-h+34}" width="52" height="11" fill="{g}"/><rect x="{x-21}" y="{470-h+84}" width="42" height="9" fill="{g}"/><path d="M{x-21} {470-h} Q{x} {470-h-52} {x+21} {470-h}Z" fill="#2A8A6A" stroke="{g}" stroke-width="2.5"/><path d="M{x} {470-h-52} V{470-h-76}" stroke="{g}" stroke-width="3"/><circle cx="{x}" cy="{470-h-78}" r="5" fill="{g}"/>')
        for k in range(4): s.add(f'<path d="M{x-6} {470-h+110+k*38} q6 -14 12 0 v18 h-12Z" fill="#0B5D4B"/>')
    minaret(300, 250); minaret(780, 250); minaret(170, 190); minaret(910, 190)
    s.add(f'<path d="M380 470 V350 Q380 332 392 332 H688 Q700 332 700 350 V470Z" fill="#E8D7A0" stroke="{g}" stroke-width="3"/>')
    for x in (418, 540, 662):
        s.add(f'<path d="M{x-24} 470 V396 Q{x-24} 366 {x} 362 Q{x+24} 366 {x+24} 396 V470Z" fill="#0B5D4B" stroke="{g}" stroke-width="2.5"/>')
    dome = s.grad([(0, "#52C7A0"), (0.5, "#1E8A6B"), (1, "#0B5D4B")], x1="0", y1="0", x2="1", y2="1")
    s.add(f'<path d="M418 332 Q418 190 540 176 Q662 190 662 332Z" fill="{dome}" stroke="{g}" stroke-width="4"/>')
    s.add(f'<path d="M470 332 Q476 230 540 190 M610 332 Q604 230 540 190 M540 190 V332" stroke="{g}" stroke-width="2" fill="none" opacity="0.7"/>')
    s.add(f'<rect x="402" y="326" width="276" height="16" fill="{g}"/><path d="M540 176 V138" stroke="{g}" stroke-width="4"/>')
    s.add(f'<circle cx="540" cy="150" r="9" fill="{g}"/><circle cx="545" cy="146" r="7" fill="#0B5D4B"/>')
    for x, w in [(335, 80), (745, 80), (230, 70), (850, 70)]:
        s.add(f'<path d="M{x-w/2} 470 V420 Q{x-w/2} 380 {x} 372 Q{x+w/2} 380 {x+w/2} 420 V470Z" fill="#2A8A6A" stroke="{g}" stroke-width="2.5"/>')
    # fanoos lanterns
    fanoos(s, 112, 120, 0.8, g); fanoos(s, 968, 120, 0.8, g); fanoos(s, 225, 80, 0.62, g); fanoos(s, 855, 80, 0.62, g)
    # geometric strip
    for i in range(0, 27):
        x = 70 + i * 36.15
        s.add(f'<path d="M{x} 80 l9 9 l-9 9 l-9 -9Z" fill="{g}" opacity="0.9"/>')
    s.add(f'<path d="M0 470 Q540 440 1080 470 V486 H0Z" fill="#052F26"/>')
    divider(s, g, y=488)
    frame(s, g, "#073B2E", panel_stroke="#E8C766", rx=44)
    s.out("islamic-devotional")


# ───────────────────────────── 6 & 7. Balloons ─────────────────────────────
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
    for fn in (radha_krishna, ganapathy, guruvayoor, christian, islamic, balloon_luxury, balloon_kids): fn()
