import { useLanguage } from "@/contexts/LanguageContext";

interface OverallSummaryProps {
  summary: {
    score: number;
    narrative: string;
    next_steps: string[];
  };
}

const getScoreColor = (score: number) => {
  if (score >= 8) return "text-score-excellent border-score-excellent";
  if (score >= 6) return "text-score-good border-score-good";
  if (score >= 4) return "text-score-warning border-score-warning";
  return "text-score-poor border-score-poor";
};

const OverallSummary = ({ summary }: OverallSummaryProps) => {
  const { t } = useLanguage();
  if (!summary) return null;

  return (
    <div data-pdf-section className="rounded-xl border border-border bg-card p-6 space-y-4 animate-fade-up">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("summary.title")}</h2>
        <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-lg font-bold ${getScoreColor(summary.score)}`}>{summary.score}</div>
      </div>
      <p className="text-base text-muted-foreground leading-relaxed">{summary.narrative}</p>
      <div className="rounded-lg bg-primary/10 border border-primary/20 p-4">
        <p className="text-base font-semibold text-primary mb-2">{t("summary.nextSteps")}</p>
        <ul className="space-y-1.5">
          {summary.next_steps.map((step, i) => (
            <li key={i} className="flex items-start gap-1.5 text-base text-primary">
              <span className="mt-0.5">•</span>
              <span>{step}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default OverallSummary;
