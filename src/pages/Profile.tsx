import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User, Brain, Bell, LogOut, Calendar, Shield, Download, Trash2,
  ChevronRight, Loader2, CheckCircle, Settings,
} from 'lucide-react';
import { type MemoryNote } from '@/components/MemoryCard';
import { useToast } from '@/hooks/use-toast';
import ThemeToggle from '@/components/ThemeToggle';
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
    { icon: Brain, label: 'Memories', value: notes.length, color: 'text-primary' },
    { icon: Bell, label: 'Reminders', value: notes.filter((n) => n.reminder_date).length, color: 'text-primary' },
    { icon: Calendar, label: 'Recurring', value: notes.filter((n) => n.is_recurring).length, color: 'text-primary' },
  ];

  const categoryBreakdown = notes.reduce((acc: Record<string, number>, n) => {
    const cat = n.category || 'other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: 'Error', description: 'Password must be at least 6 characters', variant: 'destructive' });
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
        title: n.title,
        content: n.content,
        category: n.category,
        reminder_date: n.reminder_date,
        is_recurring: n.is_recurring,
        recurrence_type: n.recurrence_type,
        created_at: n.created_at,
      }));
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `memora-export-${format(new Date(), 'yyyy-MM-dd')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported!', description: `${notes.length} memories exported` });
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteAllMemories = async () => {
    if (!confirm('Are you sure you want to delete ALL memories? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('memory_notes').delete().eq('user_id', user!.id);
      if (error) throw error;
      toast({ title: 'All memories deleted' });
      window.location.reload();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  const memberSince = user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : 'N/A';

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
        className="glass-card-elevated p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shrink-0">
            <User className="w-8 h-8 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-display font-bold text-foreground text-lg truncate">
              {user?.user_metadata?.full_name || 'User'}
            </h2>
            <p className="text-muted-foreground text-sm truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Member since {memberSince}</p>
          </div>
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
            <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
            <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Category breakdown */}
      {Object.keys(categoryBreakdown).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="glass-card p-5"
        >
          <h3 className="font-display font-semibold text-foreground text-sm mb-3">Category Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, count]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm capitalize text-foreground w-20">{cat}</span>
                  <div className="flex-1 h-2 rounded-full bg-secondary/50 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / notes.length) * 100}%` }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className="h-full rounded-full bg-primary"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8 text-right">{count}</span>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-2"
      >
        <h3 className="font-display font-semibold text-foreground text-sm mb-3 px-1">Settings</h3>

        {/* Theme */}
        <div className="glass-card px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Appearance</span>
          </div>
          <ThemeToggle />
        </div>

        {/* Change Password */}
        <div className="glass-card overflow-hidden">
          <button
            onClick={() => setChangingPassword(!changingPassword)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Change Password</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${changingPassword ? 'rotate-90' : ''}`} />
          </button>
          {changingPassword && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              onSubmit={handleChangePassword}
              className="px-4 pb-4 space-y-3"
            >
              <div className="space-y-1.5">
                <Label htmlFor="newpw" className="text-xs text-muted-foreground">New Password</Label>
                <Input
                  id="newpw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="h-10 rounded-xl"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" size="sm" variant="gradient" className="w-full" disabled={passwordLoading}>
                {passwordLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle className="w-4 h-4 mr-1" /> Update Password</>}
              </Button>
            </motion.form>
          )}
        </div>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={exporting || notes.length === 0}
          className="glass-card w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <Download className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Export All Memories</span>
          </div>
          <span className="text-xs text-muted-foreground">{notes.length} memories</span>
        </button>

        {/* Delete All */}
        <button
          onClick={handleDeleteAllMemories}
          disabled={notes.length === 0}
          className="glass-card w-full px-4 py-3 flex items-center gap-3 hover:bg-destructive/5 transition-colors text-destructive disabled:opacity-50"
        >
          <Trash2 className="w-5 h-5" />
          <span className="text-sm font-medium">Delete All Memories</span>
        </button>
      </motion.div>

      {/* Sign Out */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
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
