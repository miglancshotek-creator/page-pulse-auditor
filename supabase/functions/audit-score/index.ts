import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { auditId, scrapeData, language = "cs" } = await req.json();
    const isEn = language === "en";

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

    const langInstruction = isEn
      ? "You are a landing page conversion optimization expert. Write ALL output in English."
      : "Jsi expert na konverzní optimalizaci landing page. VEŠKERÝ VÝSTUP PIŠ V ČEŠTINĚ. Používej správnou češtinu bez anglicismů a podivných formulací.";

    const prompt = `${langInstruction} Analyze the following page data and provide a comprehensive audit.

CRITICAL LIMITATIONS OF EXTRACTED DATA:
- The scraper captures only a PARTIAL view of the page. It extracts some CTA texts, headings and text, but NOT the entire page layout.
- NEVER claim that a CTA, button or element is "missing" — absence in extracted data DOES NOT mean absence on the page.
- Focus on text quality, trust signals and verifiable issues, not placement or frequency of elements.

AUDIT CRITERIA:
${criteriaText}

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

4. Also provide legacy scores for backward compatibility.`;

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
                    description: "Content optimization cards for key text elements (heading, subheadline, CTA)",
                    items: {
                      type: "object",
                      properties: {
                        element: { type: "string", description: "Element name e.g. 'Heading', 'Subheadline', 'CTA'" },
                        impact_score: { type: "number", description: "Impact score 1-10" },
                        current_version: { type: "string", description: "The current text found on the page" },
                        optimized_version: { type: "string", description: "Your optimized version of the text" },
                        reasons: {
                          type: "array",
                          description: "List of reasons why the optimized version is better",
                          items: { type: "string" },
                        },
                      },
                      required: ["element", "impact_score", "current_version", "optimized_version", "reasons"],
                    },
                  },
                  performance_analysis: {
                    type: "array",
                    description: "5 performance dimensions: Relevance, Propensity To Take Action, Persuasiveness, Motivation, Focus On The Goal",
                    items: {
                      type: "object",
                      properties: {
                        dimension: { type: "string", description: "Dimension name" },
                        score: { type: "number", description: "Score 1-10" },
                        description: { type: "string", description: "What this dimension measures (1 sentence)" },
                        expert_insight: { type: "string", description: "Expert insight specific to this page (1-2 sentences)" },
                        action_items: {
                          type: "array",
                          description: "3 specific action items",
                          items: { type: "string" },
                        },
                      },
                      required: ["dimension", "score", "description", "expert_insight", "action_items"],
                    },
                  },
                  overall_summary: {
                    type: "object",
                    description: "Overall performance summary",
                    properties: {
                      score: { type: "number", description: "Overall score 1-10" },
                      narrative: { type: "string", description: "Detailed summary paragraph about the page's performance" },
                      next_steps: {
                        type: "array",
                        description: "5 recommended next steps",
                        items: { type: "string" },
                      },
                    },
                    required: ["score", "narrative", "next_steps"],
                  },
                  quick_wins: {
                    type: "array",
                    description: "Top 3 highest-impact changes",
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
                    description: "Legacy breakdown by category",
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
                },
                required: ["overall_score", "scores", "content_optimizations", "performance_analysis", "overall_summary", "quick_wins", "breakdown"],
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
