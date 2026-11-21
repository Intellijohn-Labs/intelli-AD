/** Structural check of the first bytes of an uploaded greeting MP4 against what WhatsApp Cloud API accepts. Returns a problem description, or null when fine. */
export function mp4Problem(head: Uint8Array): string | null {
  const dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
  const type = (o: number) => String.fromCharCode(head[o], head[o + 1], head[o + 2], head[o + 3]);
  let o = 0, first = true, moov: [number, number] | null = null;
  while (o + 8 <= head.length) {
    let size = dv.getUint32(o), t = type(o + 4);
    if (size === 1 && o + 16 <= head.length) size = Number(dv.getBigUint64(o + 8));
    if (first && t !== "ftyp") return "not an MP4 (no ftyp box)";
    first = false;
    if (t === "moof") return "fragmented MP4 (moof boxes)";
    if (t === "mdat") break; // moov must come before this
    if (t === "moov") moov = [o, Math.min(head.length, o + size)];
    if (size < 8) return "corrupt MP4 box";
    o += size;
  }
  if (!moov) return o + 8 <= head.length || head.length < 65_000 ? "moov atom is not at the start (not faststart)" : null;
  for (let i = moov[0]; i - 4 + 104 <= moov[1]; i++) { // tkhd: width / height are 16.16 fixed point at the end of the box
    if (type(i) !== "tkhd") continue;
    const base = i - 4, ver = head[i + 4], w = dv.getUint32(base + (ver === 1 ? 96 : 84)) / 65536, h = dv.getUint32(base + (ver === 1 ? 100 : 88)) / 65536;
    if (w && h && (w % 16 || h % 16)) return `video size ${w}x${h} is not a multiple of 16`;
  }
  return null;
}
