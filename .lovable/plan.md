

## Problem Analysis

The PDF export has a fundamental flaw: sections like "Issues Found" framework cards live inside a CSS grid (`lg:col-span-3`) that makes them only ~60% width. The current hack of forcing `display: block` on grids doesn't reliably fix child sizing, causing `html2canvas` to capture distorted/clipped content. The canvas slicing logic for tall sections also has coordinate bugs.

## Plan: Clean PDF Export Rewrite

### 1. Rewrite `exportPDF` in `AuditResult.tsx` — simple, no slicing

Replace the entire export function with a clean approach:

- **Temporary layout override**: Before capture, set `reportRef` to `position: absolute; width: 800px; left: -9999px` and force ALL children to single-column block layout. This guarantees every section renders at full 800px width regardless of grid classes.
- **No canvas slicing**: Remove the complex slice logic entirely. Each `data-pdf-section` gets captured individually. If a section is taller than a page, scale it down to fit rather than slicing (these are card-sized sections, none should exceed a page).
- **Balanced quality**: Use `scale: 1.5` and JPEG at 0.85 quality for smaller file size.
- **Health Score scaling**: Before capturing the FrameworkScores section, temporarily remove `max-w-xs` and set `width: 400px` (50% of 800px container) so it appears half-size in PDF only.
- **Page break logic**: Simple — if section doesn't fit remaining space, `addPage()` and place at top. The `data-pdf-page-break` attribute forces a new page.

### 2. Fix section markup in `CriticalIssues.tsx`

- Keep `data-pdf-section` on each individual framework card (already correct).
- Keep `data-pdf-page-break` on the "Issues Found" title div.
- No other changes needed.

### 3. No changes to `FrameworkScores.tsx`

Keep the current compact web styling. The PDF export will handle sizing separately.

### Technical Details

```text
PDF Page Layout (A4 = 210x297mm, 10mm margins):

Page 1:
  ┌─────────────────────────┐
  │  Page Title + URL        │  ~25mm
  │  Screenshot (capped 80mm)│  ~80mm
  │  Health Score (50% width)│  ~40mm
  │  [remaining space]       │
  └─────────────────────────┘

Page 2+:
  ┌─────────────────────────┐
  │  ⚠ Issues Found (title)  │
  │  Framework Card 1        │
  │  Framework Card 2        │
  │  ... (auto page break)   │
  └─────────────────────────┘
```

Key differences from current approach:
- Fixed-width offscreen rendering eliminates grid distortion
- No canvas slicing = no coordinate bugs
- Each section captured independently at correct dimensions
- JPEG 0.85 + scale 1.5 = ~40% smaller file than current settings

