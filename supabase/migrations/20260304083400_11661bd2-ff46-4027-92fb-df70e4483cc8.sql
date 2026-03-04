
-- Clear existing knowledge_base and insert 70 criteria across 7 frameworks
DELETE FROM public.knowledge_base;

INSERT INTO public.knowledge_base (category, criterion, weight, description) VALUES
-- 1. VALUE PROPOSITION (10 criteria)
('Value Proposition', 'Headline clarity — grunt test', 10, 'Critical. Can a visitor understand what you do, who it''s for, and why it matters in under 5 seconds? Based on Krug''s "Don''t Make Me Think" — if the headline fails the grunt test, nothing else on the page matters.'),
('Value Proposition', 'Differentiation from competitors', 8, 'High. Is the unique value proposition clearly distinct from alternatives? Cialdini''s Scarcity principle: if you sound like everyone else, there''s no reason to choose you.'),
('Value Proposition', 'Specificity and concreteness', 8, 'High. Are claims backed by concrete numbers, timeframes, or outcomes instead of vague superlatives? Heath brothers'' Made to Stick: concrete beats abstract every time.'),
('Value Proposition', 'Benefit-led vs feature-led copy', 6, 'Medium. Does the copy lead with outcomes the customer cares about, not internal features? Bly''s copywriting principle: sell the hole, not the drill.'),
('Value Proposition', 'Above-fold value delivery', 10, 'Critical. Is the core promise visible without scrolling? Miller''s StoryBrand: the hero section is your one shot to stop the scroll.'),
('Value Proposition', 'Audience specificity', 8, 'High. Does the page clearly identify WHO it''s for? Schwartz''s awareness stages: the more specific the audience call-out, the stronger the relevance signal.'),
('Value Proposition', 'Emotional hook in headline', 6, 'Medium. Does the headline trigger an emotional response — curiosity, fear of loss, desire? Kahneman''s System 1: decisions start with emotion, not logic.'),
('Value Proposition', 'Problem articulation', 8, 'High. Is the visitor''s pain point clearly stated before the solution? Miller''s StoryBrand framework: you must name the villain before presenting the guide.'),
('Value Proposition', 'Outcome visualization', 6, 'Medium. Can the visitor picture their life/business after using your product? Heath''s Concrete principle: paint a vivid picture of the after state.'),
('Value Proposition', 'Value hierarchy', 6, 'Medium. Are benefits presented in order of importance to the customer, not the company? Ariely''s Predictably Irrational: order of information changes perceived value.'),

-- 2. RELEVANCE & MESSAGE MATCH (10 criteria)
('Relevance & Message Match', 'Ad-to-page message match', 10, 'Critical. Does the headline match the ad copy or search intent that brought the visitor? Schwartz: the scent trail from ad to page must be seamless or visitors bounce instantly.'),
('Relevance & Message Match', 'Awareness stage alignment', 8, 'High. Is the copy calibrated to the visitor''s awareness level — unaware, problem-aware, solution-aware, product-aware, or most aware? Schwartz''s 5 Stages of Awareness.'),
('Relevance & Message Match', 'Traffic source congruence', 8, 'High. Is the page optimized for its primary traffic source? Google Search visitors have different intent than Facebook ad clicks.'),
('Relevance & Message Match', 'Search intent fulfillment', 6, 'Medium. Does the content deliver exactly what the search query or ad promised? Failing this creates cognitive dissonance and exit.'),
('Relevance & Message Match', 'Visual continuity from ad', 6, 'Medium. Do the design elements, colors, and imagery match the referring ad creative? Visual mismatch signals "wrong page" to System 1.'),
('Relevance & Message Match', 'Language and tone match', 6, 'Medium. Does the page speak in the visitor''s language, not corporate jargon? Krug: users scan for familiar language patterns.'),
('Relevance & Message Match', 'Expectation fulfillment', 8, 'High. Does the page deliver exactly what was promised in the referring source? Broken expectations trigger immediate exits.'),
('Relevance & Message Match', 'Segment targeting', 6, 'Medium. Is the page tailored to a specific audience segment rather than trying to speak to everyone?'),
('Relevance & Message Match', 'Context sensitivity', 6, 'Medium. Does the page account for the context — device, time, location, referral source — the visitor arrives with?'),
('Relevance & Message Match', 'Information scent trail', 8, 'High. Is there a clear, unbroken scent trail from ad → headline → subhead → CTA? Krug: users follow scent like foraging animals — break it and they leave.'),

-- 3. CLARITY & COGNITIVE EASE (10 criteria)
('Clarity & Cognitive Ease', 'Single clear primary CTA', 10, 'Critical. Is there ONE unmistakable primary action the page wants the visitor to take? Krug''s first law: don''t make me think about what to do next.'),
('Clarity & Cognitive Ease', 'Jargon elimination', 8, 'High. Is the page free of industry jargon, acronyms, or insider language the visitor won''t instantly understand? Krug: every moment of confusion is a conversion leak.'),
('Clarity & Cognitive Ease', 'Scannable page structure', 8, 'High. Can the page be scanned in 10 seconds to get the gist? Kahneman''s System 1 processes visuals and structure before reading text.'),
('Clarity & Cognitive Ease', 'Mobile text readability', 10, 'Critical. Is all text readable without zooming or horizontal scrolling on mobile? Over 60% of traffic is mobile — unreadable = unusable.'),
('Clarity & Cognitive Ease', 'Visual hierarchy effectiveness', 8, 'High. Do size, color, contrast, and position guide the eye in the intended sequence? Poor hierarchy = random scanning = missed message.'),
('Clarity & Cognitive Ease', 'Cognitive load management', 8, 'High. Is information chunked into digestible pieces (7±2 rule)? Kahneman: cognitive overload triggers System 2 resistance and exit.'),
('Clarity & Cognitive Ease', 'Reading level appropriateness', 6, 'Medium. Is copy written at a 6th–8th grade reading level? Bly: sophisticated writing loses conversions. Simple writing sells.'),
('Clarity & Cognitive Ease', 'White space and breathing room', 6, 'Medium. Is there sufficient negative space between elements to prevent visual overwhelm?'),
('Clarity & Cognitive Ease', 'Logical information architecture', 6, 'Medium. Is content organized in a logical flow: problem → solution → proof → action?'),
('Clarity & Cognitive Ease', 'Progressive disclosure', 6, 'Medium. Is complex information revealed gradually instead of dumped all at once? Krug: show only what''s needed at each stage.'),

-- 4. ANXIETY REDUCTION & TRUST (10 criteria)
('Anxiety Reduction & Trust', 'Social proof presence', 10, 'Critical. Are there testimonials, reviews, client logos, case studies, or usage numbers? Cialdini''s Social Proof: people follow what others do, especially under uncertainty.'),
('Anxiety Reduction & Trust', 'Risk reversal near CTA', 10, 'Critical. Is there a guarantee, free trial, money-back promise, or "no commitment" statement near the CTA? Reduces perceived risk of taking action.'),
('Anxiety Reduction & Trust', 'Proactive objection handling', 8, 'High. Are the top 3–5 objections addressed before the visitor reaches the CTA? Bly: unaddressed objections become silent conversion killers.'),
('Anxiety Reduction & Trust', 'Trust badges and security signals', 8, 'High. Are security seals, SSL indicators, payment badges, or certifications visible — especially near forms and CTAs?'),
('Anxiety Reduction & Trust', 'Proof specificity', 8, 'High. Are testimonials specific — with real names, photos, company names, and measurable results? Cialdini: specific social proof is 3–5x more persuasive than generic.'),
('Anxiety Reduction & Trust', 'Authority signals', 6, 'Medium. Are credentials, years of experience, media mentions, or expert endorsements displayed? Cialdini''s Authority principle.'),
('Anxiety Reduction & Trust', 'Privacy and data reassurance', 6, 'Medium. Is there reassurance about data handling near email/form fields? "We won''t spam you" reduces form anxiety.'),
('Anxiety Reduction & Trust', 'Contact accessibility', 6, 'Medium. Is it easy to find real contact information — phone, email, address? Invisible companies feel untrustworthy.'),
('Anxiety Reduction & Trust', 'Third-party validation', 6, 'Medium. Are there independent reviews (G2, Trustpilot, Google Reviews) or industry awards?'),
('Anxiety Reduction & Trust', 'Pricing and process transparency', 6, 'Medium. Is pricing or the next-step process transparent without hidden surprises? Ariely: uncertainty about cost triggers loss aversion and exit.'),

-- 5. DISTRACTION & FOCUS (10 criteria)
('Distraction & Focus', 'Navigation minimalism', 8, 'High. Is the navigation simplified or removed on landing pages? Every link is a potential exit. Krug: landing pages should have ONE job.'),
('Distraction & Focus', 'Exit point reduction', 8, 'High. Are unnecessary outbound links, social media icons, and footer links removed or minimized?'),
('Distraction & Focus', 'Form field minimalism', 10, 'Critical. Are forms reduced to only essential fields? Every additional field drops conversion rate by 5–10%. Krug: ask only what you absolutely need.'),
('Distraction & Focus', 'Page load performance', 8, 'High. Does the page load in under 3 seconds? Google data: 53% of mobile visitors leave if load time exceeds 3 seconds.'),
('Distraction & Focus', 'Single conversion goal', 10, 'Critical. Does EVERY element on the page serve the primary conversion goal? Eyal''s Hooked model: remove everything that doesn''t drive the desired action.'),
('Distraction & Focus', 'Visual noise elimination', 6, 'Medium. Is the page free of competing visual elements — busy backgrounds, decorative graphics, multiple color schemes?'),
('Distraction & Focus', 'Sidebar and footer cleanup', 6, 'Medium. Are sidebars eliminated and footers streamlined to prevent wandering?'),
('Distraction & Focus', 'Auto-play content elimination', 6, 'Medium. Are there no auto-playing videos, carousels, or animations that hijack attention? Auto-play = user annoyance = exit.'),
('Distraction & Focus', 'Pop-up restraint', 6, 'Medium. Are pop-ups used sparingly, timed appropriately, and easy to dismiss?'),
('Distraction & Focus', 'Content relevance to goal', 8, 'High. Is ALL content directly relevant to the conversion goal? Irrelevant content dilutes the message and increases cognitive load.'),

-- 6. CTA QUALITY (10 criteria)
('CTA Quality', 'Action-oriented CTA language', 10, 'Critical. Does the CTA use a strong verb + clear benefit? "Get my free audit" beats "Submit." Bly: the button text IS the final sales pitch.'),
('CTA Quality', 'Visual CTA prominence', 10, 'Critical. Is the CTA visually dominant — large, high-contrast, impossible to miss? If the CTA doesn''t pop, it doesn''t convert. Ogilvy: make the ask unmissable.'),
('CTA Quality', 'Three-layer CTA structure', 8, 'High. Does the CTA area have three layers: headline/context above, button in the middle, reassurance/micro-copy below? This structure addresses logic, action, and anxiety in one block.'),
('CTA Quality', 'Strategic CTA placement', 8, 'High. Is the primary CTA visible above the fold AND repeated after key content sections (proof, benefits, objection handling)?'),
('CTA Quality', 'Outcome-focused CTA copy', 8, 'High. Does the CTA describe what the user GETS, not what they DO? "Start saving money" vs "Sign up." Bly: sell the destination, not the vehicle.'),
('CTA Quality', 'Mobile touch-target sizing', 6, 'Medium. Is the CTA button at least 44×44px on mobile for reliable tapping? Apple/Google HIG standards.'),
('CTA Quality', 'CTA surrounding context', 6, 'Medium. Is there supporting text near the CTA that reduces last-second anxiety? "No credit card required" or "Cancel anytime."'),
('CTA Quality', 'Color and contrast differentiation', 6, 'Medium. Does the CTA button use a color that stands out from the page palette? It should be the most visually distinct element.'),
('CTA Quality', 'CTA repetition at logical intervals', 6, 'Medium. Is the CTA repeated at logical scroll points — not just once at the top or buried at the bottom?'),
('CTA Quality', 'Micro-copy below CTA', 6, 'Medium. Is there helpful micro-copy below the button addressing the #1 objection? Eyal: reduce friction at the moment of action.'),

-- 7. URGENCY & MOMENTUM (10 criteria)
('Urgency & Momentum', 'Cost of inaction articulated', 10, 'Critical. Is the consequence of NOT acting made painfully clear? Ariely + Kahneman''s Loss Aversion: people are 2x more motivated to avoid loss than to gain.'),
('Urgency & Momentum', 'Narrative arc (problem → solution → proof)', 8, 'High. Does the page tell a story: problem → agitation → solution → proof → action? Miller''s StoryBrand: humans are wired for narrative, not bullet points.'),
('Urgency & Momentum', 'Before/after contrast', 8, 'High. Is there a vivid contrast between the current painful state and the desired future state? Heath brothers: concrete contrast is more persuasive than abstract benefits.'),
('Urgency & Momentum', 'Price anchoring strategy', 6, 'Medium. Is the price anchored against a higher reference point — competitor cost, cost of the problem, or a higher-tier option? Ariely: anchor determines perceived value.'),
('Urgency & Momentum', 'Legitimate scarcity signals', 6, 'Medium. Are there genuine scarcity or exclusivity signals — limited spots, closing date, limited-time offer? Cialdini''s Scarcity: only works if believable.'),
('Urgency & Momentum', 'Social momentum indicators', 6, 'Medium. Are there signals that others are actively choosing this — "Join 2,400+ companies" or recent activity feeds? Cialdini''s Social Proof + Bandwagon effect.'),
('Urgency & Momentum', 'Time-sensitive framing', 6, 'Medium. Is there a legitimate reason to act now vs. later? Without urgency, "I''ll do it later" wins — and later never comes.'),
('Urgency & Momentum', 'Loss aversion triggers', 8, 'High. Is the potential loss from inaction highlighted more than the gain from action? Kahneman: losses loom larger than equivalent gains.'),
('Urgency & Momentum', 'Progress indicators in multi-step', 6, 'Medium. If the conversion is multi-step, is progress shown to maintain forward momentum? Eyal''s Investment phase: invested effort increases completion.'),
('Urgency & Momentum', 'Micro-commitment ladder', 6, 'Medium. Are there small, low-risk commitments before the big ask — quiz, calculator, free resource? Cialdini''s Commitment & Consistency.');
