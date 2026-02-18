import { useEffect, useRef } from "react";

const companies = [
  "Google", "Microsoft", "Shopify", "HubSpot", "Stripe",
  "Slack", "Notion", "Figma", "Webflow", "Vercel",
  "Dropbox", "Airbnb", "Spotify", "Netflix", "Adobe",
];

const LogoText = ({ name }: { name: string }) => (
  <span className="inline-flex items-center px-8 text-lg font-bold tracking-wider text-muted-foreground/30 select-none whitespace-nowrap uppercase">
    {name}
  </span>
);

const TrustedByStripe = () => {
  return (
    <div className="w-full overflow-hidden py-8 mt-12 border-t border-border/50">
      <p className="text-center text-xs font-medium text-muted-foreground/50 uppercase tracking-widest mb-4">
        Trusted by teams at
      </p>
      <div className="relative w-full">
        {/* Fade edges */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-background to-transparent" />

        <div className="flex animate-marquee">
          {/* Two copies for seamless loop */}
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0">
              {companies.map((name) => (
                <LogoText key={`${copy}-${name}`} name={name} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrustedByStripe;
