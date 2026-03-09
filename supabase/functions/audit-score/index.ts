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
    const { auditId, scrapeData, language = "cs", businessContext, mobileScreenshotUrl, includeMobile } = await req.json();
    const hasMobileData = includeMobile && scrapeData?.mobile;
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

    // Fetch previous completed audit for the same URL to avoid re-suggesting applied changes
    let previousOptimizationsText = "";
    try {
      const { data: previousAudit } = await supabase
        .from("audits")
        .select("raw_ai_response")
        .eq("url", scrapeData.url)
        .eq("status", "completed")
        .neq("id", auditId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousAudit?.raw_ai_response) {
        const prevParsed = parseMaybeJson(previousAudit.raw_ai_response);
        const prevOptimizations = prevParsed?.content_optimizations;
        if (Array.isArray(prevOptimizations) && prevOptimizations.length > 0) {
          const items = prevOptimizations.map((opt: any) =>
            `- Element: ${opt.element}\n  Previously recommended: "${opt.optimized_version}"`
          ).join("\n");
          previousOptimizationsText = `
PREVIOUSLY APPLIED OPTIMIZATIONS (from prior audit of this same URL):
The following text changes were recommended in a previous audit and have likely been applied by the site owner.
DO NOT suggest changing these texts again UNLESS you have strong, specific evidence that the current version is underperforming compared to the previously recommended version.
If the current text on the page matches or closely resembles a previously recommended "optimized_version" below, SKIP it entirely in content_optimizations. Focus on OTHER elements that were not previously optimized.

${items}
`;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch previous audit:", e);
    }

    // Build business context section
    const bc = businessContext || {};

    const trafficSource = bc.trafficSource || "mixed";
    const estimatedVisitors = bc.monthlyVisitors || 0;

    // 5×5 CR Benchmark Matrix: [businessType][trafficSource] = benchmark CR%
    const CR_BENCHMARKS: Record<string, Record<string, number>> = {
      ecommerce:  { google_search: 3.2, google_shopping: 3.2, meta_ads: 2.0, linkedin_ads: 0.8, organic: 2.5, google_display: 0.7, email: 3.2, mixed: 2.0 },
      saas:       { google_search: 3.5, google_shopping: 3.5, meta_ads: 2.5, linkedin_ads: 2.5, organic: 3.0, google_display: 0.9, email: 3.5, mixed: 2.5 },
      leadgen:    { google_search: 5.0, google_shopping: 5.0, meta_ads: 3.5, linkedin_ads: 3.0, organic: 4.0, google_display: 1.0, email: 5.0, mixed: 3.5 },
      agency:     { google_search: 4.0, google_shopping: 4.0, meta_ads: 2.5, linkedin_ads: 2.5, organic: 3.5, google_display: 0.8, email: 4.0, mixed: 2.5 },
      local:      { google_search: 6.0, google_shopping: 6.0, meta_ads: 4.0, linkedin_ads: 1.5, organic: 5.5, google_display: 1.2, email: 6.0, mixed: 4.0 },
    };

    // Look up benchmark CR from the matrix
    const bizType = bc.businessType || "ecommerce";
    const benchmarkCRFromTable = CR_BENCHMARKS[bizType]?.[trafficSource] ?? CR_BENCHMARKS["ecommerce"]?.["mixed"] ?? 2.0;
    
    // Current CR: user-provided or assume conservative 1.5%
    const currentCR = bc.conversionRate ? parseFloat(bc.conversionRate) : 1.5;
    
    // Benchmark CR = MAX(table value, current CR + 1%) — the +1% floor rule
    const benchmarkCR = Math.max(benchmarkCRFromTable, currentCR + 1.0);
    
    // Gap in percentage points
    const crGap = benchmarkCR - currentCR;
    
    // AOV
    const aov = bc.avgOrderValue ? parseFloat(bc.avgOrderValue) : null;

    // Pre-calculate total monthly leak if we have all data
    const totalMonthlyLeak = (estimatedVisitors > 0 && aov) 
      ? Math.round(estimatedVisitors * (crGap / 100) * aov) 
      : null;

    const businessContextText = estimatedVisitors > 0 ? `
BUSINESS CONTEXT:
- Monthly Visitors: ${estimatedVisitors}
- Traffic Source: ${bc.trafficSourceLabel || trafficSource}
- Business Type: ${bc.businessTypeLabel || bc.businessType || "Unknown"}
- Current Conversion Rate: ${currentCR}%${!bc.conversionRate ? " (assumed conservative default — user did not provide)" : ""}
- Benchmark CR (from table): ${benchmarkCRFromTable}%
- Benchmark CR used (with +1% floor rule): ${benchmarkCR}%
- CR Gap: ${crGap.toFixed(1)} percentage points
- Average Order Value (AOV): ${aov ? "€" + aov : "Not provided (use industry benchmark: E-commerce €65, SaaS €50, Lead Gen €120, Agency €200, Local €50)"}
${totalMonthlyLeak !== null ? `- PRE-CALCULATED Total Monthly Revenue Leak: €${totalMonthlyLeak} (= ${estimatedVisitors} × ${(crGap / 100).toFixed(4)} × €${aov})` : ""}

REVENUE LEAK FORMULA — FOLLOW THIS EXACTLY:

The TOTAL revenue leak represents the gap between the page's current performance and industry benchmark.
Formula: Monthly Leak = Visitors × (Benchmark CR − Current CR) ÷ 100 × AOV
= ${estimatedVisitors} × ${crGap.toFixed(1)}% × €${aov || "{AOV}"}
${totalMonthlyLeak !== null ? `= €${totalMonthlyLeak}/month` : ""}

For EACH critical issue, assign a SHARE of this total leak proportional to how much that issue contributes to the CR gap.
All issue losses should roughly sum to the total monthly leak (€${totalMonthlyLeak ?? "calculate from formula"}).

Step for EACH issue:
  a. Estimate what % share of the total CR gap this issue is responsible for (e.g., "25% of total gap")
  b. Issue Monthly Loss = Total Monthly Leak × share%
  c. Use the EXACT calculated value, do NOT round arbitrarily.

FORMAT the explanation field for EVERY issue using this EXACT structure:
  Line 1-2: WHY this issue hurts conversions (1-2 sentences).
  Line 3: "${isEn ? "Current CR" : "Aktuální CR"}: ${currentCR}% → ${isEn ? "Benchmark CR" : "Benchmarková CR"}: ${benchmarkCR}% (${isEn ? "gap" : "mezera"}: ${crGap.toFixed(1)}pp)"
  Line 4: "${isEn ? "Share of gap" : "Podíl na mezeře"}: {share}%"
  Line 5: "${isEn ? "Monthly leak" : "Měsíční únik"}: €${totalMonthlyLeak ?? "{total}"} × {share as decimal} = €{loss}"

CRITICAL RULES:
- The visitor count is ${estimatedVisitors}. This is a known value — do NOT re-derive it.
- The benchmark CR is ${benchmarkCR}%. The gap is ${crGap.toFixed(1)}pp. These are PRE-CALCULATED — use them as-is.
${totalMonthlyLeak !== null ? `- The TOTAL monthly leak is €${totalMonthlyLeak}. This is PRE-CALCULATED — use it as-is.` : ""}
- The €{loss} value on the LAST LINE of the explanation MUST EXACTLY EQUAL the estimated_monthly_loss number field.
- The SUM of all estimated_monthly_loss values across issues should approximately equal €${totalMonthlyLeak ?? "total"}.
- ALWAYS show ALL 5 lines. Never skip intermediate steps.` : "";

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

MOBILE LAYOUT SIGNALS (desktop HTML analysis):
${JSON.stringify(scrapeData.mobileSignals || {}, null, 2)}

${hasMobileData ? `
MOBILE VERSION DATA (actual mobile render):
- Mobile headers: ${JSON.stringify(scrapeData.mobile.headers || [])}
- Mobile CTA texts (partial): ${JSON.stringify(scrapeData.mobile.ctaTexts || [])}
- Mobile body text (excerpt): ${(scrapeData.mobile.bodyText || "").substring(0, 2000)}
- Mobile layout signals: ${JSON.stringify(scrapeData.mobile.mobileSignals || {}, null, 2)}
NOTE: A real mobile screenshot was captured. Evaluate mobile-specific issues like tap target size, text readability, layout shifts, and mobile CTA visibility. Tag mobile-specific issues with "[Mobile]" prefix in the issue name.
` : ""}

YOUR TASK:
1. Score each of the 7 frameworks on a scale of 1–10. For each framework, provide a short key_issue (the single biggest problem found) and a recommendation.

2. Identify CRITICAL ISSUES for ALL 7 frameworks — EVERY single framework MUST have at least 1-3 issue entries, NO EXCEPTIONS, NO SKIPPING.
   You MUST return issues for EACH of these 7 categories: "Value Proposition", "Relevance & Message Match", "Clarity & Cognitive Ease", "Anxiety Reduction & Trust", "Distraction & Focus", "CTA Quality", "Urgency & Momentum".
   - A score of 9/10 or below means there ARE real issues to find. Look harder. Be specific.
   - The ONLY case where you may write "No action needed" as solution is a PERFECT 10/10 score (truly flawless, almost never happens).
   - A score of 7/10 means significant room for improvement — find and describe 1-3 concrete issues.
   - A score of 8/10 means there are still 1-2 clear improvements possible.
   - A score of 9/10 means at least 1 minor issue exists.
   For each critical issue provide:
   - The issue name (short, punchy — e.g. "Zero social proof on page")
   - Which framework category it belongs to (use exact framework name)
    - Severity: "critical" (score ≤3), "high" (score 4-5), or "medium" (score 6-7)
    - A concise problem description (2-3 sentences max) explaining WHY it hurts conversions and what specific evidence from the page supports this. NEVER reference academic principles, authors, or frameworks by name (no "Cialdini", "Kahneman", "Hick's Law", "Paradox of Choice", etc.) — just explain the practical impact in plain business language.
    - A specific, actionable solution recommendation with concrete examples (NEVER "No action needed" unless score is 10/10)
    ${estimatedVisitors > 0 ? "- Estimated monthly revenue loss (using the formula above)" : "- Even without revenue data, explain the BUSINESS IMPACT: how this issue causes visitor drop-off, reduces trust, or kills conversions. Be specific about the behavioral consequence."}

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
      description: { type: "string", description: "Concise explanation (2-3 sentences max) of WHY this hurts conversions with specific page evidence. NEVER name psychological principles, theories, or authors — use plain business language only. Include business impact even without revenue numbers." },
      solution: { type: "string", description: "Specific actionable recommendation with concrete examples of what to change and why it will improve conversions" },
    };

    if (estimatedVisitors > 0) {
      criticalIssueProperties.estimated_monthly_loss = {
        type: "number",
        description: "The EXACT euro value from the last line of the explanation calculation (Line 7). Must match the calculated €{loss} exactly.",
      };
      criticalIssueProperties.explanation = {
        type: "string",
        description: "MUST contain 5 lines: Lines 1-2 why it hurts, Line 3 current CR vs benchmark CR and gap, Line 4 share of gap %, Line 5 monthly leak calculation. The final €value MUST equal estimated_monthly_loss.",
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
                    description: "MANDATORY: Return issues for ALL 7 frameworks with NO EXCEPTIONS. Aim for 2-3 issues per framework (minimum 1). For each framework scoring 1-9 out of 10, you MUST find and describe REAL, SPECIFIC, ACTIONABLE issues with concise descriptions (2-3 sentences each). NEVER reference psychological principles, theories, or author names — use plain business language. Every solution must include a concrete example. The ONLY acceptable use of 'No action needed' is for a perfect 10/10 score (extremely rare). If you skip a framework or provide shallow 1-sentence descriptions, the audit is INVALID.",
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
    console.log("AI response finish_reason:", aiData?.choices?.[0]?.finish_reason);

    let results = extractAuditResults(aiData);

    // Retry once if extraction fails (model occasionally returns malformed tool payload)
    if (!results) {
      console.warn("No valid structured payload on first attempt, retrying...");
      console.log("AI message content:", JSON.stringify(aiData?.choices?.[0]?.message?.content)?.substring(0, 500));

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
      results = extractAuditResults(retryData);
      if (!results) {
        console.error("Retry extraction failed. Message:", JSON.stringify(retryData?.choices?.[0]?.message)?.substring(0, 1200));
        throw new Error("No structured audit results in AI response after retry");
      }
    }

    // Compute overall_score from framework_scores (weighted average, scale to 0-100)
    let overallScore = 0;
    const frameworkScores = results.framework_scores || [];
    for (const fs of frameworkScores) {
      const weight = FRAMEWORK_WEIGHTS[fs.key] || 0;
      overallScore += (fs.score / 10) * 100 * weight;
    }
    results.overall_score = Math.round(overallScore);

    // POST-PROCESSING: Ensure ALL 7 frameworks have at least one critical_issue entry
    const criticalIssues: any[] = results.critical_issues || [];
    const categoryToFramework = (category: string): string => {
      const lower = category.toLowerCase().replace(/[^a-z]/g, "");
      if (lower.includes("value") || lower.includes("proposition")) return "value_proposition";
      if (lower.includes("relevance") || lower.includes("message") || lower.includes("match")) return "relevance";
      if (lower.includes("clarity") || lower.includes("cognitive") || lower.includes("ease")) return "clarity";
      if (lower.includes("anxiety") || lower.includes("trust") || lower.includes("reduction")) return "anxiety_trust";
      if (lower.includes("distraction") || lower.includes("focus")) return "distraction_focus";
      if (lower.includes("cta") || lower.includes("calltoaction")) return "cta_quality";
      if (lower.includes("urgency") || lower.includes("momentum")) return "urgency_momentum";
      return "";
    };

    const coveredFrameworks = new Set<string>();
    for (const issue of criticalIssues) {
      const fwKey = categoryToFramework(issue.category || "");
      if (fwKey) coveredFrameworks.add(fwKey);
    }

    const FRAMEWORK_DISPLAY_NAMES: Record<string, string> = {
      value_proposition: "Value Proposition",
      relevance: "Relevance & Message Match",
      clarity: "Clarity & Cognitive Ease",
      anxiety_trust: "Anxiety Reduction & Trust",
      distraction_focus: "Distraction & Focus",
      cta_quality: "CTA Quality",
      urgency_momentum: "Urgency & Momentum",
    };

    for (const fwKey of FRAMEWORK_KEYS) {
      if (!coveredFrameworks.has(fwKey)) {
        const fwScore = frameworkScores.find((fs: any) => fs.key === fwKey);
        const score = fwScore?.score || 5;
        const keyIssue = fwScore?.key_issue || (isEn ? "Needs improvement" : "Vyžaduje zlepšení");
        const recommendation = fwScore?.recommendation || (isEn ? "Review and optimize this area" : "Zrevidujte a optimalizujte tuto oblast");
        
        if (score < 10) {
          const severity = score <= 3 ? "critical" : score <= 5 ? "high" : "medium";
          criticalIssues.push({
            issue: keyIssue,
            category: FRAMEWORK_DISPLAY_NAMES[fwKey],
            severity,
            description: recommendation + (isEn
              ? `. This framework scored ${score}/10, indicating significant room for improvement. The page should be reviewed for specific weaknesses in this area to maximize conversion potential.`
              : `. Toto kritérium získalo ${score}/10, což naznačuje značný prostor pro zlepšení. Stránka by měla být přezkoumána s ohledem na konkrétní slabiny v této oblasti.`),
            solution: recommendation,
          });
          console.log(`Added fallback issue for missing framework: ${fwKey} (score: ${score}/10)`);
        }
      }
    }
    results.critical_issues = criticalIssues;

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

    // Store mobile screenshot URL in results if available
    if (mobileScreenshotUrl) {
      results.mobile_screenshot_url = mobileScreenshotUrl;
    }

    const { error: updateError } = await supabase
      .from("audits")
      .update({
        overall_score: results.overall_score,
        scores: scoresMap,
        quick_wins: results.critical_issues || [],
        breakdown: results.framework_scores || [],
        raw_ai_response: JSON.stringify(results),
        image_urls: scrapeData.imageUrls || [],
        branding_data: scrapeData.brandingData || {},
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
