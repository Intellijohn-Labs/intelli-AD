import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/context/language-context";

export function StepNav({ onBack, onNext, nextLabel = "Continue", error }: { onBack?: () => void; onNext: () => void; nextLabel?: string; error?: string | null }) {
  const { t } = useI18n();
  return (
    <div className="mt-8 border-t border-zinc-200/70 pt-5 dark:border-zinc-700">
      {error && (
        <p role="alert" className="mb-3 rounded bg-red-50 dark:bg-red-500/20 px-3 py-2 text-sm font-medium text-red-800 dark:text-red-200">
          {t(error)}
        </p>
      )}
      <div className="flex justify-between gap-3">
        {onBack ? (
          <Button variant="secondary" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("Back")}
          </Button>
        ) : (
          <span />
        )}
        <Button onClick={onNext}>
          {t(nextLabel)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
