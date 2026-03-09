import React, { useState } from 'react';
import { Info, X, Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { PAGE_INFO } from '@/constants/pageInfo';
import { motion, AnimatePresence } from 'framer-motion';

const PageInfoButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const info = PAGE_INFO[location.pathname];

  if (!info) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-7 h-7 rounded-full bg-secondary/80 flex items-center justify-center hover:bg-secondary transition-colors"
        aria-label="Page info"
      >
        <Info className="w-3.5 h-3.5 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-50"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed inset-x-4 top-20 z-50 mx-auto max-w-md native-card-elevated p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-base font-display font-bold text-foreground">{info.title}</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">{info.description}</p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-secondary/60 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="space-y-2 mt-4">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-primary" />
                  Features
                </p>
                {info.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <p className="text-[12px] text-foreground/80 leading-relaxed">{feature}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default PageInfoButton;
