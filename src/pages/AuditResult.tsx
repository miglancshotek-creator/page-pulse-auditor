import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FrameworkScores from "@/components/FrameworkScores";
import CriticalIssues from "@/components/CriticalIssues";
import OverallSummary from "@/components/OverallSummary";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, ExternalLink, Copy, Check, Image, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
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

  const exportPDF = async () => {
    if (!reportRef.current || !audit) return;
    setExporting(true);

    const A4_W = 210;
    const A4_H = 297;
    const M = 10;
    const CW = A4_W - M * 2; // content width mm
    const GAP = 3;
    const RENDER_W = 1100; // offscreen render width px (closer to max-w-6xl)

    // ---- helpers ----
    const pdf = new jsPDF("p", "mm", "a4");
    const fillBg = () => { pdf.setFillColor(252, 252, 252); pdf.rect(0, 0, A4_W, A4_H, "F"); };
    fillBg();
    let curY = M;

    const addSection = (imgData: string, wPx: number, hPx: number, forceBreak: boolean, maxH?: number) => {
      const scale = CW / wPx;
      let drawW = CW;
      let drawH = hPx * scale;
      // Proportional cap: scale both dimensions equally to preserve aspect ratio
      if (maxH && drawH > maxH) {
        const factor = maxH / drawH;
        drawW = drawW * factor;
        drawH = maxH;
      }
      if (drawH < 1) return;
      if (forceBreak && curY > M + 1) { pdf.addPage(); fillBg(); curY = M; }
      const remaining = A4_H - M - curY;
      if (drawH > remaining && curY > M + 1) { pdf.addPage(); fillBg(); curY = M; }
      const maxPageH = A4_H - M * 2;
      if (drawH > maxPageH) {
        const factor = maxPageH / drawH;
        drawW = drawW * factor;
        drawH = maxPageH;
      }
      const xOffset = M + (CW - drawW) / 2;
      pdf.addImage(imgData, "JPEG", xOffset, curY, drawW, drawH);
      curY += drawH + GAP;
    };

    // ---- clone report offscreen at fixed width ----
    const clone = reportRef.current.cloneNode(true) as HTMLElement;
    clone.style.cssText = `position:absolute;left:-9999px;top:0;width:${RENDER_W}px;background:#fcfcfc;z-index:-1;`;

    // Only disable animations and force opacity; preserve flex/grid layouts
    clone.querySelectorAll("*").forEach((el) => {
      const h = el as HTMLElement;
      h.style.setProperty("animation", "none", "important");
      h.style.setProperty("opacity", "1", "important");
      h.style.setProperty("transition", "none", "important");
    });

    // Force screenshot grid to single-column ONLY when multiple images are side-by-side
    const screenshotGrids = clone.querySelectorAll("[data-pdf-section] .grid");
    screenshotGrids.forEach((grid) => {
      const g = grid as HTMLElement;
      const imgs = g.querySelectorAll(":scope > div > img, :scope > img");
      if (imgs.length > 1) {
        g.style.setProperty("grid-template-columns", "1fr", "important");
      }
    });

    document.body.appendChild(clone);

    try {
      // Wait for images to load in clone
      const imgs = Array.from(clone.querySelectorAll("img")) as HTMLImageElement[];
      await Promise.all(imgs.map(img => img.complete ? Promise.resolve() : new Promise(r => { img.onload = r; img.onerror = r; })));

      const sections = Array.from(clone.querySelectorAll("[data-pdf-section]")) as HTMLElement[];
      const captureOpts = { scale: 1.5, useCORS: true, backgroundColor: "#fcfcfc", logging: false };

      for (const section of sections) {
        if (section.offsetHeight === 0 || section.offsetWidth === 0) continue;

        const forceBreak = section.hasAttribute("data-pdf-page-break");

        // Screenshots: cap at 80mm
        const isScreenshot = section.querySelector("img") !== null && !section.querySelector("h2") && !section.querySelector("h3");

        const canvas = await html2canvas(section, captureOpts);
        const imgData = canvas.toDataURL("image/jpeg", 0.85);
        addSection(imgData, canvas.width, canvas.height, forceBreak, isScreenshot ? 80 : undefined);
        // Add extra spacing after screenshot sections
        if (isScreenshot) curY += 8;
      }

      const fileName = `audit-${(audit.page_title || audit.url).replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}.pdf`;
      pdf.save(fileName);
      toast({ title: t("result.pdfExported") || "PDF exported successfully" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      document.body.removeChild(clone);
      setExporting(false);
    }
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

  // Parse results
  let rawResults: any = {};
  try {
    rawResults = audit.raw_ai_response ? JSON.parse(audit.raw_ai_response) : {};
  } catch {
    rawResults = {};
  }

  const frameworkScores = Array.isArray(rawResults.framework_scores) ? rawResults.framework_scores : [];
  const criticalIssues = Array.isArray(rawResults.critical_issues) ? rawResults.critical_issues : [];
  const overallSummary = rawResults.overall_summary || null;
  const revenueLoss = rawResults.revenue_loss || null;
  const mobileScreenshotUrl = rawResults.mobile_screenshot_url || null;

  const overallScore = audit.overall_score || rawResults.overall_score || 0;
  const criticalCount = frameworkScores.filter((fw: any) => Math.round((fw.score || 0) * 10) < 50).length;

  const totalMonthlyLoss = revenueLoss?.total_monthly_loss || null;
  const totalAnnualLoss = revenueLoss?.total_annual_loss || null;

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
              onClick={exportPDF}
              disabled={exporting}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              {exporting ? (t("result.exporting")) : (t("result.downloadPdf"))}
            </button>
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

      <main ref={reportRef} className="container max-w-6xl mx-auto px-4 py-8 space-y-10">
        {/* Page info */}
        <div data-pdf-section className="text-center space-y-2 animate-fade-up">
          <h1 className="text-4xl font-bold">{audit.page_title || audit.url}</h1>
          <p className="text-lg text-muted-foreground font-mono">{audit.url}</p>
          <p className="text-sm text-muted-foreground">
            {t("result.audited")} {new Date(audit.created_at).toLocaleDateString(dateLang, { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        {/* Screenshots */}
        {(audit.screenshot_url || mobileScreenshotUrl) && (
          <div data-pdf-section className="animate-fade-up">
            <div className={`grid gap-4 max-w-5xl mx-auto ${audit.screenshot_url && mobileScreenshotUrl ? 'grid-cols-1 lg:grid-cols-[2fr_1fr]' : ''}`}>
              {audit.screenshot_url && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
                    <Image className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {mobileScreenshotUrl ? t("result.desktopScreenshot") : t("result.screenshot")}
                    </span>
                  </div>
                  <img src={audit.screenshot_url} alt={t("result.screenshot")} className="w-full" />
                </div>
              )}
              {mobileScreenshotUrl && (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2 bg-muted/30 border-b border-border">
                    <span className="text-sm">📱</span>
                    <span className="text-xs text-muted-foreground">{t("result.mobileScreenshot")}</span>
                  </div>
                  <img src={mobileScreenshotUrl} alt={t("result.mobileScreenshot")} className="w-full" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Health Score — full width, centered above issues */}
        {frameworkScores.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <FrameworkScores
              scores={frameworkScores}
              overallScore={overallScore}
              criticalCount={criticalCount}
            />
          </div>
        )}

        {/* Critical issues — same width as screenshot */}
        {criticalIssues.length > 0 && (
          <div className="max-w-5xl mx-auto">
            <CriticalIssues
              issues={criticalIssues}
              totalMonthlyLoss={totalMonthlyLoss}
              totalAnnualLoss={totalAnnualLoss}
              frameworkScores={frameworkScores}
            />
          </div>
        )}

        {/* Overall summary */}
        {overallSummary && (
          <div className="max-w-5xl mx-auto">
            <OverallSummary summary={{ ...overallSummary, score: overallSummary.score ? Math.round(overallSummary.score * 10) : overallScore }} />
          </div>
        )}
      </main>
    </div>
  );
};

export default AuditResult;
