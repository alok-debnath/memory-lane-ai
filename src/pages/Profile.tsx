import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  User, Brain, Bell, LogOut, Calendar, Shield, Trash2,
  Loader2, Moon, ChevronDown,
} from 'lucide-react';
import { type MemoryNote } from '@/components/MemoryCard';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
import ExportMemories from '@/components/ExportMemories';
import { format } from 'date-fns';

const Profile: React.FC = () => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  

  const { data: notes = [] } = useQuery({
    queryKey: ['memory-notes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('memory_notes').select('*');
      if (error) throw error;
      return data as MemoryNote[];
    },
  });

  const stats = [
    { icon: Brain, label: 'Memories', value: notes.length },
    { icon: Bell, label: 'Reminders', value: notes.filter((n) => n.reminder_date).length },
    { icon: Calendar, label: 'Recurring', value: notes.filter((n) => n.is_recurring).length },
  ];

  const categoryBreakdown = notes.reduce((acc: Record<string, number>, n) => {
    const cat = n.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Minimum 6 characters', variant: 'destructive' });
      return;
    }
    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated!' });
      setChangingPassword(false);
      setNewPassword('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAll = async () => {
...
          {/* Export */}
          <div className="native-group-item justify-between">
            <span className="text-[15px] text-foreground">Export Memories</span>
            <ExportMemories notes={notes} />
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div>
        <p className="section-label">Danger Zone</p>
        <div className="native-group">
          <button
            onClick={handleDeleteAll}
            disabled={notes.length === 0}
            className="native-group-item w-full text-destructive disabled:opacity-40"
          >
            <Trash2 className="w-[18px] h-[18px]" />
            <span className="text-[15px] font-medium">Delete All Memories</span>
          </button>

          <button
            onClick={signOut}
            className="native-group-item w-full text-destructive"
          >
            <LogOut className="w-[18px] h-[18px]" />
            <span className="text-[15px] font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
