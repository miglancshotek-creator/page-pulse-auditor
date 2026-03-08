
Goal: keep homepage screenshot proportions identical in PDF (no squeezing) while leaving on-screen Audit UI untouched.

1) Root cause to address
- In `src/pages/AuditResult.tsx` (`exportPDF`), screenshot sections are currently passed with `maxH: 80`.
- `addSection()` then keeps width fixed (`CW`) but clamps height (`hMM`) to `maxH`, which distorts aspect ratio (vertical squeeze).

2) Implementation approach (PDF-only)
- Edit only PDF export logic in `src/pages/AuditResult.tsx`; do not change render JSX/classes used by website view.
- Refactor `addSection()` to preserve aspect ratio whenever a section needs size limiting:
  - Compute natural `wMM` / `hMM` from canvas.
  - If a max height is applied, scale both width and height by the same factor (`factor = maxH / hMM`) instead of changing height alone.
  - Center the narrowed section horizontally (`x = M + (CW - drawW)/2`) so layout still looks intentional.
- Keep current section pagination and page-break behavior, but apply it to final scaled dimensions.
- Keep screenshot grid override logic (single-column only when there are multiple screenshot cards), since that is unrelated to distortion and already protects layout on A4.

3) Practical adjustment to screenshot handling
- Replace current “height cap only” behavior for screenshot sections:
  - Either remove screenshot cap entirely, or keep a soft cap that uses proportional scaling.
- Preferred: keep a proportional cap (for visual balance on page 1) but never distort dimensions.

4) Safety constraint (as requested)
- No changes to audit webpage component structure/styles.
- Only `exportPDF` internals change (clone/canvas/jsPDF drawing math).

5) Verification checklist
- Export report with desktop-only screenshot: compare browser vs PDF, ratio must match exactly.
- Export report with desktop + mobile screenshots: ensure stack behavior remains correct and each image keeps native ratio.
- Confirm no regressions in Health Score / Issues / Overall frames in PDF and no visual change on website.
