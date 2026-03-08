import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type MemoryNote } from '@/components/MemoryCard';
import EditMemoryDialog from '@/components/EditMemoryDialog';
import { Clock, Tag, Calendar, Bell, Brain } from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';

const categoryEmoji: Record<string, string> = {
  personal: '🏠',
  work: '💼',
  finance: '💰',
  health: '❤️',
  other: '📝',
};

const Timeline: React.FC = () => {
  const [editNote, setEditNote] = useState<MemoryNote | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['memory-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memory_notes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MemoryNote[];
    },
  });

  const categories = [...new Set(notes.map((n) => n.category || 'other'))];
  const filtered = filter ? notes.filter((n) => (n.category || 'other') === filter) : notes;

  // Group by time period
  const groups: { label: string; items: MemoryNote[] }[] = [];
  const buckets: Record<string, MemoryNote[]> = {};

  filtered.forEach((note) => {
    const d = new Date(note.created_at);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else if (isThisWeek(d)) label = 'This Week';
    else if (isThisMonth(d)) label = 'This Month';
    else label = format(d, 'MMMM yyyy');
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(note);
  });

  Object.entries(buckets).forEach(([label, items]) => groups.push({ label, items }));

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground flex items-center gap-3">
          <Clock className="w-7 h-7 text-primary" />
          Timeline
        </h1>
        <p className="text-muted-foreground mt-1">Your memories, chronologically</p>
      </motion.div>

      {/* Category filter chips */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
      >
        <button
          onClick={() => setFilter(null)}
          className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold transition-all border ${
            filter === null
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary'
          }`}
        >
          All ({notes.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? null : cat)}
            className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-semibold transition-all border flex items-center gap-1.5 ${
              filter === cat
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-secondary/50 text-muted-foreground border-border/50 hover:bg-secondary'
            }`}
          >
            <span>{categoryEmoji[cat] || '📝'}</span>
            {cat}
            <span className="opacity-60">({notes.filter((n) => (n.category || 'other') === cat).length})</span>
          </button>
        ))}
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground text-lg">No memories yet</h3>
          <p className="text-muted-foreground mt-1 text-sm">Use the 🎤 button to create your first memory</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {groups.map((group, gi) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.08 }}
            >
              <h2 className="font-display font-semibold text-muted-foreground text-xs uppercase tracking-wider mb-3 px-1">
                {group.label}
              </h2>
              <div className="relative pl-6 border-l-2 border-border/50 space-y-3">
                {group.items.map((note, i) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div className="absolute -left-[calc(1.5rem+5px)] top-4 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />

                    <div
                      onClick={() => { setEditNote(note); setEditOpen(true); }}
                      className="glass-card p-4 cursor-pointer hover:shadow-lg transition-shadow duration-300"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-base">{categoryEmoji[note.category || 'other'] || '📝'}</span>
                            <h3 className="font-display font-semibold text-foreground text-sm truncate">{note.title}</h3>
                          </div>
                          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">{note.content}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/60 shrink-0 mt-1">
                          {format(new Date(note.created_at), 'h:mm a')}
                        </span>
                      </div>

                      {note.reminder_date && (
                        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-primary font-medium">
                          <Bell className="w-3 h-3" />
                          {format(new Date(note.reminder_date), 'MMM d')}
                          {note.is_recurring && <span className="text-muted-foreground">· {note.recurrence_type}</span>}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <EditMemoryDialog note={editNote} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
};

export default Timeline;
