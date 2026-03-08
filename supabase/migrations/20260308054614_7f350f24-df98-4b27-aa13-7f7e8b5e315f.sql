-- Create storage bucket for memory attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('memory-attachments', 'memory-attachments', true);

-- Storage policies
CREATE POLICY "Users can upload their own attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'memory-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'memory-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'memory-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public can view memory attachments"
ON storage.objects FOR SELECT TO anon
USING (bucket_id = 'memory-attachments');

-- Create memory_attachments table
CREATE TABLE public.memory_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid NOT NULL REFERENCES public.memory_notes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.memory_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own memory attachments"
ON public.memory_attachments FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory attachments"
ON public.memory_attachments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own memory attachments"
ON public.memory_attachments FOR DELETE TO authenticated
USING (auth.uid() = user_id);