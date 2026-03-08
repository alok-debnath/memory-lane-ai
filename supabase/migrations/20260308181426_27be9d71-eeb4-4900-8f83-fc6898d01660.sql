
-- Memory history table: stores snapshots of every edit and delete
CREATE TABLE public.memory_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('update', 'delete')),
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_memory_history_memory_id ON public.memory_history(memory_id);
CREATE INDEX idx_memory_history_user_id_created ON public.memory_history(user_id, created_at DESC);

-- RLS
ALTER TABLE public.memory_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history"
  ON public.memory_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own history"
  ON public.memory_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own history"
  ON public.memory_history FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger function: auto-snapshot on UPDATE or DELETE
CREATE OR REPLACE FUNCTION public.snapshot_memory_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.memory_history (memory_id, user_id, action, snapshot)
  VALUES (
    OLD.id,
    OLD.user_id,
    TG_OP::text,
    jsonb_build_object(
      'id', OLD.id,
      'title', OLD.title,
      'content', OLD.content,
      'category', OLD.category,
      'mood', OLD.mood,
      'tags', OLD.tags,
      'reminder_date', OLD.reminder_date,
      'is_recurring', OLD.is_recurring,
      'recurrence_type', OLD.recurrence_type,
      'capsule_unlock_date', OLD.capsule_unlock_date,
      'extracted_actions', OLD.extracted_actions,
      'embedding', OLD.embedding,
      'created_at', OLD.created_at,
      'updated_at', OLD.updated_at
    )
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Attach trigger to memory_notes
CREATE TRIGGER trg_memory_snapshot
  BEFORE UPDATE OR DELETE ON public.memory_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_memory_change();

-- Auto-cleanup function: delete history older than 7 days
CREATE OR REPLACE FUNCTION public.cleanup_old_history()
  RETURNS void
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = 'public'
AS $$
  DELETE FROM public.memory_history WHERE created_at < now() - interval '7 days';
$$;
