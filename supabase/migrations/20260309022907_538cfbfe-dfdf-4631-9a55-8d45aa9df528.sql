
DROP FUNCTION IF EXISTS public.get_memories_paginated(uuid, integer, timestamp with time zone, text);

CREATE FUNCTION public.get_memories_paginated(
  p_user_id uuid, 
  p_limit integer DEFAULT 50, 
  p_cursor timestamp with time zone DEFAULT NULL, 
  p_category text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, title text, content text, category text, 
  reminder_date timestamp with time zone, is_recurring boolean, 
  recurrence_type text, created_at timestamp with time zone, 
  updated_at timestamp with time zone, mood text, 
  capsule_unlock_date timestamp with time zone, 
  extracted_actions jsonb, user_id uuid,
  people text[], locations text[], importance text,
  life_area text, context_tags jsonb, sentiment_score numeric,
  linked_urls text[], tags text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT mn.id, mn.title, mn.content, mn.category, mn.reminder_date,
         mn.is_recurring, mn.recurrence_type, mn.created_at, mn.updated_at,
         mn.mood, mn.capsule_unlock_date, mn.extracted_actions, mn.user_id,
         mn.people, mn.locations, mn.importance,
         mn.life_area, mn.context_tags, mn.sentiment_score,
         mn.linked_urls, mn.tags
  FROM public.memory_notes mn
  WHERE mn.user_id = p_user_id
    AND (p_cursor IS NULL OR mn.created_at < p_cursor)
    AND (p_category IS NULL OR mn.category = p_category)
  ORDER BY mn.created_at DESC
  LIMIT p_limit;
END;
$$;
