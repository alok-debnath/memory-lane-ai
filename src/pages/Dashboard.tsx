import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import MemoryCard, { type MemoryNote } from '@/components/MemoryCard';
import EditMemoryDialog from '@/components/EditMemoryDialog';
import { Brain, Search, Bell, Mic, Sparkles, Plus } from 'lucide-react';
import ExportMemories from '@/components/ExportMemories';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { isAfter, isBefore, addDays, format } from 'date-fns';
import ThemeToggle from '@/components/ThemeToggle';

const categoryEmoji: Record<string, string> = {
  personal: '🏠',
  work: '💼',
  finance: '💰',
  health: '❤️',
  other: '📝',
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [editNote, setEditNote] = useState<MemoryNote | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [semanticResults, setSemanticResults] = useState<MemoryNote[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['memory-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memory_notes')
        .select('id, title, content, category, reminder_date, is_recurring, recurrence_type, created_at, updated_at, user_id')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MemoryNote[];
    },
    staleTime: 30_000, // 30s before refetch
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

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim() || !user) { setSemanticResults(null); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query, userId: user.id, mode: 'hybrid' },
      });
      if (error) throw error;
      setSemanticResults(data.results || []);
    } catch {
      // Fallback to local keyword search
      setSemanticResults(
        notes.filter((n) =>
          n.title.toLowerCase().includes(query.toLowerCase()) ||
          n.content.toLowerCase().includes(query.toLowerCase())
        )
      );
    } finally {
      setSearching(false);
    }
  }, [user, notes]);

  const searchTimerRef = React.useRef<NodeJS.Timeout>();
  const handleSearchChange = (value: string) => {
    setSearch(value);
    clearTimeout(searchTimerRef.current);
    if (value.trim().length >= 2) {
      searchTimerRef.current = setTimeout(() => doSearch(value), 400);
    } else {
      setSemanticResults(null);
    }
  };

  const categories = [...new Set(notes.map((n) => n.category || 'other'))];

  let displayNotes = semanticResults !== null ? semanticResults : notes;

  if (categoryFilter) {
    displayNotes = displayNotes.filter((n) => (n.category || 'other') === categoryFilter);
  }

  const upcomingReminders = notes.filter(
    (n) => n.reminder_date && isAfter(new Date(n.reminder_date), new Date()) && isBefore(new Date(n.reminder_date), addDays(new Date(), 7))
  );

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  const handleEdit = (note: MemoryNote) => {
    setEditNote(note);
    setEditOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
            Hey, {firstName} 👋
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {notes.length} memories · {upcomingReminders.length} upcoming
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ExportMemories notes={notes} />
          <div className="lg:hidden">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Upcoming reminders */}
      {upcomingReminders.length > 0 && (
        <div className="native-card-elevated p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-primary" />
            <span className="text-[13px] font-semibold text-foreground">Upcoming</span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-0.5 -mx-1 px-1 snap-x">
            {upcomingReminders.slice(0, 5).map((r) => (
              <div
                key={r.id}
                onClick={() => handleEdit(r)}
                className="shrink-0 bg-accent/60 rounded-xl px-3.5 py-2.5 min-w-[160px] snap-start cursor-pointer touch-item"
              >
                <p className="text-[13px] font-medium text-foreground truncate">{r.title}</p>
                <p className="text-[11px] text-primary font-medium mt-0.5">
                  {format(new Date(r.reminder_date!), 'EEE, MMM d')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category filters */}
      {categories.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 snap-x">
          <button
            onClick={() => setCategoryFilter(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all snap-start ${
              categoryFilter === null
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground active:bg-secondary/80'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1 snap-start ${
                categoryFilter === cat
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground active:bg-secondary/80'
              }`}
            >
              <span className="text-xs">{categoryEmoji[cat] || '📝'}</span>
              <span className="capitalize">{cat}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search memories..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-10 rounded-xl bg-secondary/60 border-0 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
        {searching && (
          <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-pulse" />
        )}
      </div>

      {semanticResults !== null && search && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" />
          AI search · {displayNotes.length} result{displayNotes.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Memory list */}
      {isLoading ? (
        <div className="native-group">
          {[1, 2, 3].map((i) => (
            <div key={i} className="px-4 py-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted" />
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded w-1/3 mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : displayNotes.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-semibold text-foreground text-base">
            {search || categoryFilter ? 'No matches' : 'No memories yet'}
          </h3>
          <p className="text-muted-foreground mt-1 text-[13px]">
            {search || categoryFilter ? 'Try a different search' : 'Tap the mic to create your first memory'}
          </p>
        </div>
      ) : (
        <div className="native-group">
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
