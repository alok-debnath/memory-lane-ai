import React, { useState } from 'react';
import { motion } from 'framer-motion';
import VoiceRecorder from '@/components/VoiceRecorder';
import TextNoteInput from '@/components/TextNoteInput';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Mic, PenLine } from 'lucide-react';

const Record: React.FC = () => {
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const processNote = async (input: string, isAudio: boolean) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-memory', {
        body: { input, isAudio },
      });

      if (error) throw error;

      const insertPayload: any = {
        title: data.title,
        content: data.content,
        reminder_date: data.reminder_date || null,
        is_recurring: data.is_recurring || false,
        recurrence_type: data.recurrence_type || null,
        category: data.category || 'other',
        user_id: user!.id,
      };
      if (data.embedding) {
        insertPayload.embedding = data.embedding;
      }
      const { error: insertError } = await supabase.from('memory_notes').insert(insertPayload);

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
      toast({ title: 'Memory saved!', description: data.title });
      navigate('/');
    } catch (err: any) {
      console.error('Process error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to process memory', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">New Memory</h1>
        <p className="text-muted-foreground mt-1">Speak or type your memory and AI will organize it</p>
      </motion.div>

      {/* Mode Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 bg-secondary/50 rounded-xl p-1 max-w-xs mx-auto sm:mx-0"
      >
        {[
          { key: 'voice' as const, icon: Mic, label: 'Voice' },
          { key: 'text' as const, icon: PenLine, label: 'Type' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              mode === m.key ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {mode === m.key && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 bg-card rounded-lg shadow-sm"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <m.icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{m.label}</span>
          </button>
        ))}
      </motion.div>

      {/* Input Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex items-center justify-center min-h-[300px]"
      >
        {mode === 'voice' ? (
          <VoiceRecorder
            onTranscriptionComplete={(text) => processNote(text, false)}
            isProcessing={isProcessing}
          />
        ) : (
          <div className="w-full">
            <TextNoteInput
              onSubmit={(text) => processNote(text, false)}
              isProcessing={isProcessing}
            />
          </div>
        )}
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="glass-card p-4 sm:p-5"
      >
        <h3 className="font-display font-semibold text-foreground text-sm mb-3">💡 Tips</h3>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li>• Say "Remind me to renew my passport on March 15 every year"</li>
          <li>• Say "Remember to buy flowers for mom's birthday on June 3rd"</li>
          <li>• Say "Note: The WiFi password for the office is starlight42"</li>
        </ul>
      </motion.div>
    </div>
  );
};

export default Record;
