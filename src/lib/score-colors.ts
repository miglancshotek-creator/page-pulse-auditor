/**
 * Unified score color system.
 * 
 * Thresholds (on a 0–100 scale):
 *   0–49  → Critical (red)
 *  50–74  → High (orange)
 *  75–89  → Medium (cyan)
 *  90–100 → Good (green)
 */

export type ScoreSeverity = "critical" | "high" | "medium" | "good";

const COLORS = {
  critical: "hsl(0, 72%, 55%)",
  high: "hsl(38, 92%, 55%)",
  medium: "hsl(172, 66%, 50%)",
  good: "hsl(152, 69%, 48%)",
} as const;

export const getScoreSeverity = (score: number): ScoreSeverity => {
  if (score >= 90) return "good";
  if (score >= 75) return "medium";
  if (score >= 50) return "high";
  return "critical";
};

/** Returns an HSL string for use in inline styles. */
export const getScoreColor = (score: number): string => {
  return COLORS[getScoreSeverity(score)];
};

/** Tailwind `bg-` class using arbitrary values. */
export const getScoreBgClass = (score: number): string => {
  const map: Record<ScoreSeverity, string> = {
    critical: "bg-[hsl(0,72%,55%)]",
    high: "bg-[hsl(38,92%,55%)]",
    medium: "bg-[hsl(172,66%,50%)]",
    good: "bg-[hsl(152,69%,48%)]",
  };
  return map[getScoreSeverity(score)];
};

/** Tailwind `text-` + `border-` classes using arbitrary values. */
export const getScoreTextClass = (score: number): string => {
  const map: Record<ScoreSeverity, string> = {
    critical: "text-[hsl(0,72%,55%)] border-[hsl(0,72%,55%)]",
    high: "text-[hsl(38,92%,55%)] border-[hsl(38,92%,55%)]",
    medium: "text-[hsl(172,66%,50%)] border-[hsl(172,66%,50%)]",
    good: "text-[hsl(152,69%,48%)] border-[hsl(152,69%,48%)]",
  };
  return map[getScoreSeverity(score)];
};

/** Badge styles: bg with opacity, text color, border with opacity. */
export const getScoreBadgeClass = (score: number): string => {
  const s = getScoreSeverity(score);
  const map: Record<ScoreSeverity, string> = {
    critical: "bg-[hsl(0,72%,55%)]/15 text-[hsl(0,72%,55%)] border-[hsl(0,72%,55%)]/30",
    high: "bg-[hsl(38,92%,55%)]/15 text-[hsl(38,92%,55%)] border-[hsl(38,92%,55%)]/30",
    medium: "bg-[hsl(172,66%,50%)]/15 text-[hsl(172,66%,50%)] border-[hsl(172,66%,50%)]/30",
    good: "bg-[hsl(152,69%,48%)]/15 text-[hsl(152,69%,48%)] border-[hsl(152,69%,48%)]/30",
  };
  return map[s];
};
