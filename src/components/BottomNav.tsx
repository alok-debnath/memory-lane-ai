import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Bell, User, Clock, BarChart3 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/timeline', icon: Clock, label: 'Timeline' },
  { path: '/reminders', icon: Bell, label: 'Alerts' },
  { path: '/stats', icon: BarChart3, label: 'Stats' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const springConfig = { type: 'spring', stiffness: 500, damping: 35, mass: 0.8 } as const;

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex justify-center pointer-events-none">
      <div className="liquid-glass-bar pointer-events-auto mb-3 mx-auto px-2 py-1.5 flex items-center justify-around" style={{ width: 'min(85vw, 320px)' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center w-16 h-12 rounded-full active:scale-[0.92]"
            >
              {isActive && (
                <motion.div
                  layoutId="liquid-glass-pill"
                  className="absolute inset-0 rounded-full liquid-glass-pill"
                  transition={springConfig}
                />
              )}
              <item.icon
                className={`relative z-10 w-[20px] h-[20px] transition-colors duration-200 ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
                strokeWidth={isActive ? 2.3 : 1.6}
              />
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 10 }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="relative z-10 text-[9px] font-bold text-primary leading-none tracking-wide overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
