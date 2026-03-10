
# Fix Revenue Loss Calculation Logic

## Problem
The AI prompt provides no concrete formula for calculating revenue loss. It just says "estimate the revenue being lost," which causes the AI to conflate ad spend with traffic volume (e.g., "€7500 ad spend = 225 conversions" — nonsensical).

## Correct Calculation Model

The proper chain is:

```text
Ad Spend (EUR) / CPC (EUR) = Monthly Visitors
Monthly Visitors x Conversion Rate (%) = Current Conversions
Current Conversions x Avg. Revenue per Conversion = Current Revenue

For each issue:
  Issue causes X% relative drop in conversion rate
  Lost Conversions = Monthly Visitors x (CR x X%)
  Lost Revenue = Lost Conversions x Avg. Revenue per Conversion
```

## Changes

### 1. Add new form field: Average Order Value / Deal Value
**File:** `src/components/AuditForm.tsx`

Add an optional input field for "Average order/deal value (EUR)" so the AI can calculate actual revenue loss, not just lost conversions. Without this, the AI has to guess revenue per conversion.

### 2. Rewrite the revenue loss prompt instructions
**File:** `supabase/functions/audit-score/index.ts`

Replace the vague "REVENUE LOSS CALCULATION INSTRUCTIONS" block (lines 40-44) with a precise, step-by-step formula:

- Provide estimated CPC benchmarks by traffic source (Google Ads ~EUR 0.50-3.00, Meta ~EUR 0.30-1.50, etc.)
- Instruct: Estimated Visitors = Ad Spend / estimated CPC
- Instruct: Current Conversions = Visitors x Conversion Rate
- Instruct: For each issue, state the estimated % relative conversion rate drop, then compute lost conversions and lost EUR
- If average order value is provided, use it; otherwise use industry benchmarks (e-commerce ~EUR 50-80, SaaS ~EUR 30-100/mo, lead gen ~EUR 50-200, etc.)
- Require the AI to show its math in the `explanation` field so the user can verify

### 3. Update the tool schema for revenue loss items
**File:** `supabase/functions/audit-score/index.ts`

Add a `calculation_details` property to each revenue loss item schema so the AI is forced to output the intermediate values (estimated CPC used, visitors, CR drop %, lost conversions, revenue per conversion). This makes the math transparent and auditable.

### 4. Display calculation transparency in the UI
**File:** `src/components/RevenueLoss.tsx`

The `explanation` field already displays in each issue card. No major UI change needed, but the explanations will now contain actual math instead of hand-waving, because the prompt forces it.

### 5. Update translations
**File:** `src/contexts/LanguageContext.tsx`

Add translations for the new "Average order value" form field label and placeholder.

## Technical Details

The key change is in the edge function prompt. The new `REVENUE LOSS CALCULATION INSTRUCTIONS` block will look roughly like:

```
REVENUE LOSS CALCULATION - FOLLOW THIS FORMULA EXACTLY:
1. Estimate CPC for the traffic source:
   - Google Search Ads: €1.00-3.00
   - Google Display: €0.30-0.80
   - Meta/Facebook: €0.40-1.50
   - LinkedIn: €3.00-8.00
   - Organic/SEO: use €0 CPC, estimate monthly organic visitors at ~1000-5000
2. Monthly Visitors = Monthly Ad Spend / estimated CPC
3. Current Conversions = Monthly Visitors x Conversion Rate
4. Revenue per Conversion = [user-provided value] or industry benchmark
5. For each conversion issue:
   - State the estimated relative CR drop (e.g., "10% relative drop")
   - Lost Conversions = Monthly Visitors x (CR x relative_drop%)
   - Monthly Loss = Lost Conversions x Revenue per Conversion
6. Show ALL math steps in the explanation field.
```

This ensures the AI cannot mix up ad spend with traffic, and the user can verify every number.
