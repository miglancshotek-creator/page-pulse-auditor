import { useLanguage } from "@/contexts/LanguageContext";

interface PerformanceDimension {
  dimension: string;
  score: number;
  description: string;
  expert_insight: string;
  action_items: string[];
}

interface PerformanceAnalysisProps {
  items: PerformanceDimension[];
}

const getScoreColor = (score: number) => {
  if (score >= 8) return "text-score-excellent border-score-excellent";
  if (score >= 6) return "text-score-good border-score-good";
  if (score >= 4) return "text-score-warning border-score-warning";
  return "text-score-poor border-score-poor";
};

const PerformanceAnalysis = ({ items }: PerformanceAnalysisProps) => {
  const { t } = useLanguage();
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("perf.title")}</h2>
      <div className="border-t border-border" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{item.dimension}</h3>
              <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-sm font-bold ${getScoreColor(item.score)}`}>{item.score}</div>
            </div>
            <p className="text-sm text-muted-foreground">{item.description}</p>
            <div className="rounded-lg bg-primary/10 border-l-4 border-primary p-3">
              <p className="text-sm">
                <span className="font-semibold text-primary">{t("perf.insight")}</span>
                <span className="text-foreground/80">{item.expert_insight}</span>
              </p>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">{t("perf.actions")}</p>
              <ul className="space-y-1">
                {item.action_items.map((action, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-sm text-muted-foreground">
                    <span className="mt-0.5">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PerformanceAnalysis;
