

## Plan: Make PDF Export Match Website Layout

### Problem
The current PDF export logic aggressively overrides the web layout:
1. **Forces all flex/grid to `display: block`** — breaks the side-by-side screenshot layout and all card structures
2. **Shrinks FrameworkScores to 50%** — but on web it's now full-width
3. **Strips `max-w-5xl`** — removes the width constraints that give the web its clean centered look

### Solution
Rewrite the PDF clone preparation to **preserve the web layout** instead of fighting it:

1. **Remove the blanket `display: block` override** — only disable animations and force opacity to 1
2. **Remove the FrameworkScores 50% shrink** — it should be full-width like the web
3. **Keep `max-w-5xl` constraints** — or better, set the clone's inner container to match the render width naturally
4. **Set clone width to ~1200px** (closer to actual web viewport) instead of 800px for better fidelity
5. **Only override grid on screenshot section** for PDF: force single-column for desktop+mobile screenshots so they stack vertically (they won't fit side-by-side at A4 width)

### File Changes

**`src/pages/AuditResult.tsx`** — `exportPDF` function only:
- Change `RENDER_W` from 800 to 1100 (better match to `max-w-6xl` container)
- Replace the blanket `display: block` loop with targeted approach:
  - Only disable animations and force opacity
  - Remove max-width constraints so content fills the render width
  - Force the screenshot grid to single-column only
- Remove the `[data-fw-scores]` 50% width shrink entirely
- Keep everything else (section capture, page break logic, addSection helper) as-is

