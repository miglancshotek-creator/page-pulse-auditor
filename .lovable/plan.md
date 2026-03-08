

## Problem

The homepage screenshot displayed in the audit results is missing background images. Firecrawl captures the page but doesn't wait long enough for all images (especially lazy-loaded background images) to render before taking the screenshot.

## Solution

Two changes:

### 1. Add `waitFor` to Firecrawl scrape request

In `supabase/functions/scrape-page/index.ts`, add a `waitFor: 5000` parameter to the Firecrawl API call. This gives the browser time to fully load background images, lazy-loaded content, and CSS background images before capturing the screenshot.

```typescript
body: JSON.stringify({
  url,
  formats: ["markdown", "html", "screenshot", "links"],
  onlyMainContent: false,
  waitFor: 5000,
  ...(mobile ? { mobile: true } : {}),
}),
```

### 2. Create an image-proxy edge function (for PDF export)

The PDF export uses `html2canvas` with `useCORS: true`, but external screenshot URLs may still fail due to CORS. Create a `supabase/functions/image-proxy/index.ts` edge function that fetches images server-side and returns them with proper CORS headers. This ensures the PDF export can render the screenshot images correctly.

### 3. Update AuditResult to proxy screenshot for PDF

In the PDF export logic in `src/pages/AuditResult.tsx`, before rendering with html2canvas, convert external screenshot image URLs to proxied base64 data URLs so they render reliably in the PDF.

## Files to change
- `supabase/functions/scrape-page/index.ts` — add `waitFor: 5000`
- `supabase/functions/image-proxy/index.ts` — new edge function
- `src/pages/AuditResult.tsx` — proxy screenshot images before PDF capture

**Note:** Existing audits will keep their current screenshots. Only new audits will benefit from the improved `waitFor` setting. To get a better screenshot for inspekto.cz, you'd need to re-run the audit.

