

## Feature: "Build Prompt" Generator — Audit to Build

Generate a downloadable `.txt` file containing a detailed Lovable-ready prompt to rebuild the audited landing page with all audit fixes applied.

### How it works

A new **"Download Build Prompt"** button will appear on the audit result page (next to the existing "Download PDF" button). When clicked, it generates a structured text prompt from the audit data and triggers a `.txt` file download — no backend needed.

### Prompt structure (generated from audit data)

The `.txt` file will contain a comprehensive Lovable prompt structured as:

1. **Header** — "Build a high-converting landing page based on the following audit analysis"
2. **Original page info** — URL, title, audit date
3. **Conversion Rate Score** — Overall score + per-framework scores with key issues
4. **Critical issues to fix** — Each issue with its solution, organized by framework
5. **Content optimizations** — Current vs optimized text for headings, CTAs, etc.
6. **Overall summary & next steps** — Narrative + prioritized action items
7. **Build instructions** — Explicit instructions for Lovable to create a modern, conversion-optimized landing page incorporating all fixes

### Files to change

1. **`src/pages/AuditResult.tsx`** — Add a `generateBuildPrompt()` function that assembles the text from `rawResults` and `audit` data, creates a Blob, and triggers download. Add a new button in the header next to "Download PDF".

2. **`src/contexts/LanguageContext.tsx`** — Add translation keys for the new button label (`result.downloadPrompt`).

### UI placement

The button will sit in the header bar alongside "Download PDF" and "Share", with a download icon and label "Download Build Prompt" / "Stáhnout Build Prompt".

### Technical approach

- Pure client-side: no edge function needed
- Uses `Blob` + `URL.createObjectURL` + temporary `<a>` element for download
- Filename: `build-prompt-{page-title}.txt`
- The prompt text will be bilingual based on current language setting

