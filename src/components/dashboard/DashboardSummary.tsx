import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Users, MapPin, Folder, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

const moodEmoji: Record<string, string> = {
  joyful: '😊', content: '😌', neutral: '😐', anxious: '😰',
  stressed: '😤', sad: '😢', angry: '😠', excited: '🤩',
  reflective: '🤔', grateful: '🙏',
};

const DashboardSummary: React.FC = () => {
  const { data: diaryEntries = [] } = useQuery({
    queryKey: ['diary-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diary_entries' as any)
        .select('mood, energy_level, topics, habits_detected, created_at, structured_insights')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });

  const { data: memoryNotes = [] } = useQuery({
    queryKey: ['memory-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memory_notes')
        .select('people, locations, life_area, category, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as any[];
    },
    staleTime: 60_000,
  });

  // Compute summaries
  const recentMoods = diaryEntries.slice(0, 5).map(e => e.mood).filter(Boolean);
  const allPeople = memoryNotes.flatMap(n => n.people || []);
  const uniquePeople = [...new Set(allPeople)].slice(0, 5);
  const allLocations = memoryNotes.flatMap(n => n.locations || []);
  const uniqueLocations = [...new Set(allLocations)].slice(0, 4);
  const lifeAreas = memoryNotes.map(n => n.life_area).filter(Boolean);
  const lifeAreaCounts = lifeAreas.reduce((acc: Record<string, number>, a: string) => {
    acc[a] = (acc[a] || 0) + 1;
    return acc;
  }, {});
  const topLifeAreas = Object.entries(lifeAreaCounts)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  const recentTopics = diaryEntries.slice(0, 3).flatMap((e: any) => e.topics || []);
  const uniqueTopics = [...new Set(recentTopics)].slice(0, 5);

  const hasContent = recentMoods.length > 0 || uniquePeople.length > 0 || uniqueLocations.length > 0;

  if (!hasContent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="native-card p-4 space-y-3"
    >
      <p className="section-label flex items-center gap-1 !mt-0">
        <TrendingUp className="w-3 h-3 text-primary" />
        Your Snapshot
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Recent Mood */}
        {recentMoods.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Mood Trend
            </p>
            <div className="flex gap-1">
              {recentMoods.map((mood, i) => (
                <span key={i} className="text-base" title={mood}>
                  {moodEmoji[mood] || '📝'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Topics */}
        {uniqueTopics.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Folder className="w-3 h-3" /> Thinking About
            </p>
            <div className="flex gap-1 flex-wrap">
              {uniqueTopics.map((topic) => (
                <span key={topic} className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* People */}
        {uniquePeople.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <Users className="w-3 h-3" /> People
            </p>
            <div className="flex gap-1 flex-wrap">
              {uniquePeople.map((person) => (
                <span key={person} className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {person}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        {uniqueLocations.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Places
            </p>
            <div className="flex gap-1 flex-wrap">
              {uniqueLocations.map((loc) => (
                <span key={loc} className="text-[10px] font-medium bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                  {loc}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Life areas */}
      {topLifeAreas.length > 0 && (
        <div className="pt-1.5 border-t border-border/40">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Life Focus</p>
          <div className="flex gap-2">
            {topLifeAreas.map(([area, count]) => (
              <div key={area} className="flex items-center gap-1.5">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(20, (count as number) * 12)}px` }} />
                <span className="text-[10px] text-muted-foreground capitalize">{area}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DashboardSummary;
