import AuditForm from "@/components/AuditForm";
import { Activity } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="container max-w-6xl mx-auto px-4 py-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold tracking-tight">PagePulse</span>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6 mb-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/30 px-4 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            AI-Powered Conversion Auditor
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Find what's <span className="text-gradient-primary">killing</span> your conversions
          </h1>
          <p className="text-muted-foreground text-lg max-w-lg mx-auto leading-relaxed">
            Get an instant, AI-driven audit of any landing page. Scored on messaging, trust, CTAs, mobile, and SEO.
          </p>
        </div>

        <AuditForm />

        {/* Pillars */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-16 max-w-2xl mx-auto w-full">
          {[
            { name: "Messaging", emoji: "💬" },
            { name: "Trust", emoji: "🛡️" },
            { name: "CTAs", emoji: "🎯" },
            { name: "Mobile", emoji: "📱" },
            { name: "SEO", emoji: "🔍" },
          ].map((p) => (
            <div key={p.name} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-card/50 text-center">
              <span className="text-lg">{p.emoji}</span>
              <span className="text-xs font-medium text-muted-foreground">{p.name}</span>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted-foreground">
          Built with Firecrawl + AI · Landing Page Auditor
        </p>
      </footer>
    </div>
  );
};

export default Index;
