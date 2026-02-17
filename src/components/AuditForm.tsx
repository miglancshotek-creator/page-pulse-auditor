import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AuditForm = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "scraping" | "scoring">("idle");
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setStep("scraping");

    try {
      // Create audit record
      const { data: audit, error: insertErr } = await supabase
        .from("audits")
        .insert({ url: url.trim(), status: "scraping" })
        .select()
        .single();

      if (insertErr || !audit) throw new Error("Failed to create audit");

      // Step 1: Scrape the page
      const { data: scrapeResult, error: scrapeErr } = await supabase.functions.invoke("scrape-page", {
        body: { url: url.trim() },
      });

      if (scrapeErr || !scrapeResult?.success) {
        throw new Error(scrapeResult?.error || "Failed to scrape page");
      }

      const scrapeData = scrapeResult.data;

      // Update audit with scraped data
      await supabase.from("audits").update({
        page_title: scrapeData.pageTitle,
        headers: scrapeData.headers,
        body_text: scrapeData.bodyText,
        cta_texts: scrapeData.ctaTexts,
        screenshot_url: scrapeData.screenshotUrl,
        status: "scoring",
      }).eq("id", audit.id);

      // Step 2: AI Scoring
      setStep("scoring");
      const { data: scoreResult, error: scoreErr } = await supabase.functions.invoke("audit-score", {
        body: {
          auditId: audit.id,
          scrapeData: { ...scrapeData, url: url.trim() },
        },
      });

      if (scoreErr) {
        throw new Error("AI scoring failed");
      }

      if (scoreResult?.error) {
        throw new Error(scoreResult.error);
      }

      navigate(`/audit/${audit.id}`);
    } catch (err: any) {
      console.error("Audit error:", err);
      toast({
        title: "Audit Failed",
        description: err.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
        <div className="relative flex items-center gap-2 rounded-xl border border-border bg-card p-2 transition-all focus-within:border-primary/50 focus-within:glow-primary">
          <Globe className="h-5 w-5 text-muted-foreground ml-3 shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter a landing page URL..."
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm py-2"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{step === "scraping" ? "Scanning..." : "Analyzing..."}</span>
              </>
            ) : (
              <>
                <span>Run Audit</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
      {loading && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-up">
          <div className="flex gap-1">
            <div className={`h-2 w-2 rounded-full ${step === "scraping" ? "bg-primary animate-pulse" : "bg-primary"}`} />
            <div className={`h-2 w-2 rounded-full ${step === "scoring" ? "bg-primary animate-pulse" : step === "scraping" ? "bg-muted" : "bg-primary"}`} />
          </div>
          <span>{step === "scraping" ? "Crawling page with Firecrawl..." : "AI is analyzing your page..."}</span>
        </div>
      )}
    </form>
  );
};

export default AuditForm;
