
-- Add columns (idempotent - they may already exist from partial migration)
DO $$ BEGIN
  ALTER TABLE public.memory_notes ADD COLUMN mood text DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.memory_notes ADD COLUMN capsule_unlock_date timestamptz DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.memory_notes ADD COLUMN extracted_actions jsonb DEFAULT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_memory_notes_capsule 
  ON public.memory_notes (user_id, capsule_unlock_date) 
  WHERE capsule_unlock_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_memory_notes_mood 
  ON public.memory_notes (user_id, mood, created_at) 
  WHERE mood IS NOT NULL;

-- Flashback function
CREATE OR REPLACE FUNCTION public.get_flashback_memories(p_user_id uuid, p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid, title text, content text, category text, mood text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT mn.id, mn.title, mn.content, mn.category, mn.mood, mn.created_at
  FROM public.memory_notes mn
  WHERE mn.user_id = p_user_id
    AND EXTRACT(MONTH FROM mn.created_at) = EXTRACT(MONTH FROM now())
    AND EXTRACT(DAY FROM mn.created_at) = EXTRACT(DAY FROM now())
    AND mn.created_at < date_trunc('day', now())
  ORDER BY mn.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Cursor pagination function
CREATE OR REPLACE FUNCTION public.get_memories_paginated(
  p_user_id uuid,
  p_limit integer DEFAULT 50,
  p_cursor timestamptz DEFAULT NULL,
  p_category text DEFAULT NULL
)
RETURNS TABLE(id uuid, title text, content text, category text, reminder_date timestamptz, 
              is_recurring boolean, recurrence_type text, created_at timestamptz, updated_at timestamptz,
              mood text, capsule_unlock_date timestamptz, extracted_actions jsonb, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT mn.id, mn.title, mn.content, mn.category, mn.reminder_date,
         mn.is_recurring, mn.recurrence_type, mn.created_at, mn.updated_at,
         mn.mood, mn.capsule_unlock_date, mn.extracted_actions, mn.user_id
  FROM public.memory_notes mn
  WHERE mn.user_id = p_user_id
    AND (p_cursor IS NULL OR mn.created_at < p_cursor)
    AND (p_category IS NULL OR mn.category = p_category)
  ORDER BY mn.created_at DESC
  LIMIT p_limit;
END;
$$;
