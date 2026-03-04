

## Unify Score Colors Across the Entire Audit Report

### Problem
Each component defines its own color thresholds independently, causing mismatches. For example, `FrameworkScores` uses `score >= 8` (80/100) for green while `CriticalIssues` derives color from AI-provided severity labels (critical/high/medium) which may not match the actual score.

### New Color Scale (user-defined)

| Range | Label | Color |
|-------|-------|-------|
| 0–49 | Critical | Red `hsl(0, 72%, 55%)` |
| 50–74 | High | Orange `hsl(38, 92%, 55%)` |
| 75–89 | Medium | Cyan `hsl(172, 66%, 50%)` |
| 90–100 | No issues | Green `hsl(152, 69%, 48%)` |

### Plan

**1. Create a shared utility** — `src/lib/score-colors.ts`

A single source of truth exporting:
- `getScoreColor(score: number)` → returns HSL string (for inline `style`)
- `getScoreColorClass(score: number)` → returns Tailwind `bg-` class
- `getScoreTextClass(score: number)` → returns Tailwind `text-` + `border-` classes
- `getScoreSeverity(score: number)` → returns `"critical" | "high" | "medium" | "good"`

All use the same 0–49/50–74/75–89/90–100 thresholds.

**2. Update `FrameworkScores.tsx`**
- Remove local `getBarColor` and `getScoreBarColor` functions
- Import shared utility; use it for both the overall health bar and per-framework bars
- Framework scores come as 1–10 scale → multiply by 10 before passing to the color function

**3. Update `CriticalIssues.tsx`**
- Instead of coloring framework headers by AI-provided severity strings, derive color from the actual framework score (score × 10) using the shared utility
- Update dot, badge, and border colors to match
- Keep individual issue severity badges as-is (those reflect per-issue severity, not framework-level)

**4. Update `ScoreRing.tsx`**
- Replace local `getScoreColor` with shared utility
- Update label thresholds to match: 90+ "Excellent", 75–89 "Good", 50–74 "Needs work", 0–49 "Critical"

**5. Update `OverallSummary.tsx`**
- Replace local `getScoreColor` with shared utility

**6. Update `ContentOptimizations.tsx`**
- Replace local `getScoreColor` with shared utility (adjusting for its 1–10 scale → ×10)

**7. Update CSS custom properties** in `src/index.css`
- Align `--score-excellent`, `--score-good`, `--score-warning`, `--score-poor` with the new thresholds for consistency with Tailwind token classes used in `AuditBreakdown.tsx`

### Files changed
- **New**: `src/lib/score-colors.ts`
- **Edit**: `src/components/FrameworkScores.tsx`
- **Edit**: `src/components/CriticalIssues.tsx`
- **Edit**: `src/components/ScoreRing.tsx`
- **Edit**: `src/components/OverallSummary.tsx`
- **Edit**: `src/components/ContentOptimizations.tsx`
- **Edit**: `src/contexts/LanguageContext.tsx` (score label thresholds)

