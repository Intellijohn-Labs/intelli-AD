import { getNewspaper } from "@/data/newspapers";
import type { AdType, CutoffRule, Newspaper } from "./types";
import { parseISODate, toISODate } from "./utils";
import { paperConfig, printsOn } from "./rates";

/** The cut-off in force for a publication and ad type: the admin's rate-sheet values, else the standard rule. */
export const cutoffRuleFor = (paper: Newspaper, adType: AdType): CutoffRule => paperConfig(paper, adType).cutoff;

export const MAX_ADVANCE_DAYS = 90;

/** The moment bookings close for a release date under a rule. */
export function cutoffFor(releaseISO: string, rule: CutoffRule): Date {
  const d = parseISODate(releaseISO);
  d.setDate(d.getDate() - rule.daysBefore);
  const [h, m] = rule.time.split(":").map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

export interface PaperCutoff {
  paper: Newspaper;
  rule: CutoffRule;
  cutoff: Date;
  msLeft: number;
  status: "open" | "closing" | "closed";
}

export function paperCutoffs(releaseISO: string, paperIds: string[], adType: AdType, now: Date): PaperCutoff[] {
  const out: PaperCutoff[] = [];
  for (const id of paperIds) {
    const paper = getNewspaper(id);
    if (!paper) continue;
    const rule = cutoffRuleFor(paper, adType);
    const cutoff = cutoffFor(releaseISO, rule);
    const msLeft = cutoff.getTime() - now.getTime();
    out.push({
      paper,
      rule,
      cutoff,
      msLeft,
      status: msLeft <= 0 || !printsOn(paper.name, parseISODate(releaseISO)) ? "closed" : msLeft < 3 * 3600_000 ? "closing" : "open",
    });
  }
  return out;
}

/** A date is bookable only if every selected publication is still open for it. */
export function isBookable(releaseISO: string, paperIds: string[], adType: AdType, now: Date) {
  const cutoffs = paperCutoffs(releaseISO, paperIds, adType, now);
  return cutoffs.length > 0 && cutoffs.every((c) => c.status !== "closed");
}

export function earliestRelease(paperIds: string[], adType: AdType, now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i <= MAX_ADVANCE_DAYS; i++) {
    const iso = toISODate(d);
    if (isBookable(iso, paperIds, adType, now)) return iso;
    d.setDate(d.getDate() + 1);
  }
  return toISODate(d);
}

export function latestRelease(now: Date): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + MAX_ADVANCE_DAYS);
  return toISODate(d);
}

export function formatCountdown(ms: number, t: (k: string, v?: Record<string, string | number>) => string = (k, v) => k.replace(/\{(\w+)\}/g, (_, n) => String(v?.[n]))) {
  if (ms <= 0) return t("Closed");
  const totalMin = Math.floor(ms / 60_000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) return t("{d}d {h}h left", { d: days, h: hours });
  if (hours > 0) return t("{h}h {m}m left", { h: hours, m: mins });
  return t("{m}m left", { m: mins });
}

export function formatClock(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}
