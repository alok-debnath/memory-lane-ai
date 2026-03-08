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
import { Loader2, Save, Mic, Square, Sparkles, Pencil, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type MemoryNote } from '@/components/MemoryCard';
import FileUploader from '@/components/FileUploader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface EditMemoryDialogProps {
  note: MemoryNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = ['personal', 'work', 'finance', 'health', 'other'];
const recurrenceTypes = ['daily', 'weekly', 'monthly', 'yearly'];
const categoryEmoji: Record<string, string> = {
  personal: '🏠', work: '💼', finance: '💰', health: '💊', other: '📝',
};

const EditMemoryDialog: React.FC<EditMemoryDialogProps> = ({ note, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [voiceEditing, setVoiceEditing] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [liveVoice, setLiveVoice] = useState('');
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef('');

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
      setLiveVoice('');

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
          title, content, category,
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

  const startVoiceEdit = useCallback(async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: 'Not supported', description: 'Use Chrome or Edge', variant: 'destructive' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      toast({ title: 'Microphone denied', description: 'Allow mic access.', variant: 'destructive' });
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    finalRef.current = '';
    setLiveVoice('');

    recognition.onresult = (e: any) => {
      let fin = '', int = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (fin += t) : (int += t);
      }
      if (fin) finalRef.current = fin;
      setLiveVoice(fin || int);
    };
    recognition.onerror = () => { setVoiceEditing(false); setLiveVoice(''); };
    recognition.onend = async () => {
      setVoiceEditing(false);
      const voiceText = finalRef.current.trim();
      setLiveVoice('');
      if (!voiceText || !note) return;

      setVoiceProcessing(true);
      try {
        const { data, error } = await supabase.functions.invoke('memory-chat', {
          body: {
            messages: [{
              role: 'user',
              content: `Edit memory (ID: ${note.id}). Current: title="${title}", content="${content}", category="${category}". Instruction: "${voiceText}". Update it.`,
            }],
            userId: note.user_id,
          },
        });
        if (error) throw error;
        if (data.mutated) {
          queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
          toast({ title: '✅ Updated via voice!' });
          onOpenChange(false);
        } else {
          toast({ title: 'AI response', description: data.reply });
        }
      } catch (err: any) {
        toast({ title: 'Failed', description: err.message, variant: 'destructive' });
      } finally {
        setVoiceProcessing(false);
      }
    };
    recognition.start();
    setVoiceEditing(true);
  }, [note, title, content, category, toast, queryClient, onOpenChange]);

  const stopVoiceEdit = useCallback(() => {
    if (recognitionRef.current && voiceEditing) recognitionRef.current.stop();
  }, [voiceEditing]);

  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto p-0 gap-0 rounded-t-2xl sm:rounded-2xl border-border/50">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/80 flex items-center justify-center text-lg">
                {categoryEmoji[note.category || 'other']}
              </div>
              <div>
                <DialogTitle className="text-[16px] font-display leading-tight">{note.title}</DialogTitle>
                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{note.category || 'other'}</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="h-px bg-border/50" />

        <Tabs defaultValue="manual" className="w-full">
          <div className="px-5 pt-3">
            <TabsList className="w-full h-10 rounded-xl bg-secondary/50 p-0.5">
              <TabsTrigger value="voice" className="flex-1 rounded-lg text-[13px] font-medium gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm h-full">
                <Mic className="w-3.5 h-3.5" />
                Voice
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 rounded-lg text-[13px] font-medium gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm h-full">
                <Pencil className="w-3.5 h-3.5" />
                Manual
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="voice" className="px-5 pb-5 pt-4 mt-0">
            <div className="flex flex-col items-center py-4">
              <AnimatePresence mode="wait">
                {voiceProcessing ? (
                  <motion.div key="processing" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-7 h-7 text-primary animate-pulse" />
                    </div>
                    <p className="text-[13px] text-muted-foreground">Applying edits...</p>
                  </motion.div>
                ) : voiceEditing ? (
                  <motion.div key="listening" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-3">
                    <motion.button onClick={stopVoiceEdit} className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center">
                      <Square className="w-5 h-5 text-destructive-foreground" />
                    </motion.button>
                    <p className="text-[13px] text-muted-foreground">Listening...</p>
                    {liveVoice && (
                      <p className="text-[13px] text-foreground/70 italic text-center max-w-[260px] bg-secondary/40 rounded-xl px-3 py-2">
                        "{liveVoice}"
                      </p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="idle" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-3">
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={startVoiceEdit}
                      className="w-16 h-16 rounded-full btn-gradient flex items-center justify-center"
                    >
                      <Mic className="w-7 h-7 text-primary-foreground" />
                    </motion.button>
                    <div className="text-center">
                      <p className="text-[13px] font-medium text-foreground">Tap to describe your edit</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[240px]">
                        e.g. "Change the title" or "Add a reminder"
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="px-5 pb-5 pt-3 mt-0">
            <div className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="title" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 rounded-xl bg-secondary/40 border-0 text-[14px]" />
              </div>

              <div className="space-y-1">
                <Label htmlFor="content" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Content</Label>
                <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[80px] rounded-xl bg-secondary/40 border-0 resize-none text-[14px]" />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-10 rounded-xl bg-secondary/40 border-0 text-[13px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          <span className="flex items-center gap-2">
                            <span>{categoryEmoji[c]}</span>
                            <span className="capitalize">{c}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Reminder</Label>
                  <Input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="h-10 rounded-xl bg-secondary/40 border-0 text-[13px]" />
                </div>
              </div>

              <div className="flex items-center justify-between bg-secondary/30 rounded-xl px-3.5 py-2.5">
                <div>
                  <Label htmlFor="recurring" className="text-[13px] font-medium">Recurring</Label>
                  <p className="text-[11px] text-muted-foreground">Repeat this reminder</p>
                </div>
                <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>

              {isRecurring && (
                <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                  <SelectTrigger className="h-10 rounded-xl bg-secondary/40 border-0 text-[13px]">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    {recurrenceTypes.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="space-y-1">
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Attachments</Label>
                <FileUploader memoryId={note.id} existingFiles={existingFiles} />
              </div>

              <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full h-10 rounded-xl text-[14px] font-semibold" variant="gradient">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                Save
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemoryDialog;
