

## Problem

Two issues:

1. **Mismatch between calculated value and displayed badge**: The AI explanation text shows a correct calculation (e.g., "= €163.08") but the `estimated_monthly_loss` number field contains a different value (e.g., 22), so the red badge shows "~€22/mo". The AI is not following the instruction to use the exact calculated value.

2. **Calculation detail is sometimes too brief**: The user wants every revenue loss item to always show full step-by-step math, not just a one-line formula.

## Root Cause

The prompt says "Use the EXACT calculated value as estimated_monthly_loss" but this instruction is easily ignored by the AI because it's buried at the end. Additionally, there's no explicit instruction requiring a full breakdown with intermediate values.

## Fix

### 1. Strengthen prompt to force value consistency (`supabase/functions/audit-score/index.ts`)

In Step 5 (explanation format), add an explicit cross-check instruction:

```
Step 5 FORMAT:
  Line 1-2: WHY this issue hurts conversions.
  Line 3: "Visitors: {estimatedVisitors}"
  Line 4: "CR used: {cr}% | Relative drop: {drop}%"
  Line 5: "Lost conversions: {estimatedVisitors} × {cr}% × {drop}% = {X}"
  Line 6: "Revenue per conversion: €{Y}"
  Line 7: "Calculation: {X} × €{Y} = €{loss}"

CRITICAL: The €{loss} value on the last line MUST EXACTLY EQUAL the estimated_monthly_loss number. 
If they differ, you made an error — recalculate.
```

This forces the AI to show every intermediate step AND cross-checks the final value.

### 2. Add redundant validation instruction in the tool schema description

Change the `estimated_monthly_loss` description from:
> "Estimated monthly revenue loss in euros for this issue"

to:
> "The EXACT euro value from the last line of the explanation calculation. Must match exactly."

### 3. No UI changes needed

The `CriticalIssues` component already displays `item.explanation` (which will now contain the full breakdown) and `item.estimated_monthly_loss` (which will now match). The `RevenueLoss` component is not currently used in the page.

## Technical Details

- **Single file change**: `supabase/functions/audit-score/index.ts` — update Step 5 format block (around lines 91-94) and the tool schema description (around line 174)
- No database changes
- No frontend changes

