import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/invokeEdge';
import { useAuth } from '@/contexts/AuthContext';
import { Link2, Sparkles } from 'lucide-react';
import { type MemoryNote } from '@/components/MemoryCard';

interface RelatedMemoriesProps {
  note: MemoryNote;
  onSelect: (note: MemoryNote) => void;
}

const RelatedMemories: React.FC<RelatedMemoriesProps> = ({ note, onSelect }) => {
  const { user } = useAuth();

  const { data: related = [], isLoading } = useQuery({
    queryKey: ['related-memories', note.id],
    queryFn: async () => {
      const { data, error } = await invokeEdge('semantic-search', {
        query: `${note.title} ${note.content.slice(0, 200)}`, userId: user?.id,
      });
      if (error) throw error;
      // Filter out the current note
      return ((data.results || []) as MemoryNote[])
        .filter((r: MemoryNote) => r.id !== note.id)
        .slice(0, 4);
    },
    enabled: !!user && !!note.id,
    staleTime: 60_000,
  });

  if (isLoading || related.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-primary" />
        Related Memories
      </p>
      <div className="space-y-1">
        {related.map((r) => (
          <button
            key={r.id}
            onClick={() => onSelect(r)}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors"
          >
            <Link2 className="w-3.5 h-3.5 text-primary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-foreground truncate">{r.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{r.content}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RelatedMemories;
