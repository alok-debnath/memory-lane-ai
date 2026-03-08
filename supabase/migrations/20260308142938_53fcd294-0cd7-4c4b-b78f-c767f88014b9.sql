
-- Add tags column to memory_notes
ALTER TABLE public.memory_notes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_memory_notes_tags ON public.memory_notes USING GIN (tags);

-- Document extractions table for OCR/AI-processed document content
CREATE TABLE public.document_extractions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id uuid NOT NULL,
  memory_id uuid NOT NULL REFERENCES public.memory_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  extracted_text text NOT NULL DEFAULT '',
  document_type text DEFAULT 'other',
  expiry_date timestamptz,
  key_details jsonb DEFAULT '{}',
  embedding vector(768),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own doc extractions" ON public.document_extractions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own doc extractions" ON public.document_extractions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own doc extractions" ON public.document_extractions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Spaced repetition review schedule
CREATE TABLE public.review_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES public.memory_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  next_review_at timestamptz NOT NULL DEFAULT now(),
  interval_days integer NOT NULL DEFAULT 1,
  ease_factor numeric(4,2) NOT NULL DEFAULT 2.50,
  repetitions integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(memory_id, user_id)
);

ALTER TABLE public.review_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reviews" ON public.review_schedule
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Function to match document extractions by vector similarity
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  attachment_id uuid,
  memory_id uuid,
  extracted_text text,
  document_type text,
  expiry_date timestamptz,
  key_details jsonb,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    de.id, de.attachment_id, de.memory_id,
    de.extracted_text, de.document_type, de.expiry_date,
    de.key_details, de.created_at,
    (1 - (de.embedding <=> query_embedding))::float AS similarity
  FROM public.document_extractions de
  WHERE de.user_id = p_user_id
    AND de.embedding IS NOT NULL
    AND 1 - (de.embedding <=> query_embedding) > match_threshold
  ORDER BY de.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
