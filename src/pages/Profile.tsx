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
  const [exporting, setExporting] = useState(false);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportData = notes.map((n) => ({
        title: n.title, content: n.content, category: n.category,
        reminder_date: n.reminder_date, is_recurring: n.is_recurring,
        recurrence_type: n.recurrence_type, created_at: n.created_at,
      }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memora-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported!', description: `${notes.length} memories` });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Delete ALL memories? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('memory_notes').delete().eq('user_id', user!.id);
      if (error) throw error;
      toast({ title: 'All memories deleted' });
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const memberSince = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : '';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Profile</h1>

      {/* User card */}
      <div className="native-card-elevated p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary-foreground">
            {(user?.user_metadata?.full_name || 'U')[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-display font-bold text-foreground truncate">
            {user?.user_metadata?.full_name || 'User'}
          </h2>
          <p className="text-[13px] text-muted-foreground truncate">{user?.email}</p>
          {memberSince && <p className="text-[11px] text-muted-foreground/60 mt-0.5">Since {memberSince}</p>}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="native-card p-3.5 text-center">
            <p className="text-xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <div className="native-card p-4">
          <p className="section-label mb-3">Categories</p>
          <div className="space-y-2.5">
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-[13px] capitalize text-foreground w-16 truncate">{cat}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / notes.length) * 100}%` }}
                      transition={{ delay: 0.3, duration: 0.5 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <span className="text-[11px] text-muted-foreground w-6 text-right">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Settings group */}
      <div>
        <p className="section-label">Settings</p>
        <div className="native-group">
          {/* Theme */}
          <div className="native-group-item justify-between">
            <div className="flex items-center gap-3">
              <Moon className="w-[18px] h-[18px] text-muted-foreground" />
              <span className="text-[15px] text-foreground">Appearance</span>
            </div>
            <ThemeToggle />
          </div>

          {/* Change Password */}
          <div>
            <button
              onClick={() => setChangingPassword(!changingPassword)}
              className="native-group-item w-full justify-between"
            >
              <div className="flex items-center gap-3">
                <Shield className="w-[18px] h-[18px] text-muted-foreground" />
                <span className="text-[15px] text-foreground">Change Password</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${changingPassword ? 'rotate-180' : ''}`} />
            </button>
            {changingPassword && (
              <form onSubmit={handleChangePassword} className="px-4 pb-4 space-y-3">
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (6+ characters)"
                  className="h-10 rounded-xl bg-secondary/60 border-0 text-[14px]"
                  minLength={6}
                  required
                />
                <Button type="submit" size="sm" variant="gradient" className="w-full h-10 rounded-xl" disabled={passwordLoading}>
                  {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Password'}
                </Button>
              </form>
            )}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting || notes.length === 0}
            className="native-group-item w-full justify-between disabled:opacity-40"
          >
            <div className="flex items-center gap-3">
              <Download className="w-[18px] h-[18px] text-muted-foreground" />
              <span className="text-[15px] text-foreground">Export Memories</span>
            </div>
            <span className="text-[13px] text-muted-foreground">{notes.length}</span>
          </button>
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
