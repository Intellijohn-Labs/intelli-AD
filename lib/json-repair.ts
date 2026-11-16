/**
 * Lenient JSON extraction for model replies: strips markdown fences and prose, takes the span from the first "{"
 * to the last "}", and, if the reply was cut off mid-way (token limit), repairs it by dropping the unfinished
 * trailing fragment and closing any open strings, arrays and objects.
 */
export interface LooseResult { value: unknown; repaired: boolean }

export function parseJsonLoose(raw: string): LooseResult {
  let t = raw.replace(/^\uFEFF/, "").trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = t.indexOf("{");
  if (start < 0) throw new Error("no JSON object in the reply");
  const end = t.lastIndexOf("}");
  if (end > start) {
    try { return { value: JSON.parse(t.slice(start, end + 1)), repaired: false }; } catch { /* fall through to repair */ }
  }
  return { value: JSON.parse(repairTruncated(t.slice(start))), repaired: true };
}

/** Closes a truncated JSON document. Walks the text tracking strings and the bracket stack. */
export function repairTruncated(src: string): string {
  const stack: string[] = [];
  let inStr = false, esc = false, strIsKey = false, prevSig = "";
  // Index just after the last point where the document was in a "clean" state (a complete value ended there).
  let safe = 0;
  const safeStack: string[][] = [];
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (esc) esc = false; else if (c === "\\") esc = true;
      else if (c === '"') {
        inStr = false;
        prevSig = '"';
        // A finished object KEY (no value yet) is not a safe cut point; a finished string value is.
        if (!strIsKey) { safe = i + 1; safeStack.length = 0; safeStack.push([...stack]); }
      }
      continue;
    }
    if (c === '"') { inStr = true; strIsKey = stack[stack.length - 1] === "}" && (prevSig === "{" || prevSig === ","); }
    else if (c === "{" || c === "[") { stack.push(c === "{" ? "}" : "]"); safe = i + 1; safeStack.length = 0; safeStack.push([...stack]); }
    else if (c === "}" || c === "]") { stack.pop(); safe = i + 1; safeStack.length = 0; safeStack.push([...stack]); }
    else if (/[0-9eE+\-.]/.test(c) || /[a-z]/.test(c)) { /* inside a number / literal: not yet safe */ }
    else if (c === ",") { safe = i; safeStack.length = 0; safeStack.push([...stack]); }
    if (!/\s/.test(c) && c !== '"') prevSig = c;
  }
  let body = src.slice(0, safe || src.length);
  const closers = (safeStack[0] ?? stack).slice().reverse();
  body = body.replace(/[,\s]+$/, "");
  // A dangling `"key":` (key without a value) can't be closed: drop it.
  body = body.replace(/,?\s*"[^"\\]*"\s*:\s*$/, "");
  return body.replace(/[,\s]+$/, "") + closers.join("");
}
