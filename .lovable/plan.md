

## Fix: Auditor Re-Suggesting Its Own Previously Applied Recommendations

### Root Cause

When you re-audit a URL, the AI has zero awareness of previous audits. It sees the text (which you changed based on its earlier advice) as "new" text and tries to optimize it further -- essentially suggesting changes to its own suggestions.

### Solution

Before sending page data to the AI, look up the most recent completed audit for the same URL. Extract the `content_optimizations` from that previous audit and inject them into the prompt as "already applied changes." This tells the AI: "These texts were already optimized per your prior recommendation -- do NOT suggest changing them unless there's a genuinely new, evidence-based reason."

### Changes

**File: `supabase/functions/audit-score/index.ts`**

1. After the existing `supabase` client setup (around line 98-100), query the most recent completed audit for the same URL:
   ```typescript
   const { data: previousAudit } = await supabase
     .from("audits")
     .select("raw_ai_response")
     .eq("url", scrapeData.url)
     .eq("status", "completed")
     .neq("id", auditId)
     .order("created_at", { ascending: false })
     .limit(1)
     .maybeSingle();
   ```

2. Parse previous content optimizations from `raw_ai_response` and build a "previously applied" context block.

3. Add a new section to the AI prompt (after the PAGE DATA section, around line 224):
   ```
   PREVIOUSLY APPLIED OPTIMIZATIONS (from prior audit of this same URL):
   The following text changes were recommended in a previous audit and have likely been applied.
   DO NOT suggest changing these texts again UNLESS you have strong, specific evidence
   that the current version is underperforming. If the current text matches or closely
   resembles a previously recommended "optimized_version", skip it in content_optimizations.
   
   - Element: Hero Headline
     Previously recommended: "Instantly Brand Your Coaching Business..."
   - Element: Sub-headline
     Previously recommended: "Get pre-written contracts..."
   ...
   ```

4. Add a matching instruction to the `content_optimizations` tool description:
   ```
   "IMPORTANT: Do NOT re-optimize text that matches previously applied recommendations
   (listed in PREVIOUSLY APPLIED OPTIMIZATIONS). Only suggest changes for elements that
   were NOT previously optimized or where genuine new issues are found."
   ```

### What This Achieves

- The AI sees exactly which texts were its own prior suggestions
- It skips re-optimizing text that already matches what it previously recommended
- It can still flag genuinely new issues on repeated elements if the context has changed
- No database schema changes needed -- uses existing `raw_ai_response` field

