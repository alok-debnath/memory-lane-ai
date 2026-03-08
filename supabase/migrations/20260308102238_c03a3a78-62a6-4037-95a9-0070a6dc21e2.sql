
CREATE TABLE public.shared_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id uuid REFERENCES public.memory_notes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  share_token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_shared_memories_token ON public.shared_memories(share_token);
CREATE INDEX idx_shared_memories_user ON public.shared_memories(user_id);

ALTER TABLE public.shared_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own shares"
ON public.shared_memories FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read by token"
ON public.shared_memories FOR SELECT
TO anon, authenticated
USING (true);
