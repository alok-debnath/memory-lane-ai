import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type MemoryNote } from '@/components/MemoryCard';
import { Bell, Calendar, Repeat } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, isThisWeek, isAfter } from 'date-fns';

const Reminders: React.FC = () => {
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['memory-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memory_notes')
        .select('*')
        .not('reminder_date', 'is', null)
        .order('reminder_date', { ascending: true });
      if (error) throw error;
      return data as MemoryNote[];
    },
  });

  const today = notes.filter((n) => n.reminder_date && isToday(new Date(n.reminder_date)));
  const tomorrow = notes.filter((n) => n.reminder_date && isTomorrow(new Date(n.reminder_date)));
  const thisWeek = notes.filter(
    (n) =>
      n.reminder_date &&
      isThisWeek(new Date(n.reminder_date)) &&
      !isToday(new Date(n.reminder_date)) &&
      !isTomorrow(new Date(n.reminder_date)) &&
      isAfter(new Date(n.reminder_date), new Date())
  );
  const later = notes.filter(
    (n) =>
      n.reminder_date &&
      !isThisWeek(new Date(n.reminder_date)) &&
      isAfter(new Date(n.reminder_date), new Date())
  );
  const past = notes.filter((n) => n.reminder_date && isPast(new Date(n.reminder_date)) && !isToday(new Date(n.reminder_date)));

  const sections = [
    { title: 'Today', items: today, color: 'text-primary' },
    { title: 'Tomorrow', items: tomorrow, color: 'text-foreground' },
    { title: 'This Week', items: thisWeek, color: 'text-foreground' },
    { title: 'Later', items: later, color: 'text-muted-foreground' },
    { title: 'Past', items: past, color: 'text-muted-foreground' },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Reminders</h1>
        <p className="text-muted-foreground mt-1">{notes.length} scheduled reminders</p>
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
      ) : sections.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Bell className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground text-lg">No reminders</h3>
          <p className="text-muted-foreground mt-1 text-sm">
            Create a memory with a date to set up reminders
          </p>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h2 className={`font-display font-semibold text-sm mb-3 ${section.color}`}>
                {section.title}
              </h2>
              <div className="space-y-2">
                <AnimatePresence>
                  {section.items.map((note, i) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="glass-card p-4 flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground text-sm truncate">{note.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(new Date(note.reminder_date!), 'EEE, MMM d, yyyy')}
                        </p>
                      </div>
                      {note.is_recurring && (
                        <div className="flex items-center gap-1 text-xs text-primary shrink-0">
                          <Repeat className="w-3 h-3" />
                          <span>{note.recurrence_type}</span>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reminders;
