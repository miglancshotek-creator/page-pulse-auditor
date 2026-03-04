import { useLanguage } from "@/contexts/LanguageContext";

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

const getBarColor = (score: number) => {
  if (score >= 8) return "bg-[hsl(172,66%,50%)]";
  if (score >= 6) return "bg-[hsl(172,66%,50%)]";
  if (score >= 4) return "bg-[hsl(38,92%,55%)]";
  return "bg-[hsl(0,72%,55%)]";
};

const getScoreBarColor = (score: number) => {
  if (score >= 80) return "bg-[hsl(152,69%,48%)]";
  if (score >= 60) return "bg-[hsl(172,66%,50%)]";
  if (score >= 40) return "bg-[hsl(38,92%,55%)]";
  return "bg-[hsl(0,72%,55%)]";
};

const FrameworkScores = ({ scores, overallScore, criticalCount }: FrameworkScoresProps) => {
  const { t, lang } = useLanguage();

  return (
    <div data-pdf-section className="rounded-xl border border-border bg-card overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="px-5 pt-5 pb-4">
        <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-3">
          {t("fw.healthScore")}
        </p>
        <div className="flex items-end justify-between mb-2">
          <div className="flex items-baseline gap-1">
            <span className="text-5xl font-extrabold tracking-tight">{overallScore}</span>
            <span className="text-lg text-muted-foreground font-medium">/100</span>
          </div>
          {criticalCount > 0 && (
            <span className="text-[10px] font-bold tracking-[0.1em] uppercase px-2.5 py-1 rounded-md bg-[hsl(0,72%,55%)]/15 text-[hsl(0,72%,55%)] border border-[hsl(0,72%,55%)]/30">
              {criticalCount} {t("fw.criticalIssues")}
            </span>
          )}
        </div>
        <div className="h-1.5 rounded-full bg-muted/30 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${getScoreBarColor(overallScore)}`}
            style={{ width: `${overallScore}%` }}
          />
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border" />

      {/* Framework bars */}
      <div className="px-5 py-4 space-y-3">
        {scores.map((fw) => {
          const label = FRAMEWORK_LABELS[fw.key]?.[lang] || fw.name;
          return (
            <div key={fw.key} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-20 shrink-0 text-right">{label}</span>
              <div className="flex-1 h-2.5 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getBarColor(fw.score)}`}
                  style={{ width: `${fw.score * 10}%` }}
                />
              </div>
              <span className="text-xs font-bold w-8 text-right tabular-nums">{fw.score}/10</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FrameworkScores;
