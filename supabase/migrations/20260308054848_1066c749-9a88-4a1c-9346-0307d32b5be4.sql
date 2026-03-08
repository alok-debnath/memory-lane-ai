-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Add embedding column to memory_notes
ALTER TABLE public.memory_notes ADD COLUMN IF NOT EXISTS embedding vector(768);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS memory_notes_embedding_idx ON public.memory_notes
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create semantic search function
CREATE OR REPLACE FUNCTION public.match_memories(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  category text,
  reminder_date timestamptz,
  is_recurring boolean,
  recurrence_type text,
  created_at timestamptz,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mn.id,
    mn.title,
    mn.content,
    mn.category,
    mn.reminder_date,
    mn.is_recurring,
    mn.recurrence_type,
    mn.created_at,
    1 - (mn.embedding <=> query_embedding) AS similarity
  FROM public.memory_notes mn
  WHERE mn.user_id = p_user_id
    AND mn.embedding IS NOT NULL
    AND 1 - (mn.embedding <=> query_embedding) > match_threshold
  ORDER BY mn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;