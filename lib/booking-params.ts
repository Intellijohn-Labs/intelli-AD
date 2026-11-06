import { getTemplate } from "@/data/categories";
import { DEFAULT_OBITUARY } from "@/data/obituary";
import { getNewspaper } from "@/data/newspapers";
import type { BookingState } from "./booking-store";
import type { AdType } from "./types";

const AD_TYPES: AdType[] = ["classified-text", "classified-display", "commercial-display"];

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Build wizard initial state from URL search params (?type, ?paper, ?eds, ?template). */
export function buildInitialState(sp: Params): Partial<BookingState> {
  const out: Partial<BookingState> = {};
  const type = first(sp.type) as AdType | undefined;
  if (type && AD_TYPES.includes(type)) out.adType = type;

  const paper = getNewspaper(first(sp.paper));
  if (paper) {
    const wanted = (first(sp.eds) ?? "").split(",").filter(Boolean);
    const valid = paper.editions.filter((e) => wanted.includes(e.id)).map((e) => e.id);
    if (valid.length) out.selection = { [paper.id]: valid };
  }

  const tpl = getTemplate(first(sp.template));
  if (tpl) {
    out.adType = "classified-text";
    out.categoryId = tpl.categoryId;
    out.text = tpl.body;
    out.templateTitle = tpl.title;
    // The anniversary memorial is a photo box ad: open it in display mode with the memorial form (garland / lamp frames).
    if (tpl.id === "obituary-anniversary") {
      out.adType = "classified-display";
      out.obituary = { ...DEFAULT_OBITUARY, kind: "anniversary", milestone: "1" };
    }
  }
  return out;
}

export function bookHref(params: { type?: AdType; paper?: string; eds?: string[]; template?: string }) {
  const q = new URLSearchParams();
  if (params.type) q.set("type", params.type);
  if (params.paper) q.set("paper", params.paper);
  if (params.eds?.length) q.set("eds", params.eds.join(","));
  if (params.template) q.set("template", params.template);
  const s = q.toString();
  return s ? `/book?${s}` : "/book";
}
