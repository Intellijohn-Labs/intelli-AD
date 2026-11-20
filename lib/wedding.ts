/** Wedding & Event Invitations: shared types, the 10 template themes, copy helpers and local persistence. */

export type EventType = "wedding" | "engagement" | "reception" | "haldi" | "nikah" | "save-the-date" | "birthday" | "housewarming" | "choroonu" | "noolukettu" | "baptism" | "babyshower" | "aqiqah" | "inauguration" | "anniversary";
export type EventGroup = "wedding" | "birthday" | "housewarming" | "baby" | "events";
export type WLang = "en" | "ml" | "both";
export type Layout = "classic" | "polaroid" | "minimal";
export type PhotoShape = "arch" | "circle" | "oval" | "rect";
export type Motif = "kasavu" | "temple" | "church" | "nikah" | "botanical" | "banarasi" | "polaroid" | "velvet" | "marigold" | "minimal"
  | "goldconfetti" | "pastelballoon" | "rosegoldbday" | "gruhapravesham" | "emeraldhome" | "christianhome" | "choroonu" | "baptism" | "babyshower" | "aqiqah" | "ribbon" | "anniversary"
  | "art" | "peacock" | "nilavilakku" | "kanchipuram" | "cathedral" | "victorian" | "betrothal" | "mughal" | "sapphire" | "walima" | "emeraldfoil" | "marble" | "burgundy" | "rosegold" | "starlight";
export type TemplateCategory = EventGroup;
export type Faith = "hindu" | "christian" | "muslim" | "modern";
export type CardEffect = "none" | "petals" | "shimmer" | "sparkle";

export interface WeddingDetails {
  eventType: EventType;
  lang: WLang;
  bride: string;
  groom: string;
  brideParents: string;
  groomParents: string;
  /** yyyy-mm-dd */
  date: string;
  /** Free text: "10:30 AM · Muhurtham 10:45 AM" */
  time: string;
  venue: string;
  mapsUrl: string;
  /** Family note / invitation wording. */
  message: string;
  blessing: string;
  verse: string;
  /** AI-suggested accent colour (#rrggbb); overrides the template accent. */
  accent: string;
  /** Couple photos as downscaled JPEG data URLs (the first sits in the template's photo frame). */
  photos: string[];
}

export interface Palette { bg1: string; bg2: string; ink: string; sub: string; accent: string; accent2: string }

export interface WeddingTemplate {
  id: string;
  name: string;
  ml: string;
  tagline: string;
  layout: Layout;
  motif: Motif;
  shape: PhotoShape;
  pal: Palette;
  /** Default blessing line, English / Malayalam. */
  blessing: [string, string];
  category: TemplateCategory;
  faith?: Faith;
  /** Event type selected when this template is chosen from another event group. */
  defaultEvent: EventType;
  /** Events this design is written for (omit for wedding-type designs that fit every wedding event). */
  events?: EventType[];
  /** Luxury designs get the gold PREMIUM badge. */
  premium?: boolean;
  /** Shown under the Animated (GIF) filter (every template can still export a GIF). */
  animated?: boolean;
  /** Shown under the Devotional filter. */
  devotional?: boolean;
  /** Illustrated image backdrop (same-origin SVG in public/templates, 1080 x 1500: artwork header + opaque text panel). m = side margin, top / bot = text-flow offsets. */
  art?: { src: string; m: number; top: number; bot: number };
}

type RawTemplate = Omit<WeddingTemplate, "category" | "faith" | "defaultEvent" | "events" | "premium" | "animated" | "devotional">;
const RAW_TEMPLATES: RawTemplate[] = [
  { id: "kasavu", name: "Royal Kerala Kasavu & Gold", ml: "കസവ് & സ്വർണ്ണം", tagline: "Traditional Malayalam / English", layout: "classic", motif: "kasavu", shape: "arch", pal: { bg1: "#FFFBF0", bg2: "#F8EDD2", ink: "#3B0A12", sub: "#6B4A2B", accent: "#B8860B", accent2: "#8C1C2B" }, blessing: ["With the blessings of the Almighty", "ദൈവാനുഗ്രഹത്താൽ"] },
  { id: "temple", name: "Guruvayoor Temple Floral", ml: "ഗുരുവായൂർ പുഷ്പാലങ്കാരം", tagline: "Sacred Hindu temple theme", layout: "classic", motif: "temple", shape: "oval", pal: { bg1: "#FFF6E3", bg2: "#FDE4B8", ink: "#4A1507", sub: "#7A3E1B", accent: "#D9480F", accent2: "#B8860B" }, blessing: ["Sri Ganapathaye Namah", "ശ്രീ ഗണപതയേ നമഃ"] },
  { id: "church", name: "Christian Church Elegance", ml: "ക്രൈസ്തവ വിവാഹം", tagline: "Minimal ivory & gold cross", layout: "classic", motif: "church", shape: "circle", pal: { bg1: "#FFFEFA", bg2: "#F6F1E4", ink: "#2B2A33", sub: "#6B6657", accent: "#B08D3C", accent2: "#8A7A52" }, blessing: ["What God has joined together, let no one separate", "ദൈവം യോജിപ്പിച്ചതിനെ മനുഷ്യൻ വേർപെടുത്തരുത്"] },
  { id: "nikah", name: "Nikah Emerald & Gold", ml: "നിക്കാഹ് മരതകം", tagline: "Islamic geometric & crescent", layout: "classic", motif: "nikah", shape: "arch", pal: { bg1: "#0B5D4B", bg2: "#06382E", ink: "#FFF6DA", sub: "#CFE8DC", accent: "#E8C766", accent2: "#F5E3A1" }, blessing: ["Bismillahir Rahmanir Raheem", "ബിസ്മില്ലാഹിർറഹ്മാനിർറഹീം"] },
  { id: "botanical", name: "Modern Pastel Botanical", ml: "പാസ്റ്റൽ ബൊട്ടാണിക്കൽ", tagline: "Eucalyptus & blush watercolor", layout: "classic", motif: "botanical", shape: "circle", pal: { bg1: "#FFF7F5", bg2: "#FBE6E2", ink: "#34423B", sub: "#6A7B72", accent: "#6F9A84", accent2: "#E8A5A5" }, blessing: ["Two hearts, one beautiful journey", "രണ്ട് മനസ്സുകൾ, ഒരു സുന്ദര യാത്ര"] },
  { id: "banarasi", name: "Banarasi Crimson Heritage", ml: "ബനാറസി ക്രിംസൺ", tagline: "Rich maroon & zari border", layout: "classic", motif: "banarasi", shape: "oval", pal: { bg1: "#7A0F1F", bg2: "#4D0612", ink: "#FFF2D0", sub: "#F1D9A8", accent: "#E9BE55", accent2: "#F7DC8D" }, blessing: ["With the blessings of elders", "മുതിർന്നവരുടെ അനുഗ്രഹത്തോടെ"] },
  { id: "polaroid", name: "Save The Date Polaroid", ml: "സേവ് ദ ഡേറ്റ്", tagline: "Photo-centric modern card", layout: "polaroid", motif: "polaroid", shape: "rect", pal: { bg1: "#FDF1E7", bg2: "#F7DCCB", ink: "#2F2A28", sub: "#6F625B", accent: "#D46A5A", accent2: "#E9B872" }, blessing: ["Save the date", "തീയതി കുറിച്ചുവയ്ക്കൂ"] },
  { id: "velvet", name: "Reception Midnight Velvet", ml: "മിഡ്നൈറ്റ് വെൽവെറ്റ്", tagline: "Dark navy & gold foil", layout: "classic", motif: "velvet", shape: "arch", pal: { bg1: "#101B3D", bg2: "#070D22", ink: "#F7EBC6", sub: "#B8BFD6", accent: "#D9B04C", accent2: "#F3D98B" }, blessing: ["Join us for an evening of celebration", "ആഘോഷസന്ധ്യയിലേക്ക് സ്വാഗതം"] },
  { id: "marigold", name: "Haldi & Mehendi Marigold", ml: "ഹൽദി & മെഹന്തി", tagline: "Vibrant yellow & orange festive", layout: "classic", motif: "marigold", shape: "circle", pal: { bg1: "#FFF1A8", bg2: "#FFC94D", ink: "#4A2300", sub: "#7A4A12", accent: "#E8590C", accent2: "#2F9E44" }, blessing: ["Come, celebrate with colours and joy", "നിറങ്ങളുടെ ആഘോഷത്തിലേക്ക് വരൂ"] },
  { id: "minimal", name: "Minimalist Typography Card", ml: "മിനിമൽ ടൈപ്പോഗ്രാഫി", tagline: "Clean editorial layout", layout: "minimal", motif: "minimal", shape: "rect", pal: { bg1: "#FFFFFF", bg2: "#F4F4F5", ink: "#111113", sub: "#5B5B63", accent: "#111113", accent2: "#8A8A93" }, blessing: ["Together with their families", "കുടുംബാംഗങ്ങളോടൊപ്പം"] },
];
const P = (bg1: string, bg2: string, ink: string, sub: string, accent: string, accent2: string): Palette => ({ bg1, bg2, ink, sub, accent, accent2 });
const NEW_TEMPLATES: RawTemplate[] = [
  { id: "peacock", name: "Royal Peacock & Lotus Mandala", ml: "മയിൽപ്പീലി & താമര", tagline: "Emerald & 24K gold foil arch", layout: "classic", motif: "peacock", shape: "arch", pal: P("#0B4D3B", "#052A21", "#FFF3CF", "#E4D3A0", "#E3B84A", "#F4DD92"), blessing: ["Sri Ganapathaye Namah", "ശ്രീ ഗണപതയേ നമഃ"] },
  { id: "nilavilakku", name: "Travancore Palace Nilavilakku", ml: "തിരുവിതാംകൂർ നിലവിളക്ക്", tagline: "Kerala silk ivory, kasavu zari & jasmine", layout: "classic", motif: "nilavilakku", shape: "oval", pal: P("#FFF9E8", "#F5E6C4", "#4A1B0C", "#7A4A2B", "#C99A2E", "#8C1C2B"), blessing: ["With the blessings of the Gods", "ഈശ്വരാനുഗ്രഹത്തോടെ"] },
  { id: "kanchipuram", name: "Kanchipuram Crimson & Gold Brocade", ml: "കാഞ്ചീപുരം പട്ട്", tagline: "Temple maroon silk, woven gold border", layout: "classic", motif: "kanchipuram", shape: "arch", pal: P("#7B0F2B", "#4A0718", "#FFF0D0", "#F1D9A8", "#E6B94F", "#F7DC8D"), blessing: ["With the blessings of elders", "മുതിർന്നവരുടെ അനുഗ്രഹത്തോടെ"] },
  { id: "cathedral", name: "Cathedral Gold & White Lily", ml: "കത്തീഡ്രൽ ലില്ലി", tagline: "Pearl ivory, embossed cross & lilies", layout: "classic", motif: "cathedral", shape: "circle", pal: P("#FFFFFF", "#F3EFE6", "#2B2A33", "#6B6657", "#B08D3C", "#8A7A52"), blessing: ["What God has joined together, let no one separate", "ദൈവം യോജിപ്പിച്ചതിനെ മനുഷ്യൻ വേർപെടുത്തരുത്"] },
  { id: "victorian", name: "Victorian Lace & Champagne Gold", ml: "വിക്ടോറിയൻ ലേസ്", tagline: "Filigree lace with rose-gold foil", layout: "classic", motif: "victorian", shape: "oval", pal: P("#FCF5EC", "#F1E0D0", "#4A3A3A", "#7C6459", "#C48F7C", "#D8B7A8"), blessing: ["Love is patient, love is kind", "സ്നേഹം ദീർഘക്ഷമയും ദയയും ഉള്ളത്"] },
  { id: "betrothal", name: "Betrothal / Madhuraveppu Royal", ml: "മധുരംവെപ്പ്", tagline: "Champagne & gold ring emblem", layout: "classic", motif: "betrothal", shape: "circle", pal: P("#FFFAF1", "#F5E6CF", "#3B2A1A", "#7A5E3A", "#B8862B", "#D9B48A"), blessing: ["Two souls, one promise", "രണ്ട് മനസ്സുകൾ, ഒരു വാഗ്ദാനം"] },
  { id: "mughal", name: "Royal Mughal Arch & Fanoos", ml: "മുഗൾ കമാനം", tagline: "Islamic dome, gold lanterns", layout: "classic", motif: "mughal", shape: "arch", pal: P("#0B3F3C", "#052321", "#FFF4D6", "#CFE3D6", "#D8B24E", "#F0DA94"), blessing: ["Bismillahir Rahmanir Raheem", "ബിസ്മില്ലാഹിർറഹ്മാനിർറഹീം"] },
  { id: "sapphire", name: "Midnight Sapphire & Silver Filigree", ml: "സഫയർ നീല", tagline: "Royal navy velvet, silver arabesque", layout: "classic", motif: "sapphire", shape: "oval", pal: P("#0C1D4D", "#050D2B", "#F4F6FF", "#B9C2DC", "#C9D1E3", "#E8C766"), blessing: ["Bismillahir Rahmanir Raheem", "ബിസ്മില്ലാഹിർറഹ്മാനിർറഹീം"] },
  { id: "walima", name: "Walima Emerald & Ivory Arch", ml: "വലീമ", tagline: "Ivory & emerald botanical arch", layout: "classic", motif: "walima", shape: "arch", pal: P("#FCF9EF", "#EDF1E1", "#153B2E", "#4D6B5C", "#1F7A5A", "#C9A646"), blessing: ["Barakallahu lakuma", "ബാറകല്ലാഹു ലകുമ"] },
  { id: "emeraldfoil", name: "24K Gold Foil & Emerald Velvet", ml: "എമറാൾഡ് വെൽവെറ്റ്", tagline: "Dark emerald velvet, layered gold", layout: "classic", motif: "emeraldfoil", shape: "arch", pal: P("#06402F", "#022016", "#F8EBC0", "#D9CC9B", "#DDB54B", "#F3DE95"), blessing: ["Together with their families", "കുടുംബാംഗങ്ങളോടൊപ്പം"] },
  { id: "marble", name: "Blush Peony & Marble Luxury", ml: "മാർബിൾ പിയോണി", tagline: "Carrara marble, gold veins, peonies", layout: "classic", motif: "marble", shape: "arch", pal: P("#FBFBFC", "#ECECF0", "#2D2A32", "#6A6570", "#B8924A", "#E8A3B3"), blessing: ["Two hearts, one beautiful journey", "രണ്ട് മനസ്സുകൾ, ഒരു സുന്ദര യാത്ര"] },
  { id: "burgundy", name: "Royal Burgundy & Gold Crest", ml: "ബർഗണ്ടി ക്രസ്റ്റ്", tagline: "Monogram crest, luxury serif", layout: "classic", motif: "burgundy", shape: "oval", pal: P("#5E1020", "#34060F", "#FBEFD2", "#E5CFA0", "#D4AF5F", "#F0D894"), blessing: ["Together with their families", "കുടുംബാംഗങ്ങളോടൊപ്പം"] },
  { id: "rosegold", name: "Ring Ceremony / Engagement Rose Gold", ml: "റിംഗ് സെറിമണി", tagline: "Interlocking rings, editorial layout", layout: "classic", motif: "rosegold", shape: "circle", pal: P("#FFF4F1", "#F8DFDA", "#4A2A2E", "#85605F", "#C98A7E", "#E8B4A8"), blessing: ["She said yes", "അവൾ സമ്മതം മൂളി"] },
  { id: "starlight", name: "Grand Reception Starlight Gold", ml: "സ്റ്റാർലൈറ്റ് റിസപ്ഷൻ", tagline: "Charcoal & champagne sparkle", layout: "classic", motif: "starlight", shape: "oval", pal: P("#1E1E24", "#0A0A0D", "#F5E8C8", "#CFC3A4", "#E3C37D", "#F4E2B0"), blessing: ["Join us for an evening of celebration", "ആഘോഷസന്ധ്യയിലേക്ക് സ്വാഗതം"] },
  { id: "goldconfetti", name: "Royal Gold & Midnight Confetti", ml: "ഗോൾഡ് കോൺഫെറ്റി", tagline: "Milestone birthday, midnight & gold", layout: "classic", motif: "goldconfetti", shape: "circle", pal: P("#0E1636", "#050917", "#FBEFD0", "#C9CFE6", "#E3BE5C", "#F6E0A0"), blessing: ["Let's celebrate!", "നമുക്ക് ആഘോഷിക്കാം!"] },
  { id: "pastelballoon", name: "Pastel Rainbow & Balloon Cloud", ml: "ബലൂൺ & മേഘം", tagline: "1st birthday & kids photo card", layout: "classic", motif: "pastelballoon", shape: "circle", pal: P("#FFF7FB", "#E3F2FF", "#3A3358", "#6F6896", "#F2778B", "#7FB7E9"), blessing: ["A little one is turning another year bigger", "ഒരു വയസ്സിന്റെ മധുരം"] },
  { id: "rosegoldbday", name: "Rose Gold Floral & Sparkle Birthday", ml: "റോസ് ഗോൾഡ് ജന്മദിനം", tagline: "Blush florals with sparkle", layout: "classic", motif: "rosegoldbday", shape: "oval", pal: P("#FFF3F1", "#F9DFDC", "#4A2A2E", "#85605F", "#C98A7E", "#E8B4A8"), blessing: ["Join us to celebrate", "ആഘോഷത്തിൽ പങ്കുചേരൂ"] },
  { id: "gruhapravesham", name: "Traditional Kerala Gruhapravesham", ml: "ഗൃഹപ്രവേശം · കസവ് & നിലവിളക്ക്", tagline: "Mango-leaf toran, brass lamp, zari border", layout: "classic", motif: "gruhapravesham", shape: "oval", pal: P("#FFF9E8", "#F6E7C2", "#4A1B0C", "#7A4A2B", "#C99A2E", "#8C1C2B"), blessing: ["With the blessings of the Gods", "ഈശ്വരാനുഗ്രഹത്തോടെ"] },
  { id: "emeraldhome", name: "Modern Emerald & Gold Home Arch", ml: "എമറാൾഡ് ഹോം", tagline: "Emerald, gold key & home emblem", layout: "classic", motif: "emeraldhome", shape: "arch", pal: P("#0B4A3A", "#052A21", "#FFF3CF", "#D9D2A8", "#E0B94A", "#F4DD92"), blessing: ["A new home, a new beginning", "പുതിയ വീട്, പുതിയ തുടക്കം"] },
  { id: "christianhome", name: "Christian Blessing Ivory & Olive Home", ml: "ഭവന വെഞ്ചരിപ്പ്", tagline: "Ivory, olive branches, cross over home", layout: "classic", motif: "christianhome", shape: "circle", pal: P("#FFFEFA", "#F5F0E3", "#2B2A33", "#6B6657", "#B08D3C", "#8A7A52"), blessing: ["Unless the Lord builds the house", "കർത്താവ് ഭവനം പണിയുന്നില്ലെങ്കിൽ"] },
  { id: "choroonu", name: "Choroonu / Noolukettu Royal Kasavu & Cradle", ml: "ചോറൂണ് · നൂലുകെട്ട്", tagline: "Kerala gold, lotus & cradle", layout: "classic", motif: "choroonu", shape: "circle", pal: P("#FFF9EA", "#F8E8C6", "#4A1B0C", "#7A4A2B", "#C99A2E", "#8C1C2B"), blessing: ["With the blessings of the Gods", "ഈശ്വരാനുഗ്രഹത്തോടെ"] },
  { id: "baptism", name: "Holy Baptism / First Communion Pearl & Dove", ml: "മാമോദീസ", tagline: "Pearl, dove & soft light", layout: "classic", motif: "baptism", shape: "circle", pal: P("#FDFEFF", "#E9F0F8", "#2B3550", "#5F6C8A", "#B08D3C", "#7E95C4"), blessing: ["Let the little children come to me", "ശിശുക്കളെ എന്റെ അടുക്കൽ വരാൻ അനുവദിക്കുവിൻ"] },
  { id: "babyshower", name: "Baby Shower / Seemantham Pastel Floral & Gold", ml: "സീമന്തം · ബേബി ഷവർ", tagline: "Pastel blooms with gold", layout: "classic", motif: "babyshower", shape: "oval", pal: P("#FFF7F3", "#FDE9E4", "#4A3340", "#7F6471", "#D0A24A", "#E8A5B3"), blessing: ["A little blessing is on the way", "ഒരു കുഞ്ഞു സന്തോഷം വരുന്നു"] },
  { id: "aqiqah", name: "Aqiqah Crescent & Emerald Gold", ml: "അഖീഖ", tagline: "Crescent, star & emerald", layout: "classic", motif: "aqiqah", shape: "circle", pal: P("#0A4A3A", "#052A21", "#FFF4D6", "#CFE3D6", "#DDB84F", "#F2DE99"), blessing: ["Bismillahir Rahmanir Raheem", "ബിസ്മില്ലാഹിർറഹ്മാനിർറഹീം"] },
  { id: "ribbon", name: "Grand Ribbon & 24K Gold Foil Inauguration", ml: "ഉദ്ഘാടനം", tagline: "Ribbon cutting, gold foil", layout: "classic", motif: "ribbon", shape: "rect", pal: P("#1B1608", "#080602", "#F8ECC4", "#D5C690", "#E3BE5C", "#F6E0A0"), blessing: ["Cordially invites you to the grand opening", "ഉദ്ഘാടന ചടങ്ങിലേക്ക് സ്വാഗതം"] },
  { id: "anniversary", name: "Ruby & Gold Anniversary Crest", ml: "വാർഷികാഘോഷം", tagline: "Ruby, gold crest & hearts", layout: "classic", motif: "anniversary", shape: "oval", pal: P("#7A0A2E", "#3F0518", "#FFF0D2", "#F0D6A8", "#E3B85C", "#F6DE98"), blessing: ["Celebrating years of love", "സ്നേഹത്തിന്റെ വർഷങ്ങൾ ആഘോഷിക്കാൻ"] },
];

type Meta = { devotional?: boolean; category: TemplateCategory; faith?: Faith; defaultEvent: EventType; /** Events this design fits; wedding-group designs fit every wedding-type event. */ events?: EventType[]; premium?: boolean; animated?: boolean };
const wd = (faith: Faith, extra: Partial<Meta> = {}, defaultEvent: EventType = "wedding"): Meta => ({ category: "wedding", faith, defaultEvent, ...extra });
const META: Record<string, Meta> = {
  kasavu: wd("hindu", { animated: true }), temple: wd("hindu"), church: wd("christian"), nikah: wd("muslim", {}, "nikah"), botanical: wd("modern"), banarasi: wd("hindu", { animated: true }), minimal: wd("modern"),
  polaroid: { category: "events", defaultEvent: "save-the-date", events: ["save-the-date"] }, velvet: { category: "events", defaultEvent: "reception", events: ["reception"], animated: true }, marigold: { category: "events", defaultEvent: "haldi", events: ["haldi"], animated: true },
  peacock: wd("hindu", { premium: true, animated: true }), nilavilakku: wd("hindu", { premium: true, animated: true }), kanchipuram: wd("hindu", { premium: true, animated: true }),
  cathedral: wd("christian", { premium: true, animated: true }), victorian: wd("christian", { premium: true, animated: true }),
  mughal: wd("muslim", { premium: true, animated: true }, "nikah"), sapphire: wd("muslim", { premium: true, animated: true }, "nikah"), walima: wd("muslim", { premium: true, animated: true }, "reception"),
  emeraldfoil: wd("modern", { premium: true, animated: true }), marble: wd("modern", { premium: true, animated: true }), burgundy: wd("modern", { premium: true, animated: true }),
  betrothal: { category: "events", faith: "christian", defaultEvent: "engagement", events: ["engagement"], premium: true, animated: true }, rosegold: { category: "events", defaultEvent: "engagement", events: ["engagement"], premium: true, animated: true }, starlight: { category: "events", defaultEvent: "reception", events: ["reception"], premium: true, animated: true },
  goldconfetti: { category: "birthday", defaultEvent: "birthday", events: ["birthday"], premium: true, animated: true }, pastelballoon: { category: "birthday", defaultEvent: "birthday", events: ["birthday"], premium: true, animated: true }, rosegoldbday: { category: "birthday", defaultEvent: "birthday", events: ["birthday"], premium: true, animated: true },
  gruhapravesham: { category: "housewarming", faith: "hindu", defaultEvent: "housewarming", events: ["housewarming"], premium: true, animated: true }, emeraldhome: { category: "housewarming", defaultEvent: "housewarming", events: ["housewarming"], premium: true, animated: true }, christianhome: { category: "housewarming", faith: "christian", defaultEvent: "housewarming", events: ["housewarming"], premium: true, animated: true },
  choroonu: { category: "baby", faith: "hindu", defaultEvent: "choroonu", events: ["choroonu", "noolukettu"], premium: true, animated: true }, baptism: { category: "baby", faith: "christian", defaultEvent: "baptism", events: ["baptism"], premium: true, animated: true }, babyshower: { category: "baby", defaultEvent: "babyshower", events: ["babyshower"], premium: true, animated: true }, aqiqah: { category: "baby", faith: "muslim", defaultEvent: "aqiqah", events: ["aqiqah"], premium: true, animated: true },
  ribbon: { category: "events", defaultEvent: "inauguration", events: ["inauguration"], premium: true, animated: true }, anniversary: { category: "events", defaultEvent: "anniversary", events: ["anniversary"], premium: true, animated: true },
};
/** Illustrated, image-based designs: devotional (Hindu / Christian / Muslim) and balloon celebrations. Artwork: scripts/generate-template-art.py -> public/templates. */
const ART = (id: string) => ({ src: `/templates/${id}.svg`, m: 150, top: 400, bot: 20 });
const ART_TEMPLATES: RawTemplate[] = [
  { id: "radha-krishna", name: "Radha Krishna Divine Gold", ml: "രാധാകൃഷ്ണ", tagline: "Peacock feather, flute & lotus on royal gold", layout: "classic", motif: "art", shape: "circle", pal: P("#FFF7E6", "#FBE9C6", "#4A0F1F", "#7A3E2B", "#9A6B00", "#8C1C2B"), blessing: ["Radhe Krishna", "രാധേ കൃഷ്ണ"], art: ART("radha-krishna") },
  { id: "ganapathy-gold", name: "Sree Ganapathy Auspicious", ml: "ശ്രീ ഗണപതി", tagline: "Lord Ganesha, brass lamps & marigold garlands", layout: "classic", motif: "art", shape: "circle", pal: P("#FFF6E2", "#FBE6BE", "#4A1208", "#7A3A1B", "#A8650A", "#B3350F"), blessing: ["Sri Ganapathaye Namah", "ശ്രീ ഗണപതയേ നമഃ"], art: ART("ganapathy-gold") },
  { id: "guruvayoor-krishna", name: "Guruvayoorappan Temple Grace", ml: "ഗുരുവായൂരപ്പൻ", tagline: "Kerala temple Krishna, kasavu & jasmine", layout: "classic", motif: "art", shape: "oval", pal: P("#FFFAEE", "#F6E8C8", "#4A1410", "#7A4A2B", "#9A6B00", "#8C1C2B"), blessing: ["Guruvayoorappan Saranam", "ഗുരുവായൂരപ്പൻ ശരണം"], art: ART("guruvayoor-krishna") },
  { id: "christian-devotional", name: "Sacred Blessing Dove & Cross", ml: "ദിവ്യ അനുഗ്രഹം", tagline: "Stained-glass rose window, dove & lilies", layout: "classic", motif: "art", shape: "circle", pal: P("#FFFFFF", "#F5F2EA", "#1F2A44", "#5F6C8A", "#8A6A1C", "#3A5FB0"), blessing: ["God is love", "ദൈവം സ്നേഹമാകുന്നു"], art: ART("christian-devotional") },
  { id: "islamic-devotional", name: "Masjid & Golden Lanterns", ml: "മസ്ജിദ് & ഫാനൂസ്", tagline: "Emerald dome, crescent & glowing fanoos", layout: "classic", motif: "art", shape: "arch", pal: P("#073B2E", "#052F26", "#FFF4D6", "#CFE3D6", "#E8C766", "#F0DA94"), blessing: ["Bismillahir Rahmanir Raheem", "ബിസ്മില്ലാഹിർറഹ്മാനിർറഹീം"], art: ART("islamic-devotional") },
  { id: "balloon-luxury", name: "Luxury Gold & Pastel Balloon Arch", ml: "ഗോൾഡ് ബലൂൺ", tagline: "Gold, champagne & blush balloons with confetti", layout: "classic", motif: "art", shape: "circle", pal: P("#FFFAF2", "#F7E6D4", "#4A2E1F", "#7C6459", "#9A6B12", "#C9707F"), blessing: ["Join us to celebrate", "ആഘോഷത്തിൽ പങ്കുചേരൂ"], art: ART("balloon-luxury") },
  { id: "balloon-kids", name: "Kids Balloon & Cloud Carnival", ml: "ബലൂൺ കാർണിവൽ", tagline: "Rainbow, clouds, stars & pastel balloons", layout: "classic", motif: "art", shape: "circle", pal: P("#FFFFFF", "#EEF6FF", "#3A3358", "#6F6896", "#D6456B", "#7757D1"), blessing: ["Let's party!", "നമുക്ക് ആഘോഷിക്കാം!"], art: ART("balloon-kids") },
];
const ART_META: Record<string, Meta> = {
  "radha-krishna": { category: "wedding", faith: "hindu", defaultEvent: "wedding", events: ["wedding", "engagement", "housewarming", "choroonu"], premium: true, devotional: true },
  "ganapathy-gold": { category: "wedding", faith: "hindu", defaultEvent: "wedding", events: ["wedding", "engagement", "housewarming", "inauguration"], premium: true, devotional: true },
  "guruvayoor-krishna": { category: "wedding", faith: "hindu", defaultEvent: "wedding", events: ["wedding", "engagement", "housewarming", "choroonu", "noolukettu"], premium: true, devotional: true },
  "christian-devotional": { category: "wedding", faith: "christian", defaultEvent: "wedding", events: ["wedding", "engagement", "baptism"], premium: true, devotional: true },
  "islamic-devotional": { category: "wedding", faith: "muslim", defaultEvent: "nikah", events: ["nikah", "reception", "aqiqah"], premium: true, devotional: true },
  "balloon-luxury": { category: "birthday", defaultEvent: "birthday", events: ["birthday", "anniversary"], premium: true },
  "balloon-kids": { category: "birthday", defaultEvent: "birthday", events: ["birthday"], premium: true },
};
export const TEMPLATES: WeddingTemplate[] = [...RAW_TEMPLATES, ...NEW_TEMPLATES, ...ART_TEMPLATES].map((t) => ({ ...t, ...(META[t.id] ?? ART_META[t.id]) }));

/** True when a design is written for this event (wedding-type designs fit every wedding-type event). */
export const templateSuits = (t: Pick<WeddingTemplate, "category" | "events">, ev: EventType) => (t.events ? t.events.includes(ev) : eventConfig(ev).group === t.category);

export const TEMPLATE_FILTERS = [
  { id: "all", label: "All" }, { id: "devotional", label: "🪔 Devotional" }, { id: "wedding", label: "Wedding (Hindu / Christian / Muslim)" }, { id: "birthday", label: "Birthday" }, { id: "housewarming", label: "Housewarming (ഗൃഹപ്രവേശം)" },
  { id: "baby", label: "Baby & Kids (ചോറൂണ് / നൂലുകെട്ട് / Baptism)" }, { id: "events", label: "Events (Engagement / Inauguration / Anniversary)" },
] as const;
export type TemplateFilter = (typeof TEMPLATE_FILTERS)[number]["id"];

export const getTemplate = (id: string) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];

/** How one kind of event words itself: field labels, default copy and sample text. */
export interface EventConfig {
  id: EventType; group: EventGroup; en: string; ml: string;
  /** Card heading (English / Malayalam). */
  title: { en: string; ml: string };
  /** Two names joined by "&" (couple) or one headline name with an optional sub-line. */
  couple: boolean;
  labels: { name1: string; name2: string; host1: string; host2: string; time: string; venue: string };
  /** The 2nd name / 2nd host fields are hidden when false. */
  useName2: boolean; useHost2: boolean;
  /** Prefix for a plain host line: "Parents: …". */
  hostPrefix: { en: string; ml: string };
  /** "{names} warmly invite you to their …" wording in the WhatsApp text. */
  invite: { en: string; ml: string };
  message: { en: string; ml: string };
  sample: Partial<WeddingDetails>;
}
const EV = (c: EventConfig) => c;
const WED_LABELS = { name1: "Groom's name", name2: "Bride's name", host1: "Groom's parents", host2: "Bride's parents", time: "Muhurtham / time", venue: "Venue" };
const WED_MSG = { en: "We joyfully invite you to bless us with your presence.", ml: "നിങ്ങളുടെ സാന്നിധ്യവും അനുഗ്രഹവും ഉണ്ടാകണമെന്ന് സവിനയം ക്ഷണിക്കുന്നു." };
const WED_SAMPLE = { groom: "Arjun", bride: "Anjali", groomParents: "Mr. & Mrs. Nair", brideParents: "Mr. & Mrs. Menon", date: "2027-02-14", time: "10:30 AM", venue: "Grand Convention Centre, Kochi", message: "together with our families, we joyfully invite you to share in our happiness." };
const wed = (id: EventType, en: string, ml: string, over: Partial<EventConfig> = {}) => EV({ id, group: "wedding", en, ml, title: { en: `${en} Invitation`, ml }, couple: true, labels: WED_LABELS, useName2: true, useHost2: true, hostPrefix: { en: "", ml: "" }, invite: { en: "their", ml: "ഞങ്ങളുടെ" }, message: WED_MSG, sample: WED_SAMPLE, ...over });
const baby = (id: EventType, en: string, ml: string, over: Partial<EventConfig> = {}) => EV({ id, group: "baby", en, ml, title: { en, ml }, couple: false, labels: { name1: "Baby's name", name2: "Mother's name (optional)", host1: "Parents' names", host2: "", time: "Time", venue: "Temple / church / venue" }, useName2: true, useHost2: false, hostPrefix: { en: "Parents: ", ml: "മാതാപിതാക്കൾ: " }, invite: { en: "the", ml: "ഞങ്ങളുടെ കുഞ്ഞിന്റെ" }, message: { en: "Join us as we celebrate this blessed moment with our little one.", ml: "ഞങ്ങളുടെ കുഞ്ഞിന്റെ ഈ ധന്യ നിമിഷത്തിൽ നിങ്ങളുടെ സാന്നിധ്യവും അനുഗ്രഹവും ഉണ്ടാകണമെന്ന് സവിനയം ക്ഷണിക്കുന്നു." }, sample: { groom: "Aadhav", bride: "", groomParents: "Arun & Anjali", date: "2027-03-06", time: "9:30 AM", venue: "Sree Krishna Temple, Guruvayoor", message: "" }, ...over });
export const EVENTS: EventConfig[] = [
  wed("wedding", "Wedding", "വിവാഹ ക്ഷണക്കത്ത്"),
  wed("engagement", "Engagement Ceremony", "വിവാഹ നിശ്ചയം", { title: { en: "Engagement Ceremony", ml: "വിവാഹ നിശ്ചയം" }, labels: { ...WED_LABELS, time: "Time" } }),
  wed("reception", "Wedding Reception", "വിവാഹ സൽക്കാരം", { title: { en: "Wedding Reception", ml: "വിവാഹ സൽക്കാരം" }, labels: { ...WED_LABELS, time: "Reception time" } }),
  wed("haldi", "Haldi & Mehendi", "ഹൽദി & മെഹന്തി", { title: { en: "Haldi & Mehendi", ml: "ഹൽദി & മെഹന്തി" }, labels: { ...WED_LABELS, time: "Time" }, message: { en: "Come, celebrate with colours, music and joy.", ml: "നിറങ്ങളും സംഗീതവും നിറഞ്ഞ ആഘോഷത്തിൽ പങ്കുചേരാൻ സ്നേഹപൂർവം ക്ഷണിക്കുന്നു." } }),
  wed("nikah", "Nikah Ceremony", "നിക്കാഹ്", { title: { en: "Nikah Ceremony", ml: "നിക്കാഹ്" }, labels: { ...WED_LABELS, name1: "Groom's name", time: "Nikah time" } }),
  wed("save-the-date", "Save the Date", "തീയതി കുറിച്ചുവയ്ക്കൂ", { title: { en: "Save the Date", ml: "തീയതി കുറിച്ചുവയ്ക്കൂ" }, message: { en: "Our invitation will follow. Please keep this date free.", ml: "ക്ഷണക്കത്ത് പിന്നാലെ എത്തും. ഈ ദിവസം മാറ്റിവയ്ക്കണമെന്ന് അഭ്യർത്ഥിക്കുന്നു." } }),
  EV({ id: "birthday", group: "birthday", en: "Birthday", ml: "ജന്മദിനം", title: { en: "Birthday Celebration", ml: "ജന്മദിനാഘോഷം" }, couple: false, labels: { name1: "Celebrant's name", name2: "Age / milestone (e.g. 1st Birthday)", host1: "Parents / hosted by", host2: "", time: "Party time", venue: "Party venue" }, useName2: true, useHost2: false, hostPrefix: { en: "Hosted by ", ml: "ആതിഥേയർ: " }, invite: { en: "the", ml: "" }, message: { en: "Come, share the cake, the laughter and the joy.", ml: "കേക്കും ചിരിയും സന്തോഷവും പങ്കിടാൻ എല്ലാവരെയും സ്നേഹപൂർവം ക്ഷണിക്കുന്നു." }, sample: { groom: "Aarav", bride: "1st Birthday", groomParents: "Arun & Anjali", date: "2027-04-10", time: "5:00 PM", venue: "Lotus Garden Hall, Kochi", message: "" } }),
  EV({ id: "housewarming", group: "housewarming", en: "Housewarming", ml: "ഗൃഹപ്രവേശം", title: { en: "Housewarming Ceremony", ml: "ഗൃഹപ്രവേശം · പാലുകാച്ചൽ" }, couple: false, labels: { name1: "Host family / couple names", name2: "New home name", host1: "New home address", host2: "", time: "Pooja / blessing & lunch time", venue: "Venue / location" }, useName2: true, useHost2: false, hostPrefix: { en: "", ml: "" }, invite: { en: "the", ml: "ഞങ്ങളുടെ" }, message: { en: "Please join us for the pooja, blessings and lunch at our new home.", ml: "ഞങ്ങളുടെ പുതിയ ഭവനത്തിലെ പൂജയിലും അനുഗ്രഹ ചടങ്ങിലും സദ്യയിലും പങ്കെടുക്കാൻ സ്നേഹപൂർവം ക്ഷണിക്കുന്നു." }, sample: { groom: "Rajesh & Meera", bride: "“Anugraha”", groomParents: "Kakkanad, Kochi", date: "2027-05-12", time: "Pooja 8:30 AM · Lunch 12:30 PM", venue: "Anugraha, Kakkanad, Kochi", message: "" } }),
  baby("choroonu", "Choroonu (First Rice Feeding)", "ചോറൂണ്", { title: { en: "Choroonu Ceremony", ml: "ചോറൂണ്" } }),
  baby("noolukettu", "Noolukettu (Naming Ceremony)", "നൂലുകെട്ട്", { title: { en: "Noolukettu Ceremony", ml: "നൂലുകെട്ട്" }, invite: { en: "the", ml: "ഞങ്ങളുടെ കുഞ്ഞിന്റെ" } }),
  baby("baptism", "Holy Baptism", "മാമോദീസ", { title: { en: "Holy Baptism", ml: "മാമോദീസ" }, labels: { name1: "Baby's name", name2: "Godparents (optional)", host1: "Parents' names", host2: "", time: "Time", venue: "Church / venue" }, message: { en: "Please join us as our little one is welcomed into God's family.", ml: "ഞങ്ങളുടെ കുഞ്ഞ് ദൈവകുടുംബത്തിലേക്ക് സ്വീകരിക്കപ്പെടുന്ന ഈ ധന്യ നിമിഷത്തിൽ പങ്കുചേരാൻ ക്ഷണിക്കുന്നു." }, sample: { groom: "Ethan", bride: "", groomParents: "Jose & Mary", date: "2027-03-20", time: "10:00 AM", venue: "St. Mary's Church, Kottayam", message: "" } }),
  baby("babyshower", "Baby Shower / Seemantham", "സീമന്തം", { title: { en: "Baby Shower", ml: "സീമന്തം" }, labels: { name1: "Mother-to-be's name", name2: "Father / family (optional)", host1: "Hosted by", host2: "", time: "Time", venue: "Venue" }, hostPrefix: { en: "Hosted by ", ml: "ആതിഥേയർ: " }, invite: { en: "the", ml: "" }, message: { en: "Join us to shower the mum-to-be with love and blessings.", ml: "വരാനിരിക്കുന്ന കുഞ്ഞിനും അമ്മയ്ക്കും അനുഗ്രഹവും സ്നേഹവും ചൊരിയാൻ എല്ലാവരെയും ക്ഷണിക്കുന്നു." }, sample: { groom: "Anjali", bride: "", groomParents: "Her loving family", date: "2027-02-27", time: "11:00 AM", venue: "Rose Residency, Thrissur", message: "" } }),
  baby("aqiqah", "Aqiqah", "അഖീഖ", { title: { en: "Aqiqah Ceremony", ml: "അഖീഖ ക്ഷണക്കത്ത്" }, labels: { name1: "Baby's name", name2: "", host1: "Parents' names", host2: "", time: "Time", venue: "Venue" }, useName2: false, message: { en: "With grateful hearts, we joyfully invite you and your family to grace the Aqiqah ceremony and celebratory feast of our beloved child. Your presence and duas will bless this joyous day.", ml: "അല്ലാഹുവിന്റെ അനുഗ്രഹത്താൽ ലഭിച്ച ഞങ്ങളുടെ പൊന്നോമനയുടെ അഖീഖ ചടങ്ങിലും സദ്യയിലും കുടുംബസമേതം പങ്കെടുത്ത് ദുആ ചെയ്യണമെന്ന് സ്നേഹപൂർവം ക്ഷണിക്കുന്നു." }, sample: { groom: "Muhammad Ayaan", bride: "", groomParents: "Faisal & Shahana", date: "2027-03-14", time: "11:00 AM", venue: "Al-Noor Hall, Kozhikode", message: "" } }),
  EV({ id: "inauguration", group: "events", en: "Inauguration", ml: "ഉദ്ഘാടനം", title: { en: "Grand Inauguration", ml: "ഉദ്ഘാടന ചടങ്ങ്" }, couple: false, labels: { name1: "Business / brand name", name2: "Chief guest (optional)", host1: "Proprietor / hosted by", host2: "", time: "Inauguration time", venue: "Venue / address" }, useName2: true, useHost2: false, hostPrefix: { en: "Proprietor: ", ml: "ഉടമ: " }, invite: { en: "the", ml: "ഞങ്ങളുടെ" }, message: { en: "We cordially invite you to the opening of our new venture.", ml: "ഞങ്ങളുടെ പുതിയ സംരംഭത്തിന്റെ ഉദ്ഘാടന ചടങ്ങിലേക്ക് സ്നേഹപൂർവം ക്ഷണിക്കുന്നു." }, sample: { groom: "Sree Lakshmi Textiles", bride: "Chief Guest: Hon. Minister", groomParents: "R. Gopalan", date: "2027-06-05", time: "10:00 AM", venue: "MG Road, Thrissur", message: "" } }),
  EV({ id: "anniversary", group: "events", en: "Anniversary", ml: "വാർഷികം", title: { en: "Wedding Anniversary", ml: "വിവാഹ വാർഷികം" }, couple: true, labels: { name1: "Husband's name", name2: "Wife's name", host1: "Milestone (e.g. 25th Anniversary)", host2: "", time: "Time", venue: "Venue" }, useName2: true, useHost2: false, hostPrefix: { en: "", ml: "" }, invite: { en: "their", ml: "ഞങ്ങളുടെ" }, message: { en: "Celebrate years of love and togetherness with us.", ml: "സ്നേഹത്തിന്റെയും ഒരുമയുടെയും വർഷങ്ങൾ ഞങ്ങളോടൊപ്പം ആഘോഷിക്കാൻ ക്ഷണിക്കുന്നു." }, sample: { groom: "Suresh", bride: "Latha", groomParents: "25th Anniversary", date: "2027-01-23", time: "6:30 PM", venue: "The Residency Towers, Kochi", message: "" } }),
];
export const EVENT_TYPES: { id: EventType; en: string; ml: string }[] = EVENTS.map((e) => ({ id: e.id, en: e.en, ml: e.ml }));
export const eventConfig = (id: EventType): EventConfig => EVENTS.find((e) => e.id === id) ?? EVENTS[0];
export const EVENT_TITLE = Object.fromEntries(EVENTS.map((e) => [e.id, e.title])) as Record<EventType, { en: string; ml: string }>;

export const EMPTY_DETAILS: WeddingDetails = { eventType: "wedding", lang: "both", bride: "", groom: "", brideParents: "", groomParents: "", date: "", time: "", venue: "", mapsUrl: "", message: "", blessing: "", verse: "", accent: "", photos: [] };

/** Placeholder text for the event type (used for gallery thumbnails and before anything is typed). */
export const sampleFor = (id: EventType): WeddingDetails => ({ ...EMPTY_DETAILS, eventType: id, ...eventConfig(id).sample });
export const SAMPLE_DETAILS: WeddingDetails = sampleFor("wedding");

export type GuestStatus = "pending" | "queued" | "sent" | "failed";
export interface Guest { id: string; name: string; place: string; phone: string; status: GuestStatus }

export const newId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function formatDate(date: string, lang: WLang): string {
  if (!date) return "";
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  const f = (loc: string) => d.toLocaleDateString(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return lang === "ml" ? f("ml-IN") : f("en-IN");
}

/** Digits only, with Kerala's +91 added to bare 10-digit numbers. */
export function normalizePhone(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return d;
}
export const validPhone = (raw: string) => { const d = normalizePhone(raw); return d.length >= 11 && d.length <= 15; };

/** Parses pasted guest rows: "Name, Place, Phone" / tab separated / "Name - Phone", one per line. */
export function parseGuests(text: string): Guest[] {
  const out: Guest[] = [];
  for (const line of text.split(/\r?\n/)) {
    const raw = line.trim();
    if (!raw) continue;
    const cells = raw.split(/\t|,|;|\|/).map((c) => c.trim()).filter(Boolean);
    const phoneIdx = cells.findIndex((c) => /^\+?[\d\s()-]{8,}$/.test(c));
    let phone = "", name = "", place = "";
    if (phoneIdx >= 0) { phone = cells[phoneIdx]; const rest = cells.filter((_, i) => i !== phoneIdx); name = rest[0] ?? ""; place = rest[1] ?? ""; }
    else { const m = raw.match(/^(.*?)[\s-]+(\+?\d[\d\s-]{7,})$/); if (m) { name = m[1].trim(); phone = m[2]; } else { name = cells[0] ?? ""; place = cells[1] ?? ""; } }
    if (name || phone) out.push({ id: newId(), name, place, phone, status: "pending" });
  }
  return out;
}

export const inviteUrl = (origin: string, id: string, g?: { name?: string; place?: string }) => {
  const q = new URLSearchParams();
  if (g?.name) q.set("guest", g.name);
  if (g?.place) q.set("addr", g.place);
  const s = q.toString();
  return `${origin}/invitation-cards/invite/${id}${s ? `?${s}` : ""}`;
};

/** The WhatsApp text for one guest (language follows the card). */
export function whatsappMessage(d: WeddingDetails, g: { name: string; place: string }): string {
  const cfg = eventConfig(d.eventType);
  const title = cfg.title;
  const names = (cfg.couple ? [d.groom, d.bride] : [d.groom]).filter(Boolean).join(" & ");
  const date = formatDate(d.date, d.lang);
  const who = g.name || "Friend";
  const maps = mapsLink(d);
  const extras = (l: "en" | "ml") => `${date ? `\n📅 ${formatDate(d.date, l)}${d.time ? `, ${d.time}` : ""}` : ""}${d.venue ? `\n📍 ${d.venue}` : ""}${maps ? `\n🗺️ ${maps}` : ""}`;
  const en = `Dear ${who}${g.place ? ` (${g.place})` : ""},\n\n${names ? `${names} ` : "We "}warmly invite you to ${cfg.couple ? "their" : "the"} ${title.en}.${extras("en")}`;
  const ml = `പ്രിയപ്പെട്ട ${who}${g.place ? ` (${g.place})` : ""},\n\n${names ? `${names} ` : ""}${title.ml} ചടങ്ങിലേക്ക് നിങ്ങളെ സ്നേഹപൂർവം ക്ഷണിക്കുന്നു.${extras("ml")}`;
  return d.lang === "ml" ? ml : d.lang === "both" ? `${ml}\n\n———\n\n${en}` : en;
}

export const whatsappLink = (phone: string, text: string) => `https://wa.me/${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
export const mapsLink = (d: Pick<WeddingDetails, "mapsUrl" | "venue">) => {
  const u = d.mapsUrl.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return d.venue.trim() ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.venue)}` : "";
};

// ── persistence (this browser) ──
const KEY = "intelliad.wedding.v1";
export interface StudioSave { template: string; details: WeddingDetails; guests: Guest[]; inviteId: string | null; publishedHash: string | null; effect?: CardEffect }
export function loadStudio(): StudioSave | null {
  try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as StudioSave) : null; } catch { return null; }
}
export function saveStudio(s: StudioSave) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { try { localStorage.setItem(KEY, JSON.stringify({ ...s, details: { ...s.details, photos: [] } })); } catch { /* storage full */ } }
}
export const localInviteKey = (id: string) => `intelliad.wedding.invite.${id}`;

/** What a guest's invite page needs (no guest list). */
export interface InvitePayload { template_id: string; data: { details: WeddingDetails; videoUrl: string | null; effect?: CardEffect } }
