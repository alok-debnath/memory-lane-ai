import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { X, Lightbulb, Heart, TrendingUp, Smile, Users, Sparkles } from 'lucide-react';

const nudgeIcons: Record<string, React.ElementType> = {
  habit_reinforce: TrendingUp,
  habit_redirect: Lightbulb,
  mood_boost: Smile,
  self_care: Heart,
  social: Users,
  growth: Sparkles,
};

const nudgeColors: Record<string, string> = {
  high: 'border-l-primary',
  medium: 'border-l-accent-foreground',
  low: 'border-l-muted-foreground',
};

const NudgeCards: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: nudges = [] } = useQuery({
    queryKey: ['ai-nudges'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_nudges' as any)
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from('ai_nudges' as any).update({ is_dismissed: true } as any).eq('id', id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-nudges'] }),
  });

  if (nudges.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="section-label flex items-center gap-1">
        <Sparkles className="w-3 h-3 text-primary" />
        AI Nudges
      </p>
      <AnimatePresence>
        {nudges.map((nudge, i) => {
          const Icon = nudgeIcons[nudge.nudge_type] || Lightbulb;
          return (
            <motion.div
              key={nudge.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12, height: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`native-card p-3.5 flex items-start gap-3 border-l-[3px] ${nudgeColors[nudge.priority] || 'border-l-muted-foreground'}`}
            >
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-foreground">{nudge.title}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{nudge.message}</p>
              </div>
              <button
                onClick={() => dismissMutation.mutate(nudge.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-secondary/60 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default NudgeCards;
