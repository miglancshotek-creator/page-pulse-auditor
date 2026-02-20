import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "cs" | "en";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Lang, string>> = {
  // Nav / Header
  "nav.brand": { cs: "PagePulse", en: "PagePulse" },
  "nav.badge": { cs: "AI auditor konverzí", en: "AI conversion auditor" },

  // Hero
  "hero.title.prefix": { cs: "Odhalte, co ", en: "Discover what " },
  "hero.title.highlight": { cs: "zabíjí", en: "kills" },
  "hero.title.suffix": { cs: " vaše konverze", en: " your conversions" },
  "hero.subtitle": {
    cs: "Získejte okamžitý AI audit jakékoli landing page. Hodnocení sdělení, důvěryhodnosti, CTA, mobilní verze a SEO.",
    en: "Get an instant AI audit of any landing page. Evaluate messaging, trust, CTAs, mobile experience and SEO.",
  },

  // Pillars
  "pillar.messaging": { cs: "Sdělení", en: "Messaging" },
  "pillar.trust": { cs: "Důvěra", en: "Trust" },
  "pillar.cta": { cs: "CTA", en: "CTA" },
  "pillar.mobile": { cs: "Mobil", en: "Mobile" },
  "pillar.seo": { cs: "SEO", en: "SEO" },

  // Trusted by
  "trusted.label": { cs: "Důvěřují nám týmy z", en: "Trusted by teams from" },

  // Footer
  "footer.text": { cs: "Postaveno s Firecrawl + AI · Auditor landing page", en: "Built with Firecrawl + AI · Landing page auditor" },

  // Audit Form
  "form.placeholder": { cs: "Zadejte URL landing page...", en: "Enter landing page URL..." },
  "form.submit": { cs: "Spustit audit", en: "Run audit" },
  "form.scraping": { cs: "Načítám...", en: "Loading..." },
  "form.scoring": { cs: "Analyzuji...", en: "Analyzing..." },
  "form.step.scraping": { cs: "Procházím stránku pomocí Firecrawl...", en: "Crawling page with Firecrawl..." },
  "form.step.scoring": { cs: "AI analyzuje vaši stránku...", en: "AI is analyzing your page..." },
  "form.error.create": { cs: "Nepodařilo se vytvořit audit", en: "Failed to create audit" },
  "form.error.scrape": { cs: "Nepodařilo se načíst stránku", en: "Failed to load page" },
  "form.error.score": { cs: "Hodnocení AI selhalo", en: "AI scoring failed" },
  "form.error.title": { cs: "Audit selhal", en: "Audit failed" },
  "form.error.generic": { cs: "Něco se pokazilo. Zkuste to prosím znovu.", en: "Something went wrong. Please try again." },

  // Audit Result
  "result.loading": { cs: "Načítám výsledky auditu...", en: "Loading audit results..." },
  "result.processing": { cs: "Tento audit se stále zpracovává nebo nebyl nalezen.", en: "This audit is still processing or was not found." },
  "result.back": { cs: "← Zpět na úvodní stránku", en: "← Back to home" },
  "result.newAudit": { cs: "Nový audit", en: "New audit" },
  "result.share": { cs: "Sdílet", en: "Share" },
  "result.copied": { cs: "Zkopírováno!", en: "Copied!" },
  "result.linkCopied": { cs: "Odkaz zkopírován!", en: "Link copied!" },
  "result.visit": { cs: "Navštívit stránku", en: "Visit page" },
  "result.screenshot": { cs: "Snímek stránky", en: "Page screenshot" },
  "result.audited": { cs: "Auditováno", en: "Audited" },
  "result.error.load": { cs: "Nepodařilo se načíst audit", en: "Failed to load audit" },
  "result.error.title": { cs: "Chyba", en: "Error" },
  "result.error.notFound": { cs: "Audit nebyl nalezen", en: "Audit not found" },
  "result.error.notFoundTitle": { cs: "Nenalezeno", en: "Not found" },

  // ScoreRing
  "score.excellent": { cs: "Výborné", en: "Excellent" },
  "score.good": { cs: "Dobré", en: "Good" },
  "score.improve": { cs: "Ke zlepšení", en: "Needs work" },
  "score.critical": { cs: "Kritické", en: "Critical" },
  "score.label": { cs: "Skóre konverzního zdraví", en: "Conversion health score" },

  // Quick Wins
  "quickwins.title": { cs: "Rychlé výhry", en: "Quick wins" },
  "quickwins.subtitle": { cs: "Změny s vysokým dopadem", en: "High-impact changes" },
  "impact.high": { cs: "vysoký", en: "high" },
  "impact.medium": { cs: "střední", en: "medium" },
  "impact.low": { cs: "nízký", en: "low" },

  // Audit Breakdown
  "breakdown.title": { cs: "Rozpis auditu", en: "Audit breakdown" },
  "breakdown.category": { cs: "Kategorie", en: "Category" },
  "breakdown.score": { cs: "Skóre", en: "Score" },
  "breakdown.recommendation": { cs: "Doporučení", en: "Recommendation" },

  // Content Optimizations
  "content.title": { cs: "Doporučení pro optimalizaci obsahu", en: "Content optimization recommendations" },
  "content.impact": { cs: "Dopad:", en: "Impact:" },
  "content.current": { cs: "Aktuální verze:", en: "Current version:" },
  "content.optimized": { cs: "Optimalizovaná verze:", en: "Optimized version:" },
  "content.why": { cs: "Proč je to lepší:", en: "Why this is better:" },

  // Performance Analysis
  "perf.title": { cs: "Podrobná analýza výkonu", en: "Detailed performance analysis" },
  "perf.insight": { cs: "Expertní vhled: ", en: "Expert insight: " },
  "perf.actions": { cs: "Akční kroky:", en: "Action items:" },

  // Overall Summary
  "summary.title": { cs: "Celkové hodnocení výkonu", en: "Overall performance rating" },
  "summary.nextSteps": { cs: "Další kroky:", en: "Next steps:" },

  // 404
  "notfound.title": { cs: "Stránka nebyla nalezena", en: "Page not found" },
  "notfound.back": { cs: "Zpět na úvodní stránku", en: "Back to home" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("pagepulse-lang");
    return (saved === "en" || saved === "cs") ? saved : "cs";
  });

  const changeLang = (newLang: Lang) => {
    setLang(newLang);
    localStorage.setItem("pagepulse-lang", newLang);
  };

  const t = (key: string): string => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang: changeLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};
