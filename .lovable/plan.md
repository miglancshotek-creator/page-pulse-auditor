

## Fix: AI double-divides by CPC in revenue loss calculations

### Problem
The AI sometimes shows `3000 / 0.8` in its calculation string, treating the already-computed visitor count (3000) as if it were still the raw ad spend and dividing by CPC again. This inflates the loss figure.

### Root Cause
The prompt in `supabase/functions/audit-score/index.ts` (Step 5) references `Monthly Visitors` but doesn't explicitly remind the AI that visitors were already computed. The AI occasionally re-derives visitors from the ad spend number mid-formula.

### Fix
**File:** `supabase/functions/audit-score/index.ts` (lines 86-98)

1. **Pre-compute visitors in the prompt text** — instead of letting the AI calculate visitors itself, compute `estimatedVisitors = monthlyAdSpend / estimatedCPC` in the TypeScript code and inject the concrete number into the prompt. This removes ambiguity.

2. **Simplify Step 5 formula** — change the instruction to:
   ```
   Step 5: For EACH conversion issue:
     Lost Conversions = {estimatedVisitors} × (CR × relative_drop%)
     Monthly Loss = Lost Conversions × Revenue per Conversion
     Show as: "{estimatedVisitors} × (CR × drop%) × revenue_per_conversion = €X"
   ```

3. **Add CPC lookup logic in TypeScript** — add a simple map of traffic source → default CPC in the edge function code, so we can pre-compute visitors:
   ```typescript
   const cpcMap: Record<string, number> = {
     google_search: 1.5, google_shopping: 0.80, google_display: 0.50,
     meta: 0.80, linkedin: 5.00, email: 0, organic: 0, mixed: 1.20
   };
   const estimatedCPC = cpcMap[bc.trafficSource] || 1.20;
   const estimatedVisitors = estimatedCPC > 0
     ? Math.round(bc.monthlyAdSpend / estimatedCPC)
     : 3000; // fallback for organic/email
   ```

4. **Inject computed visitors into prompt** — replace Step 2 with a concrete statement:
   ```
   Step 2: Monthly Visitors (pre-calculated): {estimatedVisitors}
   (Based on €{adSpend} / €{cpc} CPC for {trafficSource})
   ```

5. **Update Step 6 format instruction** — require the formula to start with the visitor count, never with ad spend / CPC:
   ```
   Format: "{visitors} × ({cr} × {drop%}) × {revenue} = €{loss}"
   ```

### Result
The AI receives a concrete visitor number and can no longer confuse ad spend with visitors or double-divide by CPC. The calculation string shown to users will be clean and verifiable.

