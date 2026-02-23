import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { password, action, pdfText, entry } = await req.json();

    const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD");
    if (!ADMIN_PASSWORD || password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Action: verify password
    if (action === "verify") {
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: parse PDF text and replace knowledge base
    if (action === "parse_pdf") {
      if (!pdfText || pdfText.trim().length < 20) {
        return new Response(JSON.stringify({ error: "PDF text too short or empty" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

      // Use AI to extract structured criteria from the PDF text
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: "You are a data extraction expert. Extract audit criteria AND general guidelines from the provided document text. Each criterion must belong to one of these 5 categories: Messaging Clarity, Trust Signals, CTA Strength, Mobile Layout, SEO Meta-data. Extract as many specific, actionable criteria as you can find. IMPORTANT: Use plain ASCII English names only for criterion names. No special characters, no Unicode symbols, no emojis. Also extract any general scoring rules, philosophy, output format instructions, or meta-rules that are NOT specific criteria (e.g. 'Score ruthlessly', 'No Copy Rewriting', scoring output format). Return them as a single general_guidelines text block preserving the original wording as much as possible.",
            },
            {
              role: "user",
              content: `Extract all audit criteria AND general guidelines from this document:\n\n${pdfText.substring(0, 50000)}`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "submit_criteria",
                description: "Submit extracted audit criteria and general guidelines",
                parameters: {
                  type: "object",
                  properties: {
                    criteria: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          category: { type: "string", enum: ["Messaging Clarity", "Trust Signals", "CTA Strength", "Mobile Layout", "SEO Meta-data"] },
                          criterion: { type: "string", description: "Short plain ASCII English name of the criterion. No special characters or Unicode." },
                          description: { type: "string", description: "Detailed description of what to check" },
                          weight: { type: "number", description: "Importance weight 1-3" },
                        },
                        required: ["category", "criterion", "description", "weight"],
                      },
                    },
                    general_guidelines: {
                      type: "string",
                      description: "All general scoring rules, philosophy, meta-rules, and output format instructions from the document that are NOT specific criteria. Preserve original wording. Include sections like Scoring Philosophy, No Copy Rewriting rules, Scoring Output Format, etc.",
                    },
                  },
                  required: ["criteria", "general_guidelines"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "submit_criteria" } },
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("AI error:", response.status, t);
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        throw new Error("AI extraction failed");
      }

      const aiData = await response.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) throw new Error("No tool call in AI response");

      const { criteria, general_guidelines } = JSON.parse(toolCall.function.arguments);

      if (!criteria || criteria.length === 0) {
        return new Response(JSON.stringify({ error: "No criteria could be extracted from the document" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Clear existing knowledge base and insert new criteria
      const { error: deleteErr } = await supabase.from("knowledge_base").delete().gte("created_at", "1970-01-01");
      if (deleteErr) {
        console.error("Delete error:", deleteErr);
        throw new Error("Failed to clear existing knowledge base");
      }

      const { error: insertErr } = await supabase.from("knowledge_base").insert(
        criteria.map((c: any) => ({
          category: c.category,
          criterion: c.criterion.replace(/[^\x20-\x7E]/g, ""),
          description: c.description,
          weight: c.weight,
        }))
      );

      if (insertErr) {
        console.error("Insert error:", insertErr);
        throw new Error("Failed to save criteria");
      }

      // Store general guidelines + condensed educational content
      await supabase.from("audit_guidelines").delete().gte("created_at", "1970-01-01");

      // Store extracted general guidelines (scoring philosophy, output format, etc.)
      if (general_guidelines && general_guidelines.trim().length > 0) {
        const { error: guidelinesErr } = await supabase.from("audit_guidelines").insert({ content: general_guidelines.trim() });
        if (guidelinesErr) console.error("Guidelines insert error:", guidelinesErr);
      }

      // Condense the educational content (psychological frameworks, CRO methodology)
      // into an actionable audit reference guide
      const reciprocityIdx = pdfText.indexOf("Reciprocity");
      const educationalContent = pdfText.substring(
        reciprocityIdx > 0 ? reciprocityIdx : Math.min(15000, pdfText.length)
      );

      if (educationalContent.length > 200) {
        console.log("Condensing educational content:", educationalContent.length, "chars");
        const condenseResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: `You are a CRO/landing page audit expert. Extract ONLY actionable evaluation principles from the educational content below. These principles will be used by an AI auditor to score landing pages.

Rules:
- Extract concrete, actionable scoring rules (e.g. "A page with no social proof cannot score above 6 on Trust Signals")
- Include all psychological frameworks with their landing page applications (Cialdini, System 1/2, Loss Aversion, Anchoring, Peak-End, WYSIATI, etc.)
- Include JTBD, Pain/Gain/Fear, 5 Awareness Stages, Objection Mapping
- Include Trust Architecture, Headline frameworks, Hero Section formula, CTA psychology
- Include Features→Benefits→Desires, Social Proof architecture, Pricing Psychology
- Include LIFT Model components
- Do NOT include exercises, end-of-day tasks, course scheduling, or meta-learning instructions
- Output ~2000 words maximum
- Use bullet points for clarity
- Every principle must be phrased as an evaluation criterion the auditor can check against a real page`,
              },
              {
                role: "user",
                content: `Extract actionable audit evaluation principles from this educational content:\n\n${educationalContent.substring(0, 40000)}`,
              },
            ],
          }),
        });

        if (condenseResponse.ok) {
          const condenseData = await condenseResponse.json();
          const condensedText = condenseData.choices?.[0]?.message?.content;
          if (condensedText && condensedText.trim().length > 100) {
            const { error: condensedErr } = await supabase.from("audit_guidelines").insert({
              content: `## AUDIT REFERENCE GUIDE - Psychological & CRO Frameworks\n\n${condensedText.trim()}`,
            });
            if (condensedErr) console.error("Condensed guide insert error:", condensedErr);
            else console.log("Stored condensed audit reference guide:", condensedText.length, "chars");
          }
        } else {
          console.error("Condense AI call failed:", condenseResponse.status, await condenseResponse.text());
        }
      }

      return new Response(JSON.stringify({ success: true, count: criteria.length, has_guidelines: !!general_guidelines }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: add single entry
    if (action === "add_entry") {
      const { error } = await supabase.from("knowledge_base").insert(entry);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: delete entry
    if (action === "delete_entry") {
      const { error } = await supabase.from("knowledge_base").delete().eq("id", entry.id);
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Action: delete all entries
    if (action === "delete_all") {
      const { error } = await supabase.from("knowledge_base").delete().gte("created_at", "1970-01-01");
      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Admin error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
