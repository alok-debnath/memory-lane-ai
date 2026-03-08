import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MemoryCard, { type MemoryNote } from '@/components/MemoryCard';
import EditMemoryDialog from '@/components/EditMemoryDialog';
import { Brain, Search, Bell, Mic, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { isAfter, isBefore, addDays, format } from 'date-fns';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editNote, setEditNote] = useState<MemoryNote | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [semanticResults, setSemanticResults] = useState<MemoryNote[] | null>(null);
  const [searching, setSearching] = useState(false);

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

  const doSemanticSearch = useCallback(async (query: string) => {
    if (!query.trim() || !user) {
      setSemanticResults(null);
      return;
    }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query, userId: user.id },
      });
      if (error) throw error;
      setSemanticResults(data.results || []);
    } catch {
      // Fallback to text search
      setSemanticResults(null);
    } finally {
      setSearching(false);
    }
  }, [user]);

  // Debounced semantic search
  const searchTimerRef = React.useRef<NodeJS.Timeout>();
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimerRef.current);
    if (value.trim().length >= 3) {
      searchTimerRef.current = setTimeout(() => doSemanticSearch(value), 500);
    } else {
      setSemanticResults(null);
    }
  };

  // Show semantic results if available, otherwise text filter
  const displayNotes = semanticResults !== null
    ? semanticResults
    : search
      ? notes.filter(
          (n) =>
            n.title.toLowerCase().includes(search.toLowerCase()) ||
            n.content.toLowerCase().includes(search.toLowerCase())
        )
      : notes;

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
            placeholder="Search memories naturally..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 h-11 rounded-xl bg-secondary/50 border-border/50"
          />
          {searching && (
            <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-pulse" />
          )}
        </div>
        <p className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
          <Mic className="w-3 h-3" />
          Use the mic button to add
        </p>
      </motion.div>

      {semanticResults !== null && search && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" />
          AI-powered search · {displayNotes.length} result{displayNotes.length !== 1 ? 's' : ''}
        </p>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-card p-5 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-3" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : displayNotes.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <Brain className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-foreground text-lg">
            {search ? 'No matching memories' : 'No memories yet'}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {search ? 'Try rephrasing your search' : 'Tap the 🎤 button to create your first memory with AI'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {displayNotes.map((note, i) => (
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
