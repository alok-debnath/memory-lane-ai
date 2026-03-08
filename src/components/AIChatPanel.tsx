import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, X, Send, Loader2, Bot, User,
  Keyboard, Brain, ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Animated voice waveform bars
const VoiceWaveform: React.FC = () => (
  <div className="flex items-center justify-center gap-[3px] h-8">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        className="w-[3px] rounded-full bg-primary"
        animate={{
          height: [8, 20 + Math.random() * 12, 8],
        }}
        transition={{
          repeat: Infinity,
          duration: 0.6 + Math.random() * 0.4,
          delay: i * 0.08,
          ease: 'easeInOut',
        }}
      />
    ))}
  </div>
);

const AIChatPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, liveTranscript]);

  useEffect(() => {
    if (open && mode === 'text' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, mode]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const sendToAI = useCallback(async (text: string) => {
    if (!text.trim() || loading || !user) return;
    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages((prev) => {
      const all = [...prev, userMsg];
      (async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke('memory-chat', {
            body: { messages: all.map((m) => ({ role: m.role, content: m.content })), userId: user.id },
          });
          if (error) throw error;
          if (data.error) {
            setMessages((p) => [...p, { role: 'assistant', content: `⚠️ ${data.error}` }]);
          } else {
            setMessages((p) => [...p, { role: 'assistant', content: data.reply }]);
            if (data.mutated) queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
          }
        } catch (err: any) {
          setMessages((p) => [...p, { role: 'assistant', content: `Something went wrong. ${err.message}` }]);
        } finally {
          setLoading(false);
        }
      })();
      return all;
    });
    setInput('');
  }, [loading, user, queryClient]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setMessages((p) => [...p, { role: 'assistant', content: "⚠️ Voice not supported here. Use Chrome/Edge or switch to text." }]);
      return;
    }
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    finalTranscriptRef.current = '';
    setLiveTranscript('');

    recognition.onresult = (e: any) => {
      let fin = '', int = '';
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (fin += t) : (int += t);
      }
      if (fin) finalTranscriptRef.current = fin;
      setLiveTranscript(fin || int);
    };
    recognition.onerror = () => { setIsListening(false); setLiveTranscript(''); if (intervalRef.current) clearInterval(intervalRef.current); };
    recognition.onend = () => {
      setIsListening(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      const t = finalTranscriptRef.current.trim();
      setLiveTranscript('');
      if (t) sendToAI(t);
    };
    recognition.start();
    setIsListening(true);
    setDuration(0);
    intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, [sendToAI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop();
  }, [isListening]);

  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const suggestions = [
    "Remember my WiFi password is starlight42",
    "What did I save about my passport?",
    "Change my dentist note to next Friday",
    "Show all my work memories",
  ];

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, rotate: -90 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 90 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50"
          >
            <button
              onClick={() => setOpen(true)}
              className="group relative h-[60px] w-[60px] rounded-full flex items-center justify-center overflow-hidden"
            >
              {/* Gradient background with animated glow */}
              <div className="absolute inset-0 btn-gradient rounded-full" />
              <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle,hsl(var(--primary)/0.4)_0%,transparent_70%)] blur-lg scale-150" />
              <Mic className="w-6 h-6 text-primary-foreground relative z-10" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 350, damping: 28 }}
            className="fixed bottom-20 right-3 sm:bottom-6 sm:right-6 z-50 
              w-[calc(100vw-1.5rem)] sm:w-[440px] h-[calc(100vh-8rem)] sm:h-[640px] max-h-[640px]
              rounded-3xl border border-border/40 bg-card/90 backdrop-blur-2xl shadow-2xl
              flex flex-col overflow-hidden"
            style={{ boxShadow: '0 25px 60px -12px hsl(220 25% 10% / 0.25), 0 0 0 1px hsl(var(--border) / 0.3)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                    <Brain className="w-5 h-5 text-primary" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-foreground text-[15px] leading-tight">Memora</h3>
                  <p className="text-[11px] text-muted-foreground leading-tight">Voice-first AI assistant</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setMode(mode === 'voice' ? 'text' : 'voice')}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                >
                  {mode === 'voice' ? <Keyboard className="w-[18px] h-[18px]" /> : <Mic className="w-[18px] h-[18px]" />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
                >
                  <X className="w-[18px] h-[18px]" />
                </button>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scroll-smooth">
              {messages.length === 0 && !isListening && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex flex-col items-center pt-4"
                >
                  {/* Hero mic visual */}
                  <div className="relative mb-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/10">
                      <Mic className="w-9 h-9 text-primary/70" />
                    </div>
                    <motion.div
                      className="absolute inset-0 rounded-full border border-primary/20"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                    />
                  </div>
                  <h4 className="font-display font-bold text-foreground text-base mb-1">
                    Hey, what's on your mind?
                  </h4>
                  <p className="text-[13px] text-muted-foreground text-center max-w-[260px] mb-6 leading-relaxed">
                    Speak or type to create, find, edit or remove any memory
                  </p>
                  <div className="w-full space-y-1.5">
                    {suggestions.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendToAI(q)}
                        className="group/s flex items-center w-full text-left text-[13px] px-4 py-2.5 rounded-2xl 
                          bg-secondary/30 text-muted-foreground 
                          hover:bg-secondary/60 hover:text-foreground 
                          transition-all duration-200 border border-transparent hover:border-border/30"
                      >
                        <span className="flex-1 truncate">"{q}"</span>
                        <ArrowDown className="w-3.5 h-3.5 rotate-[-90deg] opacity-0 group-hover/s:opacity-60 transition-opacity shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 mt-0.5 border border-primary/10">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-lg'
                        : 'bg-secondary/50 text-foreground rounded-bl-lg border border-border/20'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p:not(:last-child)]:mb-2 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>li]:text-[13px]">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-xl bg-secondary/60 flex items-center justify-center shrink-0 mt-0.5 border border-border/20">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Live transcript while listening */}
              {isListening && liveTranscript && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2.5 justify-end">
                  <div className="max-w-[78%] rounded-2xl rounded-br-lg px-4 py-2.5 text-[13px] bg-primary/15 text-foreground/80 italic border border-primary/10">
                    {liveTranscript}
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5">
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                    <Bot className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="bg-secondary/50 rounded-2xl rounded-bl-lg px-5 py-3 border border-border/20">
                    <div className="flex gap-1.5 items-center">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="w-[6px] h-[6px] rounded-full bg-primary/50"
                          animate={{ y: [0, -6, 0] }}
                          transition={{ repeat: Infinity, duration: 0.7, delay: i * 0.15, ease: 'easeInOut' }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

            {/* Input */}
            <div className="px-4 py-3">
              {mode === 'voice' ? (
                <div className="flex flex-col items-center gap-2 py-1">
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="proc"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-[52px] h-[52px] rounded-full bg-primary/10 flex items-center justify-center border border-primary/10">
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                        <span className="text-[11px] text-muted-foreground font-medium">Thinking...</span>
                      </motion.div>
                    ) : isListening ? (
                      <motion.div
                        key="listen"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="relative">
                          <motion.div
                            className="absolute inset-0 rounded-full bg-destructive/20"
                            animate={{ scale: [1, 1.4], opacity: [0.5, 0] }}
                            transition={{ repeat: Infinity, duration: 1.2, ease: 'easeOut' }}
                          />
                          <button
                            onClick={stopListening}
                            className="relative w-[52px] h-[52px] rounded-full bg-destructive flex items-center justify-center cursor-pointer z-10"
                          >
                            <Square className="w-5 h-5 text-destructive-foreground" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <VoiceWaveform />
                          <span className="text-[11px] text-muted-foreground font-mono font-medium">{fmtDur(duration)}</span>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="idle"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <motion.button
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={startListening}
                          className="w-[52px] h-[52px] rounded-full btn-gradient flex items-center justify-center cursor-pointer shadow-lg"
                          style={{ boxShadow: 'var(--shadow-soft)' }}
                        >
                          <Mic className="w-6 h-6 text-primary-foreground" />
                        </motion.button>
                        <span className="text-[11px] text-muted-foreground">Tap to speak</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendToAI(input)}
                    placeholder="Type a message..."
                    disabled={loading}
                    className="flex-1 h-11 rounded-2xl bg-secondary/40 border border-border/30 px-4 text-[13px] text-foreground placeholder:text-muted-foreground/60 
                      focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all disabled:opacity-50"
                  />
                  <button
                    onClick={() => sendToAI(input)}
                    disabled={!input.trim() || loading}
                    className="h-11 w-11 shrink-0 rounded-2xl btn-gradient flex items-center justify-center disabled:opacity-40 transition-opacity"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" /> : <Send className="w-4 h-4 text-primary-foreground" />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatPanel;
