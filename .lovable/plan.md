

## Fix: Smart Quotes Used as Apostrophes Break Bold Formatting

### Problem

The AI uses smart/curly quotes (`"` `"`) inconsistently — sometimes as real quotation marks around phrases, but also as apostrophes in contractions like `don"t` and possessives like `That"s`. The current regex sees these as quote boundaries and matches huge spans of text between unrelated quote characters.

Example from screenshot: `"The Remote Business Opportunity That"s Creating Financial Freedom For Women" are too generic. They don"t` — the `"s` and `"t` act as false quote boundaries.

### Solution

Add boundary checks so a quote character only counts as an opening/closing quote when it's NOT sandwiched between two word characters (which indicates an apostrophe/contraction usage).

**File: `src/lib/bold-quotes.tsx`** (line 14)

Replace the regex with one that uses negative lookbehind/lookahead:
```typescript
// Opening quote must NOT be preceded by a word char (avoids "That"s")
// Closing quote must NOT be followed by a word char (avoids "don"t")
const pattern = /(?<!\w)[""\u201C\u201D«»](.+?)[""\u201C\u201D«»](?!\w)|(?<!\w)'([^']*\s[^']*?)'(?!\w)/g;
```

This single regex change ensures:
- `"Register Your Spot Now"` → **bolded** (quotes preceded/followed by space/punctuation)
- `That"s` → not matched (quote between word chars)
- `don"t` → not matched (quote between word chars)
- `'multi word phrase'` → **bolded** (single quotes with spaces, at word boundaries)

