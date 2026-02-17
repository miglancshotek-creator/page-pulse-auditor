
-- Knowledge base table for gold standard audit criteria
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL,
  criterion TEXT NOT NULL,
  description TEXT,
  weight NUMERIC DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge base is publicly readable"
ON public.knowledge_base FOR SELECT
USING (true);

-- Audits table for persisting audit results
CREATE TABLE public.audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  page_title TEXT,
  screenshot_url TEXT,
  headers JSONB DEFAULT '[]'::jsonb,
  body_text TEXT,
  cta_texts JSONB DEFAULT '[]'::jsonb,
  overall_score INTEGER DEFAULT 0,
  scores JSONB DEFAULT '{}'::jsonb,
  quick_wins JSONB DEFAULT '[]'::jsonb,
  breakdown JSONB DEFAULT '[]'::jsonb,
  raw_ai_response TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Audits are publicly readable"
ON public.audits FOR SELECT
USING (true);

CREATE POLICY "Audits can be inserted by anyone"
ON public.audits FOR INSERT
WITH CHECK (true);

CREATE POLICY "Audits can be updated by anyone"
ON public.audits FOR UPDATE
USING (true);

-- Seed knowledge base with default audit criteria
INSERT INTO public.knowledge_base (category, criterion, description, weight) VALUES
('Messaging Clarity', 'Clear Value Proposition', 'The hero section must communicate what the product does, who it''s for, and why it matters within 5 seconds.', 3),
('Messaging Clarity', 'Benefit-Driven Headlines', 'Headlines should focus on outcomes and benefits, not features. Avoid jargon.', 2),
('Messaging Clarity', 'Consistent Messaging', 'All sections should reinforce the core value proposition without contradictions.', 1),
('Messaging Clarity', 'Specificity Over Vagueness', 'Use specific numbers, results, or outcomes instead of vague claims like "the best" or "revolutionary".', 2),
('Trust Signals', 'Social Proof Present', 'Page should include testimonials, case studies, logos, or user counts.', 3),
('Trust Signals', 'Authority Indicators', 'Certifications, awards, media mentions, or expert endorsements should be visible.', 2),
('Trust Signals', 'Risk Reducers', 'Money-back guarantees, free trials, or "no credit card required" reduce friction.', 2),
('Trust Signals', 'Real Names and Photos', 'Testimonials with real names, photos, and company names are more credible.', 1),
('CTA Strength', 'Above the Fold CTA', 'Primary CTA must be visible without scrolling.', 3),
('CTA Strength', 'Action-Oriented Copy', 'CTA text should use action verbs: "Start Free Trial" not "Submit" or "Click Here".', 2),
('CTA Strength', 'Visual Contrast', 'CTA button must stand out with contrasting color against the page background.', 2),
('CTA Strength', 'Single Primary CTA', 'Too many competing CTAs create decision paralysis. One clear primary action.', 1),
('Mobile Layout', 'Responsive Design', 'Page must render correctly on mobile devices with no horizontal scrolling.', 3),
('Mobile Layout', 'Tap Target Size', 'Buttons and links must be at least 44x44px for easy mobile tapping.', 2),
('Mobile Layout', 'Fast Mobile Load', 'Page should load quickly on mobile networks. Large images should be optimized.', 2),
('Mobile Layout', 'Readable Text Size', 'Body text should be at least 16px on mobile. No pinching to read.', 1),
('SEO Meta-data', 'Title Tag Optimized', 'Title tag should be under 60 chars, contain primary keyword, and be compelling.', 3),
('SEO Meta-data', 'Meta Description', 'Meta description should be under 160 chars with a clear value proposition and call to action.', 2),
('SEO Meta-data', 'H1 Tag Present', 'Page should have exactly one H1 tag that matches the page''s primary topic.', 2),
('SEO Meta-data', 'Open Graph Tags', 'OG title, description, and image should be set for social sharing.', 1);
