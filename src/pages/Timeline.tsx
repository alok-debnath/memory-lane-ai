import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type MemoryNote } from '@/components/MemoryCard';
import EditMemoryDialog from '@/components/EditMemoryDialog';
import { Clock, Bell, Brain, ChevronRight, Search, Sparkles } from 'lucide-react';
import PageInfoButton from '@/components/PageInfoButton';
import { isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import { useTimezone } from '@/hooks/useTimezone';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const categoryEmoji: Record<string, string> = {
  personal: '🏠',
  work: '💼',
  finance: '💰',
  health: '❤️',
  other: '📝',
};

const Timeline: React.FC = () => {
  const { user } = useAuth();
  const { formatTz } = useTimezone();
  const [editNote, setEditNote] = useState<MemoryNote | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<MemoryNote[] | null>(null);
  const [searching, setSearching] = useState(false);

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
    staleTime: 30_000,
  });

  const doSearch = useCallback(async (query: string) => {
    if (!query.trim() || !user) { setSearchResults(null); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke('semantic-search', {
        body: { query, userId: user.id, mode: 'hybrid' },
      });
      if (error) throw error;
      setSearchResults(data.results || []);
    } catch {
      setSearchResults(
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
      setSearchResults(null);
    }
  };

  const categories = [...new Set(notes.map((n) => n.category || 'other'))];
  const baseNotes = searchResults !== null ? searchResults : notes;
  const filtered = filter ? baseNotes.filter((n) => (n.category || 'other') === filter) : baseNotes;

  const groups: { label: string; items: MemoryNote[] }[] = [];
  const buckets: Record<string, MemoryNote[]> = {};

  filtered.forEach((note) => {
    const d = new Date(note.created_at);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else if (isThisWeek(d)) label = 'This Week';
    else if (isThisMonth(d)) label = 'This Month';
    else label = formatTz(d, 'MMMM yyyy');
    if (!buckets[label]) buckets[label] = [];
    buckets[label].push(note);
  });

  Object.entries(buckets).forEach(([label, items]) => groups.push({ label, items }));

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-primary" />
            Timeline
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Your memories, chronologically</p>
        </div>
        <PageInfoButton />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search timeline..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 h-10 rounded-xl bg-secondary/60 border-0 text-[14px] placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
        />
        {searching && (
          <Sparkles className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-pulse" />
        )}
      </div>

      {searchResults !== null && search && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-primary" />
          AI search · {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Category filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1 snap-x">
        <button
          onClick={() => setFilter(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all snap-start ${
            filter === null
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-muted-foreground active:bg-secondary/80'
          }`}
        >
          All ({notes.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(filter === cat ? null : cat)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all flex items-center gap-1 snap-start ${
              filter === cat
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground active:bg-secondary/80'
            }`}
          >
            <span className="text-xs">{categoryEmoji[cat] || '📝'}</span>
            <span className="capitalize">{cat}</span>
          </button>
        ))}
      </div>

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
      ) : groups.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="font-display font-semibold text-foreground text-base">No memories yet</h3>
          <p className="text-[13px] text-muted-foreground mt-1">Use the mic to create your first memory</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group, gi) => (
            <motion.div
              key={group.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.06 }}
            >
              <p className="section-label">{group.label}</p>
              <div className="native-group">
                {group.items.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => { setEditNote(note); setEditOpen(true); }}
                    className="native-group-item cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-accent/80 flex items-center justify-center shrink-0 text-lg">
                      {categoryEmoji[note.category || 'other'] || '📝'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-semibold text-foreground truncate leading-tight">{note.title}</h3>
                      <p className="text-[13px] text-muted-foreground line-clamp-1 mt-0.5">{note.content}</p>
                      {note.reminder_date && (
                        <span className="flex items-center gap-1 mt-1 text-[11px] text-primary font-medium">
                          <Bell className="w-3 h-3" />
                          {format(new Date(note.reminder_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground/50">
                        {format(new Date(note.created_at), 'h:mm a')}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  </div>
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
