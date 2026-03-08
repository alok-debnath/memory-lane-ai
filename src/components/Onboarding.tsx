import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Brain, Search, Pencil, X, ChevronRight } from 'lucide-react';

const steps = [
  {
    icon: Mic,
    title: 'Voice-First',
    description: 'Tap the microphone button and speak naturally to create memories, set reminders, or ask questions.',
  },
  {
    icon: Brain,
    title: 'AI-Powered',
    description: 'Memora understands context. Say "remember my dentist is Dr. Smith" and it organizes everything for you.',
  },
  {
    icon: Search,
    title: 'Smart Search',
    description: 'Find anything by meaning, not just keywords. Ask "what was that restaurant I liked?" and Memora finds it.',
  },
  {
    icon: Pencil,
    title: 'Voice Editing',
    description: 'Edit any memory with your voice. Say "change my WiFi password to newpass123" and it updates instantly.',
  },
];

const Onboarding: React.FC = () => {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem('memora-onboarded');
    if (!seen) setShow(true);
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('memora-onboarded', 'true');
  };

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
    else dismiss();
  };

  if (!show) return null;

  const current = steps[step];
  const Icon = current.icon;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-xl flex items-center justify-center p-6"
        >
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="w-full max-w-sm glass-card-elevated p-8 text-center relative"
          >
            <button
              onClick={dismiss}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-6 border border-primary/10">
              <Icon className="w-9 h-9 text-primary" />
            </div>

            <h2 className="font-display font-bold text-foreground text-xl mb-2">{current.title}</h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8">{current.description}</p>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              className="w-full h-12 rounded-2xl btn-gradient flex items-center justify-center gap-2 text-sm font-semibold"
            >
              {step < steps.length - 1 ? (
                <>
                  Next <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                "Get Started"
              )}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Onboarding;
