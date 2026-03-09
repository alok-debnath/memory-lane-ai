import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Bell, Trash2, Tag, Pencil, Paperclip, ChevronRight, Volume2, VolumeX, Lock } from 'lucide-react';
import { format, isBefore } from 'date-fns';
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
  mood?: string | null;
  capsule_unlock_date?: string | null;
  extracted_actions?: any[] | null;
  tags?: string[] | null;
}

interface MemoryCardProps {
  note: MemoryNote;
  index: number;
  onDelete: (id: string) => void;
  onEdit: (note: MemoryNote) => void;
}

const categoryEmoji: Record<string, string> = {
  personal: '🏠', work: '💼', finance: '💰', health: '❤️', other: '📝',
};

const moodEmoji: Record<string, string> = {
  happy: '😊', sad: '😢', anxious: '😰', excited: '🤩', neutral: '😐',
  grateful: '🙏', frustrated: '😤', hopeful: '🌟', nostalgic: '💭', motivated: '💪',
};

const MemoryCard: React.FC<MemoryCardProps> = ({ note, index, onDelete, onEdit }) => {
  const [attachmentCount, setAttachmentCount] = useState(0);
  const { speak, stop, speaking } = useTTS();

  const isLocked = note.capsule_unlock_date && isBefore(new Date(), new Date(note.capsule_unlock_date));

  useEffect(() => {
    supabase
      .from('memory_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('memory_id', note.id)
      .then(({ count }) => setAttachmentCount(count || 0));
  }, [note.id]);

  const handleTTS = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLocked) return;
    if (speaking) {
      stop();
    } else {
      speak(`${note.title}. ${note.content}`);
    }
  }, [speaking, stop, speak, note.title, note.content, isLocked]);

  const handleClick = () => {
    if (isLocked) return; // Can't open locked capsules
    onEdit(note);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ delay: index * 0.03, duration: 0.25 }}
      layout
      className={`native-group-item cursor-pointer group ${isLocked ? 'opacity-75' : ''}`}
      onClick={handleClick}
    >
      {/* Emoji avatar */}
      <div className="w-10 h-10 rounded-xl bg-accent/80 flex items-center justify-center shrink-0 text-lg relative">
        {isLocked ? (
          <Lock className="w-5 h-5 text-muted-foreground" />
        ) : (
          <>
            {categoryEmoji[note.category || 'other'] || '📝'}
            {note.mood && moodEmoji[note.mood] && (
              <span className="absolute -bottom-1 -right-1 text-xs">{moodEmoji[note.mood]}</span>
            )}
          </>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">
            {note.title}
          </h3>
        </div>
        {isLocked ? (
          <p className="text-[13px] text-muted-foreground leading-snug mt-0.5 italic">
            🔒 Locked until {format(new Date(note.capsule_unlock_date!), 'MMM d, yyyy')}
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground leading-snug line-clamp-1 mt-0.5">{note.content}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {note.reminder_date && (
            <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
              <Bell className="w-3 h-3" />
              {format(new Date(note.reminder_date), 'MMM d')}
            </span>
          )}
          {note.extracted_actions && note.extracted_actions.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-medium">
              {note.extracted_actions.length} action{note.extracted_actions.length !== 1 ? 's' : ''}
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
        {note.tags && note.tags.length > 0 && !isLocked && (
          <div className="flex items-center gap-1 mt-1 flex-wrap">
            {note.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] bg-primary/8 text-primary/80 px-1.5 py-0.5 rounded-full">
                {tag}
              </span>
            ))}
            {note.tags.length > 3 && (
              <span className="text-[10px] text-muted-foreground">+{note.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Actions - hidden on mobile, shown on hover for desktop */}
      <div className="flex items-center gap-0.5 shrink-0">
        <div className="hidden md:flex items-center gap-0.5">
          {!isLocked && (
            <>
              <button
                onClick={handleTTS}
                className="h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all"
                title={speaking ? 'Stop reading' : 'Read aloud'}
              >
                {speaking ? <VolumeX className="w-4 h-4 text-primary" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <ShareMemory memoryId={note.id} title={note.title} />
            </>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
            className="h-8 w-8 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
      </div>
    </motion.div>
  );
};

export default MemoryCard;
