import type { AdType, Category, CategoryId, Template } from "@/lib/types";

export const AD_TYPES: { id: AdType; label: string; short: string; description: string }[] = [
  {
    id: "classified-text",
    label: "Classified Text (ROL)",
    short: "Classified Text",
    description: "Text-only, run-on-line ads in the classified columns. Billed per line.",
  },
  {
    id: "classified-display",
    label: "Classified Display",
    short: "Classified Display",
    description: "Boxed ads with logos and artwork inside classified pages. Billed per cm².",
  },
  {
    id: "commercial-display",
    label: "Commercial Display",
    short: "Commercial Display",
    description: "Brand and promotional ads placed on news pages. Billed per cm².",
  },
];

export function getAdType(id: AdType) {
  return AD_TYPES.find((a) => a.id === id)!;
}

export const categories: Category[] = [
  {
    id: "matrimonial",
    name: "Matrimonial",
    nameMl: "വിവാഹം",
    badge: { en: "Bride / Groom Wanted", ml: "വധു / വരൻ ആവശ്യമുണ്ട്" },
    icon: "Heart",
    description: "Bride and groom wanted, community-specific and Sunday matrimonial columns.",
    descriptionMl: "വധൂവരന്മാരെ ആവശ്യമുണ്ട്, സമുദായ വിവാഹ പരസ്യങ്ങളും ഞായറാഴ്ച മാട്രിമോണിയൽ കോളങ്ങളും.",
    rateMultiplier: 1.0,
    documents: [],
  },
  {
    id: "property",
    name: "Property",
    nameMl: "വസ്തു വിൽപനയ്ക്ക് & വാടകയ്ക്ക്",
    icon: "Building2",
    description: "Sale, rent and lease of flats, houses, plots and commercial space.",
    descriptionMl: "ഫ്ലാറ്റ്, വീട്, പ്ലോട്ട്, വാണിജ്യ സ്ഥലം എന്നിവയുടെ വിൽപന, വാടക, പാട്ടം.",
    rateMultiplier: 1.0,
    documents: [
      {
        id: "ownership",
        label: "Ownership document",
        hint: "Sale deed or property tax receipt. Helps us verify faster.",
        required: false,
      },
    ],
  },
  {
    id: "recruitment",
    name: "Recruitment",
    nameMl: "ജോലി ഒഴിവുകൾ",
    icon: "Briefcase",
    description: "Job openings, walk-in interviews and tender-linked manpower notices.",
    descriptionMl: "ജോലി ഒഴിവുകൾ, വാക്ക്-ഇൻ ഇന്റർവ്യൂകൾ, ടെൻഡർ അനുബന്ധ ജീവനക്കാരുടെ അറിയിപ്പുകൾ.",
    rateMultiplier: 1.1,
    documents: [
      {
        id: "auth-letter",
        label: "Company authorisation letter",
        hint: "On letterhead, signed by an authorised signatory.",
        required: true,
      },
    ],
  },
  {
    id: "public-notice",
    name: "Public Notice",
    nameMl: "പൊതു അറിയിപ്പുകൾ & കോടതി പരസ്യങ്ങൾ",
    icon: "Scale",
    description: "Legal notices, lost documents, title verification and tender notices.",
    descriptionMl: "നിയമ അറിയിപ്പുകൾ, നഷ്ടപ്പെട്ട രേഖകൾ, ആധാര പരിശോധന, ടെൻഡർ അറിയിപ്പുകൾ.",
    rateMultiplier: 1.15,
    documents: [
      {
        id: "court-copy",
        label: "Court order / legal authority copy",
        hint: "Required for legal and court-directed notices.",
        required: true,
      },
      {
        id: "id-proof",
        label: "Advertiser ID proof",
        hint: "Aadhaar, PAN or passport of the person issuing the notice.",
        required: true,
      },
    ],
  },
  {
    id: "name-change",
    name: "Name Change",
    nameMl: "പേര് മാറ്റം",
    badge: { en: "Gazette & Affidavit format", ml: "ഗസറ്റ് & സത്യവാങ്മൂല ഫോർമാറ്റ്" },
    icon: "FileSignature",
    description: "Gazette-style change of name, religion or surname notices.",
    descriptionMl: "പേര്, മതം, കുടുംബപ്പേര് എന്നിവ മാറ്റുന്നതിനുള്ള ഗസറ്റ് രീതിയിലുള്ള അറിയിപ്പുകൾ.",
    rateMultiplier: 1.0,
    documents: [
      {
        id: "affidavit",
        label: "Notarised affidavit",
        hint: "Sworn before a Notary Public / Executive Magistrate.",
        required: true,
      },
      {
        id: "id-proof",
        label: "Photo ID proof",
        hint: "Aadhaar, passport or driving licence showing the current name.",
        required: true,
      },
    ],
  },
  {
    id: "obituary",
    name: "Remembrance",
    nameMl: "ചരമം & ഓർമ്മക്കുറിപ്പുകൾ",
    badge: { en: "Marana Vartha · In Memoriam", ml: "മരണവാർത്ത · സ്മരണാഞ്ജലി" },
    icon: "Flower2",
    description: "Obituaries, condolence messages and anniversary remembrances.",
    descriptionMl: "ചരമ അറിയിപ്പുകൾ, അനുശോചന സന്ദേശങ്ങൾ, ചരമവാർഷിക സ്മരണകൾ.",
    rateMultiplier: 0.9,
    documents: [
      {
        id: "death-cert",
        label: "Death certificate",
        hint: "Optional. Speeds up approval for obituary display ads.",
        required: false,
      },
    ],
  },
  {
    id: "business",
    name: "Business",
    nameMl: "ബിസിനസ്",
    icon: "Store",
    description: "Business announcements, tenders, partnerships and corporate notices.",
    descriptionMl: "ബിസിനസ് അറിയിപ്പുകൾ, ടെൻഡറുകൾ, പങ്കാളിത്തം, കോർപ്പറേറ്റ് അറിയിപ്പുകൾ.",
    rateMultiplier: 1.2,
    documents: [
      {
        id: "registration",
        label: "Business registration / GST certificate",
        hint: "Optional. Needed for GST invoice in the company's name.",
        required: false,
      },
    ],
  },
];

export function getCategory(id: CategoryId | string | null | undefined): Category | undefined {
  return categories.find((c) => c.id === id);
}

export const templates: Template[] = [
  {
    id: "name-change-adult",
    categoryId: "name-change",
    title: "Change of name (adult)",
    titleMl: "പേര് മാറ്റം (മുതിർന്നവർ)",
    description: "Standard legal notice for an adult changing their name by affidavit.",
    descriptionMl: "സത്യവാങ്മൂലം വഴി പേര് മാറ്റുന്ന മുതിർന്നവർക്കുള്ള നിയമ അറിയിപ്പ്.",
    body:
      "പേര് മാറ്റം: ഞാൻ, [പിതാവിന്റെ പേര്]-ന്റെ മകൻ/മകൾ, [വിലാസം] നിവാസി, ഇതുവരെ [പഴയ പേര്] എന്ന പേരിൽ അറിയപ്പെട്ടിരുന്ന ഞാൻ, [തീയതി]-ൽ [സ്ഥലം] നോട്ടറി മുമ്പാകെ സത്യവാങ്മൂലം നൽകി, ഇനിമുതൽ [പുതിയ പേര്] എന്ന പേരിൽ അറിയപ്പെടുന്നതാണെന്ന് ഇതിനാൽ അറിയിക്കുന്നു.",
  },
  {
    id: "name-change-minor",
    categoryId: "name-change",
    title: "Change of name (minor child)",
    titleMl: "പേര് മാറ്റം (പ്രായപൂർത്തിയാകാത്ത കുട്ടി)",
    description: "Notice by parents or guardians on behalf of a minor.",
    descriptionMl: "രക്ഷിതാക്കൾ കുട്ടിക്കുവേണ്ടി നൽകുന്ന അറിയിപ്പ്.",
    body:
      "പേര് മാറ്റം: ഞങ്ങളുടെ മകൻ/മകൾ [പഴയ പേര്]-ന്റെ പേര് [തീയതി]-ലെ സത്യവാങ്മൂലം പ്രകാരം [പുതിയ പേര്] എന്നാക്കി മാറ്റിയിരിക്കുന്നു. ഇനിമുതൽ ഈ പേരിൽ അറിയപ്പെടുന്നതാണ്. രക്ഷിതാവ്: [രക്ഷിതാവിന്റെ പേര്], [വിലാസം].",
  },
  {
    id: "matrimonial-bride",
    categoryId: "matrimonial",
    title: "Bride wanted",
    titleMl: "വധുവിനെ ആവശ്യമുണ്ട്",
    description: "Proposals invited for a son, with community and profession details.",
    descriptionMl: "മകനുവേണ്ടി വിവാഹാലോചനകൾ ക്ഷണിക്കുന്നു; സമുദായം, തൊഴിൽ വിവരങ്ങൾ സഹിതം.",
    body:
      "ഹിന്ദു, നായർ, 28/175cm, B.Tech, MNC സോഫ്റ്റ്‌വെയർ എൻജിനീയർ (Kochi), അനുയോജ്യരായ ബിരുദധാരികളായ യുവതികളുടെ രക്ഷിതാക്കളിൽ നിന്നും ആലോചനകൾ ക്ഷണിക്കുന്നു. ജാതകം, ഫോട്ടോ സഹിതം ബന്ധപ്പെടുക: [മൊബൈൽ നമ്പർ].",
  },
  {
    id: "matrimonial-groom",
    categoryId: "matrimonial",
    title: "Groom wanted",
    titleMl: "വരനെ ആവശ്യമുണ്ട്",
    description: "Proposals invited for a daughter, with community and profession details.",
    descriptionMl: "മകൾക്കുവേണ്ടി വിവാഹാലോചനകൾ ക്ഷണിക്കുന്നു; സമുദായം, തൊഴിൽ വിവരങ്ങൾ സഹിതം.",
    body:
      "[സമുദായം], 26/160cm, [വിദ്യാഭ്യാസ യോഗ്യത], [സ്ഥലം] സ്വദേശിനി. സർക്കാർ സർവീസിലോ വിദേശത്തോ ജോലിയുള്ള അനുയോജ്യരായ യുവാക്കളുടെ ആലോചനകൾ ക്ഷണിക്കുന്നു. ബയോഡേറ്റ, ഫോട്ടോ സഹിതം ബന്ധപ്പെടുക: [മൊബൈൽ നമ്പർ], [ഇ-മെയിൽ].",
  },
  {
    id: "lost-certificate",
    categoryId: "public-notice",
    title: "Lost certificate",
    titleMl: "സർട്ടിഫിക്കറ്റ് നഷ്ടപ്പെട്ടു",
    description: "Public notice for a lost original certificate or document.",
    descriptionMl: "യഥാർത്ഥ സർട്ടിഫിക്കറ്റോ രേഖയോ നഷ്ടപ്പെട്ടാൽ നൽകേണ്ട പൊതു അറിയിപ്പ്.",
    body:
      "സർട്ടിഫിക്കറ്റ് നഷ്ടപ്പെട്ടു: [വിലാസം] നിവാസിയായ [പേര്]-ന്റെ [സർട്ടിഫിക്കറ്റിന്റെ പേര്] (നമ്പർ [നമ്പർ], നൽകിയത്: [അധികാരസ്ഥാനം]) [സ്ഥലം] വച്ച് നഷ്ടപ്പെട്ടിരിക്കുന്നു. കണ്ടുകിട്ടുന്നവർ [മൊബൈൽ നമ്പർ] എന്ന നമ്പരിൽ അറിയിക്കേണ്ടതാണ്.",
  },
  {
    id: "legal-title-notice",
    categoryId: "public-notice",
    title: "Legal notice (title verification)",
    titleMl: "നിയമ അറിയിപ്പ് (ആധാര പരിശോധന)",
    description: "Invite claims or objections on a property on behalf of a client.",
    descriptionMl: "കക്ഷിക്കുവേണ്ടി വസ്തുവിന്മേലുള്ള അവകാശവാദങ്ങളോ എതിർപ്പുകളോ ക്ഷണിക്കുന്നു.",
    body:
      "പൊതു അറിയിപ്പ്: [താലൂക്ക്], [വില്ലേജ്] വില്ലേജിൽ സർവേ നമ്പർ [സർവേ നമ്പർ]-ൽപ്പെട്ട [വിസ്തീർണം] സെന്റ് വസ്തു [ഉടമയുടെ പേര്]-ന്റെ ഉടമസ്ഥതയിലുള്ളതാണ്. ഈ വസ്തുവിൽ ആർക്കെങ്കിലും അവകാശമോ ബാധ്യതയോ എതിർപ്പോ ഉണ്ടെങ്കിൽ ഈ അറിയിപ്പ് പ്രസിദ്ധീകരിച്ച് [14] ദിവസത്തിനകം താഴെ ഒപ്പിട്ട അഭിഭാഷകനെ രേഖാമൂലം അറിയിക്കേണ്ടതാണ്. അല്ലാത്തപക്ഷം ഒരു അവകാശവും നിലനിൽക്കുന്നതല്ല. [അഭിഭാഷകന്റെ പേര്], അഡ്വക്കേറ്റ്, [വിലാസം].",
  },
  {
    id: "property-sale",
    categoryId: "property",
    title: "Property for sale",
    titleMl: "വസ്തു വിൽപനയ്ക്ക്",
    description: "Flat or house for sale with area, location and price.",
    descriptionMl: "വിസ്തീർണം, സ്ഥലം, വില എന്നിവ സഹിതം ഫ്ലാറ്റോ വീടോ വിൽപനയ്ക്ക്.",
    body:
      "വീട് വിൽപനയ്ക്ക്: [സ്ഥലം]-ൽ ടൗണിൽ നിന്ന് [ദൂരം] കി.മീ. അകലെ, [സെന്റ്] സെന്റ് സ്ഥലത്ത് [വിസ്തീർണം] ചതുരശ്ര അടി വിസ്തീർണമുള്ള [എണ്ണം] ബെഡ്റൂം വീട് വിൽപനയ്ക്ക്. എല്ലാ സൗകര്യങ്ങളും, വ്യക്തമായ ആധാരം. വില [തുക]. ബ്രോക്കർമാർ ഒഴിവ്. ഫോൺ: [മൊബൈൽ നമ്പർ].",
  },
  {
    id: "property-rent",
    categoryId: "property",
    title: "Property for rent",
    titleMl: "വസ്തു വാടകയ്ക്ക്",
    description: "House or flat to let, with deposit and rent.",
    descriptionMl: "വാടകയ്ക്ക് നൽകാനുള്ള വീടോ ഫ്ലാറ്റോ; ഡെപ്പോസിറ്റും വാടകയും സഹിതം.",
    body:
      "വാടകയ്ക്ക്: [സ്ഥലം]-ൽ [എണ്ണം] ബെഡ്റൂം ഫ്ലാറ്റ്, പാർക്കിംഗ് സൗകര്യത്തോടെ. വാടക [തുക] രൂപ, അഡ്വാൻസ് [തുക] രൂപ. കുടുംബങ്ങൾക്ക് മുൻഗണന. ബന്ധപ്പെടുക: [മൊബൈൽ നമ്പർ].",
  },
  {
    id: "recruitment-staff",
    categoryId: "recruitment",
    title: "Vacancies / walk-in",
    titleMl: "ജോലി ഒഴിവുകൾ / വാക്ക്-ഇൻ",
    description: "Staff wanted notice with qualification and walk-in details.",
    descriptionMl: "യോഗ്യത, വാക്ക്-ഇൻ വിവരങ്ങൾ സഹിതം ജീവനക്കാരെ ആവശ്യമുണ്ടെന്ന അറിയിപ്പ്.",
    body:
      "ഒഴിവുകൾ: [സ്ഥാപനത്തിന്റെ പേര്], [സ്ഥലം]-ൽ [തസ്തിക] തസ്തികയിലേക്ക് [യോഗ്യത] യോഗ്യതയുള്ള [എണ്ണം] പേരെ ആവശ്യമുണ്ട്. പ്രവൃത്തിപരിചയം: [വർഷം] വർഷം. ആകർഷകമായ ശമ്പളം. വാക്ക്-ഇൻ ഇന്റർവ്യൂ [തീയതി] രാവിലെ 10 മുതൽ [വിലാസം]-ൽ, അല്ലെങ്കിൽ ബയോഡേറ്റ [ഇ-മെയിൽ]-ലേക്ക് അയയ്ക്കുക.",
  },
  {
    id: "obituary-condolence",
    categoryId: "obituary",
    title: "Obituary / നിര്യാതനായി / നിര്യാതയായി",
    titleMl: "മരണവാർത്ത (നിര്യാതനായി / നിര്യാതയായി)",
    description: "Standard demise notice with funeral & family details",
    descriptionMl: "സംസ്കാര, കുടുംബ വിവരങ്ങൾ സഹിതമുള്ള സാധാരണ മരണ അറിയിപ്പ്.",
    body:
      "നിര്യാതനായി. [പേര്], [വയസ്സ്], [വീട്ടുപേര്], [സ്ഥലം]. സംസ്കാരം: [തീയതി], [സമയം], [സ്ഥലം]. ഭാര്യ: [പേര്]. മക്കൾ: [പേരുകൾ]. ഫോൺ: [നമ്പർ].",
  },
  {
    id: "obituary-anniversary",
    categoryId: "obituary",
    title: "Death Anniversary / ഒന്നാം ചരമവാർഷികം",
    titleMl: "ഒന്നാം ചരമവാർഷികം / വാർഷിക സ്മരണാഞ്ജലി",
    description: "Memorial tribute with photo frame options (Garland/Lamp)",
    descriptionMl: "ഫോട്ടോ ഫ്രെയിം ഓപ്ഷനുകളോടെ (പൂമാല/നിലവിളക്ക്) സ്മരണാഞ്ജലി.",
    body:
      "വാർഷിക സ്മരണാഞ്ജലി. ഞങ്ങളുടെ ഹൃദയങ്ങളിൽ മായാത്ത ഓർമ്മയായി എന്നും ജീവിക്കുന്ന പ്രിയപ്പെട്ട [പേര്]. സ്നേഹസ്മരണകളോടെ: [കുടുംബാംഗങ്ങൾ].",
  },
  {
    id: "business-notice",
    categoryId: "business",
    title: "Change of business address",
    titleMl: "ബിസിനസ് വിലാസം മാറ്റം",
    description: "Announcement of a new office address and contact details.",
    descriptionMl: "പുതിയ ഓഫീസ് വിലാസവും ബന്ധപ്പെടാനുള്ള വിവരങ്ങളും അറിയിക്കുന്നു.",
    body:
      "അറിയിപ്പ്: [സ്ഥാപനത്തിന്റെ പേര്]-ന്റെ ഓഫീസ് [പഴയ വിലാസം]-ൽ നിന്ന് [പുതിയ വിലാസം]-ലേക്ക് [തീയതി] മുതൽ മാറ്റിയിരിക്കുന്നു. ഫോൺ നമ്പരുകൾക്ക് മാറ്റമില്ല: [ഫോൺ നമ്പർ]. എല്ലാ ഇടപാടുകാരും സഹകരിക്കണമെന്ന് അഭ്യർത്ഥിക്കുന്നു.",
  },
];

export function getTemplate(id: string | null | undefined): Template | undefined {
  return templates.find((t) => t.id === id);
}

export function templatesFor(categoryId: CategoryId | null | undefined): Template[] {
  return categoryId ? templates.filter((t) => t.categoryId === categoryId) : templates;
}
