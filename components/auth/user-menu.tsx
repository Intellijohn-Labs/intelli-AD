"use client";

import { AnimatePresence, motion } from "framer-motion";
import { FileText, LogOut, Newspaper } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/context/language-context";
import { useAuth } from "@/lib/auth";

/** Profile avatar + dropdown (name, bookings, drafts, Logout). */
export function AuthControl({ className }: { className?: string }) {
  const { user, ready, signOut } = useAuth();
  const { t } = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  // Signed-out visitors never see the site chrome (they are bounced to /login), so only the profile control is needed.
  if (!ready || !user) return <span className={className} style={{ width: 36, height: 36 }} aria-hidden="true" />;

  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const item = "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-emerald-50";
  return (
    <div ref={wrap} className={`relative ${className ?? ""}`}>
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label={user.name} onClick={() => setOpen((o) => !o)}
        className="flex h-9 items-center gap-2 rounded-full border border-emerald-200 bg-white/80 py-0.5 pr-3 pl-0.5 text-sm font-semibold text-zinc-800 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-700 to-emerald-500 text-xs font-bold text-white">{initials}</span>
        <span className="hidden max-w-[9rem] truncate lg:inline">{user.name}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
            <div className="border-b border-zinc-100 px-4 py-3">
              <p className="truncate text-sm font-bold text-zinc-900">{user.name}</p>
              <p className="truncate text-xs text-zinc-500">{user.identifier}</p>
            </div>
            <Link role="menuitem" href="/account/bookings" onClick={() => setOpen(false)} className={item}><Newspaper className="h-4 w-4" /> {t("My Bookings")}</Link>
            <Link role="menuitem" href="/book" onClick={() => setOpen(false)} className={item}><FileText className="h-4 w-4" /> {t("Ad Drafts")}</Link>
            <button role="menuitem" type="button" className={`${item} border-t border-zinc-100 text-red-600 hover:bg-red-50`}
              onClick={() => { signOut(); setOpen(false); toast("Signed out"); }}>
              <LogOut className="h-4 w-4" /> {t("Logout")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
