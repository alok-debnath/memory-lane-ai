import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Brain, RotateCcw, ThumbsDown, ThumbsUp, Zap, Trophy, Plus, CheckCircle2 } from 'lucide-react';
import PageInfoButton from '@/components/PageInfoButton';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ReviewItem {
  id: string;
  memory_id: string;
  next_review_at: string;
  interval_days: number;
  ease_factor: number;
  repetitions: number;
  last_reviewed_at: string | null;
  memory_notes?: { id: string; title: string; content: string; category: string; tags: string[] } | null;
}

// SM-2 Algorithm
function calculateSM2(quality: number, reps: number, ease: number, interval: number) {
  let newEase = ease;
  let newInterval = interval;
  let newReps = reps;

  if (quality < 3) {
    newReps = 0;
    newInterval = 1;
  } else {
    newReps = reps + 1;
    if (newReps === 1) newInterval = 1;
    else if (newReps === 2) newInterval = 3;
    else newInterval = Math.round(interval * ease);
  }

  newEase = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  return { interval_days: newInterval, ease_factor: Math.round(newEase * 100) / 100, repetitions: newReps };
}

const Review: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionScore, setSessionScore] = useState({ reviewed: 0, total: 0 });
  const [addingMode, setAddingMode] = useState(false);

  // Load due reviews
  const { data: dueReviews = [], isLoading } = useQuery({
    queryKey: ['due-reviews'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('review_schedule')
        .select('*, memory_notes(id, title, content, category, tags)')
        .eq('user_id', user?.id)
        .lte('next_review_at', new Date().toISOString())
        .order('next_review_at', { ascending: true });
      if (error) throw error;
      return (data || []) as ReviewItem[];
    },
    enabled: !!user,
    staleTime: 10_000,
  });

  // Load memories not yet in review
  const { data: availableMemories = [] } = useQuery({
    queryKey: ['available-for-review'],
    queryFn: async () => {
      // Get all memory IDs already in review
      const { data: existingReviews } = await (supabase as any)
        .from('review_schedule')
        .select('memory_id')
        .eq('user_id', user?.id);
      const existingIds = new Set((existingReviews || []).map((r: any) => r.memory_id));

      const { data, error } = await supabase
        .from('memory_notes')
        .select('id, title, content, category, extracted_actions')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []).filter(m => !existingIds.has(m.id));
    },
    enabled: !!user && addingMode,
    staleTime: 10_000,
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ reviewId, quality }: { reviewId: string; quality: number }) => {
      const review = dueReviews.find(r => r.id === reviewId);
      if (!review) throw new Error('Review not found');

      const sm2 = calculateSM2(quality, review.repetitions, Number(review.ease_factor), review.interval_days);
      const nextReview = new Date();
      nextReview.setDate(nextReview.getDate() + sm2.interval_days);

      const { error } = await (supabase as any)
        .from('review_schedule')
        .update({
          interval_days: sm2.interval_days,
          ease_factor: sm2.ease_factor,
          repetitions: sm2.repetitions,
          next_review_at: nextReview.toISOString(),
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      setSessionScore(prev => ({ ...prev, reviewed: prev.reviewed + 1 }));
      setRevealed(false);
      setCurrentIndex(prev => prev + 1);
      queryClient.invalidateQueries({ queryKey: ['due-reviews'] });
    },
  });

  const addToReviewMutation = useMutation({
    mutationFn: async (memoryId: string) => {
      const { error } = await (supabase as any)
        .from('review_schedule')
        .insert({
          memory_id: memoryId,
          user_id: user!.id,
          next_review_at: new Date().toISOString(),
          interval_days: 1,
          ease_factor: 2.5,
          repetitions: 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Added to review queue!' });
      queryClient.invalidateQueries({ queryKey: ['due-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['available-for-review'] });
    },
  });

  const currentReview = dueReviews[currentIndex];
  const isComplete = currentIndex >= dueReviews.length;

  const handleRate = useCallback((quality: number) => {
    if (!currentReview) return;
    reviewMutation.mutate({ reviewId: currentReview.id, quality });
  }, [currentReview, reviewMutation]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="native-card p-8 animate-pulse"><div className="h-40 bg-muted rounded" /></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Brain className="w-6 h-6 text-primary" />
            Review
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {dueReviews.length} memor{dueReviews.length !== 1 ? 'ies' : 'y'} due for review
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PageInfoButton />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddingMode(!addingMode)}
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      {/* Add memories to review */}
      <AnimatePresence>
        {addingMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="native-card-elevated p-4 space-y-3">
              <p className="section-label">Select memories to review</p>
              {availableMemories.length === 0 ? (
                <p className="text-[13px] text-muted-foreground py-4 text-center">All memories are already in your review queue</p>
              ) : (
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                  {availableMemories.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-foreground truncate">{m.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{m.content}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => addToReviewMutation.mutate(m.id)}
                        disabled={addToReviewMutation.isPending}
                        className="shrink-0 h-8 px-2.5 rounded-lg text-primary"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review card */}
      {isComplete || dueReviews.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="native-card-elevated p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display font-bold text-foreground text-lg">
            {dueReviews.length === 0 ? 'No reviews due' : 'Session complete! 🎉'}
          </h3>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            {dueReviews.length === 0
              ? 'Add memories to your review queue to start'
              : `You reviewed ${sessionScore.reviewed} memor${sessionScore.reviewed !== 1 ? 'ies' : 'y'}`}
          </p>
          {dueReviews.length === 0 && (
            <Button
              variant="gradient"
              className="mt-4 rounded-xl"
              onClick={() => setAddingMode(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add Memories
            </Button>
          )}
        </motion.div>
      ) : currentReview ? (
        <motion.div
          key={currentReview.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="native-card-elevated overflow-hidden"
        >
          {/* Progress bar */}
          <div className="h-1 bg-secondary">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex) / dueReviews.length) * 100}%` }}
            />
          </div>

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground font-medium">
                {currentIndex + 1} of {dueReviews.length}
              </span>
              <span className="text-[11px] text-muted-foreground capitalize bg-secondary/60 px-2 py-0.5 rounded-md">
                {currentReview.memory_notes?.category || 'other'}
              </span>
            </div>

            <div className="text-center py-6">
              <h2 className="text-xl font-display font-bold text-foreground">
                {currentReview.memory_notes?.title}
              </h2>

              <AnimatePresence>
                {revealed ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <p className="text-[14px] text-foreground/80 leading-relaxed max-w-md mx-auto">
                      {currentReview.memory_notes?.content}
                    </p>
                    {(currentReview.memory_notes as any)?.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                        {((currentReview.memory_notes as any).tags || []).map((tag: string) => (
                          <span key={tag} className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[13px] text-muted-foreground mt-4"
                  >
                    Can you remember the details?
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {!revealed ? (
              <Button
                variant="gradient"
                className="w-full h-12 rounded-xl text-[14px]"
                onClick={() => setRevealed(true)}
              >
                Reveal Answer
              </Button>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {[
                  { quality: 1, label: 'Again', icon: RotateCcw, color: 'text-destructive bg-destructive/10 hover:bg-destructive/20' },
                  { quality: 3, label: 'Hard', icon: ThumbsDown, color: 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' },
                  { quality: 4, label: 'Good', icon: ThumbsUp, color: 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20' },
                  { quality: 5, label: 'Easy', icon: Zap, color: 'text-primary bg-primary/10 hover:bg-primary/20' },
                ].map(({ quality, label, icon: Icon, color }) => (
                  <button
                    key={quality}
                    onClick={() => handleRate(quality)}
                    disabled={reviewMutation.isPending}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl font-medium text-[12px] transition-all active:scale-95 ${color}`}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                ))}
              </div>
            )}

            <p className="text-[10px] text-center text-muted-foreground">
              Reviewed {currentReview.repetitions} time{currentReview.repetitions !== 1 ? 's' : ''} ·
              Next interval: {currentReview.interval_days}d
            </p>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
};

export default Review;
