import React from 'react';
import { motion } from 'framer-motion';
import { Home, Bell, User, Brain, LogOut, Clock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/ThemeToggle';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/timeline', icon: Clock, label: 'Timeline' },
  { path: '/reminders', icon: Bell, label: 'Reminders' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const DesktopSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-card/50 backdrop-blur-xl border-r border-border/50 p-6 fixed left-0 top-0">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-foreground">Memora</span>
        </div>
        <ThemeToggle />
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-pill"
                  className="absolute inset-0 bg-accent rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon className="w-5 h-5 relative z-10" />
              <span className="relative z-10">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <Button
        variant="ghost"
        className="justify-start gap-3 text-muted-foreground hover:text-destructive"
        onClick={signOut}
      >
        <LogOut className="w-5 h-5" />
        Sign Out
      </Button>
    </aside>
  );
};

export default DesktopSidebar;
