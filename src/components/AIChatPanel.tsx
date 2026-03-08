import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, X, Send, Loader2, Bot, User, Sparkles,
  Keyboard, Brain,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
      inputRef.current.focus();
    }
  }, [open, mode]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch {}
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const sendToAI = useCallback(async (text: string) => {
    if (!text.trim() || loading || !user) return;

    const userMsg: Message = { role: 'user', content: text.trim() };
    setMessages((prev) => {
      const allMessages = [...prev, userMsg];
      // Fire async request
      (async () => {
        setLoading(true);
        try {
          const { data, error } = await supabase.functions.invoke('memory-chat', {
            body: {
              messages: allMessages.map((m) => ({ role: m.role, content: m.content })),
              userId: user.id,
            },
          });

          if (error) throw error;

          if (data.error) {
            setMessages((p) => [...p, { role: 'assistant', content: `⚠️ ${data.error}` }]);
          } else {
            setMessages((p) => [...p, { role: 'assistant', content: data.reply }]);
            if (data.mutated) {
              queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
            }
          }
        } catch (err: any) {
          setMessages((p) => [
            ...p,
            { role: 'assistant', content: `Sorry, something went wrong: ${err.message}` },
          ]);
        } finally {
          setLoading(false);
        }
      })();
      return allMessages;
    });
    setInput('');
  }, [loading, user, queryClient]);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "⚠️ Speech recognition isn't supported in this browser. Please use Chrome or Edge, or switch to text mode." },
      ]);
      return;
    }

    const recognition = new SpeechRecognition();
    // Use non-continuous mode to avoid duplication — one utterance per tap
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    finalTranscriptRef.current = '';
    setLiveTranscript('');

    recognition.onresult = (event: any) => {
      let finalText = '';
      let interimText = '';
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript;
        } else {
          interimText += transcript;
        }
      }
      if (finalText) {
        finalTranscriptRef.current = finalText;
      }
      setLiveTranscript(finalText || interimText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech error:', event.error);
      setIsListening(false);
      setLiveTranscript('');
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      const text = finalTranscriptRef.current.trim();
      setLiveTranscript('');
      if (text) {
        sendToAI(text);
      }
    };

    recognition.start();
    setIsListening(true);
    setDuration(0);
    intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
  }, [sendToAI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* FAB - Large mic button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50"
          >
            <button
              onClick={() => setOpen(true)}
              className="h-16 w-16 rounded-full shadow-xl btn-gradient flex items-center justify-center"
            >
              <Mic className="w-7 h-7 text-primary-foreground" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[600px] sm:h-[620px] glass-card-elevated flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground text-sm">Memora AI</h3>
                  <p className="text-xs text-muted-foreground">Your voice-first memory hub</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMode(mode === 'voice' ? 'text' : 'voice')}
                  className="h-8 w-8"
                  title={mode === 'voice' ? 'Switch to text' : 'Switch to voice'}
                >
                  {mode === 'voice' ? <Keyboard className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {messages.length === 0 && !isListening && (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mic className="w-8 h-8 text-primary" />
                  </div>
                  <h4 className="font-display font-semibold text-foreground text-sm mb-1">
                    Your single hub for everything
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">
                    Speak or type to create, search, edit, or delete memories
                  </p>
                  <div className="space-y-2">
                    {[
                      "Remember my WiFi password is starlight42",
                      "What did I save about my passport?",
                      "Change my dentist note to next Friday",
                      "Delete the old grocery list",
                      "Show all my work memories",
                    ].map((q) => (
                      <button
                        key={q}
                        onClick={() => sendToAI(q)}
                        className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                      >
                        "{q}"
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary/70 text-foreground rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3 h-3 text-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Live transcript */}
              {isListening && liveTranscript && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2 justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-br-md px-3 py-2 text-sm bg-primary/20 text-foreground italic">
                    {liveTranscript}
                  </div>
                </motion.div>
              )}

              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-primary" />
                  </div>
                  <div className="bg-secondary/70 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input Area */}
            <div className="px-3 py-3 border-t border-border/50">
              {mode === 'voice' ? (
                <div className="flex flex-col items-center gap-2">
                  <AnimatePresence mode="wait">
                    {loading ? (
                      <motion.div
                        key="processing"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        className="w-14 h-14 rounded-full bg-accent flex items-center justify-center"
                      >
                        <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                      </motion.div>
                    ) : isListening ? (
                      <motion.button
                        key="listening"
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        onClick={stopListening}
                        className="w-14 h-14 rounded-full bg-destructive flex items-center justify-center cursor-pointer pulse-ring"
                      >
                        <Square className="w-5 h-5 text-destructive-foreground" />
                      </motion.button>
                    ) : (
                      <motion.button
                        key="idle"
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={startListening}
                        className="w-14 h-14 rounded-full btn-gradient flex items-center justify-center cursor-pointer"
                      >
                        <Mic className="w-6 h-6 text-primary-foreground" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                  <p className="text-xs text-muted-foreground">
                    {isListening
                      ? `Listening... ${formatDuration(duration)} · tap to send`
                      : loading
                        ? 'Processing...'
                        : 'Tap to speak'}
                  </p>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendToAI(input)}
                    placeholder="Type your message..."
                    className="h-10 rounded-xl bg-secondary/50 border-border/50 text-sm"
                    disabled={loading}
                  />
                  <Button
                    onClick={() => sendToAI(input)}
                    disabled={!input.trim() || loading}
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-xl"
                    variant="gradient"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </Button>
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
