"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/context/language-context";

const PHONE_NUMBER = "919645128949"; // Replace with your support phone number
const DEFAULT_MESSAGE = encodeURIComponent("Hello IntelliAd, I need assistance with booking an advertisement.");
const WHATSAPP_URL = `https://wa.me/${PHONE_NUMBER}?text=${DEFAULT_MESSAGE}`;

/** Floating WhatsApp support shortcut, fixed bottom-right on every page. */
export function WhatsAppWidget() {
  const { lang } = useI18n();
  const path = usePathname();
  const lift = path.startsWith("/book"); // clear the mobile proof bar
  const label = lang === "ml" ? "പരസ്യങ്ങൾ ബുക്ക് ചെയ്യാൻ സഹായം വേണോ?" : "Need help booking an ad? Chat with us!";

  if (path === "/admin" || path.startsWith("/admin/")) return null; // customer support widget: not in the admin portal
  return (
    <div className={`group fixed right-6 z-50 flex items-center gap-3 ${lift ? "bottom-24 lg:bottom-6" : "bottom-6"}`}>
      <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-lg transition-all group-hover:scale-105 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 sm:flex">
        <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" aria-hidden="true" />
        {label}
      </div>
      <a
        href={WHATSAPP_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={lang === "ml" ? "വാട്ട്സ്ആപ്പിൽ ചാറ്റ് ചെയ്യുക" : "Chat with us on WhatsApp"}
        className="relative isolate flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_8px_25px_rgba(37,211,102,0.4)] transition-all duration-300 before:absolute before:inset-0 before:-z-10 before:animate-ping before:rounded-full before:border-2 before:border-[#25D366] before:opacity-30 hover:scale-110 hover:bg-[#20bd5a] hover:shadow-[0_12px_30px_rgba(37,211,102,0.6)] active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35zM12.05 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.44 9.44 0 0 1-1.45-5.04c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.7c0 5.22-4.25 9.46-9.46 9.46zM20.52 3.45A11.38 11.38 0 0 0 12.05.1C5.76.1.64 5.22.64 11.5c0 2.01.53 3.97 1.52 5.7L.55 23.4l6.3-1.65a11.4 11.4 0 0 0 5.2 1.32h.01c6.29 0 11.41-5.12 11.41-11.4 0-3.05-1.19-5.92-3.35-8.07z" />
        </svg>
      </a>
    </div>
  );
}
