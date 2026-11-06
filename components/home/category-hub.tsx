"use client";

import { FileCheck2 } from "lucide-react";
import { useState } from "react";
import { categories, templates } from "@/data/categories";
import { Badge } from "@/components/ui/badge";
import { CategoryIcon } from "@/components/ui/category-icon";
import { useI18n } from "@/context/language-context";
import type { CategoryId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { TemplateCard } from "./template-card";

/** Section headlines that differ from the category name. */
const HEADLINES: Partial<Record<CategoryId, { en: string; ml: string }>> = {
  obituary: { en: "🕯️ Obituary / Marana Vartha", ml: "🕯️ മരണവാർത്ത" },
  remembrance: { en: "🕊️ Remembrance / Death Anniversary", ml: "🕊️ ചരമവാർഷികം / സ്മരണാഞ്ജലി" },
  tender: { en: "📜 Tender Notice / ദർഘാസ് പരസ്യം", ml: "📜 ടെൻഡർ / ദർഘാസ് പരസ്യം" },
};

export function CategoryHub() {
  const { t, tl } = useI18n();
  const [active, setActive] = useState<CategoryId | "all">("all");
  const shown = categories.filter((c) => active === "all" || c.id === active);

  return (
    <div>
      <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
        {[{ id: "all" as const, name: t("All categories"), nameMl: "" }, ...categories].map((c) => (
          <button
            key={c.id}
            type="button"
            aria-pressed={active === c.id}
            onClick={() => setActive(c.id)}
            className={cn("rounded border px-3.5 py-1.5 text-sm font-semibold transition-colors", active === c.id ? "border-navy-600 bg-navy-600 text-white" : "border-zinc-300 bg-white text-zinc-700 hover:border-navy-400")}
          >
            {c.nameMl ? tl(c.name, c.nameMl) : c.name}
          </button>
        ))}
      </div>

      <div className="mt-10 space-y-12">
        {shown.map((cat) => {
          const tpls = templates.filter((x) => x.categoryId === cat.id);
          return (
            <section key={cat.id} id={cat.id} aria-labelledby={`${cat.id}-h`} className="scroll-mt-36">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <CategoryIcon name={cat.icon} className="h-6 w-6 text-navy-700" />
                <h2 id={`${cat.id}-h`} className="text-2xl font-bold text-navy-900">{HEADLINES[cat.id] ? tl(HEADLINES[cat.id]!.en, HEADLINES[cat.id]!.ml) : tl(cat.name, cat.nameMl)}</h2>
                {cat.documents.some((d) => d.required) && (
                  <Badge tone="amber"><FileCheck2 className="h-3 w-3" aria-hidden="true" /> {t("Needs")}: {cat.documents.filter((d) => d.required).map((d) => t(d.label)).join(" + ")}</Badge>
                )}
                {cat.badge && <Badge tone="slate">{tl(cat.badge.en, cat.badge.ml)}</Badge>}
              </div>
              <p className="mb-6 max-w-2xl text-sm text-zinc-700">{tl(cat.description, cat.descriptionMl)}</p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tpls.map((tp, i) => (
                  <TemplateCard key={tp.id} tpl={tp} index={i} />
                ))}
                {tpls.length === 0 && <p className="text-sm text-zinc-500">{t("No templates yet for this category.")}</p>}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
