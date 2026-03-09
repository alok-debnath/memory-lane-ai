import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import VoiceRecorder from '@/components/VoiceRecorder';
import DiaryEntryCard from '@/components/diary/DiaryEntryCard';
import DiaryTextInput from '@/components/diary/DiaryTextInput';
import { BookOpen, Mic, Keyboard } from 'lucide-react';
import PageInfoButton from '@/components/PageInfoButton';

const Diary: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice');
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['diary-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries' as any)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as any[];
    },
    staleTime: 30_000,
  });

  const processDiary = useMutation({
    mutationFn: async (text: string) => {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('process-diary', {
        body: { text },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diary-entries'] });
      queryClient.invalidateQueries({ queryKey: ['ai-nudges'] });
      toast({ title: '✨ Diary entry saved', description: 'AI has analyzed your entry and extracted insights.' });
    },
    onError: (err: any) => {
      toast({ title: 'Failed to save', description: err.message, variant: 'destructive' });
    },
    onSettled: () => setIsProcessing(false),
  });

  const handleTranscription = useCallback((text: string) => {
    processDiary.mutate(text);
  }, [processDiary]);

  const handleTextSubmit = useCallback((text: string) => {
    processDiary.mutate(text);
  }, [processDiary]);

  const moodEmoji: Record<string, string> = {
    joyful: '😊', content: '😌', neutral: '😐', anxious: '😰',
    stressed: '😤', sad: '😢', angry: '😠', excited: '🤩',
    reflective: '🤔', grateful: '🙏',
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            AI Diary
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Speak or type your thoughts · AI will organize & analyze them
          </p>
        </div>
        <PageInfoButton />
      </div>

      {/* Input mode toggle */}
      <div className="flex gap-1.5 p-1 bg-secondary/60 rounded-xl w-fit">
        <button
          onClick={() => setInputMode('voice')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            inputMode === 'voice'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          Voice
        </button>
        <button
          onClick={() => setInputMode('text')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold transition-all ${
            inputMode === 'text'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Keyboard className="w-3.5 h-3.5" />
          Type
        </button>
      </div>

      {/* Input area */}
      <div className="native-card-elevated p-6">
        {inputMode === 'voice' ? (
          <VoiceRecorder onTranscriptionComplete={handleTranscription} isProcessing={isProcessing} />
        ) : (
          <DiaryTextInput onSubmit={handleTextSubmit} isProcessing={isProcessing} />
        )}
      </div>

      {/* Entries list */}
      <div>
        <p className="section-label">Recent Entries</p>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="native-card p-4 animate-pulse">
                <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-7 h-7 text-muted-foreground/40" />
            </div>
            <p className="font-display font-semibold text-foreground text-sm">No diary entries yet</p>
            <p className="text-muted-foreground text-[12px] mt-0.5">Start speaking to create your first entry</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {entries.map((entry, i) => (
                <DiaryEntryCard key={entry.id} entry={entry} index={i} moodEmoji={moodEmoji} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default Diary;
