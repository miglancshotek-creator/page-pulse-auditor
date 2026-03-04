
Goal: enforce exactly one urgency label per framework card (headline only), with no second severity label inside the card body.

What I found:
- The issue cards are rendered in `src/components/CriticalIssues.tsx`.
- Header severity is already score-based (`fwSeverity` + `fwBadgeClass`) and shown in the framework headline.
- Individual issue rows currently still keep leftover severity plumbing (`issueSeverityStyles`, `item.severity`, unused style derivation), which is the source area to harden.
- Based on your screenshot, we need a fail-safe so inner rows can never show severity chips, even if AI payloads contain severity-like tokens.

Implementation plan:
1) Harden `CriticalIssues.tsx` so only header can carry urgency
- Remove all issue-level severity style maps and unused helpers.
- Remove any issue-level severity render path completely (not just hide by condition).
- Keep row content strictly: issue title, description, solution, explanation, loss.
- Keep framework header badge as the single urgency indicator.

2) Add normalization guard for issue titles (defensive)
- Before rendering `item.issue`, sanitize common appended severity fragments (e.g. trailing “- HIGH”, “[MEDIUM]”, “(CRITICAL)”).
- Only strip severity tokens when they appear as standalone badges/tails, not normal sentence words.
- This prevents accidental “double labels” from backend text formatting.

3) Keep urgency source consistent
- Header urgency remains derived from framework score via `getScoreSeverity` (same logic as health score colors).
- No mixing of framework urgency with per-issue `item.severity` for visual labels.

4) Verify in both problematic frameworks
- Confirm “Value Proposition” and “Relevance & Message Match” show exactly one badge in header.
- Confirm issue rows in those cards contain zero urgency badges/tags.
- Confirm same behavior for all 7 framework cards and PDF export view.

Technical details:
- Primary file: `src/components/CriticalIssues.tsx`
- Possible tiny helper addition in same file:
  - `normalizeIssueTitle(title: string): string`
  - Regex-based cleanup for severity suffix/prefix badge patterns.
- No database/backend changes required.
- No changes to scoring thresholds; only presentation consistency and defensive sanitization.
