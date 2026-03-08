
-- Diary entries: stores raw + AI-processed diary entries
CREATE TABLE public.diary_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  raw_text text NOT NULL,
  structured_insights jsonb DEFAULT '{}'::jsonb,
  mood text,
  energy_level text,
  topics text[] DEFAULT '{}'::text[],
  habits_detected jsonb DEFAULT '[]'::jsonb,
  personality_traits jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.diary_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own diary entries" ON public.diary_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own diary entries" ON public.diary_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own diary entries" ON public.diary_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own diary entries" ON public.diary_entries FOR DELETE USING (auth.uid() = user_id);

-- AI nudges: behavioral nudges generated from diary analysis
CREATE TABLE public.ai_nudges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nudge_type text NOT NULL DEFAULT 'general',
  title text NOT NULL,
  message text NOT NULL,
  priority text NOT NULL DEFAULT 'low',
  based_on jsonb DEFAULT '[]'::jsonb,
  is_dismissed boolean NOT NULL DEFAULT false,
  is_acted_on boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nudges" ON public.ai_nudges FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own nudges" ON public.ai_nudges FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own nudges" ON public.ai_nudges FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own nudges" ON public.ai_nudges FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_diary_entries_user_created ON public.diary_entries (user_id, created_at DESC);
CREATE INDEX idx_ai_nudges_user_active ON public.ai_nudges (user_id, is_dismissed, created_at DESC);

-- Updated at trigger for diary entries
CREATE TRIGGER update_diary_entries_updated_at
  BEFORE UPDATE ON public.diary_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
