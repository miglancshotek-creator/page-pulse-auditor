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

    const prompt = `Analyze this landing page data and score it using the criteria and methodology below.

AUDIT CRITERIA (Gold Standard):
${criteriaText}

PAGE DATA:
- URL: ${scrapeData.url}
- Title: ${scrapeData.pageTitle}
- Meta Description: ${scrapeData.metaDescription || "MISSING"}
- OG Tags: ${JSON.stringify(scrapeData.ogTags || {})}
- Headers: ${JSON.stringify(scrapeData.headers || [])}
- CTA Texts Found: ${JSON.stringify(scrapeData.ctaTexts || [])}
- Body Text (excerpt): ${(scrapeData.bodyText || "").substring(0, 3000)}

SCORING METHODOLOGY (follow exactly):
For each category, evaluate each criterion as PASS (1) or FAIL (0).
Category score = (number of passing criteria / total criteria in category) * 100, rounded to nearest integer.
Overall score = weighted average using these weights:
  Messaging Clarity: 30%, Trust Signals: 20%, CTA Strength: 25%, Mobile Layout: 15%, SEO Meta-data: 10%

Be binary -- either evidence exists on the page or it does not. Do not use partial credit.

For each category that scores below 80, provide a specific actionable fix based on the criteria above.
Also identify the top 3 "quick wins" — the highest-impact, easiest-to-implement changes.

LANGUAGE RULE: Detect the language of the page content (title, headers, body text). Write ALL text output (recommendations, quick_wins titles/descriptions, breakdown recommendations) in that same language. Category names stay in English.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0,
        messages: [
          { role: "system", content: "You are a landing page conversion optimization expert. Score strictly using the provided rubric. Be deterministic: identical page data must always produce identical scores. Use binary pass/fail per criterion -- no partial credit. Always respond with valid JSON only, no markdown fences." },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_audit_results",
              description: "Submit the complete audit results with scores and recommendations",
              parameters: {
                type: "object",
                properties: {
                  overall_score: { type: "number", description: "Overall weighted score 0-100" },
                  scores: {
                    type: "object",
                    properties: {
                      messaging_clarity: { type: "number" },
                      trust_signals: { type: "number" },
                      cta_strength: { type: "number" },
                      mobile_layout: { type: "number" },
                      seo_metadata: { type: "number" },
                    },
                    required: ["messaging_clarity", "trust_signals", "cta_strength", "mobile_layout", "seo_metadata"],
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
