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
    try {
      const A4_WIDTH_MM = 210;
      const A4_HEIGHT_MM = 297;
      const MARGIN_MM = 10;
      const CONTENT_WIDTH_MM = A4_WIDTH_MM - MARGIN_MM * 2;
      const SECTION_GAP_MM = 3;
      const MAX_CONTENT_HEIGHT_MM = A4_HEIGHT_MM - MARGIN_MM * 2;

      const pdf = new jsPDF("p", "mm", "a4");
      const fillPage = () => {
        pdf.setFillColor(252, 252, 252);
        pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, "F");
      };
      fillPage();

      let currentY = MARGIN_MM;

      // Disable animations and flatten grid layout for capture
      reportRef.current.style.setProperty("animation", "none", "important");
      // Force all grids to single-column so sections capture at full width
      const grids = Array.from(reportRef.current.querySelectorAll(".grid")) as HTMLElement[];
      grids.forEach((g) => {
        g.style.setProperty("display", "block", "important");
      });
      reportRef.current.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.setProperty("animation", "none", "important");
        htmlEl.style.setProperty("opacity", "1", "important");
      });

      const sections = Array.from(
        reportRef.current.querySelectorAll("[data-pdf-section]")
      ) as HTMLElement[];

      const captureOpts = { scale: 2, useCORS: true, backgroundColor: "#fcfcfc", logging: false };

      for (const section of sections) {
        // Skip zero-size sections
        if (section.offsetHeight === 0 || section.offsetWidth === 0) continue;

        // Force page break if marked
        if (section.hasAttribute("data-pdf-page-break") && currentY > MARGIN_MM) {
          pdf.addPage();
          fillPage();
          currentY = MARGIN_MM + 2;
        }

        const canvas = await html2canvas(section, captureOpts);
        const widthPx = canvas.width;
        const heightPx = canvas.height;
        const scaleFactor = CONTENT_WIDTH_MM / widthPx;
        let heightMM = heightPx * scaleFactor;

        // Cap screenshot images to save space on page 1
        const isScreenshot = section.querySelector("img") !== null && !section.querySelector("h2") && !section.querySelector("h3");
        if (isScreenshot && heightMM > 80) {
          heightMM = 80;
        }

        const imageType = isScreenshot ? "JPEG" : "PNG";
        const imgData = isScreenshot
          ? canvas.toDataURL("image/jpeg", 0.92)
          : canvas.toDataURL("image/png");
        const remainingSpace = A4_HEIGHT_MM - MARGIN_MM - currentY;

        if (heightMM <= remainingSpace) {
          // Fits on current page
          pdf.addImage(imgData, imageType, MARGIN_MM, currentY, CONTENT_WIDTH_MM, heightMM);
          currentY += heightMM + SECTION_GAP_MM;
        } else if (heightMM <= MAX_CONTENT_HEIGHT_MM) {
          // Doesn't fit here but fits on a fresh page
          pdf.addPage();
          fillPage();
          currentY = MARGIN_MM;
          pdf.addImage(imgData, imageType, MARGIN_MM, currentY, CONTENT_WIDTH_MM, heightMM);
          currentY += heightMM + SECTION_GAP_MM;
        } else {
          // Section taller than a full page — slice it
          if (currentY > MARGIN_MM) {
            pdf.addPage();
            fillPage();
            currentY = MARGIN_MM;
          }
          const pxPerMM = heightPx / heightMM;
          let srcY = 0;
          while (srcY < heightPx) {
            const availableMM = A4_HEIGHT_MM - MARGIN_MM - currentY;
            const sliceHeightPx = Math.min(availableMM * pxPerMM, heightPx - srcY);
            const sliceHeightMM = sliceHeightPx / pxPerMM;

            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = Math.round(sliceHeightPx * (canvas.width / widthPx));
            const ctx = sliceCanvas.getContext("2d")!;
            const srcYScaled = Math.round(srcY * (canvas.width / widthPx));
            const sliceHScaled = sliceCanvas.height;
            ctx.drawImage(canvas, 0, srcYScaled, canvas.width, sliceHScaled, 0, 0, canvas.width, sliceHScaled);

            const sliceImg = sliceCanvas.toDataURL("image/jpeg", 0.9);
            pdf.addImage(sliceImg, "JPEG", MARGIN_MM, currentY, CONTENT_WIDTH_MM, sliceHeightMM);

            srcY += sliceHeightPx;
            currentY += sliceHeightMM + SECTION_GAP_MM;

            if (srcY < heightPx) {
              pdf.addPage();
              fillPage();
              currentY = MARGIN_MM;
            }
          }
        }
      }

      const fileName = `audit-${(audit.page_title || audit.url).replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}.pdf`;
      pdf.save(fileName);

      // Restore styles
      reportRef.current.style.removeProperty("animation");
      grids.forEach((g) => g.style.removeProperty("display"));
      reportRef.current.querySelectorAll("*").forEach((el) => {
        const htmlEl = el as HTMLElement;
        htmlEl.style.removeProperty("animation");
        htmlEl.style.removeProperty("opacity");
      });
      toast({ title: t("result.pdfExported") || "PDF exported successfully" });
    } catch {
      if (reportRef.current) {
        reportRef.current.style.removeProperty("animation");
        const grids = Array.from(reportRef.current.querySelectorAll(".grid")) as HTMLElement[];
        grids.forEach((g) => g.style.removeProperty("display"));
        reportRef.current.querySelectorAll("*").forEach((el) => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.removeProperty("animation");
          htmlEl.style.removeProperty("opacity");
        });
      }
      toast({ title: "Export failed", variant: "destructive" });
    }
    setExporting(false);
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
          <h1 className="text-3xl font-bold">{audit.page_title || audit.url}</h1>
          <p className="text-base text-muted-foreground font-mono">{audit.url}</p>
          <p className="text-xs text-muted-foreground">
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

        {/* Framework scores card — standalone for PDF page 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2">
            {frameworkScores.length > 0 && (
              <FrameworkScores
                scores={frameworkScores}
                overallScore={overallScore}
                criticalCount={criticalCount}
              />
            )}
          </div>

          {/* Critical issues — right column */}
          <div className="lg:col-span-3">
            {criticalIssues.length > 0 && (
              <CriticalIssues
                issues={criticalIssues}
                totalMonthlyLoss={totalMonthlyLoss}
                totalAnnualLoss={totalAnnualLoss}
                frameworkScores={frameworkScores}
              />
            )}
          </div>
        </div>

        {/* Overall summary */}
        {overallSummary && <OverallSummary summary={{ ...overallSummary, score: overallSummary.score ? Math.round(overallSummary.score * 10) : overallScore }} />}
      </main>
    </div>
  );
};

export default AuditResult;
