import type { CategoryId } from "@/lib/types";

export type TemplateLang = "ml" | "en";

export interface AdTemplate {
  id: string;
  categories: CategoryId[];
  /** Chip labels, bilingual as in the brief for Malayalam. */
  label: Record<TemplateLang, string>;
  /** Draft text with [BRACKETED] placeholders the advertiser must replace before booking. */
  text: Record<TemplateLang, string>;
}

/** Ready-made drafts shown as one-click chips in the composer. */
export const AD_TEMPLATES: AdTemplate[] = [
  // ── Property ───────────────────────────────────────────────
  {
    id: "property-sale",
    categories: ["property"],
    label: { ml: "വീടും സ്ഥലവും വില്പനയ്ക്ക് (House for Sale)", en: "House for Sale" },
    text: {
      ml: "എറണാകുളം [സ്ഥലം] ൽ [X] സെന്റ് സ്ഥലവും [X] BHK വീടും വില്പനയ്ക്ക്. റോഡ് സൗകര്യം, ശുദ്ധജലം ലഭ്യമാണ്. വില: [X ലക്ഷം]. വിളിക്കുക: [ഫോൺ നമ്പർ].",
      en: "Prime property for sale at [Location]. [X] cents land with [X] BHK modern house. 24x7 water and tar road access. Expected price: [Amount]. Contact: [Phone].",
    },
  },
  {
    id: "property-rent",
    categories: ["property"],
    label: { ml: "വാടകയ്ക്ക് / ഒഴിഞ്ഞു കിടക്കുന്നു (For Rent / Lease)", en: "For Rent / Lease" },
    text: {
      ml: "[സ്ഥലം] ൽ കുടുംബങ്ങൾക്കോ സ്ഥാപനങ്ങൾക്കോ അനുയോജ്യമായ [X] BHK വീട് / ഫ്ലാറ്റ് വാടകയ്ക്ക്. പാർക്കിംഗ് സൗകര്യം ലഭ്യമാണ്. ഫോൺ: [ഫോൺ നമ്പർ].",
      en: "[X] BHK house / flat for rent at [Location], suitable for families or offices. Parking available. Rent: [Amount] per month. Contact: [Phone].",
    },
  },
  {
    id: "property-land",
    categories: ["property"],
    label: { ml: "കൊമേഴ്‌സ്യൽ സ്ഥലം വില്പനയ്ക്ക് (Commercial Land)", en: "Commercial Land" },
    text: {
      ml: "[സ്ഥലം] ൽ മെയിൻ റോഡിനോട് ചേർന്ന [X] സെന്റ് കൊമേഴ്‌സ്യൽ സ്ഥലം വില്പനയ്ക്ക്. ബിസിനസ്സിന് ഏറ്റവും അനുയോജ്യം. രേഖകൾ കൃത്യം. വില: [X ലക്ഷം]. ബന്ധപ്പെടുക: [ഫോൺ നമ്പർ].",
      en: "[X] cents commercial land for sale on the main road at [Location]. Ideal for business. Clear title documents. Price: [Amount]. Contact: [Phone].",
    },
  },
  // ── Recruitment ────────────────────────────────────────────
  {
    id: "jobs-staff",
    categories: ["recruitment"],
    label: { ml: "ജീവനക്കാരെ ആവശ്യമുണ്ട് (Staff Wanted)", en: "Staff Wanted" },
    text: {
      ml: "[സ്ഥാപനത്തിന്റെ പേര്] ലേക്ക് [തസ്തിക/സെയിൽസ്/ഡ്രൈവർ] തസ്തികകളിൽ ഉടൻ നിയമനം. ആകർഷകമായ ശമ്പളവും മറ്റ് ആനുകൂല്യങ്ങളും. താല്പര്യമുള്ളവർ വിളിക്കുക: [ഫോൺ നമ്പർ].",
      en: "Urgent recruitment for [Company Name] at [Location]. Wanted experienced [Designation]. Attractive salary package. Call / WhatsApp: [Phone Number].",
    },
  },
  {
    id: "jobs-driver-sales",
    categories: ["recruitment"],
    label: { ml: "ഡ്രൈവർ / സെയിൽസ് എക്സിക്യൂട്ടീവ്", en: "Driver / Sales Executive" },
    text: {
      ml: "[സ്ഥാപനത്തിന്റെ പേര്] ൽ ഡ്രൈവർ (ലൈസൻസ് നിർബന്ധം), സെയിൽസ് എക്സിക്യൂട്ടീവ് (പരിചയമുള്ളവർക്ക് മുൻഗണന) ഒഴിവുകൾ. താമസ സൗകര്യം, ശമ്പളം: [തുക]. ബന്ധപ്പെടുക: [ഫോൺ നമ്പർ].",
      en: "Vacancies at [Company Name]: Driver (valid licence a must) and Sales Executive (experience preferred). Salary [Amount], accommodation provided. Contact: [Phone Number].",
    },
  },
  // ── Matrimonial ────────────────────────────────────────────
  {
    id: "matri-bride",
    categories: ["matrimonial"],
    label: { ml: "വധുവിനെ ആവശ്യമുണ്ട് (Bride Wanted)", en: "Bride Wanted" },
    text: {
      ml: "[മതം/ജാതി], [വയസ്സ്] വയസ്സ്, [ഉയരം] cm, [വിദ്യാഭ്യാസം/ജോലി] ഉള്ള യുവാവിന് അനുയോജ്യരായ യുവതികളുടെ രക്ഷിതാക്കളിൽ നിന്നും വിവാഹാലോചനകൾ ക്ഷണിക്കുന്നു. ഫോൺ: [ഫോൺ നമ്പർ].",
      en: "Proposals invited from parents of suitable brides for [Religion/Community] boy, [Age] yrs, [Height] cm, [Education / Job]. Contact: [Phone Number].",
    },
  },
  {
    id: "matri-groom",
    categories: ["matrimonial"],
    label: { ml: "വരനെ ആവശ്യമുണ്ട് (Groom Wanted)", en: "Groom Wanted" },
    text: {
      ml: "[മതം/ജാതി], [വയസ്സ്] വയസ്സ്, [വിദ്യാഭ്യാസം] ഉള്ള യുവതിക്ക് ഉചിതമായ ജോലി/ബിസിനസ് ഉള്ള വരന്മാരിൽ നിന്നും വിവാഹാലോചനകൾ ക്ഷണിക്കുന്നു. ഫോൺ: [ഫോൺ നമ്പർ].",
      en: "Proposals invited from well-settled grooms for [Religion/Community] girl, [Age] yrs, [Education]. Job / business preferred. Contact: [Phone Number].",
    },
  },
  // ── Obituary & remembrance ─────────────────────────────────
  {
    id: "obit-demise",
    categories: ["obituary", "remembrance"],
    label: { ml: "ചരമവാർത്ത (Demise Notice)", en: "Demise Notice" },
    text: {
      ml: "[വീട്ടുപേര് / സ്ഥലം] പരേതനായ [പേര്] (വയസ്സ് [X]) നിര്യാതനായി. സംസ്കാരം [തിയ്യതി] [സമയം] ന് [സ്ഥലം] ൽ. ദുഃഖത്തിൽ പങ്കുചേരുന്ന കുടുംബാംഗങ്ങൾ. ഫോൺ: [ഫോൺ].",
      en: "[House name / Place]. The late [Name] (aged [X]) passed away. Funeral on [Date] at [Time] at [Place]. Bereaved family members. Phone: [Phone].",
    },
  },
  {
    id: "obit-tribute",
    categories: ["obituary", "remembrance"],
    label: { ml: "സ്മരണാഞ്ജലി (Tribute / Memorial)", en: "Tribute / Memorial" },
    text: {
      ml: "ഞങ്ങളുടെ പ്രിയപ്പെട്ട [പേര്] ന്റെ [ഒന്നാം / X-ാം] ചരമവാർഷിക ദിനത്തിൽ സ്നേഹാദരങ്ങളോടെ പ്രണാമം. എന്നും ഞങ്ങളുടെ ഓർമ്മകളിൽ ജീവിക്കുന്ന പ്രിയപ്പെട്ടവർ.",
      en: "In loving memory of our dear [Name] on the [First / Xth] death anniversary. Forever in our hearts. Remembered by family and friends.",
    },
  },
  // ── Name change & public notices ───────────────────────────
  {
    id: "name-change",
    categories: ["name-change", "public-notice"],
    label: { ml: "പേര് മാറ്റം (Gazette Name Change Notice)", en: "Gazette Name Change Notice" },
    text: {
      ml: "ഞാൻ, [പഴയ പേര്], [വിലാസം], ഇനിമുതൽ [പുതിയ പേര്] എന്ന് അറിയപ്പെടുന്നതായിരിക്കും. സത്യവാങ്മൂലം നമ്പർ: [നമ്പർ], തീയതി: [തീയതി].",
      en: "I, [Old Name], residing at [Address], hereby declare that I shall henceforth be known as [New Name]. Affidavit No. [Number], dated [Date].",
    },
  },
  {
    id: "public-notice",
    categories: ["public-notice"],
    label: { ml: "പൊതു അറിയിപ്പ് (Public Notice)", en: "Public Notice" },
    text: {
      ml: "പൊതുജനങ്ങളുടെ ശ്രദ്ധയ്ക്ക്: [വിഷയം] സംബന്ധിച്ച് [സ്ഥാപനത്തിന്റെ പേര്] അറിയിക്കുന്നത്, [വിവരങ്ങൾ]. ആക്ഷേപങ്ങൾ ഉണ്ടെങ്കിൽ [തീയതി] ന് മുമ്പായി അറിയിക്കേണ്ടതാണ്. ബന്ധപ്പെടുക: [ഫോൺ നമ്പർ].",
      en: "Public notice: [Organisation] hereby informs the public regarding [Subject]: [Details]. Any objections must be submitted before [Date]. Contact: [Phone Number].",
    },
  },
  // ── Tender ─────────────────────────────────────────────────
  {
    id: "tender-notice",
    categories: ["tender"],
    label: { ml: "ദർഘാസ് പരസ്യം (Tender & E-auction Notice)", en: "Tender & E-auction Notice" },
    text: {
      ml: "[ഓഫീസിന്റെ പേര്] നു കീഴിൽ [പദ്ധതിയുടെ പേര്] പ്രവൃത്തികൾക്കായി അംഗീകൃത കരാറുകാരിൽ നിന്നും മുദ്രവെച്ച ദർഘാസുകൾ ക്ഷണിക്കുന്നു. അവസാന തീയതി: [തിയ്യതി]. കൂടുതൽ വിവരങ്ങൾക്ക്: [വെബ്സൈറ്റ് / ഫോൺ].",
      en: "Sealed tenders are invited from approved contractors under [Office Name] for the work of [Project Name]. Last date: [Date]. For more details: [Website / Phone].",
    },
  },
  // ── Business ───────────────────────────────────────────────
  {
    id: "biz-opening",
    categories: ["business"],
    label: { ml: "ഉദ്ഘാടനം / ഓഫറുകൾ (Grand Opening / Discount)", en: "Grand Opening / Discount" },
    text: {
      ml: "[സ്ഥാപനത്തിന്റെ പേര്] ന്റെ പുതിയ ഷോറൂം [സ്ഥലം] ൽ [തീയതി] ന് ഉദ്ഘാടനം ചെയ്യുന്നു. ഉദ്ഘാടന ഓഫർ: [X]% വരെ ഡിസ്കൗണ്ട്. എല്ലാവർക്കും സ്വാഗതം. ഫോൺ: [ഫോൺ നമ്പർ].",
      en: "Grand opening of [Business Name] new showroom at [Location] on [Date]. Inauguration offer: up to [X]% off. Everyone is welcome. Phone: [Phone Number].",
    },
  },
  {
    id: "biz-services",
    categories: ["business"],
    label: { ml: "സേവനങ്ങൾ (Services & Dealership)", en: "Services & Dealership" },
    text: {
      ml: "[സ്ഥാപനത്തിന്റെ പേര്]: [സേവനങ്ങൾ / ഉൽപ്പന്നങ്ങൾ] അംഗീകൃത ഡീലർ / സർവീസ് സെന്റർ. [സ്ഥലം] ൽ ലഭ്യമാണ്. ഡീലർഷിപ്പ് അന്വേഷണങ്ങൾക്ക്: [ഫോൺ നമ്പർ].",
      en: "[Business Name]: authorised dealer / service centre for [Services / Products] at [Location]. Dealership enquiries welcome: [Phone Number].",
    },
  },
];

export const templatesForCategory = (id?: CategoryId | null): AdTemplate[] =>
  id ? AD_TEMPLATES.filter((t) => t.categories.includes(id)) : [];

/** Phone line appended by the "Insert contact" helper. */
export const CONTACT_SNIPPET: Record<TemplateLang, string> = { ml: "ഫോൺ: [ഫോൺ നമ്പർ]", en: "Contact: [Phone Number]" };
