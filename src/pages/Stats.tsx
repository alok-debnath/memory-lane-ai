import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type MemoryNote } from '@/components/MemoryCard';
import { BarChart3, Flame, Brain, TrendingUp, Heart } from 'lucide-react';
import { subDays, startOfDay, differenceInCalendarDays, eachDayOfInterval } from 'date-fns';
import { useTimezone } from '@/hooks/useTimezone';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { motion } from 'framer-motion';
import PageInfoButton from '@/components/PageInfoButton';


const categoryEmoji: Record<string, string> = {
  personal: '🏠', work: '💼', finance: '💰', health: '❤️', other: '📝',
};

const moodEmoji: Record<string, string> = {
  happy: '😊', sad: '😢', anxious: '😰', excited: '🤩', neutral: '😐',
  grateful: '🙏', frustrated: '😤', hopeful: '🌟', nostalgic: '💭', motivated: '💪',
};

const moodColors: Record<string, string> = {
  happy: 'hsl(45, 90%, 55%)', sad: 'hsl(220, 60%, 55%)', anxious: 'hsl(30, 70%, 55%)',
  excited: 'hsl(330, 80%, 55%)', neutral: 'hsl(0, 0%, 60%)', grateful: 'hsl(160, 60%, 45%)',
  frustrated: 'hsl(0, 65%, 55%)', hopeful: 'hsl(50, 80%, 50%)', nostalgic: 'hsl(270, 50%, 55%)',
  motivated: 'hsl(200, 70%, 50%)',
};

const Stats: React.FC = () => {
  const { formatTz } = useTimezone();
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['memory-notes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memory_notes')
        .select('id, title, content, category, reminder_date, is_recurring, recurrence_type, created_at, updated_at, user_id, mood, capsule_unlock_date, extracted_actions')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MemoryNote[];
    },
    staleTime: 30_000,
  });

  const stats = useMemo(() => {
    if (notes.length === 0) return null;

    // Category breakdown
    const catCounts: Record<string, number> = {};
    notes.forEach((n) => {
      const cat = n.category || 'other';
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    const categories = Object.entries(catCounts)
      .map(([name, count]) => ({ name, count, emoji: categoryEmoji[name] || '📝' }))
      .sort((a, b) => b.count - a.count);

    // Mood breakdown
    const moodCounts: Record<string, number> = {};
    notes.forEach((n) => {
      if (n.mood) moodCounts[n.mood] = (moodCounts[n.mood] || 0) + 1;
    });
    const moods = Object.entries(moodCounts)
      .map(([name, count]) => ({
        name,
        count,
        emoji: moodEmoji[name] || '😐',
        fill: moodColors[name] || 'hsl(var(--primary))',
      }))
      .sort((a, b) => b.count - a.count);

    // Mood trend (last 14 days)
    const today = startOfDay(new Date());
    const trendDays = eachDayOfInterval({ start: subDays(today, 13), end: today });
    const moodValues: Record<string, number> = {
      happy: 5, excited: 5, grateful: 4, motivated: 4, hopeful: 3,
      neutral: 3, nostalgic: 2, anxious: 2, frustrated: 1, sad: 1,
    };
    const moodTrend = trendDays.map((day) => {
      const dayStr = formatTz(day, 'yyyy-MM-dd');
      const dayNotes = notes.filter((n) => formatTz(n.created_at, 'yyyy-MM-dd') === dayStr && n.mood);
      const avgMood = dayNotes.length > 0
        ? dayNotes.reduce((sum, n) => sum + (moodValues[n.mood!] || 3), 0) / dayNotes.length
        : 0;
      return { day: formatTz(day, 'EEE'), value: Math.round(avgMood * 10) / 10, count: dayNotes.length };
    });

    // Weekly activity
    const weekDays = eachDayOfInterval({ start: subDays(today, 6), end: today });
    const weeklyActivity = weekDays.map((day) => {
      const dayStr = formatTz(day, 'yyyy-MM-dd');
      const count = notes.filter((n) => formatTz(n.created_at, 'yyyy-MM-dd') === dayStr).length;
      return { day: formatTz(day, 'EEE'), count };
    });

    // Streak
    let streak = 0;
    let checkDate = today;
    while (true) {
      const dayStr = format(checkDate, 'yyyy-MM-dd');
      const hasNote = notes.some((n) => format(new Date(n.created_at), 'yyyy-MM-dd') === dayStr);
      if (!hasNote && differenceInCalendarDays(today, checkDate) > 0) break;
      if (hasNote) streak++;
      if (differenceInCalendarDays(today, checkDate) === 0 && !hasNote) break;
      checkDate = subDays(checkDate, 1);
    }

    const thisWeek = notes.filter((n) => differenceInCalendarDays(today, new Date(n.created_at)) <= 7).length;
    const thisMonth = notes.filter((n) => differenceInCalendarDays(today, new Date(n.created_at)) <= 30).length;

    // Total actions extracted
    const totalActions = notes.reduce((sum, n) => sum + (n.extracted_actions?.length || 0), 0);

    // Dominant mood
    const dominantMood = moods.length > 0 ? moods[0] : null;

    return { categories, weeklyActivity, streak, thisWeek, thisMonth, total: notes.length, moods, moodTrend, totalActions, dominantMood };
  }, [notes]);

  if (isLoading) {
    return (
      <div className="space-y-5">
        <div className="h-8 bg-muted rounded w-1/3 animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="native-card p-4 animate-pulse"><div className="h-10 bg-muted rounded" /></div>
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="font-display font-semibold text-foreground text-base">No data yet</h3>
        <p className="text-[13px] text-muted-foreground mt-1">Create some memories to see your stats</p>
      </div>
    );
  }

  const statCards = [
    { icon: Flame, label: 'Streak', value: `${stats.streak}d`, color: 'text-orange-500' },
    { icon: TrendingUp, label: 'This Week', value: stats.thisWeek, color: 'text-primary' },
    { icon: Brain, label: 'Total', value: stats.total, color: 'text-accent-foreground' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-primary" />
            Stats
          </h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Your memory activity overview</p>
        </div>
        <PageInfoButton />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-2.5">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="native-card p-3.5 text-center"
          >
            <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
            <p className="text-xl font-display font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Mood Overview */}
      {stats.moods.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="native-card-elevated p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <Heart className="w-4 h-4 text-primary" />
            <p className="section-label">Mood Tracker</p>
            {stats.dominantMood && (
              <span className="text-sm ml-auto">{stats.dominantMood.emoji} {stats.dominantMood.name}</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.moods.slice(0, 6).map((m) => (
              <div key={m.name} className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2.5 py-1.5">
                <span className="text-sm">{m.emoji}</span>
                <span className="text-[12px] font-medium text-foreground capitalize">{m.name}</span>
                <span className="text-[11px] text-muted-foreground">({m.count})</span>
              </div>
            ))}
          </div>

          {/* Mood trend line (bar chart showing mood scores) */}
          {stats.moodTrend.some((d) => d.value > 0) && (
            <div className="h-[120px] mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.moodTrend} barCategoryGap="20%">
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis hide domain={[0, 5]} />
                  <Tooltip
                    cursor={false}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => {
                      const labels = ['', 'Low', 'Below avg', 'Neutral', 'Good', 'Great'];
                      return [labels[Math.round(value)] || value, 'Mood'];
                    }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={24}>
                    {stats.moodTrend.map((entry, index) => {
                      const hue = entry.value >= 4 ? 140 : entry.value >= 3 ? 45 : entry.value >= 2 ? 30 : 0;
                      return (
                        <Cell
                          key={index}
                          fill={entry.value > 0 ? `hsl(${hue}, 60%, 50%)` : 'hsl(var(--muted))'}
                          opacity={entry.value > 0 ? 0.85 : 0.3}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      )}

      {/* Weekly activity chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="native-card-elevated p-4"
      >
        <p className="section-label mb-3">Weekly Activity</p>
        <div className="h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.weeklyActivity} barCategoryGap="25%">
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  fontSize: '12px',
                  boxShadow: 'var(--shadow-md)',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={32}>
                {stats.weeklyActivity.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={entry.count > 0 ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
                    opacity={entry.count > 0 ? 1 : 0.5}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* Category breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="native-card-elevated p-4"
      >
        <p className="section-label mb-3">Categories</p>
        <div className="space-y-2.5">
          {stats.categories.map((cat) => {
            const pct = Math.round((cat.count / stats.total) * 100);
            return (
              <div key={cat.name} className="flex items-center gap-3">
                <span className="text-lg w-6 text-center">{cat.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium text-foreground capitalize">{cat.name}</span>
                    <span className="text-[11px] text-muted-foreground">{cat.count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, delay: 0.4 }}
                      className="h-full bg-primary rounded-full"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Monthly summary */}
      <div className="native-card p-4">
        <p className="section-label mb-2">30-Day Summary</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.thisMonth}</p>
            <p className="text-[11px] text-muted-foreground">memories</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {Math.round(stats.thisMonth / 30 * 10) / 10}
            </p>
            <p className="text-[11px] text-muted-foreground">avg/day</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.totalActions}</p>
            <p className="text-[11px] text-muted-foreground">actions</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
