-- Create memory_notes table
CREATE TABLE public.memory_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  reminder_date TIMESTAMP WITH TIME ZONE,
  is_recurring BOOLEAN NOT NULL DEFAULT false,
  recurrence_type TEXT,
  category TEXT DEFAULT 'other',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memory_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own notes" ON public.memory_notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own notes" ON public.memory_notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own notes" ON public.memory_notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notes" ON public.memory_notes FOR DELETE USING (auth.uid() = user_id);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_memory_notes_updated_at
  BEFORE UPDATE ON public.memory_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_memory_notes_user_id ON public.memory_notes(user_id);
CREATE INDEX idx_memory_notes_reminder_date ON public.memory_notes(reminder_date);