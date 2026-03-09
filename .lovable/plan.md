

## Investigation: Firecrawl Image Data Collection

### Current Issue Analysis

The user reports that audited pages with many good images aren't including those images in the Build Prompt for reconstruction. This suggests we may not be collecting or including image data properly in our scraping process.

### Investigation Steps

1. **Review Current Firecrawl Implementation**
   - Check what formats we're requesting from Firecrawl API
   - Verify what image-related data we're capturing and storing
   - Analyze the scrape-page edge function configuration

2. **Database Storage Analysis** 
   - Examine what fields in the `audits` table store image/visual data
   - Check if we're storing image URLs, descriptions, or other visual metadata
   - Review sample audit data to see what's actually being captured

3. **Build Prompt Content Review**
   - Analyze what image data (if any) is included in generated Build Prompts
   - Check if we're referencing images from the original page in reconstruction instructions
   - Verify if visual branding/design elements are being preserved

### Expected Findings

Based on the current code I can see:
- The scrape-page function requests formats: `["markdown", "html", "screenshot", "links"]`
- We store `screenshot_url` for the main page screenshot
- We store `body_text` (markdown) and `headers`, `cta_texts`
- BUT: We're likely missing individual image URLs, alt text, and visual asset information

### Proposed Solution

If investigation confirms missing image data:

1. **Enhanced Firecrawl Request**
   - Add `"branding"` format to extract design elements (colors, fonts, logos)
   - Potentially add structured JSON extraction for image metadata
   - Increase `waitFor` time for better image loading

2. **Database Schema Update**
   - Add fields for storing image URLs, branding data, and visual metadata
   - Store comprehensive visual design information

3. **Build Prompt Enhancement**
   - Include image URLs and descriptions in the generated prompt
   - Add visual design preservation instructions with specific assets
   - Reference original images for Lovable to use or recreate

### Files to Investigate
- `supabase/functions/scrape-page/index.ts` - current scraping logic
- Database audit records - what's actually being stored
- `src/pages/AuditResult.tsx` - build prompt generation
- Sample audit data to see missing visual information

