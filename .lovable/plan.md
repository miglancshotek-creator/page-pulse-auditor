

## Current State

- **Scraping (`scrape-page`):** Calls Firecrawl with no mobile-specific parameters. Firecrawl defaults to a desktop viewport. The `mobileSignals` object is just regex-based HTML inspection (viewport meta, media query count, etc.) — not an actual mobile render.
- **Audit (`audit-score`):** The AI prompt receives `mobileSignals` data and scores based on HTML heuristics, not on what the page actually looks like on mobile.
- **Screenshot:** Only one desktop screenshot is captured.

## What's Needed for True Mobile Auditing

There are two approaches:

### Option A — Dual Scrape (Recommended)
1. **Add a second Firecrawl scrape call** in `scrape-page/index.ts` with mobile parameters:
   - Firecrawl supports `mobile: true` parameter which renders the page with a mobile viewport and user-agent
2. **Return both desktop and mobile data** from the scrape function (desktop screenshot + mobile screenshot, desktop HTML + mobile HTML differences)
3. **Update the audit prompt** to evaluate both versions and include mobile-specific scoring observations
4. **Update the frontend** to show both desktop and mobile screenshots and any mobile-specific issues

### Option B — Mobile Signals Only (Lightweight)
Keep the single scrape but enhance the `mobileSignals` extraction and make the AI prompt weight mobile readiness more heavily based on the existing HTML signals.

### Recommendation
Option A gives a real mobile audit but **doubles the Firecrawl API cost per audit** (2 scrape calls instead of 1). Option B is cheaper but less accurate.

### Technical Changes (Option A)

1. **`supabase/functions/scrape-page/index.ts`** — Add a second Firecrawl call with `mobile: true`, return both datasets under `data.desktop` and `data.mobile`
2. **`supabase/functions/audit-score/index.ts`** — Update the system prompt to evaluate mobile version separately, noting mobile-specific issues (tap targets, text size, layout shifts)
3. **Frontend (`AuditResult.tsx`, `CriticalIssues.tsx`)** — Display mobile screenshot alongside desktop, tag issues as desktop/mobile/both
4. **`AuditForm.tsx` or `Index.tsx`** — Potentially add a toggle for "Include mobile audit" to let users opt in (saves cost)

