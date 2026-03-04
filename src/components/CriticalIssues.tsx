import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle } from "lucide-react";
import { getScoreBgClass, getScoreBadgeClass, getScoreSeverity } from "@/lib/score-colors";

interface CriticalIssue {
  issue: string;
  category: string;
  severity: "critical" | "high" | "medium";
  description: string;
  solution: string;
  estimated_monthly_loss?: number;
  explanation?: string;
}

interface CriticalIssuesProps {
  issues: CriticalIssue[];
  totalMonthlyLoss?: number;
  totalAnnualLoss?: number;
  frameworkScores?: { key: string; score: number }[];
}

const FRAMEWORK_ORDER = [
  "value_proposition",
  "relevance",
  "clarity",
  "anxiety_trust",
  "distraction_focus",
  "cta_quality",
  "urgency_momentum",
];

const FRAMEWORK_LABELS: Record<string, Record<string, string>> = {
  value_proposition: { cs: "Value Proposition", en: "Value Proposition" },
  relevance: { cs: "Relevance & Message Match", en: "Relevance & Message Match" },
  clarity: { cs: "Clarity & Cognitive Ease", en: "Clarity & Cognitive Ease" },
  anxiety_trust: { cs: "Anxiety Reduction & Trust", en: "Anxiety Reduction & Trust" },
  distraction_focus: { cs: "Distraction & Focus", en: "Distraction & Focus" },
  cta_quality: { cs: "CTA Quality", en: "CTA Quality" },
  urgency_momentum: { cs: "Urgency & Momentum", en: "Urgency & Momentum" },
};

// Map various category strings from AI to framework keys
const categoryToFramework = (category: string): string => {
  const lower = category.toLowerCase().replace(/[^a-z]/g, "");
  if (lower.includes("value") || lower.includes("proposition")) return "value_proposition";
  if (lower.includes("relevance") || lower.includes("message") || lower.includes("match")) return "relevance";
  if (lower.includes("clarity") || lower.includes("cognitive") || lower.includes("ease")) return "clarity";
  if (lower.includes("anxiety") || lower.includes("trust") || lower.includes("reduction")) return "anxiety_trust";
  if (lower.includes("distraction") || lower.includes("focus")) return "distraction_focus";
  if (lower.includes("cta") || lower.includes("calltoaction")) return "cta_quality";
  if (lower.includes("urgency") || lower.includes("momentum")) return "urgency_momentum";
  return "value_proposition"; // fallback
};

const formatCurrency = (val: number) =>
  `€${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

/** Strip severity tokens that the AI sometimes appends to issue titles. */
const cleanIssueTitle = (title: string): string =>
  title
    .replace(/\s*[-–—]\s*(critical|high|medium|low)\s*$/i, "")
    .replace(/\s*\[(critical|high|medium|low)\]\s*/gi, "")
    .replace(/\s*\((critical|high|medium|low)\)\s*/gi, "")
    .trim();

const CriticalIssues = ({ issues, totalMonthlyLoss, totalAnnualLoss, frameworkScores }: CriticalIssuesProps) => {
  const { t, lang } = useLanguage();

  if (!issues || issues.length === 0) return null;

  // Group issues by framework
  const grouped: Record<string, CriticalIssue[]> = {};
  for (const issue of issues) {
    const fwKey = categoryToFramework(issue.category);
    if (!grouped[fwKey]) grouped[fwKey] = [];
    grouped[fwKey].push(issue);
  }

  // Always show ALL 7 frameworks in order
  const orderedFrameworks = FRAMEWORK_ORDER;

  return (
    <div data-pdf-section className="space-y-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-[hsl(0,72%,55%)]" />
        <h2 className="text-2xl font-bold">{t("issues.title")}</h2>
      </div>

      <div className="space-y-4">
        {orderedFrameworks.map((fwKey, fwIndex) => {
          const fwIssues = grouped[fwKey] || [];
          const label = FRAMEWORK_LABELS[fwKey]?.[lang] || fwKey;
          const hasIssues = fwIssues.length > 0;
          // Derive framework-level color from actual score, not AI severity
          const fwScore = frameworkScores?.find(s => s.key === fwKey)?.score || 0;
          const fwScoreNormalized = Math.round(fwScore * 10);
          const fwSeverity = getScoreSeverity(fwScoreNormalized);
          const fwDotClass = getScoreBgClass(fwScoreNormalized);
          const fwBadgeClass = getScoreBadgeClass(fwScoreNormalized);
          const frameworkLoss = fwIssues.reduce(
            (sum, item) => sum + (item.estimated_monthly_loss || 0),
            0
          );

          // Only show "Looks good" for scores strictly above 90/100 (i.e. > 9/10)
          const isAllGood = fwScore > 9 && (!hasIssues || fwIssues.every(
            (i) => i.solution?.toLowerCase().includes("no action needed") || i.solution?.toLowerCase().includes("není potřeba")
          ));
          // If AI returned no issues but score is ≤ 9, flag it
          const isMissingIssues = !hasIssues && fwScore <= 9 && fwScore > 0;

          return (
            <div
              key={fwKey}
              className="rounded-xl border border-border bg-card overflow-hidden animate-fade-up"
              style={{ animationDelay: `${fwIndex * 100}ms` }}
            >
              {/* Framework header */}
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${fwDotClass}`} />
                  <h3 className="text-base font-bold">{label}</h3>
                  {isAllGood ? (
                    <span className={`text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded border ${fwBadgeClass}`}>
                      ✓ {lang === "cs" ? "V pořádku" : "Looks good"}
                    </span>
                  ) : isMissingIssues ? (
                    <span className={`text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded border ${fwBadgeClass}`}>
                      {lang === "cs" ? "⚠ K revizi" : "⚠ Review"}
                    </span>
                  ) : (
                    <span
                      className={`text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded border ${fwBadgeClass}`}
                    >
                      {fwSeverity}
                    </span>
                  )}
                </div>
                {frameworkLoss > 0 && !isAllGood && (
                  <span className="text-sm font-bold text-[hsl(0,72%,55%)] tabular-nums">
                    ~{formatCurrency(frameworkLoss)}/mo
                  </span>
                )}
              </div>

              {/* Issues within framework */}
              {isAllGood ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    {lang === "cs"
                      ? "Tato sekce je dobře optimalizovaná. Nebyly nalezeny žádné závažné problémy."
                      : "This section is well-optimized. No significant issues found."}
                  </p>
                </div>
              ) : isMissingIssues ? (
                <div className="px-4 py-4">
                  <p className="text-sm text-[hsl(38,92%,55%)]">
                    {lang === "cs"
                      ? `Skóre ${Math.round(fwScore * 10)}/100 — problémy nebyly vráceny, ale doporučujeme revizi.`
                      : `Score ${Math.round(fwScore * 10)}/100 — no specific issues returned, review recommended.`}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {fwIssues.map((item, i) => (
                      <div key={i} className="px-4 py-3">
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-semibold">{cleanIssueTitle(item.issue)}</h4>
                          </div>
                          {item.estimated_monthly_loss != null && item.estimated_monthly_loss > 0 && (
                            <span className="text-xs font-bold text-[hsl(0,72%,55%)] shrink-0 tabular-nums">
                              ~{formatCurrency(item.estimated_monthly_loss)}/mo
                            </span>
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                          {item.description}
                        </p>

                        <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5">
                          <p className="text-sm">
                            <span className="font-semibold text-primary">
                              {t("issues.solution")}:{" "}
                            </span>
                            <span className="text-foreground/80">{item.solution}</span>
                          </p>
                        </div>

                        {item.explanation && (
                          <div className="mt-2 rounded-lg bg-muted/40 border border-border/60 p-3 font-mono text-[11px] text-muted-foreground leading-[1.7] whitespace-pre-line tabular-nums">
                            {item.explanation}
                          </div>
                        )}
                      </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Revenue leak total */}
      {totalMonthlyLoss != null && totalMonthlyLoss > 0 && (
        <div className="rounded-xl border border-[hsl(0,72%,55%)]/30 bg-[hsl(0,72%,55%)]/5 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">{t("issues.estMonthlyLeak")}</p>
              {totalAnnualLoss != null && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("issues.estAnnualLeak")}: {formatCurrency(totalAnnualLoss)}
                </p>
              )}
            </div>
            <p className="text-3xl font-extrabold text-[hsl(0,72%,55%)]">
              {formatCurrency(totalMonthlyLoss)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CriticalIssues;
