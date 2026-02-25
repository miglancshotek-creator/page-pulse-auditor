import { useLanguage } from "@/contexts/LanguageContext";
import { DollarSign, TrendingDown, AlertTriangle } from "lucide-react";

interface RevenueLossItem {
  issue: string;
  estimated_monthly_loss: number;
  severity: "high" | "medium" | "low";
  explanation: string;
}

interface RevenueLossProps {
  items: RevenueLossItem[];
  totalMonthlyLoss: number;
  totalAnnualLoss: number;
}

const RevenueLoss = ({ items, totalMonthlyLoss, totalAnnualLoss }: RevenueLossProps) => {
  const { t } = useLanguage();

  const severityStyles = {
    high: "border-red-500/30 bg-red-500/5",
    medium: "border-yellow-500/30 bg-yellow-500/5",
    low: "border-blue-500/30 bg-blue-500/5",
  };

  const severityDot = {
    high: "bg-red-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  };

  const formatCurrency = (val: number) =>
    `€${val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <div data-pdf-section className="space-y-4 animate-fade-up">
      <div className="flex items-center gap-2 mb-2">
        <TrendingDown className="h-5 w-5 text-red-500" />
        <h2 className="text-lg font-bold">{t("revenue.title")}</h2>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("revenue.monthlyLoss")}</p>
          <p className="text-2xl font-extrabold text-red-400">{formatCurrency(totalMonthlyLoss)}</p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t("revenue.annualLoss")}</p>
          <p className="text-2xl font-extrabold text-red-400">{formatCurrency(totalAnnualLoss)}</p>
        </div>
      </div>

      {/* Issue breakdown */}
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className={`rounded-xl border p-4 ${severityStyles[item.severity]}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`h-2 w-2 rounded-full ${severityDot[item.severity]}`} />
                  <h3 className="text-sm font-semibold">{item.issue}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.explanation}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-red-400">-{formatCurrency(item.estimated_monthly_loss)}</p>
                <p className="text-[10px] text-muted-foreground">{t("revenue.perMonth")}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RevenueLoss;
