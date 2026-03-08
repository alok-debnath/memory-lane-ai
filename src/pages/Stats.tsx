import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { type MemoryNote } from '@/components/MemoryCard';
import { BarChart3, Flame, Brain, Calendar, TrendingUp } from 'lucide-react';
import { format, subDays, startOfDay, differenceInCalendarDays, eachDayOfInterval } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { motion } from 'framer-motion';
import ExportMemories from '@/components/ExportMemories';

const categoryEmoji: Record<string, string> = {
  personal: '🏠', work: '💼', finance: '💰', health: '❤️', other: '📝',
};

const Stats: React.FC = () => {
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

    // Weekly activity (last 7 days)
    const today = startOfDay(new Date());
    const weekDays = eachDayOfInterval({ start: subDays(today, 6), end: today });
    const weeklyActivity = weekDays.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const count = notes.filter((n) => format(new Date(n.created_at), 'yyyy-MM-dd') === dayStr).length;
      return { day: format(day, 'EEE'), count };
    });

    // Streak calculation
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

    // Total memories this week/month
    const thisWeek = notes.filter((n) => differenceInCalendarDays(today, new Date(n.created_at)) <= 7).length;
    const thisMonth = notes.filter((n) => differenceInCalendarDays(today, new Date(n.created_at)) <= 30).length;

    return { categories, weeklyActivity, streak, thisWeek, thisMonth, total: notes.length };
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
        <ExportMemories notes={notes} />
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-display font-bold text-foreground">{stats.thisMonth}</p>
            <p className="text-[11px] text-muted-foreground">memories created</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold text-foreground">
              {Math.round(stats.thisMonth / 30 * 10) / 10}
            </p>
            <p className="text-[11px] text-muted-foreground">avg per day</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stats;
