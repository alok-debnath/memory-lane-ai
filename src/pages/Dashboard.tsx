import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MemoryCard, { type MemoryNote } from '@/components/MemoryCard';
import EditMemoryDialog from '@/components/EditMemoryDialog';
import { Brain, Plus, Search, Bell, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { isAfter, isBefore, addDays, format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editNote, setEditNote] = useState<MemoryNote | null>(null);
  const [editOpen, setEditOpen] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('memory_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
      toast({ title: 'Memory deleted' });
    },
  });

  const filteredNotes = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  );

  const upcomingReminders = notes.filter(
    (n) => n.reminder_date && isAfter(new Date(n.reminder_date), new Date()) && isBefore(new Date(n.reminder_date), addDays(new Date(), 7))
  );

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  const handleEdit = (note: MemoryNote) => {
    setEditNote(note);
    setEditOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
          Hey, {firstName} 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          You have {notes.length} memories & {upcomingReminders.length} upcoming reminders
        </p>
      </motion.div>

      {upcomingReminders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card-elevated p-4 sm:p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-display font-semibold text-foreground text-sm">Upcoming Reminders</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {upcomingReminders.slice(0, 5).map((r) => (
              <div key={r.id} className="shrink-0 bg-accent/50 rounded-xl px-4 py-3 min-w-[180px]">
                <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                <p className="text-xs text-primary font-medium mt-1">
                  {format(new Date(r.reminder_date!), 'EEE, MMM d')}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex items-center gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search memories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-secondary/50 border-border/50"
          />
        </div>
        <Button variant="gradient" size="lg" onClick={() => navigate('/record')} className="shrink-0">
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">New Memory</span>
        </Button>
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
      ) : filteredNotes.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground text-lg">
            {search ? 'No matching memories' : 'No memories yet'}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {search ? 'Try a different search term' : 'Tap the microphone to create your first memory'}
          </p>
          {!search && (
            <Button variant="gradient" className="mt-6" onClick={() => navigate('/record')}>
              <Mic className="w-4 h-4" />
              Create Memory
            </Button>
          )}
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredNotes.map((note, i) => (
              <MemoryCard
                key={note.id}
                note={note}
                index={i}
                onDelete={(id) => deleteMutation.mutate(id)}
                onEdit={handleEdit}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <EditMemoryDialog note={editNote} open={editOpen} onOpenChange={setEditOpen} />
    </div>
  );
};

export default Dashboard;
