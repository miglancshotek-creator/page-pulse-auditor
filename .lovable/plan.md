

## Problem

Frameworks scoring 70/100 (like Relevance, Clarity) are showing "✓ Looks good" because the AI simply returns no issues for them. The UI then treats "no issues found" as "all good." Two fixes needed:

1. **Prompt fix** — Make the instruction crystal clear: return actionable issues for every single framework scoring 9/10 or below (i.e., 90/100 or below). Only a score of 10/10 (100/100) may use "No action needed." Emphasize that EVERY framework MUST have at least one issue entry — no exceptions for any score below 10/10.

2. **UI fix** — In `CriticalIssues.tsx`, the `isAllGood` condition currently checks `fwScore > 9`. This is correct (maps to >90/100). But the fallback for `!hasIssues` (no issues returned by AI) also shows "Looks good." Change this: if a framework has no issues AND its score is ≤ 9 (≤90/100), show a fallback message like "No specific issues returned — review recommended" instead of "Looks good."

### Files to change

1. **`supabase/functions/audit-score/index.ts`** (line ~239) — Rewrite the `critical_issues` description to be unambiguous:
   - "Return issues for ALL 7 frameworks, no exceptions. For frameworks scoring 1-9 out of 10, find REAL problems and describe them with severity and solutions. The ONLY case where 'No action needed' is acceptable is a perfect 10/10 score. A score of 7/10 means there are clear issues — find and report them."

2. **`src/components/CriticalIssues.tsx`** (~line 106-108) — Update the `isAllGood` and `!hasIssues` rendering logic:
   - Only show "✓ Looks good" when `fwScore > 9` AND `!hasIssues`
   - If `!hasIssues` but `fwScore <= 9`, show a warning that issues should exist for this score level

3. **Redeploy** the edge function.

