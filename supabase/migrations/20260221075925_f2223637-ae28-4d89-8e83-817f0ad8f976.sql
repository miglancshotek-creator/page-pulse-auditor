CREATE TABLE audit_guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_guidelines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Guidelines are publicly readable"
  ON audit_guidelines FOR SELECT USING (true);