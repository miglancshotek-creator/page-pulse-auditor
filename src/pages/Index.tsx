import AuditForm from "@/components/AuditForm";
import TrustedByStripe from "@/components/TrustedByStripe";
import LanguageToggle from "@/components/LanguageToggle";
import { Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { t } = useLanguage();

  const pillars = [
    { name: t("pillar.messaging"), emoji: "💬" },
    { name: t("pillar.trust"), emoji: "🛡️" },
    { name: t("pillar.cta"), emoji: "🎯" },
    { name: t("pillar.mobile"), emoji: "📱" },
    { name: t("pillar.seo"), emoji: "🔍" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold tracking-tight">PagePulse</span>
          </div>
          <LanguageToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-2xl mx-auto text-center space-y-4 mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            {t("nav.badge")}
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            {t("hero.title.prefix")}<span className="text-gradient-primary">{t("hero.title.highlight")}</span>{t("hero.title.suffix")}
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            {t("hero.subtitle")}
          </p>
        </div>

        <AuditForm />

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-10 max-w-2xl mx-auto w-full">
          {pillars.map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-card/50 text-center">
              <span className="text-lg">{p.emoji}</span>
              <span className="text-xs font-medium text-muted-foreground">{p.name}</span>
            </div>
          ))}
        </div>

        <TrustedByStripe />
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          {t("footer.text")}
        </p>
      </footer>
    </div>
  );
};

export default Index;
