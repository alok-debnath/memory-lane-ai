import React from 'react';
import { Home, Bell, User, Brain, LogOut, Clock, BarChart3, FileText, Network, RotateCcw } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ThemeToggle from '@/components/ThemeToggle';

const navItems = [
  { path: '/', icon: Home, label: 'Dashboard' },
  { path: '/timeline', icon: Clock, label: 'Timeline' },
  { path: '/reminders', icon: Bell, label: 'Reminders' },
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/review', icon: RotateCcw, label: 'Review' },
  { path: '/graph', icon: Network, label: 'Graph' },
  { path: '/stats', icon: BarChart3, label: 'Stats' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const DesktopSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'User';

  return (
    <aside className="hidden lg:flex flex-col w-72 h-screen bg-card border-r border-border/60 fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 h-16">
        <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
          <Brain className="w-[18px] h-[18px] text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold text-foreground tracking-tight">Memora</span>
      </div>

      <div className="h-px bg-border/60 mx-4" />

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'text-primary bg-accent'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60 active:bg-secondary'
              }`}
            >
              <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="h-px bg-border/60 mx-4" />

      {/* User section */}
      <div className="px-4 py-3 space-y-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">{firstName[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate">{firstName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
          </div>
          <ThemeToggle />
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
