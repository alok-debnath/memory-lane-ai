import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Brain, Calendar, Tag, ArrowLeft } from 'lucide-react';
import { formatInTz, getDetectedTimezone } from '@/lib/timezone';

const categoryEmoji: Record<string, string> = {
  personal: '🏠', work: '💼', finance: '💰', health: '❤️', other: '📝',
};

const SharedMemory: React.FC = () => {
  const { token } = useParams<{ token: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['shared-memory', token],
    queryFn: async () => {
      const { data: share, error: shareErr } = await supabase
        .from('shared_memories')
        .select('memory_id, expires_at')
        .eq('share_token', token!)
        .maybeSingle();
      if (shareErr) throw shareErr;
      if (!share) throw new Error('Not found');
      if (share.expires_at && new Date(share.expires_at) < new Date()) throw new Error('Expired');

      const { data: note, error: noteErr } = await supabase
        .from('memory_notes')
        .select('id, title, content, category, created_at, reminder_date')
        .eq('id', share.memory_id)
        .single();
      if (noteErr) throw noteErr;
      return note;
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground">Memory not found</h1>
          <p className="text-[13px] text-muted-foreground mt-1">This link may have expired or been removed.</p>
          <Link to="/" className="text-[13px] text-primary font-medium mt-4 inline-block">
            ← Go to Memora
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-4 py-8">
        <Link to="/" className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Open Memora
        </Link>

        <div className="native-card-elevated p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-accent/80 flex items-center justify-center text-2xl">
              {categoryEmoji[data.category || 'other'] || '📝'}
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground">{data.title}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(data.created_at), 'PPP')}
                </span>
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground capitalize">
                  <Tag className="w-3 h-3" />
                  {data.category || 'other'}
                </span>
              </div>
            </div>
          </div>

          <div className="h-px bg-border/50" />

          <div className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {data.content}
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-6">
          Shared via <span className="font-semibold text-primary">Memora</span>
        </p>
      </div>
    </div>
  );
};

export default SharedMemory;
