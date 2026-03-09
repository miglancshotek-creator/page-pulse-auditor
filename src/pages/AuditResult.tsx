import { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FrameworkScores from "@/components/FrameworkScores";
import CriticalIssues from "@/components/CriticalIssues";
import OverallSummary from "@/components/OverallSummary";
import LanguageToggle from "@/components/LanguageToggle";
import { ArrowLeft, ExternalLink, Copy, Check, Image, Download, FileText } from "lucide-react";
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

    const addSection = (imgData: string, wPx: number, hPx: number, forceBreak: boolean, maxH?: number, maxW?: number) => {
      const scale = CW / wPx;
      let drawW = CW;
      let drawH = hPx * scale;
      // Proportional cap: scale both dimensions equally to preserve aspect ratio
      if (maxH && drawH > maxH) {
        const factor = maxH / drawH;
        drawW = drawW * factor;
        drawH = maxH;
      }
      // Optional width cap (proportional)
      if (maxW && drawW > maxW) {
        const factor = maxW / drawW;
        drawH = drawH * factor;
        drawW = maxW;
      }
      if (drawH < 1) return drawW;
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
      return drawW;
    };

    // ---- clone report offscreen at fixed width ----
    const clone = reportRef.current.cloneNode(true) as HTMLElement;
    clone.style.cssText = `position:absolute;left:-9999px;top:0;width:${RENDER_W}px;background:#fcfcfc;z-index:-1;font-size:120%;`;

    // Only disable animations and force opacity; preserve flex/grid layouts
    clone.querySelectorAll("*").forEach((el) => {
      const h = el as HTMLElement;
      h.style.setProperty("animation", "none", "important");
      h.style.setProperty("opacity", "1", "important");
      h.style.setProperty("transition", "none", "important");
    });

    // Boost Health Score fonts by 50% in PDF
    const fwScoresEl = clone.querySelector("[data-fw-scores]") as HTMLElement | null;
    if (fwScoresEl) fwScoresEl.style.setProperty("font-size", "150%", "important");

    // Hide elements marked for PDF exclusion
    clone.querySelectorAll("[data-pdf-hide]").forEach((el) => {
      (el as HTMLElement).style.setProperty("display", "none", "important");
    });

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
      // Proxy external screenshot images to base64 data URLs for reliable PDF rendering
      const imgs = Array.from(clone.querySelectorAll("img")) as HTMLImageElement[];
      await Promise.all(imgs.map(async (img) => {
        const src = img.src;
        if (!src || src.startsWith("data:")) return;
        try {
          const { data, error } = await supabase.functions.invoke("image-proxy", {
            body: { url: src },
          });
          if (!error && data?.dataUrl) {
            img.src = data.dataUrl;
          }
        } catch {
          // Fall back to original URL
        }
        // Wait for image to settle
        if (!img.complete) {
          await new Promise(r => { img.onload = r; img.onerror = r; });
        }
      }));

      const sections = Array.from(clone.querySelectorAll("[data-pdf-section]")) as HTMLElement[];
      const captureOpts = { scale: 1.5, useCORS: true, backgroundColor: "#fcfcfc", logging: false };

      let lastScreenshotW: number | undefined;

      for (const section of sections) {
        if (section.offsetHeight === 0 || section.offsetWidth === 0) continue;

        const forceBreak = section.hasAttribute("data-pdf-page-break");

        // Screenshots: cap at 80mm
        const isScreenshot = section.querySelector("img") !== null && !section.querySelector("h2") && !section.querySelector("h3");
        // Health Score section (has data-fw-scores attribute)
        const isHealthScore = section.querySelector("[data-fw-scores]") !== null || section.hasAttribute("data-fw-scores");

        const canvas = await html2canvas(section, captureOpts);
        const imgData = canvas.toDataURL("image/jpeg", 0.85);

        const drawnW = addSection(imgData, canvas.width, canvas.height, forceBreak, isScreenshot ? 80 : undefined, isHealthScore ? lastScreenshotW : undefined);

        if (isScreenshot) {
          lastScreenshotW = drawnW;
          curY += 3;
        }
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

  const generateBuildPrompt = () => {
    if (!audit) return;

    const isCs = lang === "cs";
    const lines: string[] = [];
    const add = (s: string) => lines.push(s);
    const blank = () => lines.push("");

    add("=".repeat(70));
    add(isCs
      ? "LOVABLE PROMPT: Vylepši landing page na základě auditu"
      : "LOVABLE PROMPT: Improve landing page based on audit findings");
    add("=".repeat(70));
    blank();

    // 1. Original page info
    add(isCs ? "## Původní stránka" : "## Original Page");
    add(`URL: ${audit.url}`);
    add(`${isCs ? "Název" : "Title"}: ${audit.page_title || "N/A"}`);
    if (audit.screenshot_url) add(`${isCs ? "Screenshot (vizuální reference)" : "Screenshot (visual reference)"}: ${audit.screenshot_url}`);
    add(`${isCs ? "Datum auditu" : "Audit date"}: ${new Date(audit.created_at).toLocaleDateString(lang === "cs" ? "cs-CZ" : "en-US", { day: "numeric", month: "long", year: "numeric" })}`);
    add(`${isCs ? "Celkové skóre" : "Overall score"}: ${overallScore}/100`);
    blank();

    // 2. Original page structure
    add(isCs ? "## Struktura původní stránky" : "## Original Page Structure");
    blank();

    // Headers
    const auditFull = audit as any;
    const headers = auditFull.headers;
    if (headers && (Array.isArray(headers) ? headers.length > 0 : Object.keys(headers).length > 0)) {
      add(isCs ? "### Nadpisy stránky" : "### Page Headings");
      if (Array.isArray(headers)) {
        for (const h of headers) {
          if (typeof h === "string") add(`- ${h}`);
          else if (h.tag && h.text) add(`- ${h.tag}: ${h.text}`);
          else add(`- ${JSON.stringify(h)}`);
        }
      } else if (typeof headers === "object") {
        for (const [tag, vals] of Object.entries(headers)) {
          if (Array.isArray(vals)) {
            for (const v of vals) add(`- ${tag}: ${v}`);
          } else {
            add(`- ${tag}: ${vals}`);
          }
        }
      }
      blank();
    }

    // CTA texts
    const ctaTexts = auditFull.cta_texts;
    if (Array.isArray(ctaTexts) && ctaTexts.length > 0) {
      add(isCs ? "### CTA tlačítka na stránce" : "### CTA Buttons on Page");
      for (const cta of ctaTexts) add(`- ${cta}`);
      blank();
    }

    // Image URLs from scraped content
    const imageUrls = auditFull.image_urls;
    if (Array.isArray(imageUrls) && imageUrls.length > 0) {
      add(isCs ? "### Obrázky na stránce" : "### Images on Page");
      for (const img of imageUrls) {
        if (typeof img === "string") {
          add(`- ${img}`);
        } else if (img.url) {
          add(`- ${img.url}${img.alt ? ` (alt: "${img.alt}")` : ""}`);
        }
      }
      blank();
    }

    // Branding data from scraped content
    const brandingData = auditFull.branding_data;
    if (brandingData && typeof brandingData === "object" && Object.keys(brandingData).length > 0) {
      add(isCs ? "### Design & Branding" : "### Design & Branding");
      if (brandingData.colorScheme) add(`${isCs ? "Barevné schéma" : "Color scheme"}: ${brandingData.colorScheme}`);
      if (brandingData.logo) add(`Logo: ${brandingData.logo}`);
      if (brandingData.colors && typeof brandingData.colors === "object") {
        add(isCs ? "Hlavní barvy:" : "Primary colors:");
        for (const [key, value] of Object.entries(brandingData.colors)) {
          if (typeof value === "string") add(`  - ${key}: ${value}`);
        }
      }
      if (brandingData.fonts && Array.isArray(brandingData.fonts)) {
        add(isCs ? "Fonty:" : "Fonts:");
        for (const font of brandingData.fonts) {
          if (font.family) add(`  - ${font.family}`);
        }
      }
      if (brandingData.images && typeof brandingData.images === "object") {
        if (brandingData.images.favicon) add(`Favicon: ${brandingData.images.favicon}`);
        if (brandingData.images.ogImage) add(`OG Image: ${brandingData.images.ogImage}`);
      }
      blank();
    }

    // Body text (markdown content of the page)
    const bodyText = auditFull.body_text;
    if (bodyText && typeof bodyText === "string") {
      add(isCs ? "### Obsah stránky (markdown)" : "### Page Content (markdown)");
      add(bodyText.substring(0, 5000));
      if (bodyText.length > 5000) add(`\n... (${isCs ? "zkráceno" : "truncated"})`);
      blank();
    }

    // 3. Framework scores
    if (frameworkScores.length > 0) {
      add(isCs ? "## Skóre podle frameworků" : "## Framework Scores");
      for (const fw of frameworkScores) {
        const score = Math.round((fw.score || 0) * 10);
        add(`- ${fw.name}: ${score}/100`);
        if (fw.issues?.length) {
          for (const issue of fw.issues) {
            add(`  • ${isCs ? "Problém" : "Issue"}: ${issue.title || issue}`);
            if (issue.solution) add(`    ${isCs ? "Řešení" : "Solution"}: ${issue.solution}`);
          }
        }
      }
      blank();
    }

    // 4. Critical issues
    if (criticalIssues.length > 0) {
      add(isCs ? "## Kritické problémy k opravě" : "## Critical Issues to Fix");
      for (const issue of criticalIssues) {
        add(`### ${issue.framework || "General"}: ${issue.title}`);
        if (issue.description) add(issue.description);
        if (issue.solution) add(`${isCs ? "Řešení" : "Solution"}: ${issue.solution}`);
        if (issue.est_monthly_leak) add(`${isCs ? "Měsíční únik" : "Monthly leak"}: ${issue.est_monthly_leak}`);
        blank();
      }
    }

    // 5. Content optimizations
    const contentOpts = rawResults.content_optimizations;
    if (Array.isArray(contentOpts) && contentOpts.length > 0) {
      add(isCs ? "## Optimalizace obsahu" : "## Content Optimizations");
      for (const opt of contentOpts) {
        add(`- ${opt.element || opt.type || "Element"}`);
        if (opt.current) add(`  ${isCs ? "Aktuální" : "Current"}: ${opt.current}`);
        if (opt.optimized) add(`  ${isCs ? "Optimalizovaná" : "Optimized"}: ${opt.optimized}`);
        if (opt.why) add(`  ${isCs ? "Proč" : "Why"}: ${opt.why}`);
      }
      blank();
    }

    // 6. Overall summary
    if (overallSummary) {
      add(isCs ? "## Celkové shrnutí" : "## Overall Summary");
      if (overallSummary.narrative) add(overallSummary.narrative);
      if (overallSummary.next_steps?.length) {
        blank();
        add(isCs ? "Další kroky:" : "Next steps:");
        for (const step of overallSummary.next_steps) {
          add(`- ${step}`);
        }
      }
      blank();
    }

    // 7. Build instructions — REPAIR, DON'T REPLACE
    add("=".repeat(70));
    add(isCs ? "## INSTRUKCE PRO LOVABLE" : "## INSTRUCTIONS FOR LOVABLE");
    add("=".repeat(70));
    blank();

    if (isCs) {
      add(`Toto NENÍ nová stránka. Rekonstruuj stránku ${audit.url} a aplikuj POUZE opravy nalezené v auditu.`);
      add(`Screenshot výše slouží jako primární vizuální reference — stránka musí vypadat stejně, jen lépe.`);
      blank();
      add("Pravidla:");
      add("1. ZACHOVEJ barevné schéma, logo, celkový layout a navigaci původní stránky");
      add("2. ZACHOVEJ sekce stránky ve stejném pořadí, pokud audit nenavrhuje jinak");
      add("3. ZACHOVEJ font styl a vizuální identitu — neopravuj to, co funguje");
      add("4. POUŽIJ původní obrázky a vizuální prvky uvedené v sekci 'Obrázky na stránce' a 'Design & Branding'");
      add("5. Aplikuj POUZE změny navržené v auditu výše");
      add("6. Použij optimalizované texty z auditu místo původních tam, kde audit navrhuje změnu");
      add("7. Zajisti plnou responzivitu (mobile-first)");
      add("8. Optimalizuj CTA tlačítka dle doporučení auditu — zachovej pozice, zlepši texty a kontrast");
      add("9. Dodržuj SEO best practices — správná heading hierarchie, meta tagy, alt texty");
      add("10. Použij React + Tailwind CSS + shadcn/ui komponenty");
      add("11. Přidej jemné animace (framer-motion) tam, kde to zlepší engagement, ale neměň charakter stránky");
    } else {
      add(`This is NOT a new page. Reconstruct the page ${audit.url} and apply ONLY the fixes identified in the audit.`);
      add(`The screenshot above serves as the primary visual reference — the page must look the same, just better.`);
      blank();
      add("Rules:");
      add("1. PRESERVE the color scheme, logo, overall layout and navigation of the original page");
      add("2. PRESERVE sections in the same order, unless the audit suggests otherwise");
      add("3. PRESERVE font style and visual identity — don't fix what isn't broken");
      add("4. USE the original images and visual elements listed in 'Images on Page' and 'Design & Branding' sections");
      add("5. Apply ONLY the changes recommended in the audit above");
      add("6. Use optimized copy from the audit where changes are suggested");
      add("7. Ensure full responsiveness (mobile-first)");
      add("8. Optimize CTA buttons per audit recommendations — keep positions, improve copy and contrast");
      add("9. Follow SEO best practices — proper heading hierarchy, meta tags, alt text");
      add("10. Use React + Tailwind CSS + shadcn/ui components");
      add("11. Add subtle animations (framer-motion) where they improve engagement, but don't change the page character");
    }
    blank();

    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `build-prompt-${(audit.page_title || audit.url).replace(/[^a-zA-Z0-9]/g, "-").substring(0, 40)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              onClick={generateBuildPrompt}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border border-border rounded-lg px-3 py-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              {t("result.downloadPrompt")}
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
