import type { BookingState } from "./booking-store";
import type { FileMeta } from "./types";

/** Saved ad drafts live in this browser's localStorage, one list per signed-in user. */
export interface Draft {
  id: string;
  savedAt: string;
  state: BookingState;
}

const key = (userId: string) => `intelliad.drafts.v1.${userId}`;
export const BOOKING_STORAGE_KEY = "intelliad.booking.v1";

export function listDrafts(userId: string): Draft[] {
  try {
    const arr = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(arr) ? (arr as Draft[]).filter((d) => d && d.id && d.state).sort((a, b) => b.savedAt.localeCompare(a.savedAt)) : [];
  } catch {
    return [];
  }
}

function write(userId: string, drafts: Draft[]) {
  localStorage.setItem(key(userId), JSON.stringify(drafts));
}

/** Drop in-memory file previews (blob URLs don't survive a reload). */
function clean(state: BookingState): BookingState {
  const c = (f: FileMeta | null) => (f ? { name: f.name, size: f.size, type: f.type, url: f.url } : null);
  return { ...state, receipt: null, artwork: c(state.artwork), documents: Object.fromEntries(Object.entries(state.documents).map(([k, v]) => [k, c(v)!])) };
}

export function saveDraft(userId: string, state: BookingState): Draft | null {
  try {
    const d: Draft = { id: `d_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, savedAt: new Date().toISOString(), state: clean(state) };
    write(userId, [d, ...listDrafts(userId)].slice(0, 25));
    return d;
  } catch {
    return null;
  }
}

export function deleteDraft(userId: string, id: string) {
  try { write(userId, listDrafts(userId).filter((d) => d.id !== id)); } catch { /* ignore */ }
}

/** Puts the draft into the wizard's session storage; /book hydrates from it. */
export function loadDraftIntoWizard(d: Draft): boolean {
  try {
    sessionStorage.setItem(BOOKING_STORAGE_KEY, JSON.stringify({ ...d.state, step: Math.min(d.state.step, 3), returnToCheckout: false, receipt: null }));
    return true;
  } catch {
    return false;
  }
}
