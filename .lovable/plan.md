
# Fix Knowledge Base: Store Full Guidelines + Clean Parsing

## Problem
The uploaded `.txt` file contains two types of content:
1. **Structured criteria** (40 items across 5 categories) -- these ARE being extracted, but with garbage Unicode characters in the names
2. **General guidelines** (Scoring Philosophy, No Copy Rewriting rule, Scoring Output Format) -- these are LOST because there's no place to store them

## Solution

### 1. Add a `raw_guidelines` column to `knowledge_base` config
Create a new table `audit_guidelines` with a single row to store the raw guidelines text (the non-criteria sections of the uploaded document).

**New table: `audit_guidelines`**
- `id` (uuid, primary key)
- `content` (text) -- the raw guidelines text
- `created_at` (timestamptz)
- RLS: publicly readable (same as knowledge_base)

### 2. Update the `admin-kb` edge function
- Modify the AI extraction prompt to:
  - Extract **general guidelines** separately (Scoring Philosophy, No Copy Rewriting, Scoring Output Format)
  - Add a `general_guidelines` field to the tool schema (a single string with all non-criteria instructions)
  - Clean criterion names -- explicitly instruct the AI to use plain ASCII names only, no special characters
- After parsing, store the general guidelines in the `audit_guidelines` table
- Clear and re-insert criteria as before (but with clean names)

### 3. Update the `audit-score` edge function
- Fetch from `audit_guidelines` table alongside `knowledge_base`
- Prepend the raw guidelines text to the AI prompt before the structured criteria section, so the audit AI sees instructions like "Score ruthlessly", "No Copy Rewriting", and the output format requirements

### 4. Re-upload the document
After deploying, delete all existing entries (to clear garbage characters) and re-upload the `.txt` file through the admin UI.

## Technical Details

**Database migration:**
```sql
CREATE TABLE audit_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_guidelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guidelines are publicly readable"
  ON audit_guidelines FOR SELECT USING (true);
```

**admin-kb changes (parse_pdf action):**
- Add `general_guidelines` string field to the AI tool schema
- Instruct AI: "Also extract any general scoring rules, philosophy, or output format instructions that are NOT specific criteria. Return them as a single `general_guidelines` text block."
- Instruct AI: "Use plain English names only for criterion names. No special characters, no Unicode symbols."
- After extraction: clear `audit_guidelines` table, insert the general_guidelines text
- Clear `knowledge_base`, insert clean criteria as before

**audit-score changes:**
- Add: `const { data: guidelines } = await supabase.from("audit_guidelines").select("content").limit(1).single();`
- Prepend `guidelines?.content` to the prompt before the `AUDIT CRITERIA:` section

## Files to modify
- **New migration** -- create `audit_guidelines` table
- `supabase/functions/admin-kb/index.ts` -- extract and store general guidelines, fix criterion name cleanup
- `supabase/functions/audit-score/index.ts` -- fetch and include guidelines in prompt
