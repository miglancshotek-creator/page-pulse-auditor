import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Firecrawl not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping:", formattedUrl);

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "html", "screenshot", "links"],
        onlyMainContent: false,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Firecrawl error:", data);
      return new Response(JSON.stringify({ error: data.error || "Scrape failed" }), {
        status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract structured data from HTML
    const html = data.data?.html || data.html || "";
    const markdown = data.data?.markdown || data.markdown || "";
    const screenshot = data.data?.screenshot || data.screenshot || "";
    const metadata = data.data?.metadata || data.metadata || {};

    // Extract headers from markdown
    const headerRegex = /^(#{1,3})\s+(.+)$/gm;
    const headers: { level: number; text: string }[] = [];
    let match;
    while ((match = headerRegex.exec(markdown)) !== null) {
      headers.push({ level: match[1].length, text: match[2].trim() });
    }

    // Extract CTA-like text (buttons, links with action words)
    const ctaRegex = /\[([^\]]*(?:start|sign|get|try|buy|join|subscribe|download|register|book|schedule|contact|learn|request|free|demo)[^\]]*)\]/gi;
    const ctaTexts: string[] = [];
    while ((match = ctaRegex.exec(markdown)) !== null) {
      ctaTexts.push(match[1].trim());
    }

    // Also try to extract from HTML for better CTA detection
    const buttonRegex = /<(?:button|a)[^>]*>([^<]{2,50})<\/(?:button|a)>/gi;
    while ((match = buttonRegex.exec(html)) !== null) {
      const text = match[1].trim().replace(/\s+/g, " ");
      if (text.length > 1 && text.length < 50 && !ctaTexts.includes(text)) {
        ctaTexts.push(text);
      }
    }

    // Truncate body text for AI processing
    const bodyText = markdown.substring(0, 5000);

    // Extract mobile layout signals from HTML
    const mobileSignals: Record<string, any> = {};

    // Viewport meta tag
    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']+)["']/i);
    mobileSignals.viewportMeta = viewportMatch ? viewportMatch[1] : null;

    // Check for responsive CSS (media queries in inline styles)
    const mediaQueryCount = (html.match(/@media/gi) || []).length;
    mobileSignals.mediaQueryCount = mediaQueryCount;

    // Check for responsive meta tags / frameworks
    mobileSignals.hasResponsiveFramework = /bootstrap|tailwind|foundation|bulma/i.test(html);

    // Check for touch-friendly elements (large tap targets)
    const inputCount = (html.match(/<input/gi) || []).length;
    const selectCount = (html.match(/<select/gi) || []).length;
    const textareaCount = (html.match(/<textarea/gi) || []).length;
    mobileSignals.formElements = { inputs: inputCount, selects: selectCount, textareas: textareaCount };

    // Check for sticky/fixed elements (likely sticky nav or CTA)
    mobileSignals.hasStickyElements = /position:\s*(?:sticky|fixed)/i.test(html);

    // Check for lazy loading images
    const totalImages = (html.match(/<img/gi) || []).length;
    const lazyImages = (html.match(/loading=["']lazy["']/gi) || []).length;
    mobileSignals.images = { total: totalImages, lazyLoaded: lazyImages };

    // Check for font-size declarations (readable typography)
    const smallFontMatches = html.match(/font-size:\s*(\d+)px/gi) || [];
    const smallFonts = smallFontMatches.filter(f => {
      const size = parseInt(f.match(/(\d+)/)?.[1] || "16");
      return size < 14;
    });
    mobileSignals.smallFontCount = smallFonts.length;

    // Check for horizontal scroll risks (fixed widths)
    const fixedWidths = (html.match(/width:\s*\d{4,}px/gi) || []).length;
    mobileSignals.fixedWidthElements = fixedWidths;

    // Check for mobile-specific link attributes (tel:, mailto:)
    mobileSignals.hasTelLinks = /href=["']tel:/i.test(html);
    mobileSignals.hasMailtoLinks = /href=["']mailto:/i.test(html);

    // Check for PWA / mobile app hints
    mobileSignals.hasManifest = /rel=["']manifest["']/i.test(html);
    mobileSignals.hasAppleTouchIcon = /apple-touch-icon/i.test(html);
    mobileSignals.hasThemeColor = /<meta[^>]*name=["']theme-color["']/i.test(html);

    return new Response(JSON.stringify({
      success: true,
      data: {
        pageTitle: metadata.title || "",
        headers,
        bodyText,
        ctaTexts: ctaTexts.slice(0, 20),
        screenshotUrl: screenshot,
        metaDescription: metadata.description || "",
        ogTags: {
          title: metadata.ogTitle || metadata["og:title"] || "",
          description: metadata.ogDescription || metadata["og:description"] || "",
          image: metadata.ogImage || metadata["og:image"] || "",
        },
        mobileSignals,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Scrape error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
