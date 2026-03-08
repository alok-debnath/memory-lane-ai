import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Bell, Trash2, Tag, Pencil, Paperclip, ChevronRight, Volume2, VolumeX } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import ShareMemory from '@/components/ShareMemory';
import { useTTS } from '@/hooks/useTTS';

export interface MemoryNote {
  id: string;
  title: string;
  content: string;
  reminder_date: string | null;
  is_recurring: boolean;
  recurrence_type: string | null;
  category: string | null;
  created_at: string;
  user_id: string;
}

interface MemoryCardProps {
  note: MemoryNote;
  index: number;
  onDelete: (id: string) => void;
  onEdit: (note: MemoryNote) => void;
}

const categoryEmoji: Record<string, string> = {
  personal: '🏠',
  work: '💼',
  finance: '💰',
  health: '❤️',
  other: '📝',
};

const MemoryCard: React.FC<MemoryCardProps> = ({ note, index, onDelete, onEdit }) => {
  const [attachmentCount, setAttachmentCount] = useState(0);
  const { speak, stop, speaking } = useTTS();

  useEffect(() => {
    supabase
      .from('memory_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('memory_id', note.id)
      .then(({ count }) => setAttachmentCount(count || 0));
  }, [note.id]);

  const handleTTS = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (speaking) {
      stop();
    } else {
      speak(`${note.title}. ${note.content}`);
    }
  }, [speaking, stop, speak, note.title, note.content]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      layout
      className="native-group-item cursor-pointer group"
      onClick={() => onEdit(note)}
    >
      {/* Emoji avatar */}
      <div className="w-10 h-10 rounded-xl bg-accent/80 flex items-center justify-center shrink-0 text-lg">
        {categoryEmoji[note.category || 'other'] || '📝'}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">
            {note.title}
          </h3>
        </div>
        <p className="text-[13px] text-muted-foreground leading-snug line-clamp-1 mt-0.5">{note.content}</p>
        <div className="flex items-center gap-3 mt-1.5">
          {note.reminder_date && (
            <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
              <Bell className="w-3 h-3" />
              {format(new Date(note.reminder_date), 'MMM d')}
            </span>
          )}
          {attachmentCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Paperclip className="w-3 h-3" />
              {attachmentCount}
            </span>
          )}
          <span className="text-[11px] text-muted-foreground/60">
            {format(new Date(note.created_at), 'MMM d')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={handleTTS}
          className="h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
          title={speaking ? 'Stop reading' : 'Read aloud'}
        >
          {speaking ? <VolumeX className="w-4 h-4 text-primary" /> : <Volume2 className="w-4 h-4" />}
        </button>
        <ShareMemory memoryId={note.id} title={note.title} />
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </div>
    </motion.div>
  );
};

export default MemoryCard;
