import { useLanguage } from "@/contexts/LanguageContext";

interface ContentOptimization {
  element: string;
  impact_score: number;
  current_version: string;
  optimized_version: string;
  reasons: string[];
}

interface ContentOptimizationsProps {
  items: ContentOptimization[];
}

const getScoreColor = (score: number) => {
  if (score >= 8) return "text-score-excellent border-score-excellent";
  if (score >= 6) return "text-score-good border-score-good";
  if (score >= 4) return "text-score-warning border-score-warning";
  return "text-score-poor border-score-poor";
};

const ContentOptimizations = ({ items }: ContentOptimizationsProps) => {
  const { t } = useLanguage();
  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("content.title")}</h2>
      <div className="border-t border-border" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4 animate-fade-up" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{item.element}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t("content.impact")}</span>
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${getScoreColor(item.impact_score)}`}>{item.impact_score}</div>
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-1">{t("content.current")}</p>
              <p className="text-sm">{item.current_version}</p>
            </div>
            <div className="rounded-lg bg-primary/10 border border-primary/20 p-3">
              <p className="text-xs font-semibold text-primary mb-1">{t("content.optimized")}</p>
              <p className="text-sm">{item.optimized_version}</p>
              <p className="text-xs font-semibold text-primary mt-3 mb-1">{t("content.why")}</p>
              <ul className="space-y-1">
                {item.reasons.map((reason, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-xs text-primary">
                    <span className="mt-0.5">•</span>
                    <span>{reason}</span>
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

export default ContentOptimizations;
