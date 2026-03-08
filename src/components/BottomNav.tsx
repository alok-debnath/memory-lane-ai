import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Plus, FileText, RotateCcw, MoreHorizontal, Network, BarChart3, User, Bell, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCommandPanel } from './AppLayout';

const primaryItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/documents', icon: FileText, label: 'Docs' },
];

const rightItems = [
  { path: '/review', icon: RotateCcw, label: 'Review' },
];

const moreItems = [
  { path: '/timeline', icon: Bell, label: 'Timeline' },
  { path: '/reminders', icon: Bell, label: 'Reminders' },
  { path: '/graph', icon: Network, label: 'Knowledge Graph' },
  { path: '/stats', icon: BarChart3, label: 'Statistics' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const springConfig = { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 } as const;

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);
  const { open: openPanel } = useCommandPanel();

  const isActive = (path: string) => location.pathname === path;
  const isMoreActive = moreItems.some(i => isActive(i.path));

  const NavButton = ({ path, icon: Icon, label }: { path: string; icon: React.ElementType; label: string }) => {
    const active = isActive(path);
    return (
      <button
        onClick={() => { navigate(path); setMoreOpen(false); }}
        className="relative flex flex-col items-center justify-center w-14 h-12 rounded-full active:scale-[0.92]"
      >
        {active && (
          <motion.div
            layoutId="liquid-glass-pill"
            className="absolute inset-0 rounded-full liquid-glass-pill"
            transition={springConfig}
          />
        )}
        <Icon
          className={`relative z-10 w-[20px] h-[20px] transition-colors duration-200 ${
            active ? 'text-primary' : 'text-muted-foreground'
          }`}
          strokeWidth={active ? 2.3 : 1.6}
        />
        <AnimatePresence>
          {active && (
            <motion.span
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 10 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.15 }}
              className="relative z-10 text-[9px] font-bold text-primary leading-none tracking-wide overflow-hidden"
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    );
  };

  return (
    <>
      {/* More menu overlay */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-24 left-4 right-4 z-50 lg:hidden native-card-elevated p-2"
            >
              {moreItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => { navigate(item.path); setMoreOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[14px] font-medium transition-colors ${
                    isActive(item.path)
                      ? 'text-primary bg-accent'
                      : 'text-foreground active:bg-secondary/60'
                  }`}
                >
                  <item.icon className="w-5 h-5" strokeWidth={1.8} />
                  <span>{item.label}</span>
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom bar - no center + button, FAB is in UnifiedCommandPanel */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex justify-center pointer-events-none pb-safe">
        <div className="liquid-glass-bar pointer-events-auto mb-3 mx-auto px-1.5 py-1.5 flex items-center justify-around gap-0" style={{ width: 'min(90vw, 320px)' }}>
          {primaryItems.map(item => (
            <NavButton key={item.path} {...item} />
          ))}

          {rightItems.map(item => (
            <NavButton key={item.path} {...item} />
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className="relative flex flex-col items-center justify-center w-14 h-12 rounded-full active:scale-[0.92]"
          >
            {(isMoreActive && !moreOpen) && (
              <motion.div
                className="absolute inset-0 rounded-full liquid-glass-pill"
                transition={springConfig}
              />
            )}
            {moreOpen ? (
              <X className="relative z-10 w-[20px] h-[20px] text-primary" strokeWidth={2.3} />
            ) : (
              <MoreHorizontal
                className={`relative z-10 w-[20px] h-[20px] transition-colors duration-200 ${
                  isMoreActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={isMoreActive ? 2.3 : 1.6}
              />
            )}
            <AnimatePresence>
              {(isMoreActive && !moreOpen) && (
                <motion.span
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 10 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="relative z-10 text-[9px] font-bold text-primary leading-none tracking-wide overflow-hidden"
                >
                  More
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>
    </>
  );
};

export default BottomNav;
