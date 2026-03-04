import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FRAMEWORK_KEYS = [
  "value_proposition",
  "relevance",
  "clarity",
  "anxiety_trust",
  "distraction_focus",
  "cta_quality",
  "urgency_momentum",
] as const;

const FRAMEWORK_WEIGHTS: Record<string, number> = {
  value_proposition: 0.20,
  relevance: 0.15,
  clarity: 0.15,
  anxiety_trust: 0.15,
  distraction_focus: 0.10,
  cta_quality: 0.15,
  urgency_momentum: 0.10,
};

const parseMaybeJson = (raw: string): any | null => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const extractJsonFromContent = (content: unknown): any | null => {
  let text = "";

  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    text = content
      .map((part: any) => {
        if (typeof part === "string") return part;
        if (part?.type === "text") return part?.text || "";
        return "";
      })
      .join("\n");
  }

  if (!text.trim()) return null;

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  const direct = parseMaybeJson(cleaned);
  if (direct) return direct;

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) return null;

  return parseMaybeJson(match[0]);
};

const extractAuditResults = (aiData: any): any | null => {
  const message = aiData?.choices?.[0]?.message;
  if (!message) return null;

  const toolArgs = message?.tool_calls?.[0]?.function?.arguments;
  if (typeof toolArgs === "string") {
    const parsedTool = parseMaybeJson(toolArgs);
    if (parsedTool) return parsedTool;
    console.warn("Tool call args parse failed");
  }

  const parsedFromContent = extractJsonFromContent(message?.content);
  if (parsedFromContent && typeof parsedFromContent === "object") return parsedFromContent;

  return null;
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

    const trafficSource = bc.trafficSource || "mixed";
    const estimatedVisitors = bc.monthlyVisitors || 0;

    const businessContextText = estimatedVisitors > 0 ? `
BUSINESS CONTEXT:
- Monthly Visitors: ${estimatedVisitors}
- Traffic Source: ${bc.trafficSourceLabel || trafficSource}
- Current Conversion Rate: ${bc.conversionRate ? bc.conversionRate + "%" : "Not provided (use industry average for " + (bc.businessTypeLabel || "this business type") + ")"}
- Business Type: ${bc.businessTypeLabel || bc.businessType || "Unknown"}
- Average Revenue per Conversion: ${bc.avgOrderValue ? "€" + bc.avgOrderValue : "Not provided (use industry benchmark)"}

REVENUE LOSS CALCULATION — FOLLOW THIS FORMULA EXACTLY:

Step 1: Monthly Visitors = ${estimatedVisitors} (provided by user)

Step 2: Conversion Rate:
  ${bc.conversionRate ? "Use provided: " + bc.conversionRate + "%" : "Use industry average: E-commerce ~2.5%, SaaS ~3-5%, Lead Gen ~5-10%, Agency ~3-7%, Local ~5-8%"}

Step 3: Revenue per Conversion:
  ${bc.avgOrderValue ? "Use provided: €" + bc.avgOrderValue : "Use industry benchmark: E-commerce €50-80, SaaS €30-100/mo, Lead Gen €50-200, Agency €100-300, Local €30-80"}

Step 4: For EACH conversion issue found:
  a. State the estimated RELATIVE conversion rate drop (e.g., "15% relative drop")
  b. Lost Conversions = ${estimatedVisitors} × (CR × relative_drop%)
  c. Monthly Loss = Lost Conversions × Revenue per Conversion
  d. Use the EXACT calculated value, do NOT round.

Step 5: FORMAT the explanation field for EVERY issue using this EXACT structure:
  Line 1-2: WHY this issue hurts conversions (1-2 sentences).
  Line 3: "${isEn ? "Visitors" : "Návštěvníci"}: ${estimatedVisitors}"
  Line 4: "${isEn ? "CR used" : "Použitá CR"}: {cr}% | ${isEn ? "Relative drop" : "Relativní pokles"}: {drop}%"
  Line 5: "${isEn ? "Lost conversions" : "Ztracené konverze"}: ${estimatedVisitors} × {cr as decimal} × {drop as decimal} = {X}"
  Line 6: "${isEn ? "Revenue per conversion" : "Výnos na konverzi"}: €{Y}"
  Line 7: "${isEn ? "Calculation" : "Výpočet"}: {X} × €{Y} = €{loss}"

CRITICAL RULES:
- The visitor count is ${estimatedVisitors}. This is a known value — do NOT re-derive it.
- The €{loss} value on the LAST LINE of the explanation MUST EXACTLY EQUAL the estimated_monthly_loss number field.
- If they differ, you made an error — recalculate until they match.
- ALWAYS show ALL 7 lines. Never skip intermediate steps.` : "";

    const langInstruction = isEn
      ? "You are a landing page conversion optimization expert. Write ALL output in English."
      : "Jsi expert na konverzní optimalizaci landing page. VEŠKERÝ VÝSTUP PIŠ V ČEŠTINĚ. Používej správnou češtinu bez anglicismů a podivných formulací.";

    const frameworkNames = isEn
      ? ["Value Proposition", "Relevance & Message Match", "Clarity & Cognitive Ease", "Anxiety Reduction & Trust", "Distraction & Focus", "CTA Quality", "Urgency & Momentum"]
      : ["Value Proposition", "Relevance & Message Match", "Clarity & Cognitive Ease", "Anxiety Reduction & Trust", "Distraction & Focus", "CTA Quality", "Urgency & Momentum"];

    const prompt = `${langInstruction} Analyze the following page data using the 7-framework evaluation model with 70 criteria (10 per framework).

${guidelinesText ? `GENERAL GUIDELINES:\n${guidelinesText}\n` : ""}
CRITICAL LIMITATIONS OF EXTRACTED DATA:
- The scraper captures only a PARTIAL view of the page. It extracts some CTA texts, headings and text, but NOT the entire page layout.
- NEVER claim that a CTA, button or element is "missing" — absence in extracted data DOES NOT mean absence on the page.
- Focus on text quality, trust signals and verifiable issues, not placement or frequency of elements.

THE 7 EVALUATION FRAMEWORKS (10 criteria each, 70 total):
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
1. Score each of the 7 frameworks on a scale of 1–10. For each framework, provide a short key_issue (the single biggest problem found) and a recommendation.

2. Identify CRITICAL ISSUES for ALL 7 frameworks — EVERY framework MUST have at least one issue entry, NO EXCEPTIONS.
   - A score of 9/10 or below means there ARE real issues to find. Look harder. Be specific.
   - The ONLY case where you may write "No action needed" as solution is a PERFECT 10/10 score (truly flawless, almost never happens).
   - A score of 7/10 means significant room for improvement — find and describe 1-3 concrete issues.
   - A score of 8/10 means there are still 1-2 clear improvements possible.
   - A score of 9/10 means at least 1 minor issue exists.
   For each critical issue provide:
   - The issue name (short, punchy — e.g. "Zero social proof on page")
   - Which framework category it belongs to (use exact framework name)
   - Severity: "critical" (score ≤3), "high" (score 4-5), or "medium" (score 6-7)
   - A concise problem description explaining WHY it hurts conversions
   - A specific solution recommendation (NEVER "No action needed" unless score is 10/10)
   ${estimatedVisitors > 0 ? "- Estimated monthly revenue loss (using the formula above)" : ""}

3. Provide CONTENT OPTIMIZATION RECOMMENDATIONS for key text elements (heading, subheadline, CTA). For each show current version, write optimized version and explain why it's better.

4. Provide an OVERALL SUMMARY with a narrative assessment and prioritized next steps.

${estimatedVisitors > 0 ? `5. Calculate the TOTAL estimated monthly and annual revenue leak using the revenue loss formula.` : ""}

SCORING RULES:
- Any criterion with weight 10 that scores ≤3 is automatically "critical" severity
- Any criterion with weight 8 that scores ≤5 is "high" severity
- Be ruthless: missing social proof = score 1-2 for trust, vague headline = score 2-3 for value proposition
- The overall score (0-100) = weighted average of framework scores × 10`;

    // Build tools array
    const criticalIssueProperties: Record<string, any> = {
      issue: { type: "string", description: "Short punchy issue name" },
      category: { type: "string", description: "Which framework this belongs to" },
      severity: { type: "string", enum: ["critical", "high", "medium"] },
      description: { type: "string", description: "Why this hurts conversions (1-2 sentences)" },
      solution: { type: "string", description: "Specific actionable recommendation" },
    };

    if (estimatedVisitors > 0) {
      criticalIssueProperties.estimated_monthly_loss = {
        type: "number",
        description: "The EXACT euro value from the last line of the explanation calculation (Line 7). Must match the calculated €{loss} exactly.",
      };
      criticalIssueProperties.explanation = {
        type: "string",
        description: "MUST contain 7 lines: Lines 1-2 why it hurts, Line 3 visitors, Line 4 CR & drop%, Line 5 lost conversions math, Line 6 revenue per conversion, Line 7 final calculation. The final €value MUST equal estimated_monthly_loss.",
      };
    }

    const criticalIssueRequired = ["issue", "category", "severity", "description", "solution"];
    if (estimatedVisitors > 0) {
      criticalIssueRequired.push("estimated_monthly_loss", "explanation");
    }

    const revenueLossProperties = estimatedVisitors > 0 ? {
      revenue_loss: {
        type: "object",
        description: "Revenue loss totals",
        properties: {
          monthly_visitors: { type: "number" },
          conversion_rate_used: { type: "number" },
          revenue_per_conversion: { type: "number" },
          total_monthly_loss: { type: "number" },
          total_annual_loss: { type: "number" },
        },
        required: ["monthly_visitors", "conversion_rate_used", "revenue_per_conversion", "total_monthly_loss", "total_annual_loss"],
      },
    } : {};

    const requiredFields = ["framework_scores", "critical_issues", "content_optimizations", "overall_summary"];
    if (estimatedVisitors > 0) requiredFields.push("revenue_loss");

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
          { role: "system", content: isEn ? "You are a landing page conversion optimization expert. Provide detailed page-specific analysis using the 7-framework model. Extracted data is INCOMPLETE — never claim CTAs or elements are missing. Write ALL output in English." : "Jsi expert na konverzní optimalizaci landing page. Poskytuj podrobnou analýzu specifickou pro danou stránku pomocí 7-framework modelu. Extrahovaná data jsou NEÚPLNÁ — nikdy netvrd, že CTA nebo prvky chybí. VEŠKERÝ VÝSTUP PIŠ V ČEŠTINĚ. Používej správnou spisovnou češtinu." },
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
                  framework_scores: {
                    type: "array",
                    description: "Scores for each of the 7 frameworks",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string", enum: [...FRAMEWORK_KEYS], description: "Framework identifier" },
                        name: { type: "string", description: "Framework display name" },
                        score: { type: "number", description: "Score 1-10" },
                        key_issue: { type: "string", description: "The single biggest issue found in this framework" },
                        recommendation: { type: "string", description: "Top recommendation for this framework" },
                      },
                      required: ["key", "name", "score", "key_issue", "recommendation"],
                    },
                  },
                  critical_issues: {
                    type: "array",
                    description: "MANDATORY: Return issues for ALL 7 frameworks with NO EXCEPTIONS. For each framework scoring 1-9 out of 10, you MUST find and describe REAL, SPECIFIC, ACTIONABLE issues — never use 'No action needed' for these scores. A score of 7/10 means there are clear problems to report. A score of 9/10 still requires at least 1 minor issue. The ONLY acceptable use of 'No action needed' is for a perfect 10/10 score (extremely rare). If you skip a framework or fail to provide issues for a score ≤9, the audit is INVALID.",
                    items: {
                      type: "object",
                      properties: criticalIssueProperties,
                      required: criticalIssueRequired,
                    },
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
                  overall_summary: {
                    type: "object",
                    properties: {
                      narrative: { type: "string", description: "Detailed narrative assessment" },
                      next_steps: { type: "array", items: { type: "string" }, description: "Prioritized list of next steps" },
                    },
                    required: ["narrative", "next_steps"],
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
    console.log("AI response finish_reason:", aiData.choices?.[0]?.finish_reason);
    let toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    // Retry once if no tool call (model sometimes returns text instead)
    if (!toolCall) {
      console.warn("No tool call on first attempt, retrying...");
      console.log("AI message content:", JSON.stringify(aiData.choices?.[0]?.message?.content)?.substring(0, 500));
      
      const retryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          temperature: 0,
          messages: [
            { role: "system", content: isEn ? "You are a landing page conversion optimization expert. You MUST respond by calling the submit_audit_results function. Do NOT respond with text." : "Jsi expert na konverzní optimalizaci landing page. MUSÍŠ odpovědět zavoláním funkce submit_audit_results. NEODPOVÍDEJ textem." },
            { role: "user", content: prompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_audit_results",
                description: "Submit the complete audit results. YOU MUST CALL THIS FUNCTION.",
                parameters: {
                  type: "object",
                  properties: {
                    framework_scores: {
                      type: "array",
                      description: "Scores for each of the 7 frameworks",
                      items: {
                        type: "object",
                        properties: {
                          key: { type: "string", enum: [...FRAMEWORK_KEYS], description: "Framework identifier" },
                          name: { type: "string", description: "Framework display name" },
                          score: { type: "number", description: "Score 1-10" },
                          key_issue: { type: "string", description: "The single biggest issue found in this framework" },
                          recommendation: { type: "string", description: "Top recommendation for this framework" },
                        },
                        required: ["key", "name", "score", "key_issue", "recommendation"],
                      },
                    },
                    critical_issues: {
                      type: "array",
                      description: "Critical issues found across all 7 frameworks",
                      items: {
                        type: "object",
                        properties: criticalIssueProperties,
                        required: criticalIssueRequired,
                      },
                    },
                    content_optimizations: {
                      type: "array",
                      description: "Content optimization cards",
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
                    overall_summary: {
                      type: "object",
                      properties: {
                        narrative: { type: "string" },
                        next_steps: { type: "array", items: { type: "string" } },
                      },
                      required: ["narrative", "next_steps"],
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
      
      if (!retryResponse.ok) {
        const t = await retryResponse.text();
        console.error("Retry AI error:", retryResponse.status, t);
        throw new Error("AI scoring failed on retry");
      }
      
      const retryData = await retryResponse.json();
      toolCall = retryData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) {
        console.error("Retry also failed. Response:", JSON.stringify(retryData.choices?.[0]?.message)?.substring(0, 1000));
        throw new Error("No tool call in AI response after retry");
      }
    }

    const results = JSON.parse(toolCall.function.arguments);

    // Compute overall_score from framework_scores (weighted average, scale to 0-100)
    let overallScore = 0;
    const frameworkScores = results.framework_scores || [];
    for (const fs of frameworkScores) {
      const weight = FRAMEWORK_WEIGHTS[fs.key] || 0;
      overallScore += (fs.score / 10) * 100 * weight;
    }
    results.overall_score = Math.round(overallScore);

    // Count critical issues
    const criticalCount = (results.critical_issues || []).filter(
      (i: any) => i.severity === "critical"
    ).length;
    results.critical_count = criticalCount;

    // Build legacy-compatible scores object from framework_scores
    const scoresMap: Record<string, number> = {};
    for (const fs of frameworkScores) {
      scoresMap[fs.key] = fs.score;
    }

    const { error: updateError } = await supabase
      .from("audits")
      .update({
        overall_score: results.overall_score,
        scores: scoresMap,
        quick_wins: results.critical_issues || [],
        breakdown: results.framework_scores || [],
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
