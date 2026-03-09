import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceRecorder from '@/components/VoiceRecorder';
import TextNoteInput from '@/components/TextNoteInput';
import MemoryTemplates, { type MemoryTemplate } from '@/components/MemoryTemplates';
import CapsuleDatePicker from '@/components/CapsuleDatePicker';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/invokeEdge';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Mic, PenLine, Lightbulb, LayoutTemplate, CheckCircle2 } from 'lucide-react';
import MemoryConflicts from '@/components/MemoryConflicts';

const Record: React.FC = () => {
  const [mode, setMode] = useState<'voice' | 'text' | 'template'>('voice');
  const [isProcessing, setIsProcessing] = useState(false);
  const [templatePrefill, setTemplatePrefill] = useState<{ text: string; category: string } | null>(null);
  const [capsuleDate, setCapsuleDate] = useState<string | null>(null);
  const [lastActions, setLastActions] = useState<any[] | null>(null);
  const [conflicts, setConflicts] = useState<any[] | null>(null);
  const [lastSavedMemory, setLastSavedMemory] = useState<{ id: string; title: string } | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();

  const processNote = async (input: string, isAudio: boolean, categoryOverride?: string) => {
    setIsProcessing(true);
    setLastActions(null);
    setConflicts(null);
    try {
      const { data, error } = await supabase.functions.invoke('process-memory', {
        body: { input, isAudio, timezone },
      });

      if (error) throw error;

      const insertPayload: any = {
        title: data.title,
        content: data.content,
        reminder_date: data.reminder_date || null,
        is_recurring: data.is_recurring || false,
        recurrence_type: data.recurrence_type || null,
        category: categoryOverride || data.category || 'other',
        user_id: user!.id,
        mood: data.mood || null,
        extracted_actions: data.extracted_actions || null,
        capsule_unlock_date: capsuleDate ? new Date(capsuleDate).toISOString() : null,
        tags: data.tags || [],
        people: data.people || [],
        locations: data.locations || [],
        importance: data.importance || 'normal',
        life_area: data.life_area || null,
        context_tags: data.context_tags || {},
        sentiment_score: data.sentiment_score ?? null,
        linked_urls: data.linked_urls || [],
      };
      if (data.embedding) {
        insertPayload.embedding = data.embedding;
      }
      const { data: insertedRows, error: insertError } = await supabase
        .from('memory_notes')
        .insert(insertPayload)
        .select('id, title')
        .single();

      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['memory-notes'] });

      const savedId = insertedRows.id;
      const savedTitle = insertedRows.title;
      setLastSavedMemory({ id: savedId, title: savedTitle });

      const actions = data.extracted_actions;
      if (actions && actions.length > 0) {
        setLastActions(actions);
        toast({
          title: '✨ Memory saved!',
          description: `${savedTitle} — ${actions.length} action${actions.length !== 1 ? 's' : ''} extracted`,
        });
      } else {
        toast({ title: 'Memory saved!', description: savedTitle });
      }

      // Run conflict detection in background (non-blocking)
      supabase.functions.invoke('detect-conflicts', {
        body: { memoryId: savedId, content: data.content, title: savedTitle, userId: user!.id },
      }).then(({ data: conflictData }) => {
        if (conflictData?.conflicts?.length > 0) {
          setConflicts(conflictData.conflicts);
        }
      }).catch(() => {});

      setTemplatePrefill(null);
      setCapsuleDate(null);
    } catch (err: any) {
      console.error('Process error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to process memory', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTemplateSelect = (template: MemoryTemplate) => {
    setTemplatePrefill({ text: template.prefill, category: template.category });
    setMode('text');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">New Memory</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">Speak, type, or use a template</p>
      </div>

      {/* Mode Toggle */}
      <div className="native-card p-1 max-w-sm mx-auto sm:mx-0 flex">
        {[
          { key: 'voice' as const, icon: Mic, label: 'Voice' },
          { key: 'text' as const, icon: PenLine, label: 'Type' },
          { key: 'template' as const, icon: LayoutTemplate, label: 'Template' },
        ].map((m) => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
              mode === m.key ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            {mode === m.key && (
              <motion.div
                layoutId="mode-pill"
                className="absolute inset-0 bg-accent rounded-xl"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <m.icon className="w-4 h-4 relative z-10" />
            <span className="relative z-10">{m.label}</span>
          </button>
        ))}
      </div>

      {/* Capsule Date Picker */}
      <CapsuleDatePicker value={capsuleDate} onChange={setCapsuleDate} />

      {/* Input Area */}
      <div className="flex items-center justify-center min-h-[280px]">
        <AnimatePresence mode="wait">
          {mode === 'voice' ? (
            <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <VoiceRecorder
                onTranscriptionComplete={(text) => processNote(text, false)}
                isProcessing={isProcessing}
              />
            </motion.div>
          ) : mode === 'template' ? (
            <motion.div key="template" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
              <MemoryTemplates onSelect={handleTemplateSelect} />
            </motion.div>
          ) : (
            <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
              <TextNoteInput
                onSubmit={(text) => processNote(text, false, templatePrefill?.category)}
                isProcessing={isProcessing}
                defaultValue={templatePrefill?.text}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Extracted Actions Feedback */}
      {lastActions && lastActions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="native-card-elevated p-4 space-y-2">
          <p className="text-[13px] font-semibold text-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            Extracted Actions
          </p>
          {lastActions.map((action: any, i: number) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-muted-foreground">
              <span className="text-primary">•</span>
              <span>{action.text}</span>
              <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md capitalize">{action.type}</span>
            </div>
          ))}
          {!conflicts?.length && (
            <button
              onClick={() => { setLastActions(null); navigate('/'); }}
              className="text-[13px] text-primary font-medium mt-2"
            >
              Go to Dashboard →
            </button>
          )}
        </motion.div>
      )}

      {/* Memory Conflicts Detection */}
      {conflicts && conflicts.length > 0 && lastSavedMemory && (
        <MemoryConflicts
          conflicts={conflicts}
          newMemoryId={lastSavedMemory.id}
          newMemoryTitle={lastSavedMemory.title}
          onDismiss={() => { setConflicts(null); navigate('/'); }}
        />
      )}

      {/* Tips */}
      <div className="native-card p-4">
        <div className="flex items-center gap-2 mb-2.5">
          <Lightbulb className="w-4 h-4 text-primary" />
          <span className="text-[13px] font-semibold text-foreground">Tips</span>
        </div>
        <ul className="space-y-1.5 text-[13px] text-muted-foreground">
          <li>• "Remind me to renew my passport on March 15 every year"</li>
          <li>• "Meeting notes: decided to launch Q2, assign design to Sarah"</li>
          <li>• "WiFi password for the office is starlight42"</li>
          <li>• Enable Time Capsule to lock a memory until a future date 🔒</li>
        </ul>
      </div>
    </div>
  );
};

export default Record;
