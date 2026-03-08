import { useLanguage } from "@/contexts/LanguageContext";
import { getScoreTextClass } from "@/lib/score-colors";

interface OverallSummaryProps {
  summary: {
    score: number;
    narrative: string;
    next_steps: string[];
  };
}

const OverallSummary = ({ summary }: OverallSummaryProps) => {
  const { t } = useLanguage();
  if (!summary) return null;

  return (
    <div data-pdf-section className="rounded-xl border border-border bg-card overflow-hidden animate-fade-up">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="text-base font-bold">{t("summary.title")}</h2>
        <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getScoreTextClass(summary.score)}`}>{summary.score}/100</div>
      </div>
      <div className="px-4 py-3 space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">{summary.narrative}</p>
        <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
          <p className="text-sm font-semibold text-primary mb-1.5">{t("summary.nextSteps")}</p>
          <ul className="space-y-1">
            {summary.next_steps.map((step, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-primary">
                <span className="mt-0.5">•</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OverallSummary;
