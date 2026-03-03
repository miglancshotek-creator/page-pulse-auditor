import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { auditId, scrapeData, language = "cs", businessContext } = await req.json();
    const isEn = language === "en";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: criteria } = await supabase.from("knowledge_base").select("*");
    const criteriaText = (criteria || [])
      .map((c) => `[${c.category}] ${c.criterion} (weight: ${c.weight}): ${c.description}`)
      .join("\n");

    const { data: guidelinesData } = await supabase.from("audit_guidelines").select("content").limit(1).single();
    const guidelinesText = guidelinesData?.content || "";

    // Build business context section
    const bc = businessContext || {};
    const businessContextText = bc.monthlyAdSpend ? `
BUSINESS CONTEXT:
- Monthly Ad Spend: €${bc.monthlyAdSpend}
- Traffic Source: ${bc.trafficSourceLabel || bc.trafficSource || "Unknown"}
- Current Conversion Rate: ${bc.conversionRate ? bc.conversionRate + "%" : "Not provided (use industry average for " + (bc.businessTypeLabel || "this business type") + ")"}
- Business Type: ${bc.businessTypeLabel || bc.businessType || "Unknown"}
- Average Revenue per Conversion: ${bc.avgOrderValue ? "€" + bc.avgOrderValue : "Not provided (use industry benchmark)"}

REVENUE LOSS CALCULATION — FOLLOW THIS FORMULA EXACTLY:

Step 1: Estimate CPC (Cost Per Click) for the traffic source:
  - Google Search Ads: €1.00–3.00
  - Google Shopping: €0.50–1.50
  - Google Display: €0.30–0.80
  - Meta/Facebook/Instagram: €0.40–1.50
  - LinkedIn Ads: €3.00–8.00
  - Email Campaign: €0 CPC — estimate 5,000–20,000 recipients, 20% open rate, 3% CTR → visitors
  - Organic/SEO: €0 CPC — estimate monthly organic visitors at 1,000–5,000
  - Mixed Sources: use a blended CPC of €1.00–2.00
  Pick a specific CPC value within the range and state it.

Step 2: Calculate Monthly Visitors:
  Monthly Visitors = Monthly Ad Spend (€${bc.monthlyAdSpend}) / estimated CPC
  (For organic/email: use the visitor estimate directly, ignore ad spend for visitor calc)

Step 3: Calculate Current Conversions:
  If conversion rate is provided: use ${bc.conversionRate ? bc.conversionRate + "%" : "industry average"}
  Industry averages if not provided: E-commerce ~2.5%, SaaS ~3-5%, Lead Gen ~5-10%, Agency ~3-7%, Local ~5-8%
  Current Conversions = Monthly Visitors × Conversion Rate

Step 4: Revenue per Conversion:
  ${bc.avgOrderValue ? "Use the provided value: €" + bc.avgOrderValue : "Use industry benchmark: E-commerce €50-80, SaaS €30-100/mo, Lead Gen €50-200, Agency €100-300, Local €30-80"}

Step 5: For EACH conversion issue found:
  a. State the estimated RELATIVE conversion rate drop (e.g., "8% relative drop means CR goes from 2.5% to 2.3%")
  b. Lost Conversions = Monthly Visitors × (Conversion Rate × relative_drop_percentage)
  c. Monthly Loss = Lost Conversions × Revenue per Conversion

Step 6: SHOW ALL MATH in the explanation field for each item. Example:
  "CPC est. €1.50 → ${bc.monthlyAdSpend}/1.50 = X visitors/mo. CR 2.5%, relative drop 10% → X × 0.25% = Y lost conversions. At €65/conv → €Z/mo lost."

CRITICAL: Do NOT confuse ad spend with traffic volume. Ad spend ÷ CPC = visitors. Never say "€7500 ad spend = 225 conversions".` : "";

    const langInstruction = isEn
      ? "You are a landing page conversion optimization expert. Write ALL output in English."
      : "Jsi expert na konverzní optimalizaci landing page. VEŠKERÝ VÝSTUP PIŠ V ČEŠTINĚ. Používej správnou češtinu bez anglicismů a podivných formulací.";

    const prompt = `${langInstruction} Analyze the following page data and provide a comprehensive audit.

${guidelinesText ? `GENERAL GUIDELINES:\n${guidelinesText}\n` : ""}
CRITICAL LIMITATIONS OF EXTRACTED DATA:
- The scraper captures only a PARTIAL view of the page. It extracts some CTA texts, headings and text, but NOT the entire page layout.
- NEVER claim that a CTA, button or element is "missing" — absence in extracted data DOES NOT mean absence on the page.
- Focus on text quality, trust signals and verifiable issues, not placement or frequency of elements.

AUDIT CRITERIA:
${criteriaText}
${businessContextText}

PAGE DATA:
- URL: ${scrapeData.url}
- Title: ${scrapeData.pageTitle}
- Meta description: ${scrapeData.metaDescription || (isEn ? "MISSING" : "CHYBÍ")}
- OG tags: ${JSON.stringify(scrapeData.ogTags || {})}
- Headers: ${JSON.stringify(scrapeData.headers || [])}
- Found CTA texts (partial list): ${JSON.stringify(scrapeData.ctaTexts || [])}
- Page text (excerpt): ${(scrapeData.bodyText || "").substring(0, 3000)}

MOBILE LAYOUT SIGNALS:
${JSON.stringify(scrapeData.mobileSignals || {}, null, 2)}

YOUR TASK:
1. Provide CONTENT OPTIMIZATION RECOMMENDATIONS for key text elements (heading, subheadline, CTA). For each show current version, write optimized version and explain why it's better with specific points.

2. Provide DETAILED PERFORMANCE ANALYSIS in 5 dimensions: ${isEn ? "Relevance, Propensity To Take Action, Persuasiveness, Motivation, Focus On The Goal" : "Relevance, Sklon k akci, Přesvědčivost, Motivace, Zaměření na cíl"}. For each provide score (1-10), description, expert insight specific to this page and 3 action items.

3. Provide OVERALL PERFORMANCE SCORE (1-10) with detailed narrative summary and next steps.

4. Also provide legacy scores for backward compatibility.

${bc.monthlyAdSpend ? `5. Provide REVENUE LOSS ESTIMATION: For each major conversion issue found, estimate the monthly revenue loss in euros based on the business context provided. List 3-5 specific issues with their estimated monthly loss.` : ""}`;

    // Build tools array
    const revenueLossProperties = bc.monthlyAdSpend ? {
      revenue_loss: {
        type: "object",
        description: "Revenue loss estimation based on business context. All math must be shown.",
        properties: {
          estimated_cpc: { type: "number", description: "The CPC value used for calculation (in euros)" },
          estimated_monthly_visitors: { type: "number", description: "Monthly visitors = ad spend / CPC" },
          conversion_rate_used: { type: "number", description: "Conversion rate used (percentage, e.g. 2.5)" },
          revenue_per_conversion: { type: "number", description: "Revenue per conversion in euros" },
          total_monthly_loss: { type: "number", description: "Total estimated monthly revenue loss in euros" },
          total_annual_loss: { type: "number", description: "Total estimated annual revenue loss (monthly × 12)" },
          items: {
            type: "array",
            description: "3-5 specific conversion issues with estimated revenue impact",
            items: {
              type: "object",
              properties: {
                issue: { type: "string", description: "The specific conversion issue" },
                estimated_monthly_loss: { type: "number", description: "Estimated monthly loss in euros for this issue" },
                severity: { type: "string", enum: ["high", "medium", "low"] },
                relative_cr_drop_percent: { type: "number", description: "Estimated relative CR drop in % (e.g. 10 means 10% relative drop)" },
                lost_conversions: { type: "number", description: "Number of lost conversions per month from this issue" },
                explanation: { type: "string", description: "Full math breakdown: CPC used, visitors calculated, CR drop, lost conversions, revenue per conversion, final loss" },
              },
              required: ["issue", "estimated_monthly_loss", "severity", "relative_cr_drop_percent", "lost_conversions", "explanation"],
            },
          },
        },
        required: ["estimated_cpc", "estimated_monthly_visitors", "conversion_rate_used", "revenue_per_conversion", "total_monthly_loss", "total_annual_loss", "items"],
      },
    } : {};

    const requiredFields = ["overall_score", "scores", "content_optimizations", "performance_analysis", "overall_summary", "quick_wins", "breakdown"];
    if (bc.monthlyAdSpend) requiredFields.push("revenue_loss");

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
          { role: "system", content: isEn ? "You are a landing page conversion optimization expert. Provide detailed page-specific analysis. Extracted data is INCOMPLETE — never claim CTAs or elements are missing. Write ALL output in English." : "Jsi expert na konverzní optimalizaci landing page. Poskytuj podrobnou analýzu specifickou pro danou stránku. Extrahovaná data jsou NEÚPLNÁ — nikdy netvrd, že CTA nebo prvky chybí. VEŠKERÝ VÝSTUP PIŠ V ČEŠTINĚ. Používej správnou spisovnou češtinu." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_audit_results",
              description: "Submit the complete audit results",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "Overall weighted percentage score 0-100 for legacy compatibility" },
                  scores: {
                    type: "object",
                    properties: {
                      messaging_clarity: { type: "number", description: "Percentage score 0-100" },
                      trust_signals: { type: "number", description: "Percentage score 0-100" },
                      cta_strength: { type: "number", description: "Percentage score 0-100" },
                      mobile_layout: { type: "number", description: "Percentage score 0-100" },
                      seo_metadata: { type: "number", description: "Percentage score 0-100" },
                    },
                    required: ["messaging_clarity", "trust_signals", "cta_strength", "mobile_layout", "seo_metadata"],
                  },
                  content_optimizations: {
                    type: "array",
                    description: "Content optimization cards for key text elements",
                    items: {
                      type: "object",
                      properties: {
                        element: { type: "string" },
                        impact_score: { type: "number" },
                        current_version: { type: "string" },
                        optimized_version: { type: "string" },
                        reasons: { type: "array", items: { type: "string" } },
                      },
                      required: ["element", "impact_score", "current_version", "optimized_version", "reasons"],
                    },
                  },
                  performance_analysis: {
                    type: "array",
                    description: "5 performance dimensions",
                    items: {
                      type: "object",
                      properties: {
                        dimension: { type: "string" },
                        score: { type: "number" },
                        description: { type: "string" },
                        expert_insight: { type: "string" },
                        action_items: { type: "array", items: { type: "string" } },
                      },
                      required: ["dimension", "score", "description", "expert_insight", "action_items"],
                    },
                  },
                  overall_summary: {
                    type: "object",
                    properties: {
                      score: { type: "number" },
                      narrative: { type: "string" },
                      next_steps: { type: "array", items: { type: "string" } },
                    },
                    required: ["score", "narrative", "next_steps"],
                  },
                  quick_wins: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        impact: { type: "string", enum: ["high", "medium", "low"] },
                      },
                      required: ["title", "description", "impact"],
                    },
                  },
                  breakdown: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        category: { type: "string" },
                        score: { type: "number" },
                        status: { type: "string", enum: ["pass", "warning", "fail"] },
                        recommendation: { type: "string" },
                      },
                      required: ["category", "score", "status", "recommendation"],
                    },
                  },
                  ...revenueLossProperties,
                },
                required: requiredFields,
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

    // Validate scores are percentages
    const scoreKeys = ["messaging_clarity", "trust_signals", "cta_strength", "mobile_layout", "seo_metadata"];
    for (const key of scoreKeys) {
      if (results.scores[key] !== undefined && results.scores[key] <= 8) {
        results.scores[key] = Math.round((results.scores[key] / 8) * 100);
      }
    }
    const weights = { messaging_clarity: 0.30, trust_signals: 0.20, cta_strength: 0.25, mobile_layout: 0.15, seo_metadata: 0.10 };
    results.overall_score = Math.round(
      scoreKeys.reduce((sum, k) => sum + (results.scores[k] || 0) * weights[k], 0)
    );
    if (Array.isArray(results.breakdown)) {
      for (const item of results.breakdown) {
        if (item.score !== undefined && item.score <= 8) {
          item.score = Math.round((item.score / 8) * 100);
        }
        item.status = item.score >= 80 ? "pass" : item.score >= 50 ? "warning" : "fail";
      }
    }

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
