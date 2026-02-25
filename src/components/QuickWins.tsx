import { Zap } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuickWin {
  title: string;
  description: string;
  impact: string;
}

interface QuickWinsProps {
  wins: QuickWin[];
}

const impactColors: Record<string, string> = {
  high: "bg-score-poor/10 text-score-poor border-score-poor/20",
  medium: "bg-score-warning/10 text-score-warning border-score-warning/20",
  low: "bg-score-good/10 text-score-good border-score-good/20",
};

const QuickWins = ({ wins }: QuickWinsProps) => {
  const { t } = useLanguage();

  const impactLabel = (impact: string) => t(`impact.${impact}`) || impact;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-score-warning" />
        <h3 className="text-xl font-semibold">{t("quickwins.title")}</h3>
        <span className="text-sm text-muted-foreground ml-1">{t("quickwins.subtitle")}</span>
      </div>
      {wins.map((win, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:glow-primary animate-fade-up" style={{ animationDelay: `${i * 150}ms` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base font-semibold">{win.title}</span>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${impactColors[win.impact] || impactColors.medium}`}>
                  {impactLabel(win.impact)}
                </span>
              </div>
              <p className="text-base text-muted-foreground leading-relaxed">{win.description}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default QuickWins;
