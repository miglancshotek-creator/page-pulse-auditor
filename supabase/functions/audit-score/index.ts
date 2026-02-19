import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { auditId, scrapeData } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch knowledge base criteria
    const { data: criteria } = await supabase.from("knowledge_base").select("*");
    const criteriaText = (criteria || [])
      .map((c) => `[${c.category}] ${c.criterion} (weight: ${c.weight}): ${c.description}`)
      .join("\n");

    const prompt = `You are an expert landing page conversion auditor. Analyze the following page data against the criteria below.

CRITICAL LIMITATIONS OF SCRAPED DATA:
- The scraper captures only a PARTIAL view of the page. It extracts some CTA texts, headers, and body text, but it does NOT capture the full page layout, element positions, or every button/link on the page.
- You can see SOME CTA texts in the data, but the list is NOT exhaustive. The page almost certainly has MORE buttons and CTAs than what appears in the scraped data.
- NEVER claim that a CTA, button, or element is "missing" or "not present" unless you have very strong evidence. The absence of an element from scraped data does NOT mean it's absent from the page.
- NEVER recommend "adding" or "inserting" CTAs in specific page sections — you cannot see where CTAs are positioned on the page.
- Instead of recommendations about CTA placement/frequency, focus on CTA copy quality, contrast, urgency, and microcopy based on what you CAN observe.
- Similarly, do NOT make claims about element ordering, spacing, or visual layout that the text-based scrape cannot reveal.

AUDIT CRITERIA:
${criteriaText}

PAGE DATA:
- URL: ${scrapeData.url}
- Title: ${scrapeData.pageTitle}
- Meta Description: ${scrapeData.metaDescription || "MISSING"}
- OG Tags: ${JSON.stringify(scrapeData.ogTags || {})}
- Headers: ${JSON.stringify(scrapeData.headers || [])}
- CTA Texts Found (partial list, page may have more): ${JSON.stringify(scrapeData.ctaTexts || [])}
- Body Text (excerpt): ${(scrapeData.bodyText || "").substring(0, 3000)}

MOBILE LAYOUT SIGNALS:
${JSON.stringify(scrapeData.mobileSignals || {}, null, 2)}

Use the Mobile Layout Signals above to score the Mobile Layout category. Key indicators:
- viewportMeta: Should be present with "width=device-width"
- mediaQueryCount: Higher = more responsive design
- hasResponsiveFramework: Whether a responsive CSS framework is detected
- hasStickyElements: Sticky nav/CTA is good for mobile UX
- images.lazyLoaded vs images.total: Lazy loading improves mobile performance
- smallFontCount: Fewer small fonts = better mobile readability
- fixedWidthElements: Should be 0 for good mobile layout
- hasTelLinks: Click-to-call links are mobile-friendly
- hasManifest/hasAppleTouchIcon/hasThemeColor: PWA/mobile-app readiness

SCORING INSTRUCTIONS:
1. For each of the 5 categories, count how many criteria PASS vs FAIL based on evidence found in the page data.
2. Calculate each category score as a PERCENTAGE from 0 to 100: (passing_count / total_criteria_in_category) * 100, rounded to nearest integer.
   - Example: if a category has 8 criteria and 6 pass, the score is round(6/8 * 100) = 75.
   - Scores MUST be integers between 0 and 100. Never return raw counts like 0, 1, 2, etc.
3. Calculate overall_score as the weighted average: Messaging Clarity 30% + CTA Strength 25% + Trust Signals 20% + Mobile Layout 15% + SEO Meta-data 10%.
4. For the breakdown, set status: "pass" if score >= 80, "warning" if score >= 50, "fail" if score < 50.
5. For each category's recommendation, write 2-4 sentences of specific, actionable advice referencing actual elements found (or missing) on the page. Mention specific text, buttons, sections by name. Do NOT write generic advice. NEVER claim a CTA or element is missing if it could simply be outside the scraped excerpt.
6. For quick_wins, identify the top 3 highest-impact, easiest-to-implement changes. Each must have a specific title, a detailed description (2-3 sentences referencing the actual page content), and an impact level. NEVER suggest adding CTAs to specific sections since you cannot verify their absence.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        temperature: 0,
        messages: [
          { role: "system", content: "You are a landing page conversion optimization expert. You must return scores as percentages (0-100), NOT as raw criterion counts. Write detailed, page-specific recommendations that reference actual elements on the page. CRITICAL: The scraped data is INCOMPLETE — never claim CTAs or elements are missing just because they don't appear in the partial scrape. Focus recommendations on copy quality, trust signals, and verifiable issues rather than element placement or frequency." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_audit_results",
              description: "Submit the complete audit results with percentage scores (0-100) and detailed recommendations",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "Overall weighted percentage score from 0 to 100" },
                  scores: {
                    type: "object",
                    description: "Each score is a percentage from 0 to 100, NOT a raw count",
                    properties: {
                      messaging_clarity: { type: "number", description: "Percentage score 0-100" },
                      trust_signals: { type: "number", description: "Percentage score 0-100" },
                      cta_strength: { type: "number", description: "Percentage score 0-100" },
                      mobile_layout: { type: "number", description: "Percentage score 0-100" },
                      seo_metadata: { type: "number", description: "Percentage score 0-100" },
                    },
                    required: ["messaging_clarity", "trust_signals", "cta_strength", "mobile_layout", "seo_metadata"],
                  },
                  quick_wins: {
                    type: "array",
                    description: "Top 3 highest-impact changes with detailed descriptions",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string", description: "Short actionable title" },
                        description: { type: "string", description: "2-3 sentences of specific advice referencing actual page elements" },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["title", "description", "impact"],
                    },
                  },
                  breakdown: {
                    type: "array",
                    description: "One entry per category with percentage score and detailed recommendation",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        score: { type: "number", description: "Percentage score 0-100" },
                        status: { type: "string", enum: ["pass", "warning", "fail"] },
                        recommendation: { type: "string", description: "2-4 sentences of specific, actionable advice referencing actual page content" },
                      },
                      required: ["category", "score", "status", "recommendation"],
                    },
                  },
                },
                required: ["overall_score", "scores", "quick_wins", "breakdown"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_audit_results" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI scoring failed");
    }

    const aiData = await response.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in AI response");

    const results = JSON.parse(toolCall.function.arguments);

    // Validate scores are percentages, not raw counts
    const scoreKeys = ["messaging_clarity", "trust_signals", "cta_strength", "mobile_layout", "seo_metadata"];
    for (const key of scoreKeys) {
      if (results.scores[key] !== undefined && results.scores[key] <= 8) {
        // Likely a raw count out of 8 criteria — convert to percentage
        results.scores[key] = Math.round((results.scores[key] / 8) * 100);
      }
    }
    // Recalculate overall if individual scores were fixed
    const weights = { messaging_clarity: 0.30, trust_signals: 0.20, cta_strength: 0.25, mobile_layout: 0.15, seo_metadata: 0.10 };
    results.overall_score = Math.round(
      scoreKeys.reduce((sum, k) => sum + (results.scores[k] || 0) * weights[k], 0)
    );
    // Fix breakdown scores too
    if (Array.isArray(results.breakdown)) {
      for (const item of results.breakdown) {
        if (item.score !== undefined && item.score <= 8) {
          item.score = Math.round((item.score / 8) * 100);
        }
        item.status = item.score >= 80 ? "pass" : item.score >= 50 ? "warning" : "fail";
      }
    }

    // Update audit in database
    const { error: updateError } = await supabase
      .from("audits")
      .update({
        overall_score: Math.round(results.overall_score),
        scores: results.scores,
        quick_wins: results.quick_wins,
        breakdown: results.breakdown,
        raw_ai_response: JSON.stringify(results),
        status: "completed",
      })
      .eq("id", auditId);

    if (updateError) {
      console.error("DB update error:", updateError);
      throw new Error("Failed to save results");
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Audit error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
