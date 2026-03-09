import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, Mic, Square, Sparkles, Pencil, X, Plus, Lightbulb, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { type MemoryNote } from '@/components/MemoryCard';
import FileUploader from '@/components/FileUploader';
import RelatedMemories from '@/components/RelatedMemories';
import ExtractedActions from '@/components/ExtractedActions';
import CapsuleDatePicker from '@/components/CapsuleDatePicker';
import ShareMemory from '@/components/ShareMemory';
import { useTTS } from '@/hooks/useTTS';

interface EditMemoryDialogProps {
  note: MemoryNote | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete?: (id: string) => void;
}

const categories = ['personal', 'work', 'finance', 'health', 'other'];
const recurrenceTypes = ['daily', 'weekly', 'monthly', 'yearly'];
const moods = ['happy', 'sad', 'anxious', 'excited', 'neutral', 'grateful', 'frustrated', 'hopeful', 'nostalgic', 'motivated'];
const categoryEmoji: Record<string, string> = {
  personal: '🏠', work: '💼', finance: '💰', health: '💊', other: '📝',
};
const moodEmoji: Record<string, string> = {
  happy: '😊', sad: '😢', anxious: '😰', excited: '🤩', neutral: '😐',
  grateful: '🙏', frustrated: '😤', hopeful: '🌟', nostalgic: '💭', motivated: '💪',
};

const EditMemoryDialog: React.FC<EditMemoryDialogProps> = ({ note, open, onOpenChange }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [mode, setMode] = useState<'manual' | 'voice'>('manual');
  const [saving, setSaving] = useState(false);
  const [voiceEditing, setVoiceEditing] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [liveVoice, setLiveVoice] = useState('');
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef('');

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('other');
  const [mood, setMood] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('');
  const [capsuleDate, setCapsuleDate] = useState<string | null>(null);
  const [existingFiles, setExistingFiles] = useState<any[]>([]);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setCategory(note.category || 'other');
      setMood((note as any).mood || null);
      setReminderDate(note.reminder_date ? note.reminder_date.slice(0, 16) : '');
      setIsRecurring(note.is_recurring);
      setRecurrenceType(note.recurrence_type || '');
      setCapsuleDate(note.capsule_unlock_date ? note.capsule_unlock_date.slice(0, 10) : null);
      setLiveVoice('');
      setNewTag('');
      setMode('manual');

      supabase
        .from('memory_notes')
        .select('tags')
        .eq('id', note.id)
        .single()
        .then(({ data }) => { setTags(data?.tags || []); });

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

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setNewTag('');
  };

  const removeTag = (tag: string) => setTags(tags.filter(t => t !== tag));

  const handleSave = async () => {
    if (!note) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('memory_notes')
        .update({
          title, content, category, mood, tags,
          reminder_date: reminderDate || null,
          is_recurring: isRecurring,
          recurrence_type: isRecurring ? recurrenceType : null,
          capsule_unlock_date: capsuleDate ? new Date(capsuleDate).toISOString() : null,
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
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-display">
            <Pencil className="w-5 h-5 text-primary" />
            Edit Memory
          </DialogTitle>
          <DialogDescription className="text-[13px]">
            {categoryEmoji[note.category || 'other']} {note.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Mode Toggle — matches NewMemoryDialog style */}
          <div className="native-card p-1 flex">
            {[
              { key: 'manual' as const, icon: Pencil, label: 'Manual' },
              { key: 'voice' as const, icon: Mic, label: 'Voice' },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                  mode === m.key ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {mode === m.key && (
                  <motion.div
                    layoutId="edit-mode-pill"
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

          {/* Content Area */}
          <AnimatePresence mode="wait">
            {mode === 'voice' ? (
              <motion.div key="voice" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center py-6">
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
              </motion.div>
            ) : (
              <motion.div key="manual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <Label htmlFor="edit-title" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Title</Label>
                    <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-10 rounded-xl bg-secondary/40 border-0 text-[14px]" />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="edit-content" className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Content</Label>
                    <Textarea id="edit-content" value={content} onChange={(e) => setContent(e.target.value)} className="min-h-[80px] rounded-xl bg-secondary/40 border-0 resize-none text-[14px]" />
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
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Mood</Label>
                      <Select value={mood || '_none'} onValueChange={(v) => setMood(v === '_none' ? null : v)}>
                        <SelectTrigger className="h-10 rounded-xl bg-secondary/40 border-0 text-[13px]">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">None</SelectItem>
                          {moods.map((m) => (
                            <SelectItem key={m} value={m}>
                              <span className="flex items-center gap-2">
                                <span>{moodEmoji[m]}</span>
                                <span className="capitalize">{m}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tags</Label>
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[12px] gap-1 pr-1 rounded-lg">
                            {tag}
                            <button onClick={() => removeTag(tag)} className="ml-0.5 hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5">
                      <Input
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                        placeholder="Add tag..."
                        className="h-8 rounded-lg bg-secondary/40 border-0 text-[13px] flex-1"
                      />
                      <Button type="button" size="sm" variant="ghost" onClick={addTag} className="h-8 w-8 p-0 rounded-lg">
                        <Plus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Reminder</Label>
                    <Input type="datetime-local" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} className="h-10 rounded-xl bg-secondary/40 border-0 text-[13px]" />
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

                  {/* Extracted Actions */}
                  {note.extracted_actions && note.extracted_actions.length > 0 && (
                    <ExtractedActions actions={note.extracted_actions} />
                  )}

                  <div className="space-y-1">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Attachments</Label>
                    <FileUploader memoryId={note.id} existingFiles={existingFiles} />
                  </div>

                  <Button onClick={handleSave} disabled={saving || !title.trim()} className="w-full h-10 rounded-xl text-[14px] font-semibold" variant="gradient">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                    Save Changes
                  </Button>

                  <RelatedMemories
                    note={note}
                    onSelect={(related) => {
                      setTitle(related.title);
                      setContent(related.content);
                      setCategory(related.category || 'other');
                    }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Tips — matches NewMemoryDialog */}
          <div className="native-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-primary" />
              <span className="text-[12px] font-semibold text-foreground">Tips</span>
            </div>
            <ul className="space-y-1 text-[12px] text-muted-foreground">
              <li>• Use voice mode to describe changes naturally</li>
              <li>• Add tags to organize and find memories faster</li>
              <li>• Set a mood to track how you felt 🎭</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditMemoryDialog;
