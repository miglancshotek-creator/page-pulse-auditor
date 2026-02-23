import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ScoreRing from "@/components/ScoreRing";
import QuickWins from "@/components/QuickWins";
import ContentOptimizations from "@/components/ContentOptimizations";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import OverallSummary from "@/components/OverallSummary";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, ExternalLink, Copy, Check, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface AuditData {
  id: string;
  url: string;
  page_title: string | null;
  screenshot_url: string | null;
  overall_score: number | null;
  scores: any;
  quick_wins: any;
  breakdown: any;
  raw_ai_response: string | null;
  status: string;
  created_at: string;
}

const AuditResult = () => {
  const { id } = useParams<{ id: string }>();
  const [audit, setAudit] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { t, lang } = useLanguage();

  useEffect(() => {
    const fetchAudit = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        toast({ title: t("result.error.title"), description: t("result.error.load"), variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!data) {
        toast({ title: t("result.error.notFoundTitle"), description: t("result.error.notFound"), variant: "destructive" });
        setLoading(false);
        return;
      }
      setAudit(data as AuditData);
      setLoading(false);
    };
    fetchAudit();
  }, [id]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast({ title: t("result.linkCopied") });
    setTimeout(() => setCopied(false), 2000);
  };

  const dateLang = lang === "cs" ? "cs-CZ" : "en-US";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">{t("result.loading")}</p>
        </div>
      </div>
    );
  }

  if (!audit || audit.status !== "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">{t("result.processing")}</p>
          <Link to="/" className="text-primary hover:underline text-sm">{t("result.back")}</Link>
        </div>
      </div>
    );
  }

  let rawResults: any = {};
  try {
    rawResults = audit.raw_ai_response ? JSON.parse(audit.raw_ai_response) : {};
  } catch {
    rawResults = {};
  }

  const contentOptimizations = Array.isArray(rawResults.content_optimizations) ? rawResults.content_optimizations : [];
  const performanceAnalysis = Array.isArray(rawResults.performance_analysis) ? rawResults.performance_analysis : [];
  const overallSummary = rawResults.overall_summary || null;
  const quickWins = Array.isArray(audit.quick_wins) ? audit.quick_wins : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            {t("result.newAudit")}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <button
              onClick={copyLink}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? t("result.copied") : t("result.share")}
            </button>
            <a
              href={audit.url.startsWith("http") ? audit.url : `https://${audit.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              {t("result.visit")}
            </a>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-10">
        <div className="text-center space-y-2 animate-fade-up">
          <h1 className="text-2xl font-bold">{audit.page_title || audit.url}</h1>
          <p className="text-sm text-muted-foreground font-mono">{audit.url}</p>
          <p className="text-xs text-muted-foreground">
            {t("result.audited")} {new Date(audit.created_at).toLocaleDateString(dateLang, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {audit.screenshot_url && (
          <div className="rounded-xl border border-border overflow-hidden animate-fade-up max-w-4xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
              <Image className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{t("result.screenshot")}</span>
            </div>
            <img src={audit.screenshot_url} alt={t("result.screenshot")} className="w-full" />
          </div>
        )}

        {contentOptimizations.length > 0 && <ContentOptimizations items={contentOptimizations} />}
        {performanceAnalysis.length > 0 && <PerformanceAnalysis items={performanceAnalysis} />}
        {overallSummary && <OverallSummary summary={overallSummary} />}

        {quickWins.length > 0 && contentOptimizations.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-6 animate-fade-up">
            <QuickWins wins={quickWins} />
          </div>
        )}
      </main>
    </div>
  );
};

export default AuditResult;
