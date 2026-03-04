import { useLanguage } from "@/contexts/LanguageContext";
import { getScoreColor } from "@/lib/score-colors";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

const ScoreRing = ({ score, size = 200, strokeWidth = 12 }: ScoreRingProps) => {
  const { t } = useLanguage();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  const getScoreLabel = (s: number) => {
    if (s >= 80) return t("score.excellent");
    if (s >= 60) return t("score.good");
    if (s >= 40) return t("score.improve");
    return t("score.critical");
  };

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(220, 14%, 14%)" strokeWidth={strokeWidth} />
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-[1500ms] ease-out" style={{ filter: `drop-shadow(0 0 8px ${color})` }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tracking-tight" style={{ color }}>{score}</span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">/ 100</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color }}>{getScoreLabel(score)}</p>
        <p className="text-xs text-muted-foreground">{t("score.label")}</p>
      </div>
    </div>
  );
};

export default ScoreRing;
