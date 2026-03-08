import React from 'react';
import { motion } from 'framer-motion';
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
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden flex justify-center pb-safe pointer-events-none">
      <div className="liquid-glass-bar pointer-events-auto mb-2 mx-4 px-2 py-1.5 flex items-center justify-around gap-1 max-w-[280px] w-full">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center justify-center w-14 h-11 rounded-2xl transition-all duration-300 touch-item"
            >
              {isActive && (
                <motion.div
                  layoutId="liquid-pill"
                  className="absolute inset-0 rounded-2xl liquid-glass-pill"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <item.icon
                className={`relative z-10 w-[21px] h-[21px] transition-all duration-300 ${
                  isActive ? 'text-foreground scale-110' : 'text-muted-foreground'
                }`}
                strokeWidth={isActive ? 2.3 : 1.7}
              />
              {isActive && (
                <motion.span
                  initial={{ opacity: 0, y: 2 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="relative z-10 text-[9px] font-semibold text-foreground mt-0.5 leading-none"
                >
                  {item.label}
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
