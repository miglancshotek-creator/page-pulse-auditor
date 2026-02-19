import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ScoreRing from "@/components/ScoreRing";
import QuickWins from "@/components/QuickWins";
import ContentOptimizations from "@/components/ContentOptimizations";
import PerformanceAnalysis from "@/components/PerformanceAnalysis";
import OverallSummary from "@/components/OverallSummary";
import { ArrowLeft, ExternalLink, Copy, Check, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  useEffect(() => {
    const fetchAudit = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("audits")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        toast({ title: "Error", description: "Failed to load audit", variant: "destructive" });
        setLoading(false);
        return;
      }
      if (!data) {
        toast({ title: "Not found", description: "Audit not found", variant: "destructive" });
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
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading audit results...</p>
        </div>
      </div>
    );
  }

  if (!audit || audit.status !== "completed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">This audit is still processing or was not found.</p>
          <Link to="/" className="text-primary hover:underline text-sm">← Back to home</Link>
        </div>
      </div>
    );
  }

  // Parse raw AI response for new fields
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
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            New Audit
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Share"}
            </button>
            <a
              href={audit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Visit Page
            </a>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Page Info */}
        <div className="text-center space-y-2 animate-fade-up">
          <h1 className="text-2xl font-bold">{audit.page_title || audit.url}</h1>
          <p className="text-sm text-muted-foreground font-mono">{audit.url}</p>
          <p className="text-xs text-muted-foreground">
            Audited on {new Date(audit.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Screenshot */}
        {audit.screenshot_url && (
          <div className="rounded-xl border border-border overflow-hidden animate-fade-up max-w-4xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
              <Image className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Page Screenshot</span>
            </div>
            <img src={audit.screenshot_url} alt="Page screenshot" className="w-full" />
          </div>
        )}

        {/* Content Optimization Recommendations */}
        {contentOptimizations.length > 0 && (
          <ContentOptimizations items={contentOptimizations} />
        )}

        {/* Detailed Performance Analysis */}
        {performanceAnalysis.length > 0 && (
          <PerformanceAnalysis items={performanceAnalysis} />
        )}

        {/* Overall Performance Score */}
        {overallSummary && (
          <OverallSummary summary={overallSummary} />
        )}

        {/* Quick Wins (legacy fallback) */}
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
