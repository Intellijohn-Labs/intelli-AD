#!/usr/bin/env python3
"""Normalises the source art in images/hindu wedding/ into 1080x1500 JPEGs under public/templates/hindu-wedding/.

The card canvas is a fixed 1080x1500 (ratio 0.72) but the sources are 9:16, 2:3, 3:4 ... Instead of stretching or
cropping borders/deities, each image is scaled to cover the card, and any surplus height is removed as a horizontal
strip taken from a plain band of the artwork (blended over a short cross-fade so no seam is visible).
Run: python3 scripts/prepare-hindu-wedding-images.py   (needs Pillow + numpy)
"""
import os
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "images", "hindu wedding")
OUT = os.path.join(ROOT, "public", "templates", "hindu-wedding")
W, H = 1080, 1500
FADE = 56

# slug -> (source file, plain band [a, b] as a fraction of the source height where a strip may be removed[, fixed scale])
JOBS = {
    "hindu-radha-krishna": ("Radha Krishna Hindu Wedding Invitation Background.jpeg", (0.3, 0.6)),
    "hindu-shiva-parvati-arch": ("Wedding Invitation Card Design Inspired by Shiva Sakthi for Elegant Events.jpeg", (0.2, 0.5)),
    "hindu-gopuram-garden": ("Wedding Invitation_.jpeg", (0.14, 0.48)),
    "hindu-shiva-sakthi-rose": ("_ (3).jpeg", (0.16, 0.6)),
    "hindu-mandap-pooja": ("_ (4).jpeg", (0.25, 0.75)),
    "hindu-temple-tower": ("_ (5).jpeg", (0.12, 0.5)),
    "hindu-ramayana-gold": ("_ (6).jpeg", (0.3, 0.6)),
    "hindu-bells-hands": ("_.jpeg", (0.45, 0.78)),
    "hindu-watercolor-couple": ("love❤️_🩹.jpeg", (0.25, 0.72)),
    "hindu-hands-minimal": ("_ (1).jpeg", (0.46, 0.95)),
    "hindu-silhouette-couple": ("_ (2).jpeg", (0.05, 0.5)),
    "hindu-sunrise-temple": ("_ (7).jpeg", (0.3, 0.6)),
    # 1:2 source with the couple's names / date baked in: paint the text area clean, scale gently, reflect-pad the sides.
    "hindu-royal-ganesha-couple": ("Hindu Wedding Invite Card  Royal Indian Wedding Invitation  AI Wedding Invitation Design d.jpeg", (0.1, 0.5), 1.1),
}

# Later additions, one output folder per category. scale "fit" = scale to the card height and reflect-pad the sides
# (for tall 9:16 art whose side decoration mirrors cleanly); otherwise cover + remove a strip from the plain band.
# Only images with a clear text area belong here: finished designs with names / dates baked in are not registered.
CATEGORY_JOBS = {
    "hindu-wedding": {
        "hindu-peacock-arch-couple": ("Hindu Wedding Invitation Card Design for Elegant Celebrations.jpeg", (0.25, 0.55), "fit"),
        "hindu-red-gold-palace-door": ("Indian Wedding Invitation Card Template for Elegant Events.jpeg", (0.6, 0.9), "fit"),
        "hindu-mandap-hanging-flowers": ("_ (12).jpeg", (0.2, 0.55), "fit"),
    },
    "haldi": {"haldi-yellow-drapes-bride": ("Bride Haldi Ceremony Invitation Template 💛 _ Indian Wedding Function.jpeg", (0.15, 0.55), "fit")},
    "nikah": {"nikah-cream-arch-lanterns": ("Islamic Wedding Invitations Template - Elegant Muslim Nikah Design with Gold & Ivory.jpeg", (0.3, 0.5))},
    "reception": {"reception-stage-couple": ("_ (9).jpeg", (0.15, 0.5), "fit")},
    "wedding": {
        "wedding-sunset-arch-couple": ("Invitation Template.jpeg", (0.3, 0.55)),
        "wedding-palm-arch-dance": ("_ (10).jpeg", (0.2, 0.5)),
    },
}


def clean_baked_text(im: Image.Image) -> Image.Image:
    """Replaces the baked-in blessing / names / date block of the 736x1472 'royal' card with its own soft background."""
    a = np.asarray(im, dtype=np.float32)
    out = a.copy()
    for (x0, x1, y0, y1) in [(150, 585, 176, 790)]:  # the small "Shree Ganeshay Namah" line above it is kept
        k = np.hanning(61).astype(np.float32); k /= k.sum()  # smooth the edge colours down the rows so no banding shows
        smooth = lambda v: np.stack([np.convolve(np.pad(v[:, c], 30, mode="edge"), k, mode="valid") for c in range(3)], axis=1)
        L = smooth(a[y0:y1, x0 - 6:x0 - 1].mean(axis=1))
        R = smooth(a[y0:y1, x1 + 1:x1 + 6].mean(axis=1))
        t = np.linspace(0, 1, x1 - x0, dtype=np.float32)[None, :, None]
        patch = Image.fromarray((L[:, None, :] * (1 - t) + R[:, None, :] * t).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))
        mask = Image.new("L", patch.size, 0)
        mask.paste(255, (8, 8, patch.width - 8, patch.height - 8))
        base = Image.fromarray(out.clip(0, 255).astype(np.uint8))
        base.paste(patch, (x0, y0), mask.filter(ImageFilter.GaussianBlur(5)))
        out = np.asarray(base, dtype=np.float32)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def retarget(im: Image.Image, band, scale=None) -> Image.Image:
    w, h = im.size
    s = H / h if scale == "fit" else (scale or max(W / w, H / h))
    im = im.resize((round(w * s), round(h * s)), Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2, 60, 2))
    if im.width < W:  # reflect-pad the sides (decorative pillars / garlands mirror cleanly)
        pad = W - im.width
        arr = np.pad(np.asarray(im), ((0, 0), (pad // 2, pad - pad // 2), (0, 0)), mode="reflect")
        im = Image.fromarray(arr)
    if im.width > W:  # centre-crop sides
        x = (im.width - W) // 2
        im = im.crop((x, 0, x + W, im.height))
    d = im.height - H
    if d <= 0:
        return im.crop((0, 0, W, H)) if im.height >= H else im
    a = np.asarray(im.convert("RGB"), dtype=np.float32)
    lo, hi = int(band[0] * im.height) + FADE, int(band[1] * im.height) - d - FADE
    hi = max(hi, lo + 1)
    best, by = 1e18, lo
    for y in range(lo, hi, 4):  # rows around y must resemble rows around y + d
        cost = np.abs(a[y - FADE:y + FADE:6] - a[y + d - FADE:y + d + FADE:6]).mean()
        if cost < best: best, by = cost, y
    y = by
    top, bot = a[:y - FADE], a[y + d + FADE:]
    t = np.linspace(0, 1, 2 * FADE, dtype=np.float32)[:, None, None]
    mid = a[y - FADE:y + FADE] * (1 - t) + a[y + d - FADE:y + d + FADE] * t
    out = np.concatenate([top, mid, bot], axis=0)
    assert out.shape[0] == H, out.shape
    print(f"   cut {d}px at y={y} (seam cost {best:.1f})")
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


os.makedirs(OUT, exist_ok=True)
for folder, jobs in CATEGORY_JOBS.items():
    out = os.path.join(ROOT, "public", "templates", folder)
    os.makedirs(out, exist_ok=True)
    for slug, (fn, band, *opt) in jobs.items():
        print(folder, slug)
        r = retarget(Image.open(os.path.join(SRC, fn)).convert("RGB"), band, *opt)
        assert r.size == (W, H), r.size
        r.save(os.path.join(out, slug + ".jpg"), quality=90, optimize=True, progressive=True)
for slug, (fn, band, *opt) in JOBS.items():
    im = Image.open(os.path.join(SRC, fn)).convert("RGB")
    print(slug, im.size)
    if slug == "hindu-royal-ganesha-couple": im = clean_baked_text(im)
    r = retarget(im, band, *opt)
    assert r.size == (W, H), r.size
    r.save(os.path.join(OUT, slug + ".jpg"), quality=90, optimize=True, progressive=True)
