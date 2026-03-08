-- Fix: drop the case-sensitive check constraint and replace with case-insensitive one
ALTER TABLE public.memory_history DROP CONSTRAINT memory_history_action_check;
ALTER TABLE public.memory_history ADD CONSTRAINT memory_history_action_check CHECK (lower(action) = ANY (ARRAY['update', 'delete']));

-- Also recreate the trigger to store lowercase action for consistency
CREATE OR REPLACE FUNCTION public.snapshot_memory_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.memory_history (memory_id, user_id, action, snapshot)
  VALUES (
    OLD.id,
    OLD.user_id,
    lower(TG_OP),
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
      'created_at', OLD.created_at,
      'updated_at', OLD.updated_at
    )
  );
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger (drop first if exists, then create)
DROP TRIGGER IF EXISTS trg_memory_snapshot ON public.memory_notes;
CREATE TRIGGER trg_memory_snapshot
  BEFORE UPDATE OR DELETE ON public.memory_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.snapshot_memory_change();