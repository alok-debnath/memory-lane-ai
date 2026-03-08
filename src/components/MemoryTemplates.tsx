import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Briefcase, Heart, ListChecks } from 'lucide-react';

export interface MemoryTemplate {
  id: string;
  label: string;
  icon: React.ElementType;
  category: string;
  prefill: string;
}

export const templates: MemoryTemplate[] = [
  {
    id: 'meeting',
    label: 'Meeting Notes',
    icon: Briefcase,
    category: 'work',
    prefill: '📋 Meeting: [Topic]\n\n👥 Attendees:\n- \n\n📌 Key Points:\n1. \n2. \n\n✅ Action Items:\n- [ ] \n- [ ] \n\n📅 Follow-up:',
  },
  {
    id: 'journal',
    label: 'Daily Journal',
    icon: FileText,
    category: 'personal',
    prefill: '📖 Daily Journal\n\n🌅 How I feel today:\n\n✨ Highlights:\n1. \n2. \n\n🙏 Grateful for:\n- \n\n📝 Thoughts:\n\n🎯 Tomorrow\'s focus:',
  },
  {
    id: 'habit',
    label: 'Habit Tracker',
    icon: ListChecks,
    category: 'health',
    prefill: '🎯 Habit Tracker\n\n💪 Habits:\n- [ ] Exercise (30 min)\n- [ ] Read (20 min)\n- [ ] Meditate (10 min)\n- [ ] Drink 8 glasses of water\n- [ ] Sleep by 11 PM\n\n📊 Streak: Day _\n\n📝 Notes:',
  },
  {
    id: 'health',
    label: 'Health Log',
    icon: Heart,
    category: 'health',
    prefill: '❤️ Health Log\n\n🏥 Symptoms / Observations:\n- \n\n💊 Medications:\n- \n\n🍎 Diet:\n- Breakfast: \n- Lunch: \n- Dinner: \n\n🏃 Exercise:\n\n😴 Sleep: _ hours\n\n📝 Notes:',
  },
];

interface MemoryTemplatesProps {
  onSelect: (template: MemoryTemplate) => void;
}

const MemoryTemplates: React.FC<MemoryTemplatesProps> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-2 gap-2">
      {templates.map((t, i) => (
        <motion.button
          key={t.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(t)}
          className="native-card p-3.5 text-left hover:bg-accent/40 transition-colors touch-item"
        >
          <div className="w-9 h-9 rounded-xl bg-accent/80 flex items-center justify-center mb-2">
            <t.icon className="w-4.5 h-4.5 text-accent-foreground" />
          </div>
          <p className="text-[13px] font-semibold text-foreground">{t.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{t.category}</p>
        </motion.button>
      ))}
    </div>
  );
};

export default MemoryTemplates;
