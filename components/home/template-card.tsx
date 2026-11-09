"use client";

import { ArrowRight, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Clipping } from "@/components/ui/clipping";
import { useToast } from "@/components/ui/toast";
import { CATEGORY_COLOR } from "@/data/brand-colors";
import { getCategory } from "@/data/categories";
import { useI18n } from "@/context/language-context";
import { bookHref } from "@/lib/booking-params";
import { calculateQuote, flagshipEdition } from "@/lib/pricing";
import { useRatesVersion } from "@/lib/use-rates";
import { usePublication } from "@/lib/publication";
import type { Template } from "@/lib/types";
import { formatINR, wrapText } from "@/lib/utils";

function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\[[^\]]+\])/g).map((part, i) =>
        part.startsWith("[") ? (
          <mark key={i} className="rounded-sm bg-amber-200 px-0.5 font-semibold text-zinc-900 underline decoration-dotted">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

/** A Malayalam newspaper clipping template with estimate and a pinned "Use Template" CTA. */
export function TemplateCard({ tpl, index = 0 }: { tpl: Template; index?: number }) {
  const { t, tl, pn, place } = useI18n();
  const toast = useToast();
  const { paper } = usePublication();
  const cat = getCategory(tpl.categoryId)!;
  const flagship = flagshipEdition(paper);
  useRatesVersion();
  const estimate = calculateQuote({ adType: "classified-text", category: tpl.categoryId, selection: { [paper.id]: [flagship.id] }, text: tpl.body }).totals.total;

  return (
    <Card accent={CATEGORY_COLOR[cat.id]} className="flex h-full flex-col p-5 sm:p-6">
      <Badge tone="slate" className="self-start">{tl(cat.name, cat.nameMl)}</Badge>
      <h3 className="mt-3 font-serif text-xl font-bold text-[#0F172A] dark:text-zinc-50">{tl(tpl.title, tpl.titleMl)}</h3>
      <p className="mt-1 text-sm text-zinc-600">{tl(tpl.description, tpl.descriptionMl)}</p>
      <p className="mt-3 border-t border-dashed border-zinc-400 pt-3 font-mono text-xs text-zinc-500">
        {t("Estimated in {paper} ({edition}):", { paper: pn(paper), edition: place(flagship.name) })}{" "}
        <span className="font-bold text-zinc-950">
          <AnimatedNumber value={estimate} format={(n) => formatINR(n)} />
        </span>{" "}
        {t("incl. GST")} · {t("≈ {n} lines · fill the highlighted fields", { n: wrapText(tpl.body, 28).length })}
      </p>
      <div className="my-5 flex-1">
        <Clipping tag={`${cat.nameMl} · ${tpl.titleMl}`} headline={tpl.titleMl} rotate={index % 2 ? 0.4 : -0.4}>
          <p className="text-justify">
            <Highlighted text={tpl.body} />
          </p>
        </Clipping>
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-200 pt-4">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(tpl.body).then(
              () => toast(t("Template text copied")),
              () => toast(t("Could not copy. Select the text manually.")),
            );
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-zinc-950"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden="true" /> {t("Copy text")}
        </button>
        <ButtonLink href={bookHref({ template: tpl.id, paper: paper.id, eds: [flagship.id] })} size="sm">
          {t("Use this Template")} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </ButtonLink>
      </div>
    </Card>
  );
}
