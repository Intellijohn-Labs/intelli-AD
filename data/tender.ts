import { fmtDate, fmtTime } from "./obituary";

/** Tender Notice (ദർഘാസ് പരസ്യം): fields, sample templates and the print-text composer. */
export interface TenderFields {
  org: string;
  ref: string;
  description: string;
  pac: string;
  emd: string;
  /** Tender document / form fee. */
  fee: string;
  lastDate: string; // YYYY-MM-DD
  lastTime: string; // HH:mm
  /** Officer / authority contact details. */
  contact: string;
  website: string;
  /** How the uploaded logo is cropped in the preview. */
  logoShape: "square" | "round";
  /** Structured item blocks (schedule of items / works) printed as a ruled table. */
  items: TenderItem[];
  /** Authorised signatory block. */
  signatory: string;
  designation: string;
  /** Reserve a seal / stamp zone beside the signature. */
  seal: boolean;
  /** Where the seal sits relative to the signature (click it in the proof to cycle). */
  sealPos: "left" | "center" | "right";
}

export interface TenderItem {
  name: string;
  qty: string;
  amount: string;
}

export const DEFAULT_TENDER: TenderFields = { org: "", ref: "", description: "", pac: "", emd: "", fee: "", lastDate: "", lastTime: "", contact: "", website: "", logoShape: "square", items: [], signatory: "", designation: "", seal: true, sealPos: "left" };

/** "15-11-2026, ഉച്ചയ്ക്ക് 3:00" or a [തീയതി] placeholder. */
export function fmtTenderDeadline(f: Pick<TenderFields, "lastDate" | "lastTime">) {
  return [f.lastDate ? fmtDate(f.lastDate) : "[തീയതി]", f.lastTime && fmtTime(f.lastTime)].filter(Boolean).join(", ");
}

export const TENDER_HEADER = "ദർഘാസ് പരസ്യം / TENDER NOTICE";

/** Required details left empty become [BRACKETED] so booking is blocked until they are filled. */
export function composeTender(f: TenderFields): string {
  const lines = [TENDER_HEADER, f.org.trim() || "[സ്ഥാപനത്തിന്റെ പേര്]", `ടെൻഡർ നമ്പർ: ${f.ref.trim() || "[ടെൻഡർ നമ്പർ]"}`, f.description.trim() || "[ജോലിയുടെ / സാമഗ്രികളുടെ വിവരണം]"];
  if (f.pac.trim()) lines.push(`അടങ്കൽ തുക (PAC): ${money(f.pac)}`);
  if (f.emd.trim()) lines.push(`നിരതദ്രവ്യം (EMD): ${money(f.emd)}`);
  if (f.fee.trim()) lines.push(`ദർഘാസ് ഫോറത്തിന്റെ വില: ${money(f.fee)}`);
  const items = f.items.filter((i) => i.name.trim());
  if (items.length) {
    lines.push("ഇനങ്ങൾ:");
    items.forEach((i, n) => lines.push(`${n + 1}. ${i.name.trim()}${i.qty.trim() ? ` – ${i.qty.trim()}` : ""}${i.amount.trim() ? ` – ${money(i.amount)}` : ""}`));
  }
  lines.push(`അവസാന തീയതിയും സമയവും: ${fmtTenderDeadline(f)}`);
  const contact = [f.contact.trim(), f.website.trim()].filter(Boolean).join(", ");
  lines.push(`വിശദവിവരങ്ങൾക്ക്: ${contact || "[ഫോൺ / വെബ്സൈറ്റ്]"}`);
  if (f.signatory.trim()) lines.push(`${f.signatory.trim()}${f.designation.trim() ? `, ${f.designation.trim()}` : ""}`);
  return lines.join("\n");
}

/** "5,00,000" or "[തുക]" stay as typed; a bare number gets ₹. */
function money(v: string) {
  const t = v.trim();
  return /^[\d,.]+$/.test(t) ? `₹${t}` : t;
}

export interface TenderTemplateDef { id: string; fields: TenderFields }

/** Fields for the ready-made tender templates (bracketed items are for the advertiser to replace). */
export const TENDER_TEMPLATE_FIELDS: Record<string, TenderFields> = {
  "tender-works": {
    org: "ഗ്രാമപഞ്ചായത്ത് [പേര്], [ജില്ല]",
    ref: "[ടെൻഡർ നമ്പർ]",
    description: "[റോഡ് / കെട്ടിടം] നിർമ്മാണ പ്രവൃത്തിക്കായി അംഗീകൃത കരാറുകാരിൽ നിന്നും മുദ്രവച്ച ടെൻഡറുകൾ ക്ഷണിക്കുന്നു.",
    pac: "[തുക]",
    emd: "[തുക]",
    fee: "[തുക]",
    lastDate: "", lastTime: "15:00",
    contact: "[ഓഫീസ് ഫോൺ]",
    website: "[വെബ്സൈറ്റ്]",
    logoShape: "square", items: [], signatory: "", designation: "", seal: true, sealPos: "left",
  },
  "tender-supply": {
    org: "[സഹകരണ ബാങ്ക് / വകുപ്പിന്റെ പേര്]",
    ref: "[ടെൻഡർ നമ്പർ]",
    description: "[സാമഗ്രികളുടെ പേര്] വിതരണം ചെയ്യുന്നതിന് രജിസ്റ്റർ ചെയ്ത വിതരണക്കാരിൽ നിന്നും ദർഘാസുകൾ ക്ഷണിക്കുന്നു.",
    pac: "", emd: "[തുക]", fee: "",
    lastDate: "", lastTime: "13:00",
    contact: "[ഫോൺ]",
    website: "[ഇ-മെയിൽ / വെബ്സൈറ്റ്]",
    logoShape: "round", items: [], signatory: "", designation: "", seal: true, sealPos: "left",
  },
};
