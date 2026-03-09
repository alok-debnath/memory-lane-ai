import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { differenceInCalendarDays } from 'date-fns';
import { useTimezone } from '@/hooks/useTimezone';

const moodEmoji: Record<string, string> = {
  happy: '😊', sad: '😢', anxious: '😰', excited: '🤩', neutral: '😐',
  grateful: '🙏', frustrated: '😤', hopeful: '🌟', nostalgic: '💭', motivated: '💪',
};

const DailyFlashback: React.FC = () => {
  const { user } = useAuth();
  const { formatTz } = useTimezone();

  const { data: flashbacks = [] } = useQuery({
    queryKey: ['flashback-memories'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_flashback_memories', {
        p_user_id: user!.id,
        p_limit: 5,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    staleTime: 60_000 * 30, // 30min — flashbacks don't change often
  });

  if (flashbacks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="native-card-elevated p-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-primary" />
        <span className="text-[13px] font-semibold text-foreground">On This Day</span>
        <Sparkles className="w-3 h-3 text-primary/60" />
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-0.5 -mx-1 px-1 snap-x">
        {flashbacks.map((fb: any) => {
          const daysAgo = differenceInCalendarDays(new Date(), new Date(fb.created_at));
          const yearsAgo = Math.round(daysAgo / 365);
          const timeLabel = yearsAgo >= 1 ? `${yearsAgo}y ago` : `${Math.round(daysAgo / 30)}mo ago`;

          return (
            <div
              key={fb.id}
              className="shrink-0 bg-accent/60 rounded-xl px-3.5 py-2.5 min-w-[180px] max-w-[220px] snap-start"
            >
              <div className="flex items-center gap-1.5 mb-1">
                {fb.mood && <span className="text-sm">{moodEmoji[fb.mood] || '📝'}</span>}
                <p className="text-[13px] font-medium text-foreground truncate">{fb.title}</p>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{fb.content}</p>
              <p className="text-[10px] text-primary font-medium mt-1.5">
                {formatTz(fb.created_at, 'MMM d, yyyy')} · {timeLabel}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default DailyFlashback;
