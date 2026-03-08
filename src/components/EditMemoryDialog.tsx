import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Mic, Square, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type MemoryNote } from '@/components/MemoryCard';
import FileUploader from '@/components/FileUploader';

interface EditMemoryDialogProps {
  note: MemoryNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = ['personal', 'work', 'finance', 'health', 'other'];
const recurrenceTypes = ['daily', 'weekly', 'monthly', 'yearly'];

const EditMemoryDialog: React.FC<EditMemoryDialogProps> = ({ note, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [voiceEditing, setVoiceEditing] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('other');
  const [reminderDate, setReminderDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('');
  const [existingFiles, setExistingFiles] = useState<any[]>([]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setCategory(note.category || 'other');
      setReminderDate(note.reminder_date ? note.reminder_date.slice(0, 16) : '');
      setIsRecurring(note.is_recurring);
      setRecurrenceType(note.recurrence_type || '');

      supabase
        .from('memory_attachments')
        .select('*')
        .eq('memory_id', note.id)
        .then(({ data }) => {
          if (data) {
            setExistingFiles(
              data.map((f: any) => ({
                ...f,
                url: supabase.storage.from('memory-attachments').getPublicUrl(f.file_path).data.publicUrl,
              }))
            );
          }
        });
    }
  }, [note]);

  const handleSave = async () => {
    if (!note) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('memory_notes')
        .update({
          title,
          content,
          category,
          reminder_date: reminderDate || null,
          is_recurring: isRecurring,
          recurrence_type: isRecurring ? recurrenceType : null,
        })
        .eq('id', note.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
      toast({ title: 'Memory updated!' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const startVoiceEdit = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Not supported', description: 'Use Chrome or Edge for voice editing', variant: 'destructive' });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    transcriptRef.current = '';

    recognition.onresult = (event: any) => {
      let t = '';
      for (let i = 0; i < event.results.length; i++) {
        t += event.results[i][0].transcript;
      }
      transcriptRef.current = t;
    };

    recognition.onerror = () => setVoiceEditing(false);

    recognition.onend = async () => {
      setVoiceEditing(false);
      const voiceText = transcriptRef.current.trim();
      if (!voiceText || !note) return;

      setVoiceProcessing(true);
      try {
        // Send voice instruction + current note to AI for editing
        const { data, error } = await supabase.functions.invoke('memory-chat', {
          body: {
            messages: [
              {
                role: 'user',
                content: `I want to edit this memory (ID: ${note.id}). Current title: "${title}". Current content: "${content}". Current category: "${category}". My edit instruction: "${voiceText}". Please update this memory accordingly.`,
              },
            ],
            userId: note.user_id,
          },
        });

        if (error) throw error;

        if (data.mutated) {
          queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
          toast({ title: 'Memory updated by voice!' });
          onOpenChange(false);
        } else {
          toast({ title: 'Voice edit', description: data.reply });
        }
      } catch (err: any) {
        toast({ title: 'Voice edit failed', description: err.message, variant: 'destructive' });
      } finally {
        setVoiceProcessing(false);
      }
    };

    recognition.start();
    setVoiceEditing(true);
  }, [note, title, content, category, toast, queryClient, onOpenChange]);

  const stopVoiceEdit = useCallback(() => {
    if (recognitionRef.current && voiceEditing) {
      recognitionRef.current.stop();
      setVoiceEditing(false);
    }
  }, [voiceEditing]);

  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Memory</DialogTitle>
        </DialogHeader>

        {/* Voice Edit Section */}
        <div className="flex items-center justify-center py-3">
          <AnimatePresence mode="wait">
            {voiceProcessing ? (
              <motion.div
                key="processing"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>
                <p className="text-xs text-muted-foreground">AI is applying your edits...</p>
              </motion.div>
            ) : voiceEditing ? (
              <motion.div
                key="listening"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <motion.button
                  onClick={stopVoiceEdit}
                  className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center cursor-pointer pulse-ring"
                >
                  <Square className="w-5 h-5 text-destructive-foreground" />
                </motion.button>
                <p className="text-xs text-muted-foreground">Listening... describe your edits</p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startVoiceEdit}
                  className="w-14 h-14 rounded-full btn-gradient flex items-center justify-center cursor-pointer"
                >
                  <Mic className="w-6 h-6 text-primary-foreground" />
                </motion.button>
                <p className="text-xs text-muted-foreground">Tap to edit with your voice</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or edit manually</span>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c} className="capitalize">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reminder">Reminder Date</Label>
            <Input
              id="reminder"
              type="datetime-local"
              value={reminderDate}
              onChange={(e) => setReminderDate(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="recurring">Recurring</Label>
            <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {recurrenceTypes.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Attachments</Label>
            <FileUploader memoryId={note.id} existingFiles={existingFiles} />
          </div>

          <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full" variant="gradient">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemoryDialog;
