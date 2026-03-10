

## Fix: Bold Formatting for Single-Quoted Citations

### Problem
The previous fix removed all single-quote matching to avoid bolding apostrophes in contractions ("don't"). But the AI uses single quotes for citations like `'Register Your Spot Now'`, so those are no longer bolded.

### Solution
Use two regex patterns:
1. Double/smart quotes — match as before
2. Single quotes — only match when the content contains at least one space (multi-word phrases like `'Register Your Spot Now'`), which excludes contractions like `don't`

### Changes

**File: `src/lib/bold-quotes.tsx`**

Replace the single regex with a combined pattern:
```typescript
// Double/smart quotes: any content
// Single quotes: only multi-word content (contains a space) to avoid apostrophes
const pattern = /[""\u201C\u201D«»](.+?)[""\u201C\u201D«»]|'([^']*\s[^']*?)'/g;
```

Update the match handler to use either capture group:
```typescript
const quoted = match[1] || match[2];
```

This is a single-file, ~2-line change in `src/lib/bold-quotes.tsx`.

