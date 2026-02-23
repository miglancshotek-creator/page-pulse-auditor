

# Include Full Knowledge Document in Audits

## Problem
The uploaded `.txt` file is 743 lines long, but the `admin-kb` edge function only sends the first 15,000 characters to the AI extractor -- roughly the first 158 lines. This means ~75% of the document (all the psychological frameworks, copywriting principles, CRO methodology) is completely ignored during extraction and never used in audits.

## What's Missing
The following knowledge is in the document but never reaches the audit AI:
- Cialdini's 7 Principles (detailed explanations with landing page applications)
- System 1 vs System 2 / Cognitive Ease / Anchoring / Loss Aversion / Peak-End Rule / WYSIATI
- Jobs-to-be-Done theory and Pain/Gain/Fear framework
- Schwartz's 5 Stages of Customer Awareness
- Objection Mapping (6 universal categories)
- Trust Architecture (design quality, transparency, trust destroyers)
- Headline frameworks, Hero Section formula, CTA psychology
- Features to Benefits to Desires chain
- Social Proof architecture and placement
- Pricing Psychology (decoy effect, value framing, anchoring)
- LIFT Model for heuristic analysis
- CRO testing methodology

## Solution

### 1. Store the raw document text directly as guidelines
Instead of relying on the AI to summarize the educational content (which loses detail), store the full document text (lines 148-743, the non-criteria sections) directly in the `audit_guidelines` table. The structured criteria (lines 1-147) are already handled well by the extraction logic.

### 2. Increase extraction limit in `admin-kb`
Change `pdfText.substring(0, 15000)` to `pdfText.substring(0, 50000)` so the AI extractor can see the entire document for criteria extraction.

### 3. Store full educational content separately
After AI extraction of structured criteria, take the remaining document text (everything after the criteria/output format sections) and store it in `audit_guidelines` alongside the extracted general guidelines.

### 4. Feed a condensed version to the audit AI
The full educational content (~600 lines) is too large to include verbatim in every audit prompt. Instead:
- During the `admin-kb` parse step, use a second AI call to condense the educational content into a ~2000-word "audit reference guide" -- extracting only the actionable evaluation principles (not the exercises, not the "End-of-Day Tasks", not the course scheduling)
- Store this condensed version in `audit_guidelines`
- The `audit-score` function already prepends this to the prompt, so no changes needed there

### 5. What the condensed guide will contain
The AI will be instructed to extract actionable audit principles such as:
- "A page with no social proof cannot score above 6 on Trust Signals"
- "System 1 decides within 50-200ms -- hero must trigger positive emotional response immediately"
- "Cognitive fluency: difficult-to-read = untrustworthy. Simple words beat clever words"
- "Anchoring: show expensive option or cost-of-inaction before price"
- "Loss framing outperforms gain framing (losses feel 2x as powerful)"
- "Peak-End Rule: invest disproportionately in hero and final CTA"
- "WYSIATI: fewer strong signals beat more weak ones"
- "JTBD: address functional, emotional, AND social jobs"
- "Pain/Gain/Fear: use all three, lead with loss frame"
- "5 Awareness Stages: copy must match traffic awareness level"
- "6 Objection Categories: check all are addressed"
- "Trust destroyers: stock photos, fake timers, vague testimonials, slow load, broken links"
- "Headline 4 U's: Useful, Urgent, Unique, Ultra-specific"
- "Hero must answer: What is this? Who is it for? What does it do for me? Why believe you?"
- "Features to Benefits to Desires: never lead with features"
- "CTA 'I Want To' test: button must complete visitor's sentence"
- "Social proof hierarchy and strategic placement at different page sections"
- "LIFT Model: Value Proposition, Relevance, Clarity, Urgency, Distraction, Anxiety"

## Technical Details

**Changes to `supabase/functions/admin-kb/index.ts`:**

1. Increase text limit:
```
pdfText.substring(0, 50000)
```

2. After criteria extraction, make a second AI call:
```
// Condense educational content into audit reference guide
const educationalContent = pdfText.substring(
  pdfText.indexOf("Reciprocity") > 0 ? pdfText.indexOf("Reciprocity") : 15000
);

const condenseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  // Ask AI to extract ONLY actionable evaluation principles
  // from the educational content, max ~2000 words
  // No exercises, no tasks, no course scheduling
});
```

3. Combine extracted `general_guidelines` with the condensed educational principles and store both in `audit_guidelines`

**No changes needed to `audit-score/index.ts`** -- it already reads from `audit_guidelines` and prepends to the prompt.

## Files to Modify
- `supabase/functions/admin-kb/index.ts` -- increase text limit, add second AI call to condense educational content, store combined guidelines

## After Deployment
Delete all existing entries via /admin and re-upload the `.txt` file. The knowledge base will then contain:
- 40 structured criteria (same as now, clean names)
- Full guidelines including scoring philosophy, output format, AND all psychological/CRO frameworks in condensed form

