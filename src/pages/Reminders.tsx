import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type MemoryNote } from '@/components/MemoryCard';
import { Bell, Calendar, Repeat, CheckCircle } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, isThisWeek, isAfter } from 'date-fns';
import PageInfoButton from '@/components/PageInfoButton';

const Reminders: React.FC = () => {
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['memory-reminders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memory_notes')
        .select('id, title, content, category, reminder_date, is_recurring, recurrence_type, created_at, updated_at, user_id')
        .not('reminder_date', 'is', null)
        .order('reminder_date', { ascending: true });
      if (error) throw error;
      return data as MemoryNote[];
    },
    staleTime: 30_000,
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
    { title: 'Today', items: today, accent: true },
    { title: 'Tomorrow', items: tomorrow, accent: false },
    { title: 'This Week', items: thisWeek, accent: false },
    { title: 'Later', items: later, accent: false },
    { title: 'Past', items: past, accent: false },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Reminders</h1>
        <p className="text-[13px] text-muted-foreground mt-0.5">{notes.length} scheduled</p>
      </div>

      {isLoading ? (
        <div className="native-group">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sections.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Bell className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-semibold text-foreground text-base">No reminders</h3>
          <p className="text-[13px] text-muted-foreground mt-1">Create a memory with a date to set reminders</p>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className={`section-label ${section.accent ? '!text-primary' : ''}`}>
                {section.title}
              </p>
              <div className="native-group">
                {section.items.map((note, i) => (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="native-group-item"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      section.title === 'Past' ? 'bg-secondary' : 'bg-accent'
                    }`}>
                      {section.title === 'Past' ? (
                        <CheckCircle className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Calendar className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] font-medium truncate ${
                        section.title === 'Past' ? 'text-muted-foreground line-through' : 'text-foreground'
                      }`}>
                        {note.title}
                      </p>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {format(new Date(note.reminder_date!), 'EEE, MMM d · h:mm a')}
                      </p>
                    </div>
                    {note.is_recurring && (
                      <div className="flex items-center gap-1 text-[11px] text-primary shrink-0">
                        <Repeat className="w-3 h-3" />
                        <span className="capitalize">{note.recurrence_type}</span>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Reminders;
