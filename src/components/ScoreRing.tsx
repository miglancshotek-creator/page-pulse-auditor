interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return "hsl(152, 69%, 48%)";
  if (score >= 60) return "hsl(172, 66%, 50%)";
  if (score >= 40) return "hsl(38, 92%, 55%)";
  return "hsl(0, 72%, 55%)";
};

const getScoreLabel = (score: number) => {
  if (score >= 80) return "Výborné";
  if (score >= 60) return "Dobré";
  if (score >= 40) return "Ke zlepšení";
  return "Kritické";
};

const ScoreRing = ({ score, size = 200, strokeWidth = 12 }: ScoreRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="relative flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ overflow: 'visible' }}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(220, 14%, 14%)"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-[1500ms] ease-out"
            style={{ filter: `drop-shadow(0 0 8px ${color})` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tracking-tight" style={{ color }}>
            {score}
          </span>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest mt-1">
            / 100
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold" style={{ color }}>
          {getScoreLabel(score)}
        </p>
        <p className="text-xs text-muted-foreground">Skóre konverzního zdraví</p>
      </div>
    </div>
  );
};

export default ScoreRing;