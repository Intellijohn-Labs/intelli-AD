import { Headphones, Mail, Phone, ShieldCheck, Stamp, Lock } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { T } from "@/context/language-context";

export function Footer() {
  return (
    <footer className="mt-12 sm:mt-16 border-t border-white/10 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-300">
      <ul className="mx-auto grid max-w-[1500px] grid-cols-2 gap-4 border-b border-white/10 px-4 py-8 sm:px-6 md:grid-cols-4 lg:px-8" aria-label="Trust badges">
        {[
          { icon: ShieldCheck, label: "Authorized Publication Partner" },
          { icon: Stamp, label: "Verified RO" },
          { icon: Headphones, label: "24/7 Support" },
          { icon: Lock, label: "Secure checkout (demo)" },
        ].map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-2 text-sm font-semibold text-white">
            <Icon className="h-5 w-5 text-sky-300" aria-hidden="true" /> <T k={label} />
          </li>
        ))}
      </ul>
      <div className="mx-auto grid max-w-[1500px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <BrandLogo onDark />
          <p className="mt-2 max-w-xs text-sm text-zinc-300">
            <T k="Book classified and display advertising in India's leading dailies, with transparent rates and verified Release Orders." />
          </p>
        </div>
        <nav aria-label="Footer" className="text-sm">
          <p className="mb-2 font-bold text-white"><T k="Explore" /></p>
          <ul className="space-y-1.5">
            <li><Link className="hover:underline" href="/book"><T k="Book an ad" /></Link></li>
            <li><Link className="hover:underline" href="/categories"><T k="Category templates" /></Link></li>
            <li><Link className="hover:underline" href="/#publications"><T k="Publications" /></Link></li>
          </ul>
        </nav>
        <div className="space-y-2 text-sm">
          <p className="font-bold text-white"><T k="24/7 support" /></p>
          <p className="flex items-center gap-2"><Phone className="h-4 w-4" aria-hidden="true" /> 1800-000-0000 (demo)</p>
          <p className="flex items-center gap-2"><Mail className="h-4 w-4" aria-hidden="true" /> help@intelliad.example</p>
        </div>
      </div>
      <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-zinc-400">
        <span className="block pb-1 font-semibold text-slate-300">© 2026 IntelliAd. All rights reserved.</span>
        <T k="Demo application. Rates are illustrative and payments are simulated. Publication names belong to their respective owners." />
      </p>
    </footer>
  );
}
