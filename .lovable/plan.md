

## Fix: Firecrawl Returning Cached/Stale Page Content

### Root Cause

Firecrawl caches previously scraped pages with a **default freshness window of 2 days** (172,800,000 ms). When you re-audit the same URL after making changes, Firecrawl returns its cached (pre-change) version of the page. The AI auditor then sees the old content and re-suggests the same fixes.

### Solution

Add `maxAge: 0` to the Firecrawl scrape request in `supabase/functions/scrape-page/index.ts` to force a fresh scrape every time.

### Changes

**File: `supabase/functions/scrape-page/index.ts`** — In the `scrapeUrl` function, add `maxAge: 0` to the request body:

```typescript
body: JSON.stringify({
  url,
  formats: ["markdown", "html", "screenshot", "links"],
  onlyMainContent: false,
  waitFor: 5000,
  maxAge: 0,  // Always fetch fresh content, never use cache
  ...(mobile ? { mobile: true } : {}),
}),
```

This is a one-line addition. After deploying, every audit will scrape the live page fresh, ensuring the auditor sees your latest changes.

