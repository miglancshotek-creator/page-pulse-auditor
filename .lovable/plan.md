

## Problem

The AI scoring produces inconsistent results (75%, 76%, 78%) for the same page because:

1. **No temperature control** -- the API call lacks a `temperature` parameter, defaulting to ~1.0 which introduces randomness
2. **Vague scoring instructions** -- the prompt says "score 0-100" but lacks a strict rubric tying specific evidence to specific point values, leaving room for interpretation

## Solution

Update `supabase/functions/audit-score/index.ts` with two changes:

### 1. Set temperature to 0

Add `temperature: 0` to the AI request body. This makes the model deterministic -- given the same input, it will produce the same output every time.

### 2. Add a strict, evidence-based scoring rubric to the prompt

Replace the vague "score on these 5 categories" instruction with a precise rubric that tells the AI exactly how to calculate each category score:

- Each category has 8 criteria from the knowledge base
- Each criterion is scored as **present (full points)** or **absent (0 points)**
- The category score = sum of earned points, normalized to 0-100
- The overall score = weighted average of the 5 categories
- Explicit weights for each category are defined in the prompt

This removes subjective "feel" from scoring and turns it into a checklist-based calculation.

---

### Technical Details

**File changed:** `supabase/functions/audit-score/index.ts`

**Changes:**

1. Add `temperature: 0` to the fetch request body (alongside `model`, `messages`, `tools`)

2. Update the prompt to include a deterministic scoring methodology:

```text
SCORING METHODOLOGY (follow exactly):
For each category, evaluate each criterion as PASS (1) or FAIL (0).
Category score = (number of passing criteria / total criteria in category) * 100, rounded to nearest integer.
Overall score = weighted average using these weights:
  Messaging Clarity: 30%, Trust Signals: 20%, CTA Strength: 25%, Mobile Layout: 15%, SEO Meta-data: 10%

Be binary -- either evidence exists on the page or it does not. Do not use partial credit.
```

3. Update the system message to reinforce determinism:

```text
You are a landing page conversion optimization expert. Score strictly using the provided rubric. 
Be deterministic: identical page data must always produce identical scores. 
Use binary pass/fail per criterion -- no partial credit.
```

These changes together will make the audit produce the same score for the same page data every time.

