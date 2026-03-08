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
  personal: '🏠',
  work: '💼',
  finance: '💰',
  health: '💊',
  other: '📝',
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

  const startVoiceEdit = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: 'Not supported', description: 'Use Chrome or Edge for voice editing', variant: 'destructive' });
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
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-3xl border-border/40">
        {/* Header with gradient accent */}
        <div className="relative px-6 pt-6 pb-4">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/60 via-primary to-primary/60 rounded-t-3xl" />
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10 text-lg">
                {categoryEmoji[note.category || 'other']}
              </div>
              <div>
                <DialogTitle className="font-display text-lg leading-tight">{note.title}</DialogTitle>
                <p className="text-[12px] text-muted-foreground mt-0.5 capitalize">{note.category || 'other'} memory</p>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

        <Tabs defaultValue="voice" className="w-full">
          <div className="px-6 pt-4">
            <TabsList className="w-full h-11 rounded-2xl bg-secondary/40 p-1 border border-border/20">
              <TabsTrigger value="voice" className="flex-1 rounded-xl text-[13px] font-medium gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Volume2 className="w-3.5 h-3.5" />
                Voice Edit
              </TabsTrigger>
              <TabsTrigger value="manual" className="flex-1 rounded-xl text-[13px] font-medium gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Pencil className="w-3.5 h-3.5" />
                Manual Edit
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Voice Tab */}
          <TabsContent value="voice" className="px-6 pb-6 pt-4 mt-0">
            <div className="flex flex-col items-center py-6">
              <AnimatePresence mode="wait">
                {voiceProcessing ? (
                  <motion.div
                    key="processing"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                      <Sparkles className="w-8 h-8 text-primary animate-pulse" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Applying your edits...</p>
                  </motion.div>
                ) : voiceEditing ? (
                  <motion.div
                    key="listening"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <div className="relative">
                      <motion.div
                        className="absolute inset-0 rounded-full bg-destructive/20"
                        animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
                      />
                      <button
                        onClick={stopVoiceEdit}
                        className="relative w-20 h-20 rounded-full bg-destructive flex items-center justify-center cursor-pointer z-10 shadow-lg"
                      >
                        <Square className="w-6 h-6 text-destructive-foreground" />
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Listening... tap to send</p>
                    {liveVoice && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[13px] text-foreground/70 italic text-center max-w-[280px] bg-secondary/30 rounded-2xl px-4 py-2 border border-border/20"
                      >
                        "{liveVoice}"
                      </motion.p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-3"
                  >
                    <motion.button
                      whileHover={{ scale: 1.06 }}
                      whileTap={{ scale: 0.94 }}
                      onClick={startVoiceEdit}
                      className="w-20 h-20 rounded-full btn-gradient flex items-center justify-center cursor-pointer shadow-lg"
                    >
                      <Mic className="w-8 h-8 text-primary-foreground" />
                    </motion.button>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">Tap to describe your edit</p>
                      <p className="text-[12px] text-muted-foreground mt-1 max-w-[260px] leading-relaxed">
                        e.g. "Change the title to grocery list" or "Add a reminder for next Monday"
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </TabsContent>

          {/* Manual Tab */}
          <TabsContent value="manual" className="px-6 pb-6 pt-4 mt-0">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-11 rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="content" className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Content</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[100px] rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="h-11 rounded-xl">
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

                <div className="space-y-1.5">
                  <Label htmlFor="reminder" className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Reminder</Label>
                  <Input
                    id="reminder"
                    type="datetime-local"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3 border border-border/20">
                <div>
                  <Label htmlFor="recurring" className="text-[13px] font-medium">Recurring</Label>
                  <p className="text-[11px] text-muted-foreground">Repeat this reminder</p>
                </div>
                <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>

              {isRecurring && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-1.5">
                  <Label className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Frequency</Label>
                  <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      {recurrenceTypes.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </motion.div>
              )}

              <div className="space-y-1.5">
                <Label className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">Attachments</Label>
                <FileUploader memoryId={note.id} existingFiles={existingFiles} />
              </div>

              <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full h-12 rounded-xl text-[14px] font-semibold" variant="gradient">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemoryDialog;
