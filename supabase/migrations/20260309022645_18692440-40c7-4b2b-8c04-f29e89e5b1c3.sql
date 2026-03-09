
ALTER TABLE public.memory_notes
  ADD COLUMN IF NOT EXISTS people text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS locations text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS importance text DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS life_area text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS context_tags jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sentiment_score numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_urls text[] DEFAULT '{}'::text[];
