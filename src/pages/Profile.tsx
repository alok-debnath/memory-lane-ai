import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { User, Brain, Bell, LogOut, Calendar } from 'lucide-react';
import { type MemoryNote } from '@/components/MemoryCard';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();

  const { data: notes = [] } = useQuery({
    queryKey: ['memory-notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('memory_notes').select('*');
      if (error) throw error;
      return data as MemoryNote[];
    },
  });

  const stats = [
    { icon: Brain, label: 'Total Memories', value: notes.length },
    { icon: Bell, label: 'Reminders', value: notes.filter((n) => n.reminder_date).length },
    { icon: Calendar, label: 'Recurring', value: notes.filter((n) => n.is_recurring).length },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">Profile</h1>
      </motion.div>

      {/* User Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card-elevated p-6 flex items-center gap-4"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
          <User className="w-8 h-8 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display font-bold text-foreground text-lg">
            {user?.user_metadata?.full_name || 'User'}
          </h2>
          <p className="text-muted-foreground text-sm">{user?.email}</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-3"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="glass-card p-4 text-center">
            <stat.icon className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Button
          variant="outline"
          className="w-full justify-center gap-2 h-12 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/5"
          onClick={signOut}
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
};

export default Profile;
