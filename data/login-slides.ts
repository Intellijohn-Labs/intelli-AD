/**
 * Promotional poster slides on the login page. Edit this list to change the banner (later it can be fetched from
 * Supabase with the same shape). Without an `imageUrl` a styled graphic (gradient + badge + headline) is drawn.
 */
export interface PromoSlide {
  id: string;
  title: string;
  description: string;
  /** Small pill above the headline. */
  badge?: string;
  /** Poster photo (path under /public or a full URL). Optional: the gradient graphic is the fallback. */
  imageUrl?: string;
  /** Tailwind gradient classes for the fallback graphic. */
  gradient: string;
}

export const PROMO_SLIDES: PromoSlide[] = [
  {
    id: "book-today",
    badge: "Kerala's newspaper ad network",
    title: "Book Newspaper Ads Today",
    description: "Compose, preview and book classified and display ads across Kerala's leading dailies, with an instant Release Order.",
    imageUrl: "/images/newspaper-rack.webp",
    gradient: "from-blue-700 via-indigo-700 to-slate-900",
  },
  {
    id: "volume-discount",
    badge: "Volume savings",
    title: "Special 15% Volume Discount",
    description: "Run the same ad on 3+ days to save 5%, 5+ days 10%, and 7+ days 15% automatically.",
    gradient: "from-emerald-600 via-teal-700 to-slate-900",
  },
  {
    id: "partners",
    badge: "For Akshaya & agencies",
    title: "Become a Booking Partner",
    description: "Akshaya Centres and registered agencies can book for walk-in customers and track every Release Order.",
    gradient: "from-amber-600 via-rose-700 to-slate-900",
  },
  {
    id: "all-papers",
    badge: "9 publications",
    title: "One Place for Every Daily",
    description: "Malayala Manorama, Mathrubhumi, Deshabhimani, The Hindu and more, compared and booked together.",
    gradient: "from-violet-700 via-purple-800 to-slate-900",
  },
];
