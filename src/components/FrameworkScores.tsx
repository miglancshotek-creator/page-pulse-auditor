import { useLanguage } from "@/contexts/LanguageContext";
import { getScoreBgClass, getScoreBadgeClass } from "@/lib/score-colors";

interface FrameworkScore {
  key: string;
  name: string;
  score: number;
  key_issue: string;
  recommendation: string;
}

interface FrameworkScoresProps {
  scores: FrameworkScore[];
  overallScore: number;
  criticalCount: number;
}

const FRAMEWORK_LABELS: Record<string, Record<string, string>> = {
  value_proposition: { cs: "Value Prop", en: "Value Prop" },
  relevance: { cs: "Relevance", en: "Relevance" },
  clarity: { cs: "Clarity", en: "Clarity" },
  anxiety_trust: { cs: "Trust", en: "Trust" },
  distraction_focus: { cs: "Focus", en: "Focus" },
  cta_quality: { cs: "CTA", en: "CTA" },
  urgency_momentum: { cs: "Urgency", en: "Urgency" },
};

const FrameworkScores = ({ scores, overallScore, criticalCount }: FrameworkScoresProps) => {
  const { t, lang } = useLanguage();

  return (
    <div data-pdf-section className="rounded-xl border border-border bg-card overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <p className="text-[9px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1.5">
          {t("fw.healthScore")}
        </p>
        <div className="flex items-end justify-between mb-1.5">
          <div className="flex items-baseline gap-0.5">
            <span className="text-3xl font-extrabold tracking-tight">{overallScore}</span>
            <span className="text-sm text-muted-foreground font-medium">/100</span>
          </div>
          {criticalCount > 0 && (
            <span className={`text-[9px] font-bold tracking-[0.1em] uppercase px-2 py-0.5 rounded-md border ${getScoreBadgeClass(0)}`}>
              {criticalCount} {t("fw.criticalIssues")}
            </span>
          )}
        </div>
        <div className="h-1 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${getScoreBgClass(overallScore)}`}
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Framework bars */}
      <div className="px-3 py-2.5 space-y-1.5">
        {scores.map((fw) => {
          const label = FRAMEWORK_LABELS[fw.key]?.[lang] || fw.name;
          return (
            <div key={fw.key} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-16 shrink-0 text-right">{label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getScoreBgClass(fw.score * 10)}`}
                  style={{ width: `${fw.score * 10}%` }}
                />
              </div>
              <span className="text-[10px] font-bold w-10 text-right tabular-nums">{Math.round(fw.score * 10)}/100</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FrameworkScores;
