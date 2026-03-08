import React, { useState, useEffect } from 'react';
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
import { Loader2, Save } from 'lucide-react';
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

      // Load existing attachments
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

  if (!note) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Memory</DialogTitle>
        </DialogHeader>

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
