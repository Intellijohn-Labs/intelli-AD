/** Wedding & Event Invitations: shared types, the 10 template themes, copy helpers and local persistence. */
import type { TextAnim } from "@/lib/text-anim";

export type EventType = "wedding" | "engagement" | "reception" | "haldi" | "nikah" | "save-the-date" | "birthday" | "housewarming" | "choroonu" | "noolukettu" | "baptism" | "babyshower" | "aqiqah" | "inauguration" | "anniversary" | "festival";
export type EventGroup = "wedding" | "birthday" | "housewarming" | "baby" | "events" | "inauguration" | "festival";
export type WLang = "en" | "ml" | "both";
export type Layout = "classic" | "polaroid" | "minimal";
export type PhotoShape = "arch" | "circle" | "oval" | "rect";
export type Motif = "kasavu" | "temple" | "church" | "nikah" | "botanical" | "banarasi" | "polaroid" | "velvet" | "marigold" | "minimal"
  | "goldconfetti" | "pastelballoon" | "rosegoldbday" | "gruhapravesham" | "emeraldhome" | "christianhome" | "choroonu" | "baptism" | "babyshower" | "aqiqah" | "ribbon" | "anniversary"
  | "art" | "peacock" | "nilavilakku" | "kanchipuram" | "cathedral" | "victorian" | "betrothal" | "mughal" | "sapphire" | "walima" | "emeraldfoil" | "marble" | "burgundy" | "rosegold" | "starlight";
export type TemplateCategory = EventGroup;
export type Faith = "hindu" | "christian" | "muslim" | "modern";
export type GreetingFormat = "dear-name-place" | "dear-family" | "dear-family-place" | "to-family" | "ml-family" | "custom";
/** Independently movable text groups on the card (the greeting badge has its own guestBadgeX / Y). */
export type BlockKey = "header" | "names" | "body" | "dateTime" | "venue";
/** Everything on the card that can be moved, resized or given its own font: the greeting plus the five text groups. */
export type BlockId = "guest" | BlockKey;
export type FontId = "playfair" | "cormorant" | "great-vibes" | "alex-brush" | "cinzel" | "lora" | "montserrat" | "poppins" | "dancing-script" | "libre-baskerville" | "noto-serif-ml" | "manjari" | "gayathri";
/** "default" = the template's own type; royal / script / sans / ml-classic are the earlier presets (kept so saved cards still render); the rest are single fonts. */
/** One editable text element on the card; each can be sized on its own (blessing and event title are separate, as are family line and message). */
export type TextId = "guest" | "blessing" | "title" | "names" | "parents" | "message" | "datetime" | "venue" | "verse";
/** Text-size multiplier range offered by every size control (50 % - 250 %). */
export const TEXT_SCALE_MIN = 0.5, TEXT_SCALE_MAX = 2.5;
/** Typography overrides for one built-in text element (anything unset keeps the template's own look). */
export interface TextStyle { color?: string; align?: "left" | "center" | "right"; /** letter spacing in em */ ls?: number; /** line height multiplier */ lh?: number }
export type LayerShape = "rect" | "rounded" | "circle";
export type ElementKind = "divider-diamond" | "divider-dots" | "frame-double" | "star" | "heart" | "flower";
/** Extra things the client drops on the card in the fullscreen studio. x / y = centre as 0-100 % of the card; w = width as % of card width. Array order = stacking order (last is on top). */
export type CardLayer =
  | { id: string; type: "text"; x: number; y: number; w: number; text: string; size: number; font: FontStyle | ""; color: string; align: "left" | "center" | "right"; ls: number; lh: number; opacity: number; bold: boolean; italic: boolean }
  | { id: string; type: "image"; x: number; y: number; w: number; src: string; shape: LayerShape; opacity: number; border: number; borderColor: string; shadow: boolean }
  | { id: string; type: "element"; x: number; y: number; w: number; kind: ElementKind; color: string; opacity: number };
export type FontStyle = "default" | "royal" | "script" | "sans" | "ml-classic" | FontId;
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
  /** Legacy: an accent override from earlier AI runs. Kept so old drafts load; it is no longer shown or applied. */
  accent: string;
  /** Couple photos as downscaled JPEG data URLs (the first sits in the template's photo frame). */
  photos: string[];
  /** How each guest's "To / Dear ..." line reads on their personalised card. */
  guestGreetingFormat: GreetingFormat;
  /** Prefix used by the "custom" greeting format (e.g. "With love to"). */
  guestCustomPrefix: string;
  /** Centre of the greeting badge as 0-100 % of card width / height; null = it sits in the normal text flow. */
  guestBadgeX: number | null;
  guestBadgeY: number | null;
  /** The "custom" greeting wording; {Name} and {Place} are replaced for every guest (e.g. "To {Name}, {Place}"). */
  guestGreetingTemplate: string;
  /** Centre of each dragged text element (keyed by TextId; the greeting uses guestBadgeX / Y) as 0-100 % of the card; an element with no entry stays in the template's flow. */
  blockPos: Partial<Record<TextId | BlockKey, { x: number; y: number }>>;
  /** true = the greeting sits in a rounded bordered pill; false = plain text straight on the card. */
  guestGreetingBoxed: boolean;
  /** Typography for the whole card (a block can override it with blockFont). */
  fontStyle: FontStyle;
  /** Size multiplier per text element, keyed by TextId (0.5 - 2.5, 1 = template default). Older saves keyed by group (header / body / dateTime) still apply to their members. */
  blockScale: Partial<Record<TextId | BlockId, number>>;
  /** Master text size for every block at once (0.5 - 2.5, 1 = template default); multiplies each element's own blockScale. */
  contentScale: number;
  /** The client's own invitation image (downscaled data URL; an uploaded URL once published). Used when the "Your own card" template is picked. */
  customCard: string | null;
  /** Custom card only: print the guest's "Dear ..." line on it (on by default). */
  showGuestName: boolean;
  /** Custom card only: also print the event title, names, date and venue on the image (off by default: the uploaded design already has them). */
  printCustomDetails: boolean;
  /** Custom card only: the event title used for the WhatsApp message and invite page (the host / sender name is the first name field). */
  customTitle: string;
  /** Festival greetings only: also place the sender's photo or brand logo (the first uploaded photo) on the card. */
  festivalPhoto: boolean;
  /** Video greetings only: the footer quote burned onto the video (blank = no footer), its festival preset / language, and its look. */
  videoQuote: string;
  videoFestival: string;
  videoQuoteLang: "en" | "ml";
  videoQuoteX: number | null;
  videoQuoteY: number | null;
  videoQuoteScale: number;
  videoQuoteColor: string;
  videoQuoteFont: "sans" | "serif" | "manjari";
  videoQuoteBackdrop: boolean;
  /** Text animation for the guest line (header) and the footer quote of a video greeting. */
  videoHeaderAnim: TextAnim;
  videoFooterAnim: TextAnim;
  /** Per-element colour / alignment / letter spacing / line height. */
  textStyle: Partial<Record<TextId, TextStyle>>;
  /** Custom text boxes, uploaded images and decorative elements placed in the fullscreen studio. */
  layers: CardLayer[];
  /** Per-block font override; a block with no entry follows fontStyle. */
  blockFont: Partial<Record<TextId | BlockId, FontStyle>>;
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
  /** Illustrated image backdrop (same-origin SVG in public/templates, 1080 x 1500: artwork header + opaque text panel). left / right / top / bottom = the inner safe box (px from each edge of the 1080 x 1500 card) that every text line is confined to; panel draws a soft ivory panel behind the text for artwork with no clear area. */
  /** Festival greeting designs: the default headline and wish printed when the client hasn't typed their own (Malayalam + English). */
  festival?: { title: { en: string; ml: string }; wish: { en: string; ml: string } };
  art?: { src: string; left: number; right: number; top: number; bottom: number; panel?: boolean };
}

type RawTemplate = Omit<WeddingTemplate, "category" | "faith" | "defaultEvent" | "events" | "premium" | "animated">;
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

type Meta = { category: TemplateCategory; faith?: Faith; defaultEvent: EventType; /** Events this design fits; wedding-group designs fit every wedding-type event. */ events?: EventType[]; premium?: boolean; animated?: boolean };
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
  ribbon: { category: "inauguration", defaultEvent: "inauguration", events: ["inauguration"], premium: true, animated: true }, anniversary: { category: "events", defaultEvent: "anniversary", events: ["anniversary"], premium: true, animated: true },
};
/**
 * Real-artwork Hindu wedding designs (public/templates/hindu-wedding, prepared by scripts/prepare-hindu-wedding-images.py).
 * Each `art` box is the clear area of that image, measured on the final 1080 x 1500 card, so no text line reaches a border,
 * garland, deity or other artwork; ink / accent colours are picked for the tone of that clear area.
 */
const HW = (id: string, over: Partial<RawTemplate> & Pick<RawTemplate, "name" | "ml" | "tagline" | "pal" | "blessing">, box: [number, number, number, number], panel = false, folder = "hindu-wedding"): RawTemplate => ({
  id, layout: "classic", motif: "art", shape: "oval", ...over,
  art: { src: `/templates/${folder}/${id}.jpg`, left: box[0], right: box[1], top: box[2], bottom: box[3], ...(panel ? { panel: true } : {}) },
});
const GANESHA: [string, string] = ["Sri Ganapathaye Namah", "ശ്രീ ഗണപതയേ നമഃ"], SHIVA: [string, string] = ["Om Namah Shivaya", "ഓം നമഃ ശിവായ"];
const HINDU_RAW: RawTemplate[] = [
  HW("hindu-royal-ganesha-couple", { name: "Royal Shiva Parvati Vivaha", ml: "ശിവപാർവതി വിവാഹം", tagline: "Golden pillars, sacred fire & marigold", pal: P("#FCEBD8", "#F7DAB8", "#5A1010", "#7A4A2B", "#9A6410", "#8C1C2B"), blessing: SHIVA }, [320, 300, 215, 760]),
  HW("hindu-radha-krishna", { name: "Radha Krishna Lotus Garden", ml: "രാധാകൃഷ്ണ", tagline: "Pastel arch, lotus pond & the divine pair", pal: P("#FFFCF5", "#FBEFD8", "#4A1020", "#7A4B3A", "#A06A12", "#B03060"), blessing: ["Radhe Krishna", "രാധേ കൃഷ്ണ"] }, [525, 170, 280, 310]),
  HW("hindu-shiva-parvati-arch", { name: "Shiva Parvati Floral Arch", ml: "ശിവപാർവതി", tagline: "Cream arch, hanging blooms & the celestial court", pal: P("#FBF3E4", "#F3E2C4", "#4A1710", "#7A4A2B", "#9A6410", "#8C1C2B"), blessing: SHIVA }, [300, 300, 260, 770]),
  HW("hindu-ramayana-gold", { name: "Golden Temple Sri Rama Seetha", ml: "ശ്രീരാമ സീത", tagline: "Carved temple gateway at golden hour", pal: P("#F6D9A0", "#EDBE76", "#3B1405", "#5E2E10", "#7A2E00", "#6B1A10"), blessing: ["Sri Rama Jayam", "ശ്രീരാമ ജയം"] }, [280, 300, 210, 520]),
  HW("hindu-gopuram-garden", { name: "Gopuram & Sri Rama Darbar", ml: "ഗോപുരം · രാമദർബാർ", tagline: "Parchment, banana leaves & temple tower", pal: P("#F8EFD8", "#F0E2BF", "#3B1A0A", "#6B4A2B", "#9A6410", "#8C1C2B"), blessing: GANESHA }, [290, 210, 215, 735]),
  HW("hindu-shiva-sakthi-rose", { name: "Shiva Sakthi Rose Watercolor", ml: "ശിവശക്തി", tagline: "Blush wash, Ganesha lotus & pink lotuses", pal: P("#F7E4E6", "#F0D2D6", "#4A0F24", "#7A3A4A", "#9A5A10", "#A01E4A"), blessing: SHIVA }, [150, 150, 400, 580]),
  HW("hindu-watercolor-couple", { name: "Shiva Parvati Watercolor Om", ml: "ഓം · ശിവപാർവതി", tagline: "Soft watercolor, Om mandala & temple bells", pal: P("#F6EDCC", "#EEE3BC", "#3B2A10", "#6B5A30", "#8A6410", "#7A3A1E"), blessing: SHIVA }, [100, 100, 255, 540]),
  HW("hindu-temple-tower", { name: "Temple Gopuram & Lotus", ml: "ക്ഷേത്ര ഗോപുരം", tagline: "Colourful gopuram, banana leaf & petals", pal: P("#FFFFFF", "#FFF8EE", "#3E1A10", "#7A4A2B", "#A06A12", "#C0392B"), blessing: ["Om Namo Narayanaya", "ഓം നമോ നാരായണായ"] }, [500, 70, 440, 120]),
  HW("hindu-mandap-pooja", { name: "Mandapam Pooja & Jasmine", ml: "മണ്ഡപം പൂജ", tagline: "Jasmine strings, brass lamps & the pooja mandap", pal: P("#FDF1EE", "#FADAD4", "#4A1020", "#7A3E3A", "#A06A12", "#B03060"), blessing: GANESHA }, [110, 480, 560, 390]),
  HW("hindu-hands-minimal", { name: "Divine Union Minimal", ml: "ദിവ്യ സംഗമം", tagline: "Krishna & Radha's clasped hands on white", pal: P("#FFFFFF", "#FFF9F0", "#2E1A24", "#6B4A5A", "#9A6410", "#C0392B"), blessing: ["Radhe Krishna", "രാധേ കൃഷ്ണ"] }, [110, 110, 790, 70]),
  HW("hindu-bells-hands", { name: "Divine Hands & Temple Bells", ml: "ദിവ്യ കരങ്ങൾ", tagline: "Bells, Ganesha lotus & garden florals", pal: P("#FBF1E6", "#F6E3D0", "#4A1020", "#7A4A3A", "#9A6410", "#B03060"), blessing: GANESHA }, [110, 110, 790, 370]),
  HW("hindu-silhouette-couple", { name: "Shiva Parvati Silhouette Minimal", ml: "ശിവപാർവതി", tagline: "Hand-in-hand on white, saffron & gold drapes", pal: P("#FFFFFF", "#FFF9F0", "#2E1A24", "#6B4A5A", "#9A6410", "#C0392B"), blessing: SHIVA }, [100, 100, 100, 900]),
  HW("hindu-sunrise-temple", { name: "Temple Sunrise Marigold Path", ml: "ക്ഷേത്ര സൂര്യോദയം", tagline: "Sunlit gopuram, marigold garlands & lamps", pal: P("#FFF8EA", "#F8E6C4", "#3E1A0A", "#6B4A2B", "#9A6410", "#8C1C2B"), blessing: GANESHA }, [210, 210, 370, 410], true),
];
const HINDU_TEMPLATES = HINDU_RAW;

/** Later additions across categories (one public/templates/<category>/ folder each); same safe-box rules as above. */
const NEW_IMAGE_RAW: RawTemplate[] = [
  HW("haldi-yellow-drapes-bride", { name: "Haldi Yellow Drapes & Bride", ml: "ഹൽദി", tagline: "Marigold garlands, sheer drapes & a radiant bride", pal: P("#FFF6D6", "#FBE7A1", "#4A2A00", "#7A4A12", "#B45309", "#2F6B2F"), blessing: ["Come, celebrate with colours and joy", "നിറങ്ങളുടെ ആഘോഷത്തിലേക്ക്"] }, [320, 330, 250, 860], false, "haldi"),
  HW("hindu-red-gold-palace-door", { name: "Royal Red & Gold Palace Door", ml: "രാജകീയ കവാടം", tagline: "Carved gold doorway over deep crimson", pal: P("#8E1B1B", "#6B1010", "#FFF3D6", "#F1DDB0", "#F0CF7A", "#F7DC8D"), blessing: GANESHA }, [290, 290, 880, 170]),
  HW("hindu-peacock-arch-couple", { name: "Peacock Palace Arch & Couple", ml: "മയിൽ കൊട്ടാരം", tagline: "Fairy-lit arches, peacock & palms", pal: P("#FFF8EA", "#F8E6C4", "#3E1A0A", "#6B4A2B", "#9A6410", "#8C1C2B"), blessing: GANESHA }, [260, 260, 330, 670], true),
  HW("hindu-mandap-hanging-flowers", { name: "Floral Mandap Bride & Groom", ml: "പുഷ്പ മണ്ഡപം", tagline: "Hanging blooms over a wedding mandap", pal: P("#FFFFFF", "#FFF8EE", "#3E1A10", "#7A4A2B", "#A06A12", "#C0392B"), blessing: GANESHA }, [140, 340, 280, 860]),
  HW("nikah-cream-arch-lanterns", { name: "Nikah Cream Arch & Lanterns", ml: "നിക്കാഹ് കമാനം", tagline: "Ivory arch, crescent & golden lanterns", pal: P("#FBF6EA", "#F2E8D2", "#2E3A2E", "#5F6B5A", "#8A6A1C", "#1F7A5A"), blessing: ["Bismillahir Rahmanir Raheem", "ബിസ്മില്ലാഹിർറഹ്മാനിർറഹീം"] }, [300, 280, 300, 660], false, "nikah"),
  HW("reception-stage-couple", { name: "Grand Reception Stage Couple", ml: "റിസപ്ഷൻ വേദി", tagline: "Warm bronze, floral stage & soft spotlights", pal: P("#7A6246", "#5E4A33", "#FFF4DC", "#EBDDBF", "#F0D58A", "#F7E5AD"), blessing: ["Join us for an evening of celebration", "ആഘോഷസന്ധ്യയിലേക്ക്"] }, [160, 160, 160, 550], false, "reception"),
  HW("wedding-sunset-arch-couple", { name: "Sunset Gold Arch & Couple", ml: "സൂര്യാസ്തമയ കമാനം", tagline: "Golden-hour balcony, ornate gold arch", pal: P("#FFF1E0", "#FCE4C8", "#4A1710", "#7A4A2B", "#9A5A10", "#8C1C2B"), blessing: GANESHA }, [470, 130, 330, 370], false, "wedding"),
  HW("wedding-palm-arch-dance", { name: "Palm Garden Arch & First Dance", ml: "പാം ഗാർഡൻ", tagline: "Botanical print, palms & a graceful dance", pal: P("#FBF4DE", "#F3EACB", "#2E3A22", "#5F6B4A", "#8A6A1C", "#B03060"), blessing: ["Two hearts, one beautiful journey", "രണ്ട് മനസ്സുകൾ, ഒരു സുന്ദര യാത്ര"] }, [220, 290, 340, 620], false, "wedding"),
];
/** Shop / business inauguration designs (SVG art from scripts/generate-template-art.py); each draws its own header and an opaque text panel. */
const IN = (id: string, name: string, ml: string, tagline: string, pal: Palette, blessing: [string, string]): RawTemplate => ({ id, name, ml, tagline, layout: "classic", motif: "art", shape: "rect", pal, blessing, art: { src: `/templates/${id}.svg`, left: 150, right: 150, top: 520, bottom: 140 } });
const OPENING: [string, string] = ["Cordially invites you to the grand opening", "ഉദ്ഘാടന ചടങ്ങിലേക്ക് സ്വാഗതം"];
const INAUG_RAW: RawTemplate[] = [
  IN("inaug-nilavilakku", "Royal Nilavilakku & Marigold Opening", "നിലവിളക്ക് ഉദ്ഘാടനം", "Brass lamp, marigold toran, ivory & gold", P("#FFF8E8", "#F7E6C0", "#4A1B0C", "#7A4A2B", "#9A6B00", "#8C1C2B"), ["Sri Ganapathaye Namah", "ശ്രീ ഗണപതയേ നമഃ"]),
  IN("inaug-ribbon-arch", "Grand Ribbon Cutting & Gold Arch", "റിബൺ മുറിക്കൽ", "Crimson velvet, gold arch & ribbon", P("#FFF6E6", "#FBE5C8", "#4A0A14", "#7A3A3A", "#9A6B00", "#8E1328"), OPENING),
  IN("inaug-showroom-gold", "Luxury Showroom Black & Gold", "ഷോറൂം ഉദ്ഘാടനം", "Emerald-black, gold deco fan & gem", P("#0F1D19", "#0A1512", "#F6E7BE", "#CDBF98", "#E3BE5C", "#F6E3A1"), ["A new landmark opens its doors", "പുതിയ ഒരു തുടക്കം"]),
  IN("inaug-cafe-launch", "Modern Cafe & Storefront Launch", "കഫേ ലോഞ്ച്", "Terracotta awning, leaves & coffee", P("#FFF6EA", "#F6DCC4", "#4A2415", "#7A4A36", "#B5532B", "#3E6B45"), ["Fresh beginnings, great taste", "പുതിയ രുചിയുടെ തുടക്കം"]),
  IN("inaug-corporate-navy", "Corporate Office & Clinic Opening", "ഓഫീസ് / ക്ലിനിക് ഉദ്ഘാടനം", "Royal navy skyline & champagne gold", P("#FBF8F0", "#F1EBDD", "#10224A", "#4D5A78", "#8A6C1E", "#10224A"), OPENING),
];
const INAUG_META: Meta = { category: "inauguration", defaultEvent: "inauguration", events: ["inauguration"], premium: true };

/** Festival greeting designs (SVG art from scripts/generate-template-art.py): a festive header and a solid text panel; the headline and wish default to each festival's own wording. */
const FEST = (id: string, name: string, ml: string, tagline: string, pal: Palette, title: { en: string; ml: string }, wish: { en: string; ml: string }): RawTemplate => ({
  id, name, ml, tagline, layout: "classic", motif: "art", shape: "circle", pal, blessing: ["", ""], festival: { title, wish }, art: { src: `/templates/${id}.svg`, left: 150, right: 150, top: 520, bottom: 140 },
});
const FESTIVAL_RAW: RawTemplate[] = [
  FEST("fest-onam", "Onam Pookkalam & Kasavu", "ഓണാശംസ", "Floral pookkalam, kasavu gold & lamp", P("#FFF9EA", "#F8E9C4", "#3F1A08", "#7A4A1E", "#A56A00", "#2E7D32"), { en: "Happy Onam", ml: "ഹൃദയം നിറഞ്ഞ ഓണാശംസകൾ" }, { en: "Dear {name}, may the festival of Onam bring happiness, prosperity and togetherness to you and your family.", ml: "പ്രിയ {name}, ഓണം നിങ്ങൾക്കും കുടുംബത്തിനും സന്തോഷവും ഐശ്വര്യവും ഒരുമയും കൊണ്ടുവരട്ടെ." }),
  FEST("fest-vishu", "Vishu Kani Konna & Lamp", "വിഷു ആശംസ", "Golden konna blooms & the vishukkani", P("#FFFBEA", "#FBEFB8", "#4A2A00", "#7A5A12", "#B07A00", "#2E6B2E"), { en: "Happy Vishu", ml: "ഐശ്വര്യപൂർണ്ണമായ വിഷു ആശംസകൾ" }, { en: "Dear {name}, may the Vishukkani bring you a year full of prosperity, good health and joy.", ml: "പ്രിയ {name}, വിഷുക്കണി നിങ്ങൾക്ക് ഐശ്വര്യവും ആരോഗ്യവും സന്തോഷവും നിറഞ്ഞ ഒരു വർഷം സമ്മാനിക്കട്ടെ." }),
  FEST("fest-christmas", "Christmas Star & Pine", "ക്രിസ്മസ് ആശംസ", "Red & pine with a golden star", P("#FFF8F0", "#F9E6D8", "#4A0A14", "#6E3A3A", "#A07400", "#1F6B3A"), { en: "Merry Christmas & Season's Greetings", ml: "ക്രിസ്മസ് ആശംസകൾ" }, { en: "Dear {name}, wishing you the joy, peace and love of Christmas, and a blessed new year.", ml: "പ്രിയ {name}, ക്രിസ്മസിന്റെ സന്തോഷവും സമാധാനവും സ്നേഹവും നിങ്ങൾക്ക് നേരുന്നു." }),
  FEST("fest-newyear", "New Year Fireworks", "പുതുവത്സരാശംസ", "Midnight navy & gold fireworks", P("#0E1B3F", "#08112B", "#F7E9BE", "#C9CFE6", "#E3BE5C", "#F6E3A1"), { en: "Happy New Year", ml: "പുതുവത്സരാശംസകൾ" }, { en: "Dear {name}, wishing you a new year full of health, happiness and new beginnings.", ml: "പ്രിയ {name}, ആരോഗ്യവും സന്തോഷവും പുതിയ തുടക്കങ്ങളും നിറഞ്ഞ ഒരു പുതുവർഷം നേരുന്നു." }),
  FEST("fest-eid", "Eid Mubarak Crescent & Lanterns", "ഈദ് മുബാറക്", "Emerald, gold crescent & fanoos", P("#073B2E", "#052F26", "#FFF4D6", "#CFE3D6", "#E8C766", "#F0DA94"), { en: "Eid Mubarak", ml: "ഈദ് മുബാറക്" }, { en: "Dear {name}, may Allah accept your prayers and fill your home with joy, peace and blessings this Eid.", ml: "പ്രിയ {name}, ഈ പെരുന്നാൾ നിങ്ങളുടെ വീട്ടിൽ സന്തോഷവും സമാധാനവും അനുഗ്രഹവും നിറയ്ക്കട്ടെ." }),
  FEST("fest-diwali", "Diwali Diyas & Rangoli", "ദീപാവലി ആശംസ", "Royal maroon, diya lights & rangoli", P("#FFF6E4", "#FBE3BD", "#4A0F1A", "#7A4030", "#A86400", "#9A1B2E"), { en: "Happy Diwali", ml: "ദീപാവലി ആശംസകൾ" }, { en: "Dear {name}, may the festival of lights fill your life with happiness, prosperity and peace.", ml: "പ്രിയ {name}, ദീപങ്ങളുടെ ഉത്സവം നിങ്ങളുടെ ജീവിതത്തിൽ സന്തോഷവും ഐശ്വര്യവും സമാധാനവും നിറയ്ക്കട്ടെ." }),
];
const FESTIVAL_META: Meta = { category: "festival", defaultEvent: "festival", events: ["festival"], premium: true };

const IMG_META: Record<string, Meta> = {
  "haldi-yellow-drapes-bride": { category: "events", defaultEvent: "haldi", events: ["haldi"], premium: true },
  "nikah-cream-arch-lanterns": { category: "wedding", faith: "muslim", defaultEvent: "nikah", events: ["nikah", "engagement"], premium: true },
  "reception-stage-couple": { category: "events", defaultEvent: "reception", events: ["reception"], premium: true },
  "wedding-sunset-arch-couple": { category: "wedding", faith: "modern", defaultEvent: "wedding", events: ["wedding", "engagement", "reception"], premium: true },
  "wedding-palm-arch-dance": { category: "wedding", faith: "modern", defaultEvent: "wedding", events: ["wedding", "engagement", "reception"], premium: true },
};

/** Illustrated, image-based balloon celebration designs. Artwork: scripts/generate-template-art.py -> public/templates. */
const ART = (id: string) => ({ src: `/templates/${id}.svg`, left: 150, right: 150, top: 520, bottom: 140 });
const ART_TEMPLATES: RawTemplate[] = [
  { id: "balloon-luxury", name: "Luxury Gold & Pastel Balloon Arch", ml: "ഗോൾഡ് ബലൂൺ", tagline: "Gold, champagne & blush balloons with confetti", layout: "classic", motif: "art", shape: "circle", pal: P("#FFFAF2", "#F7E6D4", "#4A2E1F", "#7C6459", "#9A6B12", "#C9707F"), blessing: ["Join us to celebrate", "ആഘോഷത്തിൽ പങ്കുചേരൂ"], art: ART("balloon-luxury") },
  { id: "balloon-kids", name: "Kids Balloon & Cloud Carnival", ml: "ബലൂൺ കാർണിവൽ", tagline: "Rainbow, clouds, stars & pastel balloons", layout: "classic", motif: "art", shape: "circle", pal: P("#FFFFFF", "#EEF6FF", "#3A3358", "#6F6896", "#D6456B", "#7757D1"), blessing: ["Let's party!", "നമുക്ക് ആഘോഷിക്കാം!"], art: ART("balloon-kids") },
];
const HINDU_META: Meta = { category: "wedding", faith: "hindu", defaultEvent: "wedding", events: ["wedding", "engagement", "reception"], premium: true };
const ART_META: Record<string, Meta> = {
  "balloon-luxury": { category: "birthday", defaultEvent: "birthday", events: ["birthday", "anniversary"], premium: true },
  "balloon-kids": { category: "birthday", defaultEvent: "birthday", events: ["birthday"], premium: true },
};
/** "Your own card": the client's uploaded image is the whole background. It has no gallery entry of its own (the picker shows an upload card instead). */
export const CUSTOM_TEMPLATE_ID = "custom-upload";
const CUSTOM_RAW: RawTemplate[] = [{ id: CUSTOM_TEMPLATE_ID, name: "Your own card", ml: "സ്വന്തം കാർഡ്", tagline: "Upload your design; each guest's name is added", layout: "classic", motif: "minimal", shape: "rect", pal: P("#FFFFFF", "#F3F3F3", "#1F1F24", "#55555F", "#B8860B", "#8C1C2B"), blessing: ["", ""] }];
/** "Greeting video": the client's uploaded clip is the background; only the guest's name is drawn (as a transparent overlay) and burned onto the video. Pseudo template like "Your own card". */
export const VIDEO_TEMPLATE_ID = "video-greeting";
const VIDEO_RAW: RawTemplate[] = [{ id: VIDEO_TEMPLATE_ID, name: "Greeting video", ml: "ആശംസാ വീഡിയോ", tagline: "Upload a clip; each guest's name is added", layout: "classic", motif: "minimal", shape: "rect", pal: P("#FFFFFF", "#F3F3F3", "#FFFFFF", "#EDEDED", "#E3BE5C", "#8C1C2B"), blessing: ["", ""] }];
/** Templates that aren't gallery designs (the picker has upload tiles for them) and must never be auto-selected. */
export const isPseudoTemplate = (id: string) => id === CUSTOM_TEMPLATE_ID || id === VIDEO_TEMPLATE_ID;
const CUSTOM_META: Meta = { category: "events", defaultEvent: "wedding", events: [] }; // events: [] so no event type ever auto-selects it

export const TEMPLATES: WeddingTemplate[] = [...NEW_IMAGE_RAW, ...HINDU_TEMPLATES, ...INAUG_RAW, ...FESTIVAL_RAW, ...RAW_TEMPLATES, ...NEW_TEMPLATES, ...ART_TEMPLATES, ...CUSTOM_RAW, ...VIDEO_RAW].map((t) => ({ ...t, ...((isPseudoTemplate(t.id) ? CUSTOM_META : undefined) ?? META[t.id] ?? ART_META[t.id] ?? IMG_META[t.id] ?? (t.id.startsWith("inaug-") ? INAUG_META : t.id.startsWith("fest-") ? FESTIVAL_META : undefined) ?? (t.id.startsWith("hindu-") ? HINDU_META : undefined)) }));

/** True when a design is written for this event (wedding-type designs fit every wedding-type event). */
export const templateSuits = (t: Pick<WeddingTemplate, "category" | "events">, ev: EventType) => (t.events ? t.events.includes(ev) : eventConfig(ev).group === t.category);

export const TEMPLATE_FILTERS = [
  { id: "all", label: "All" }, { id: "wedding", label: "Wedding (Hindu / Christian / Muslim)" }, { id: "birthday", label: "Birthday" }, { id: "housewarming", label: "Housewarming (ഗൃഹപ്രവേശം)" },
  { id: "baby", label: "Baby & Kids (ചോറൂണ് / നൂലുകെട്ട് / Baptism)" }, { id: "events", label: "Events (Engagement / Anniversary)" }, { id: "inauguration", label: "Inauguration (ഉദ്ഘാടനം)" }, { id: "festival", label: "Festivals & Greetings" },
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
  EV({ id: "inauguration", group: "inauguration", en: "Inauguration", ml: "ഉദ്ഘാടനം", title: { en: "Grand Inauguration", ml: "ഉദ്ഘാടന ചടങ്ങ്" }, couple: false, labels: { name1: "Shop / Business name", name2: "Business tagline / category", host1: "Inaugurated by / Chief guest (optional)", host2: "", time: "Inauguration time", venue: "Venue / address" }, useName2: true, useHost2: false, hostPrefix: { en: "", ml: "" }, invite: { en: "the", ml: "ഞങ്ങളുടെ" }, message: { en: "We cordially invite you to the grand opening of our new venture. Your presence and blessings will make the day special.", ml: "ഞങ്ങളുടെ പുതിയ സംരംഭത്തിന്റെ ഉദ്ഘാടന ചടങ്ങിലേക്ക് സ്നേഹപൂർവം ക്ഷണിക്കുന്നു. നിങ്ങളുടെ സാന്നിധ്യവും അനുഗ്രഹവും ഞങ്ങൾക്ക് ഏറെ പ്രിയപ്പെട്ടതാണ്." }, sample: { groom: "Lumina Gold & Diamonds", bride: "Grand Opening Ceremony", groomParents: "Inaugurated by Sri. Ramesh Menon", date: "2027-06-05", time: "10:00 AM", venue: "MG Road, Thrissur", message: "" } }),
  EV({ id: "festival", group: "festival", en: "Festival greeting", ml: "ഉത്സവാശംസ", title: { en: "Festival Greeting", ml: "ഉത്സവാശംസ" }, couple: false, labels: { name1: "From / Sender name", name2: "", host1: "", host2: "", time: "", venue: "" }, useName2: false, useHost2: false, hostPrefix: { en: "", ml: "" }, invite: { en: "the", ml: "" }, message: { en: "Wishing you and your family joy, peace and prosperity.", ml: "നിങ്ങൾക്കും കുടുംബത്തിനും സന്തോഷവും സമാധാനവും ഐശ്വര്യവും നേരുന്നു." }, sample: { groom: "Arun & Family", bride: "", groomParents: "", date: "", time: "", venue: "", message: "" } }),
  EV({ id: "anniversary", group: "events", en: "Anniversary", ml: "വാർഷികം", title: { en: "Wedding Anniversary", ml: "വിവാഹ വാർഷികം" }, couple: true, labels: { name1: "Husband's name", name2: "Wife's name", host1: "Milestone (e.g. 25th Anniversary)", host2: "", time: "Time", venue: "Venue" }, useName2: true, useHost2: false, hostPrefix: { en: "", ml: "" }, invite: { en: "their", ml: "ഞങ്ങളുടെ" }, message: { en: "Celebrate years of love and togetherness with us.", ml: "സ്നേഹത്തിന്റെയും ഒരുമയുടെയും വർഷങ്ങൾ ഞങ്ങളോടൊപ്പം ആഘോഷിക്കാൻ ക്ഷണിക്കുന്നു." }, sample: { groom: "Suresh", bride: "Latha", groomParents: "25th Anniversary", date: "2027-01-23", time: "6:30 PM", venue: "The Residency Towers, Kochi", message: "" } }),
];
export const EVENT_TYPES: { id: EventType; en: string; ml: string }[] = EVENTS.map((e) => ({ id: e.id, en: e.en, ml: e.ml }));
export const eventConfig = (id: EventType): EventConfig => EVENTS.find((e) => e.id === id) ?? EVENTS[0];
export const EVENT_TITLE = Object.fromEntries(EVENTS.map((e) => [e.id, e.title])) as Record<EventType, { en: string; ml: string }>;

export const EMPTY_DETAILS: WeddingDetails = { eventType: "wedding", lang: "both", bride: "", groom: "", brideParents: "", groomParents: "", date: "", time: "", venue: "", mapsUrl: "", message: "", blessing: "", verse: "", accent: "", photos: [], guestGreetingFormat: "dear-name-place", guestCustomPrefix: "", guestBadgeX: null, guestBadgeY: null, guestGreetingTemplate: "", blockPos: {}, guestGreetingBoxed: true, fontStyle: "default", blockScale: {}, contentScale: 1, textStyle: {}, layers: [], customCard: null, showGuestName: true, printCustomDetails: false, customTitle: "", festivalPhoto: false, videoQuote: "", videoFestival: "custom", videoQuoteLang: "en", videoQuoteX: null, videoQuoteY: null, videoQuoteScale: 1, videoQuoteColor: "#FFFFFF", videoQuoteFont: "sans", videoQuoteBackdrop: true, videoHeaderAnim: "none", videoFooterAnim: "none", blockFont: {} };

/** Placeholder text for the event type (used for gallery thumbnails and before anything is typed). */
export const sampleFor = (id: EventType): WeddingDetails => ({ ...EMPTY_DETAILS, eventType: id, ...eventConfig(id).sample });
export const SAMPLE_DETAILS: WeddingDetails = sampleFor("wedding");

export const GREETING_FORMATS: { id: GreetingFormat; label: string }[] = [
  { id: "dear-name-place", label: "Dear {Name}, {Place}" },
  { id: "dear-family", label: "Dear {Name} & Family" },
  { id: "dear-family-place", label: "Dear {Name} & Family, {Place}" },
  { id: "to-family", label: "To: {Name} & Family" },
  { id: "ml-family", label: "സ്നേഹപൂർവ്വം {Name} & കുടുംബാംഗങ്ങൾക്കും" },
  { id: "custom", label: "Custom prefix" },
];
/** Shown on the live preview until a real guest is added. */
/** Replaces {name} / {{name}} (any case, optional inner spaces) with the recipient's name ("Guest" when there is none). */
export const fillName = (text: string, name?: string | null) => text.replace(/\{\{\s*name\s*\}\}|\{\s*name\s*\}/gi, () => (name ?? "").trim() || "Guest");
export const SAMPLE_GUEST = { name: "Arun", place: "Kochi" };

const ML_SERIF = '"Noto Serif Malayalam", "Noto Serif", Georgia, serif';
const ML_SANS = '"Noto Sans Malayalam", system-ui, sans-serif';
const ML_SCRIPT = '"Chilanka", "Noto Serif Malayalam", cursive';
/**
 * The 13 curated fonts (Google Fonts, linked in app/layout.tsx so the canvas that renders the preview AND every exported PNG can use them).
 * `stack` always ends with a Malayalam-capable face, so mixed English + Malayalam lines render cleanly. `weight` pins fonts that only ship
 * one weight; `scale` evens out fonts that run small (scripts) or wide (Cinzel, Montserrat, Poppins) next to the template's own type.
 */
export const FONT_CHOICES: { id: FontId; label: string; note: string; family: string; stack: string; weight?: number; scale: number; script?: boolean; weights: number[] }[] = [
  { id: "playfair", label: "Playfair Display", note: "Classic serif", family: "Playfair Display", stack: `"Playfair Display", ${ML_SERIF}`, scale: 1, weights: [500, 700, 800] },
  { id: "cormorant", label: "Cormorant Garamond", note: "Luxury editorial serif", family: "Cormorant Garamond", stack: `"Cormorant Garamond", ${ML_SERIF}`, scale: 1.08, weights: [500, 600, 700] },
  { id: "great-vibes", label: "Great Vibes", note: "Calligraphy script", family: "Great Vibes", stack: `"Great Vibes", ${ML_SCRIPT}`, weight: 400, scale: 1.2, script: true, weights: [400] },
  { id: "alex-brush", label: "Alex Brush", note: "Flowing script", family: "Alex Brush", stack: `"Alex Brush", ${ML_SCRIPT}`, weight: 400, scale: 1.25, script: true, weights: [400] },
  { id: "cinzel", label: "Cinzel", note: "Royal engraved caps", family: "Cinzel", stack: `"Cinzel", ${ML_SERIF}`, scale: 0.92, weights: [500, 700, 800] },
  { id: "lora", label: "Lora", note: "Warm serif", family: "Lora", stack: `"Lora", ${ML_SERIF}`, scale: 1, weights: [500, 600, 700] },
  { id: "montserrat", label: "Montserrat", note: "Modern clean sans", family: "Montserrat", stack: `"Montserrat", ${ML_SANS}`, scale: 0.94, weights: [500, 600, 700, 800] },
  { id: "poppins", label: "Poppins", note: "Geometric sans", family: "Poppins", stack: `"Poppins", ${ML_SANS}`, scale: 0.94, weights: [500, 600, 700, 800] },
  { id: "dancing-script", label: "Dancing Script", note: "Casual calligraphy", family: "Dancing Script", stack: `"Dancing Script", ${ML_SCRIPT}`, scale: 1.08, script: true, weights: [500, 600, 700] },
  { id: "libre-baskerville", label: "Libre Baskerville", note: "Traditional print serif", family: "Libre Baskerville", stack: `"Libre Baskerville", ${ML_SERIF}`, scale: 0.94, weights: [400, 700] },
  { id: "noto-serif-ml", label: "Noto Serif Malayalam", note: "Traditional Malayalam serif", family: "Noto Serif Malayalam", stack: ML_SERIF.replace('"Noto Serif", ', '"Noto Serif", '), scale: 1, weights: [600, 700, 800] },
  { id: "manjari", label: "Manjari", note: "Graceful rounded Malayalam", family: "Manjari", stack: `"Manjari", ${ML_SERIF}`, scale: 1.05, weights: [400, 700] },
  { id: "gayathri", label: "Gayathri", note: "Modern thin Malayalam", family: "Gayathri", stack: `"Gayathri", ${ML_SERIF}`, scale: 1.05, weights: [400, 700] },
];
/** What the font pickers list: the template's own type first, then the 13 curated fonts. */
export const FONT_STYLES: { id: FontStyle; label: string; hint: string }[] = [
  { id: "default", label: "Template default", hint: "The typography this design was made for" },
  ...FONT_CHOICES.map((f) => ({ id: f.id as FontStyle, label: f.label, hint: f.note })),
];
export const fontLabel = (id: FontStyle | undefined) => FONT_STYLES.find((f) => f.id === id)?.label ?? (id === "royal" ? "Royal Serif" : id === "script" ? "Calligraphy Script" : id === "sans" ? "Modern Sans" : id === "ml-classic" ? "Malayalam Classic" : "Template default");
/** Canvas / CSS font stacks for every non-default style (the four legacy presets plus each curated font). */
export const FONT_STACKS: Record<Exclude<FontStyle, "default">, string> = {
  royal: `"Playfair Display", ${ML_SERIF}`,
  script: '"Great Vibes", "Chilanka", "Noto Serif Malayalam", cursive',
  sans: 'Inter, "Noto Sans Malayalam", system-ui, sans-serif',
  "ml-classic": `"Cormorant Garamond", ${ML_SERIF}`,
  ...(Object.fromEntries(FONT_CHOICES.map((f) => [f.id, f.stack])) as Record<FontId, string>),
};

/** Wording of each preset ({Place} is dropped, with its separator, when a guest has no place). */
export const GREETING_TEMPLATES: Record<Exclude<GreetingFormat, "custom">, string> = {
  "dear-name-place": "Dear {Name}, {Place}",
  "dear-family": "Dear {Name} & Family",
  "dear-family-place": "Dear {Name} & Family, {Place}",
  "to-family": "To: {Name} & Family",
  "ml-family": "സ്നേഹപൂർവ്വം {Name} & കുടുംബാംഗങ്ങൾക്കും",
};

/** The greeting template currently in force (what the inline editor shows). */
export function greetingTemplate(d: Pick<WeddingDetails, "guestGreetingFormat" | "guestGreetingTemplate" | "guestCustomPrefix">): string {
  if (d.guestGreetingFormat !== "custom") return GREETING_TEMPLATES[d.guestGreetingFormat];
  return d.guestGreetingTemplate.trim() ? d.guestGreetingTemplate : `${d.guestCustomPrefix.trim() || "Dear"} {Name}, {Place}`;
}

/** The personalised "To / Dear ..." line for one guest. A name already ending in "& Family" is not doubled. */
export function greetingText(d: Pick<WeddingDetails, "guestGreetingFormat" | "guestGreetingTemplate" | "guestCustomPrefix">, g: { name: string; place: string }): string {
  const tpl = greetingTemplate(d);
  const family = /&\s*(family|കുടുംബ)/i.test(tpl);
  const name = (family ? g.name.trim().replace(/\s*(&|and)\s*family$/i, "") : g.name.trim()).trim() || "Guest";
  const place = g.place.trim();
  const out = tpl.replace(/\{name\}/gi, name).replace(place ? /\{place\}/gi : /\s*[,:\-–]?\s*\{place\}/gi, place);
  return out.replace(/\s{2,}/g, " ").trim();
}

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

/** Minimal RFC-4180 CSV reader (quoted cells, "" escapes, CRLF, BOM); the delimiter (comma, semicolon or tab) is detected from the first line. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = [",", ";", "\t"].map((d) => [d, first.split(d).length] as const).sort((x, y) => y[1] - x[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === delim) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && src[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.some((x) => x.trim())) rows.push(row); row = []; }
    else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

export const SAMPLE_GUESTS_CSV = "Name,Place,Phone\nSuresh Kumar,Thrissur,+91 98470 12345\nMary Joseph,Kottayam,9946012345\nAbdul Rahman,Kozhikode,+91 94470 55555\n";

export interface GuestImportResult { guests: Guest[]; added: number; duplicates: number; invalid: number; blank: number; truncated: boolean }
const IMPORT_CAP = 5000;

/**
 * Turns a CSV (header Name / Place / Phone in any order, or headerless rows) into guests: phones are normalised to +91 form,
 * rows with an unusable number are skipped, and a phone already in the list (or earlier in the file) is dropped as a duplicate.
 */
export function guestsFromCsv(text: string, existing: Guest[]): GuestImportResult {
  const rows = parseCsv(text);
  const isPhone = (c: string) => /^\+?[\d\s()-]{8,}$/.test(c);
  const head = (rows[0] ?? []).map((c) => c.toLowerCase());
  const col = (re: RegExp) => head.findIndex((c) => re.test(c));
  const iName = col(/name|guest/), iPhone = col(/phone|mobile|whats|contact|number/), iPlace = col(/place|address|city|town|location/);
  const hasHeader = iPhone >= 0 && iName >= 0 && !rows[0].some(isPhone);
  const seen = new Set(existing.map((g) => normalizePhone(g.phone)).filter(Boolean));
  const out: Guest[] = [];
  let duplicates = 0, invalid = 0, blank = 0, truncated = false;
  for (const cells of hasHeader ? rows.slice(1) : rows) {
    if (out.length >= IMPORT_CAP) { truncated = true; break; }
    let name: string, place: string, phone: string;
    if (hasHeader) { name = cells[iName] ?? ""; phone = cells[iPhone] ?? ""; place = iPlace >= 0 ? cells[iPlace] ?? "" : ""; }
    else { const pi = cells.findIndex(isPhone); phone = pi >= 0 ? cells[pi] : ""; const rest = cells.filter((_, i) => i !== pi).filter(Boolean); name = rest[0] ?? ""; place = rest[1] ?? ""; }
    if (!name.trim() && !phone.trim()) { blank++; continue; }
    if (!name.trim() || !validPhone(phone)) { invalid++; continue; } // also catches Excel's 9.8E+11 exports
    const n = normalizePhone(phone);
    if (seen.has(n)) { duplicates++; continue; }
    seen.add(n);
    out.push({ id: newId(), name: name.trim().slice(0, 120), place: place.trim().slice(0, 160), phone: `+${n}`, status: "pending" });
  }
  return { guests: out, added: out.length, duplicates, invalid, blank, truncated };
}

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
export function whatsappMessage(d: WeddingDetails, g: { name: string; place: string }, festival?: { title: { en: string; ml: string }; wish: { en: string; ml: string } }): string {
  const cfg = eventConfig(d.eventType);
  if (cfg.group === "festival") { // a greeting, not an invitation: headline + wish + who it's from
    const who = g.name || "Friend", from = d.groom.trim(), typedTitle = fillName(d.customTitle.trim(), g.name), typedWish = fillName(d.message.trim(), g.name);
    const part = (l: "en" | "ml") => `${typedTitle || festival?.title[l] || cfg.title[l]}${from ? (l === "en" ? ` from ${from}` : ` - ${from}`) : ""}!${typedWish || fillName(festival?.wish[l] ?? "", g.name) || cfg.message[l] ? `\n\n${typedWish || fillName(festival?.wish[l] ?? "", g.name) || cfg.message[l]}` : ""}`;
    const en = `Dear ${who},\n\n${part("en")}`, ml = `പ്രിയപ്പെട്ട ${who},\n\n${part("ml")}`;
    return d.lang === "ml" ? ml : d.lang === "both" ? `${ml}\n\n———\n\n${en}` : en;
  }
  const custom = !!d.customCard && !!d.customTitle.trim();
  const title = custom ? { en: d.customTitle.trim(), ml: d.customTitle.trim() } : cfg.title;
  const names = (cfg.couple && !custom ? [d.groom, d.bride] : [d.groom]).filter(Boolean).join(" & ");
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
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { try { localStorage.setItem(KEY, JSON.stringify({ ...s, details: { ...s.details, photos: [], layers: (s.details.layers ?? []).filter((l) => l.type !== "image") } })); } catch { /* storage full */ } }
}
export const localInviteKey = (id: string) => `intelliad.wedding.invite.${id}`;

/** What a guest's invite page needs (no guest list). */
export interface InvitePayload { template_id: string; data: { details: WeddingDetails; videoUrl: string | null; effect?: CardEffect } }
