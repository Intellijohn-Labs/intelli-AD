/**
 * Per-number send guard. Meta limits how many marketing templates one WhatsApp number receives in a short window, so the studio and the
 * dispatch API both refuse a third invitation to the same number inside a rolling 24 hours (Meta's per-user marketing template frequency cap). Pure functions: shared by the browser and the server.
 */
export const COOLDOWN_MAX = 2;
export const COOLDOWN_WINDOW_MS = 24 * 3600_000;

/**
 * When the number may be sent to again, or null if it can be now. `times` are the send times (ms) of earlier dispatches to that number.
 * With 2 recent sends the wait ends 24 hours after the older one; with more, once enough of them have aged out for fewer than 2 to remain.
 */
export function cooldownUntil(times: readonly number[], now = Date.now()): number | null {
  const recent = times.filter((t) => t > now - COOLDOWN_WINDOW_MS && t <= now + 10_000).sort((a, b) => a - b);
  if (recent.length < COOLDOWN_MAX) return null;
  const until = recent[recent.length - COOLDOWN_MAX] + COOLDOWN_WINDOW_MS;
  return until > now ? until : null;
}

/** Countdown text: "23h 42m" while an hour or more is left, "m:ss" for the last hour. */
export function clock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60);
  return h >= 1 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}:${String(total % 60).padStart(2, "0")}`;
}

/** Same countdown as HH:MM:SS (for screen readers and tooltips). */
export const clockFull = (ms: number): string => { const t = Math.max(0, Math.ceil(ms / 1000)); return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((x) => String(x).padStart(2, "0")).join(":"); };

export const COOLDOWN_HINT = "Meta limits 2 marketing templates per number within 24 hours unless the guest replies on WhatsApp.";
export const REPLIED_CONFIRM = "Confirm that this guest has replied to you on WhatsApp?\n\nOnce a guest replies, Meta lets you message them again. Only continue if they really did: an unreplied number can still be blocked by WhatsApp.";
