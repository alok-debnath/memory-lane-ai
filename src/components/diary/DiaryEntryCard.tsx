import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp, Sparkles, Heart, Zap, Tag } from 'lucide-react';

interface DiaryEntryCardProps {
  entry: any;
  index: number;
  moodEmoji: Record<string, string>;
}

const DiaryEntryCard: React.FC<DiaryEntryCardProps> = ({ entry, index, moodEmoji }) => {
  const [expanded, setExpanded] = useState(false);
  const insights = entry.structured_insights || {};
  const keyPoints = insights.key_points || [];
  const habits = entry.habits_detected || [];
  const traits = entry.personality_traits || [];
  const likes = insights.likes || [];
  const dislikes = insights.dislikes || [];
  const actionItems = insights.action_items || [];

  const categoryColors: Record<string, string> = {
    thought: 'bg-accent text-accent-foreground',
    event: 'bg-primary/10 text-primary',
    feeling: 'bg-destructive/10 text-destructive',
    decision: 'bg-secondary text-secondary-foreground',
    goal: 'bg-primary/15 text-primary',
    concern: 'bg-destructive/8 text-destructive/80',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="native-card overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-start gap-3 p-4 text-left touch-item"
      >
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-lg">{moodEmoji[entry.mood] || '📝'}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground line-clamp-2">
            {insights.summary || entry.raw_text?.slice(0, 100)}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-muted-foreground">
              {format(new Date(entry.created_at), 'MMM d, h:mm a')}
            </span>
            {entry.mood && (
              <span className="text-[10px] font-medium text-primary capitalize">{entry.mood}</span>
            )}
            {entry.energy_level && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Zap className="w-2.5 h-2.5" />
                {entry.energy_level}
              </span>
            )}
          </div>
          {/* Topics */}
          {entry.topics?.length > 0 && (
            <div className="flex gap-1 mt-1.5 flex-wrap">
              {entry.topics.slice(0, 4).map((topic: string) => (
                <span key={topic} className="text-[10px] font-medium bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="shrink-0 mt-1">
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-border/60"
        >
          <div className="p-4 space-y-4">
            {/* Raw text */}
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">What you said</p>
              <p className="text-[13px] text-foreground/80 leading-relaxed">{entry.raw_text}</p>
            </div>

            {/* Key points */}
            {keyPoints.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Key Points
                </p>
                <div className="space-y-1.5">
                  {keyPoints.map((kp: any, i: number) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 ${categoryColors[kp.category] || 'bg-secondary text-muted-foreground'}`}>
                        {kp.category}
                      </span>
                      <p className="text-[12px] text-foreground/80">{kp.point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Likes & Dislikes */}
            {(likes.length > 0 || dislikes.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {likes.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-primary" /> Likes
                    </p>
                    <div className="space-y-1">
                      {likes.map((l: string, i: number) => (
                        <p key={i} className="text-[11px] text-foreground/70">• {l}</p>
                      ))}
                    </div>
                  </div>
                )}
                {dislikes.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">👎 Dislikes</p>
                    <div className="space-y-1">
                      {dislikes.map((d: string, i: number) => (
                        <p key={i} className="text-[11px] text-foreground/70">• {d}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Habits */}
            {habits.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Habits Detected
                </p>
                <div className="flex gap-1.5 flex-wrap">
                  {habits.map((h: any, i: number) => (
                    <span
                      key={i}
                      className={`text-[10px] font-medium px-2 py-1 rounded-lg ${
                        h.sentiment === 'positive' ? 'bg-primary/10 text-primary'
                        : h.sentiment === 'negative' ? 'bg-destructive/10 text-destructive'
                        : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {h.habit}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Personality traits */}
            {traits.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">🧬 Personality Signals</p>
                <div className="space-y-1.5">
                  {traits.map((t: any, i: number) => (
                    <div key={i} className="text-[11px]">
                      <span className="font-medium text-foreground">{t.trait}</span>
                      <span className="text-muted-foreground"> — {t.evidence}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action items */}
            {actionItems.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">✅ Action Items</p>
                <div className="space-y-1">
                  {actionItems.map((a: string, i: number) => (
                    <p key={i} className="text-[11px] text-foreground/80">☐ {a}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default DiaryEntryCard;
