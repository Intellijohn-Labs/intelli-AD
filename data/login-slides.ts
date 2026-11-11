/** A slide of the login-page promo carousel. Slides come only from active rows of `promotional_banners` (no built-in defaults). */
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
  /** Optional: clicking the slide opens this URL. */
  linkUrl?: string;
  /** Admin-uploaded poster: the image is shown as-is, not as a tinted backdrop. */
  custom?: boolean;
}
