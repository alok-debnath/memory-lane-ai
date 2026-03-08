import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Bell, Trash2, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

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
}

const categoryColors: Record<string, string> = {
  personal: 'bg-accent text-accent-foreground',
  work: 'bg-secondary text-secondary-foreground',
  finance: 'bg-primary/10 text-primary',
  health: 'bg-destructive/10 text-destructive',
  other: 'bg-muted text-muted-foreground',
};

const MemoryCard: React.FC<MemoryCardProps> = ({ note, index, onDelete }) => {
  const catClass = categoryColors[note.category || 'other'] || categoryColors.other;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      layout
      className="glass-card p-4 sm:p-5 group hover:shadow-lg transition-shadow duration-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-display font-semibold text-foreground text-base truncate">{note.title}</h3>
            {note.category && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${catClass}`}>
                <Tag className="w-3 h-3" />
                {note.category}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">{note.content}</p>

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            {note.reminder_date && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                <Bell className="w-3.5 h-3.5" />
                <span>{format(new Date(note.reminder_date), 'MMM d, yyyy')}</span>
                {note.is_recurring && (
                  <span className="text-muted-foreground">· {note.recurrence_type}</span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span>{format(new Date(note.created_at), 'MMM d')}</span>
            </div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(note.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
};

export default MemoryCard;
