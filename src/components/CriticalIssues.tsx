import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle } from "lucide-react";

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
}

const severityStyles: Record<string, { badge: string; dot: string }> = {
  critical: {
    badge: "bg-[hsl(0,72%,55%)]/15 text-[hsl(0,72%,55%)] border-[hsl(0,72%,55%)]/30",
    dot: "bg-[hsl(0,72%,55%)]",
  },
  high: {
    badge: "bg-[hsl(38,92%,55%)]/15 text-[hsl(38,92%,55%)] border-[hsl(38,92%,55%)]/30",
    dot: "bg-[hsl(38,92%,55%)]",
  },
  medium: {
    badge: "bg-[hsl(172,66%,50%)]/15 text-[hsl(172,66%,50%)] border-[hsl(172,66%,50%)]/30",
    dot: "bg-[hsl(172,66%,50%)]",
  },
};

const formatCurrency = (val: number) =>
  `€${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const CriticalIssues = ({ issues, totalMonthlyLoss, totalAnnualLoss }: CriticalIssuesProps) => {
  const { t } = useLanguage();

  if (!issues || issues.length === 0) return null;

  return (
    <div data-pdf-section className="space-y-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-[hsl(0,72%,55%)]" />
        <h2 className="text-2xl font-bold">{t("issues.title")}</h2>
      </div>

      <div className="space-y-3">
        {issues.map((item, i) => {
          const style = severityStyles[item.severity] || severityStyles.medium;
          return (
            <div
              key={i}
              className="rounded-xl border border-border bg-card p-4 animate-fade-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${style.dot}`} />
                  <h3 className="text-base font-semibold">{item.issue}</h3>
                  <span className={`text-[9px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded border ${style.badge}`}>
                    {item.severity}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-medium">{item.category}</span>
                </div>
                {item.estimated_monthly_loss != null && item.estimated_monthly_loss > 0 && (
                  <span className="text-sm font-bold text-[hsl(0,72%,55%)] shrink-0 tabular-nums">
                    ~{formatCurrency(item.estimated_monthly_loss)}/mo
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{item.description}</p>

              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3">
                <p className="text-sm">
                  <span className="font-semibold text-primary">{t("issues.solution")}: </span>
                  <span className="text-foreground/80">{item.solution}</span>
                </p>
              </div>

              {item.explanation && (
                <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line leading-relaxed">{item.explanation}</p>
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
            <p className="text-3xl font-extrabold text-[hsl(0,72%,55%)]">{formatCurrency(totalMonthlyLoss)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CriticalIssues;
