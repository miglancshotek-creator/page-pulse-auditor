import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Globe, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";


const TRAFFIC_SOURCES = [
  { value: "google_search", label: { cs: "Google Search Ads", en: "Google Search Ads" } },
  { value: "google_shopping", label: { cs: "Google Shopping", en: "Google Shopping" } },
  { value: "meta_ads", label: { cs: "Meta Ads (FB / Instagram)", en: "Meta Ads (FB / Instagram)" } },
  { value: "linkedin_ads", label: { cs: "LinkedIn Ads", en: "LinkedIn Ads" } },
  { value: "email", label: { cs: "E-mailová kampaň", en: "Email Campaign" } },
  { value: "organic", label: { cs: "Organické / SEO", en: "Organic / SEO" } },
  { value: "mixed", label: { cs: "Smíšené zdroje", en: "Mixed Sources" } },
];

const BUSINESS_TYPES = [
  { value: "ecommerce", label: { cs: "E-commerce", en: "E-commerce" } },
  { value: "saas", label: { cs: "SaaS / Software", en: "SaaS / Software" } },
  { value: "leadgen", label: { cs: "Generování leadů", en: "Lead Generation" } },
  { value: "agency", label: { cs: "Agentura / Služby", en: "Agency / Services" } },
  { value: "local", label: { cs: "Lokální byznys", en: "Local Business" } },
];

const AuditForm = () => {
  const [url, setUrl] = useState("");
  const [monthlyVisitors, setMonthlyVisitors] = useState("");
  const [trafficSource, setTrafficSource] = useState("google_search");
  const [conversionRate, setConversionRate] = useState("");
  const [businessType, setBusinessType] = useState("ecommerce");
  const [avgOrderValue, setAvgOrderValue] = useState("");
  const [includeMobile, setIncludeMobile] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"idle" | "scraping" | "scoring">("idle");
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, lang } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setStep("scraping");

    try {
      const { data: audit, error: insertErr } = await supabase
        .from("audits")
        .insert({ url: url.trim(), status: "scraping" })
        .select()
        .single();

      if (insertErr || !audit) throw new Error(t("form.error.create"));

      const { data: scrapeResult, error: scrapeErr } = await supabase.functions.invoke("scrape-page", {
        body: { url: url.trim(), includeMobile },
      });

      if (scrapeErr || !scrapeResult?.success) {
        throw new Error(scrapeResult?.error || t("form.error.scrape"));
      }

      const scrapeData = scrapeResult.data;

      await supabase.from("audits").update({
        page_title: scrapeData.pageTitle,
        headers: scrapeData.headers,
        body_text: scrapeData.bodyText,
        cta_texts: scrapeData.ctaTexts,
        screenshot_url: scrapeData.screenshotUrl,
        status: "scoring",
      }).eq("id", audit.id);

      // Store mobile screenshot URL if available
      const mobileScreenshotUrl = scrapeData.mobile?.screenshotUrl || null;

      setStep("scoring");

      const parsedVisitors = monthlyVisitors ? parseInt(monthlyVisitors, 10) : null;

      const { data: scoreResult, error: scoreErr } = await supabase.functions.invoke("audit-score", {
        body: {
          auditId: audit.id,
          scrapeData: { ...scrapeData, url: url.trim() },
          language: lang,
          businessContext: {
            monthlyVisitors: parsedVisitors && !isNaN(parsedVisitors) ? parsedVisitors : null,
            trafficSource,
            trafficSourceLabel: TRAFFIC_SOURCES.find(s => s.value === trafficSource)?.label[lang] || "",
            conversionRate: conversionRate ? parseFloat(conversionRate) : null,
            businessType,
            businessTypeLabel: BUSINESS_TYPES.find(b => b.value === businessType)?.label[lang] || "",
            avgOrderValue: avgOrderValue ? parseFloat(avgOrderValue) : null,
          },
        },
      });

      if (scoreErr) throw new Error(t("form.error.score"));
      if (scoreResult?.error) throw new Error(scoreResult.error);

      navigate(`/audit/${audit.id}`);
    } catch (err: any) {
      console.error("Audit error:", err);
      toast({
        title: t("form.error.title"),
        description: err.message || t("form.error.generic"),
        variant: "destructive",
      });
      setStep("idle");
    } finally {
      setLoading(false);
    }
  };

  const selectClass = "w-full bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 transition-colors appearance-none cursor-pointer";
  const labelClass = "block text-[10px] font-semibold tracking-[0.15em] uppercase text-muted-foreground mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-4">
      {/* URL Input */}
      <div className="relative group">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl" />
        <div className="relative flex items-center gap-2 rounded-xl border border-border bg-card p-2 transition-all focus-within:border-primary/50 focus-within:glow-primary">
          <Globe className="h-5 w-5 text-muted-foreground ml-3 shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t("form.placeholder")}
            className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm py-2"
            disabled={loading}
          />
        </div>
      </div>

      {/* Business Context Fields */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>{t("form.monthlyVisitors")}</label>
          <input
            type="number"
            value={monthlyVisitors}
            onChange={e => setMonthlyVisitors(e.target.value)}
            placeholder={t("form.monthlyVisitorsPlaceholder")}
            className={selectClass}
            disabled={loading}
          />
        </div>
        <div>
          <label className={labelClass}>{t("form.trafficSource")}</label>
          <select value={trafficSource} onChange={e => setTrafficSource(e.target.value)} className={selectClass} disabled={loading}>
            {TRAFFIC_SOURCES.map(o => (
              <option key={o.value} value={o.value}>{o.label[lang]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t("form.conversionRate")}</label>
          <input
            type="text"
            value={conversionRate}
            onChange={e => setConversionRate(e.target.value)}
            placeholder={t("form.conversionRatePlaceholder")}
            className={selectClass}
            disabled={loading}
          />
        </div>
        <div>
          <label className={labelClass}>{t("form.businessType")}</label>
          <select value={businessType} onChange={e => setBusinessType(e.target.value)} className={selectClass} disabled={loading}>
            {BUSINESS_TYPES.map(o => (
              <option key={o.value} value={o.value}>{o.label[lang]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>{t("form.avgOrderValue")}</label>
          <input
            type="text"
            value={avgOrderValue}
            onChange={e => setAvgOrderValue(e.target.value)}
            placeholder={t("form.avgOrderValuePlaceholder")}
            className={selectClass}
            disabled={loading}
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{step === "scraping" ? t("form.scraping") : t("form.scoring")}</span>
          </>
        ) : (
          <>
            <span>→</span>
            <span>{t("form.submit")}</span>
          </>
        )}
      </button>

      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-up">
          <div className="flex gap-1">
            <div className={`h-2 w-2 rounded-full ${step === "scraping" ? "bg-primary animate-pulse" : "bg-primary"}`} />
            <div className={`h-2 w-2 rounded-full ${step === "scoring" ? "bg-primary animate-pulse" : step === "scraping" ? "bg-muted" : "bg-primary"}`} />
          </div>
          <span>{step === "scraping" ? t("form.step.scraping") : t("form.step.scoring")}</span>
        </div>
      )}
    </form>
  );
};

export default AuditForm;
