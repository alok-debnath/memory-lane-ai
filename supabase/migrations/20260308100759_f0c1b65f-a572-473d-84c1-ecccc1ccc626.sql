-- Enable trigram extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN indexes for fuzzy search on title and content
CREATE INDEX IF NOT EXISTS idx_memory_notes_title_trgm 
ON public.memory_notes USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_memory_notes_content_trgm 
ON public.memory_notes USING gin (content gin_trgm_ops);

-- Create a fuzzy search function that returns results even with typos
CREATE OR REPLACE FUNCTION public.fuzzy_search_memories(
  search_query text,
  p_user_id uuid,
  similarity_threshold float DEFAULT 0.15,
  max_results int DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  category text,
  reminder_date timestamptz,
  is_recurring boolean,
  recurrence_type text,
  created_at timestamptz,
  fuzzy_score float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    GREATEST(
      similarity(mn.title, search_query),
      similarity(mn.content, search_query)
    )::float AS fuzzy_score
  FROM public.memory_notes mn
  WHERE mn.user_id = p_user_id
    AND (
      similarity(mn.title, search_query) > similarity_threshold
      OR similarity(mn.content, search_query) > similarity_threshold
      OR mn.title ILIKE '%' || search_query || '%'
      OR mn.content ILIKE '%' || search_query || '%'
    )
  ORDER BY fuzzy_score DESC
  LIMIT max_results;
END;
$$;