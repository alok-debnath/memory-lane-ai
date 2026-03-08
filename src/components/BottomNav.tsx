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
      <div className="liquid-glass-bar pointer-events-auto mb-3 mx-auto px-3 py-2 flex items-center justify-around gap-0.5" style={{ width: 'min(80vw, 300px)', borderRadius: '28px' }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center flex-1 h-12 rounded-[16px] transition-all duration-200 active:scale-[0.92]"
            >
              {isActive && (
                <motion.div
                  layoutId="liquid-glass-pill"
                  className="absolute inset-0.5 rounded-[14px] liquid-glass-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35, mass: 0.8 }}
                />
              )}
              <motion.div
                animate={{ y: isActive ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="relative z-10 flex flex-col items-center"
              >
                <item.icon
                  className={`w-[20px] h-[20px] transition-all duration-200 ${
                    isActive ? 'text-primary drop-shadow-[0_0_6px_hsl(var(--primary)/0.4)]' : 'text-muted-foreground'
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.6}
                  fill={isActive ? 'hsl(var(--primary) / 0.15)' : 'none'}
                />
                <AnimatePresence>
                  {isActive && (
                    <motion.span
                      initial={{ opacity: 0, height: 0, y: 4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 4 }}
                      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                      className="text-[9px] font-bold text-primary mt-0.5 leading-none tracking-wide"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
