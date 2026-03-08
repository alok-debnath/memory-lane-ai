import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Bell, User, Clock } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/timeline', icon: Clock, label: 'Timeline' },
  { path: '/reminders', icon: Bell, label: 'Reminders' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex justify-center pointer-events-none">
      <div className="liquid-glass-bar pointer-events-auto mb-3 mx-auto px-2.5 py-1.5 flex items-center justify-center gap-1" style={{ width: 'min(80vw, 300px)' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <motion.button
              layout
              key={item.path}
              onClick={() => navigate(item.path)}
              transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
              className={`relative flex items-center justify-center h-10 rounded-full transition-colors duration-200 active:scale-[0.92] ${
                isActive ? 'gap-1.5 px-4' : 'w-10'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="liquid-glass-pill"
                  className="absolute inset-0 rounded-full liquid-glass-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                />
              )}
              <motion.div
                layout
                transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                className="relative z-10 flex items-center gap-1.5"
              >
                <item.icon
                  className={`w-[20px] h-[20px] transition-colors duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  strokeWidth={isActive ? 2.2 : 1.6}
                />
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                      className="text-[11px] font-bold text-primary leading-none tracking-tight whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
