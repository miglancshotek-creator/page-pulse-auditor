

## Fix: Single-Quote Pattern Fails on Apostrophes Inside Citations

### Problem
The text `'The Remote Business Opportunity That's Creating Financial Freedom For Women'` isn't matched because the regex `[^']*` stops at the apostrophe in `That's`, treating it as the closing quote.

### Solution
Allow apostrophes (single quotes followed by a word character) inside single-quoted content.

**File: `src/lib/bold-quotes.tsx`** — update the single-quote portion of the regex (line 14):

Current single-quote pattern:
```
(?<!\w)'([^']*\s[^']*?)'(?!\w)
```

New pattern:
```
(?<!\w)'((?:[^']|'(?=\w))*?\s(?:[^']|'(?=\w))*?)'(?!\w)
```

Logic: `[^']` matches any non-quote char; `'(?=\w)` matches an apostrophe (quote followed by a word char like `s` in `That's`). The closing `'(?!\w)` ensures only a quote NOT followed by a word char ends the match.

