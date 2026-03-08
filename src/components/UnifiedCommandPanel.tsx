import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, X, Send, Loader2, Bot, User,
  Keyboard, Brain, ArrowRight, Volume2, VolumeX,
  PenLine, LayoutTemplate, Plus, CheckCircle2, Lightbulb,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { useTTS } from '@/hooks/useTTS';
import { useToast } from '@/hooks/use-toast';
import TextNoteInput from '@/components/TextNoteInput';
import MemoryTemplates, { type MemoryTemplate } from '@/components/MemoryTemplates';
import CapsuleDatePicker from '@/components/CapsuleDatePicker';
import MemoryConflicts from '@/components/MemoryConflicts';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const VoiceWaveform: React.FC = () => (
  <div className="flex items-center justify-center gap-[3px] h-6">
    {[...Array(5)].map((_, i) => (
      <motion.div
        key={i}
        className="w-[2.5px] rounded-full bg-primary"
        animate={{ height: [6, 16 + Math.random() * 10, 6] }}
        transition={{ repeat: Infinity, duration: 0.6 + Math.random() * 0.4, delay: i * 0.08, ease: 'easeInOut' }}
      />
    ))}
  </div>
);

type Tab = 'chat' | 'note';

const UnifiedCommandPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('chat');

  // -- Chat state --
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatMode, setChatMode] = useState<'voice' | 'text'>('text');
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('memora-tts') !== 'false');

  // -- Note state --
  const [noteMode, setNoteMode] = useState<'text' | 'template'>('text');
  const [isProcessing, setIsProcessing] = useState(false);
  const [templatePrefill, setTemplatePrefill] = useState<{ text: string; category: string } | null>(null);
  const [capsuleDate, setCapsuleDate] = useState<string | null>(null);
  const [lastActions, setLastActions] = useState<any[] | null>(null);
  const [conflicts, setConflicts] = useState<any[] | null>(null);
  const [lastSavedMemory, setLastSavedMemory] = useState<{ id: string; title: string } | null>(null);

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { speak, stop, speaking } = useTTS();
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, liveTranscript]);

  useEffect(() => {
    if (open && tab === 'chat' && chatMode === 'text' && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, tab, chatMode]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('memora-tts', ttsEnabled ? 'true' : 'false');
  }, [ttsEnabled]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) { setOpen(false); stop(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, stop]);

  // ===================== CHAT LOGIC =====================
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
          const reply = data.error ? `⚠️ ${data.error}` : data.reply;
          setMessages((p) => [...p, { role: 'assistant', content: reply }]);
          if (data.mutated) queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
          if (ttsEnabled && !data.error) speak(reply);
        } catch (err: any) {
          setMessages((p) => [...p, { role: 'assistant', content: `Something went wrong. ${err.message}` }]);
        } finally {
          setLoading(false);
        }
      })();
      return all;
    });
    setInput('');
  }, [loading, user, queryClient, ttsEnabled, speak]);

  const startListening = useCallback(async () => {
    stop();
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: 'Not supported', description: 'Use Chrome, Edge, or Safari.', variant: 'destructive' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
    } catch {
      toast({ title: 'Microphone denied', description: 'Allow mic access in browser settings.', variant: 'destructive' });
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
    recognition.onerror = () => {
      setIsListening(false); setLiveTranscript('');
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
    recognition.onend = () => {
      setIsListening(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      const t = finalTranscriptRef.current.trim();
      setLiveTranscript('');
      if (t) sendToAI(t);
    };
    try {
      recognition.start();
      setIsListening(true);
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      toast({ title: 'Error', description: 'Failed to start voice.', variant: 'destructive' });
    }
  }, [sendToAI, stop, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop();
  }, [isListening]);

  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ===================== NOTE LOGIC =====================
  const resetNoteState = () => {
    setNoteMode('text');
    setIsProcessing(false);
    setTemplatePrefill(null);
    setCapsuleDate(null);
    setLastActions(null);
    setConflicts(null);
    setLastSavedMemory(null);
  };

  const processNote = async (inputText: string, categoryOverride?: string) => {
    setIsProcessing(true);
    setLastActions(null);
    setConflicts(null);
    try {
      const { data, error } = await supabase.functions.invoke('process-memory', {
        body: { input: inputText, isAudio: false },
      });
      if (error) throw error;

      const insertPayload: any = {
        title: data.title,
        content: data.content,
        reminder_date: data.reminder_date || null,
        is_recurring: data.is_recurring || false,
        recurrence_type: data.recurrence_type || null,
        category: categoryOverride || data.category || 'other',
        user_id: user!.id,
        mood: data.mood || null,
        extracted_actions: data.extracted_actions || null,
        capsule_unlock_date: capsuleDate ? new Date(capsuleDate).toISOString() : null,
        tags: data.tags || [],
      };
      if (data.embedding) insertPayload.embedding = data.embedding;

      const { data: insertedRows, error: insertError } = await supabase
        .from('memory_notes')
        .insert(insertPayload)
        .select('id, title')
        .single();
      if (insertError) throw insertError;

      queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
      const savedId = insertedRows.id;
      const savedTitle = insertedRows.title;
      setLastSavedMemory({ id: savedId, title: savedTitle });

      const actions = data.extracted_actions;
      if (actions && actions.length > 0) {
        setLastActions(actions);
        toast({ title: '✨ Memory saved!', description: `${savedTitle} — ${actions.length} action${actions.length !== 1 ? 's' : ''} extracted` });
      } else {
        toast({ title: 'Memory saved!', description: savedTitle });
        // Auto-close after short delay if no actions
        setTimeout(() => { setOpen(false); resetNoteState(); }, 600);
      }

      supabase.functions.invoke('detect-conflicts', {
        body: { memoryId: savedId, content: data.content, title: savedTitle, userId: user!.id },
      }).then(({ data: conflictData }) => {
        if (conflictData?.conflicts?.length > 0) setConflicts(conflictData.conflicts);
      }).catch(() => {});

      setTemplatePrefill(null);
      setCapsuleDate(null);
    } catch (err: any) {
      console.error('Process error:', err);
      toast({ title: 'Error', description: err.message || 'Failed to process memory', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTemplateSelect = (template: MemoryTemplate) => {
    setTemplatePrefill({ text: template.prefill, category: template.category });
    setNoteMode('text');
  };

  const handleClose = () => {
    setOpen(false);
    stop();
    resetNoteState();
  };

  const suggestions = [
    "Remember my WiFi password is starlight42",
    "What did I save about my passport?",
    "Show all my work memories",
  ];

  return (
    <>
      {/* FAB */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[72px] right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 rounded-full btn-gradient flex items-center justify-center lg:bottom-6"
            style={{ boxShadow: '0 4px 20px -4px hsl(36 85% 52% / 0.4)' }}
          >
            <Plus className="w-6 h-6 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm sm:hidden"
              onClick={handleClose}
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed z-50
                inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6
                w-full sm:w-[420px] lg:w-[460px]
                h-[85vh] sm:h-[620px] lg:h-[680px]
                sm:rounded-2xl rounded-t-2xl
                bg-card border border-border/50 sm:border
                flex flex-col overflow-hidden"
              style={{ boxShadow: 'var(--shadow-lg)' }}
            >
              {/* Mobile handle */}
              <div className="flex justify-center pt-2 pb-0 sm:hidden">
                <div className="w-9 h-1 rounded-full bg-border" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-semibold text-foreground leading-tight">Memora</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      {tab === 'chat' ? 'Ask anything about your memories' : 'Create a new memory'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {tab === 'chat' && (
                    <>
                      <button
                        onClick={() => { setTtsEnabled((v) => !v); if (speaking) stop(); }}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                          ttsEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => setChatMode(chatMode === 'voice' ? 'text' : 'voice')}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all"
                      >
                        {chatMode === 'voice' ? <Keyboard className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                    </>
                  )}
                  <button
                    onClick={handleClose}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Tab switcher */}
              <div className="px-4 pb-2">
                <div className="flex bg-secondary/40 rounded-xl p-0.5">
                  {([
                    { key: 'chat' as Tab, icon: Brain, label: 'AI Chat' },
                    { key: 'note' as Tab, icon: PenLine, label: 'New Memory' },
                  ]).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setTab(t.key)}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                        tab === t.key ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {tab === t.key && (
                        <motion.div
                          layoutId="unified-tab-pill"
                          className="absolute inset-0 bg-background rounded-xl shadow-sm"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <t.icon className="w-4 h-4 relative z-10" />
                      <span className="relative z-10">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-border/50" />

              {/* Content */}
              <AnimatePresence mode="wait">
                {tab === 'chat' ? (
                  <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col flex-1 min-h-0">
                    {/* Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                      {messages.length === 0 && !isListening && (
                        <div className="flex flex-col items-center pt-8">
                          <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
                            <Brain className="w-7 h-7 text-primary/60" />
                          </div>
                          <h4 className="text-[15px] font-semibold text-foreground mb-1">What's on your mind?</h4>
                          <p className="text-[12px] text-muted-foreground text-center max-w-[240px] mb-5">
                            Create, find, edit or remove any memory
                          </p>
                          <div className="w-full space-y-1">
                            {suggestions.map((q) => (
                              <button
                                key={q}
                                onClick={() => sendToAI(q)}
                                className="flex items-center w-full text-left text-[13px] px-3.5 py-2.5 rounded-xl
                                  bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground
                                  transition-all active:scale-[0.98]"
                              >
                                <span className="flex-1 truncate">"{q}"</span>
                                <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0 ml-2" />
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
                            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <Bot className="w-3 h-3 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                              msg.role === 'user'
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-secondary/60 text-foreground rounded-bl-md'
                            }`}
                          >
                            {msg.role === 'assistant' ? (
                              <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p:not(:last-child)]:mb-1.5 [&>ul]:my-1 [&>ol]:my-1 [&>li]:text-[13px]">
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                              </div>
                            ) : msg.content}
                            {msg.role === 'assistant' && ttsEnabled && (
                              <button
                                onClick={() => speaking ? stop() : speak(msg.content)}
                                className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                              >
                                {speaking ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                                {speaking ? 'Stop' : 'Listen'}
                              </button>
                            )}
                          </div>
                          {msg.role === 'user' && (
                            <div className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                              <User className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </motion.div>
                      ))}

                      {isListening && liveTranscript && (
                        <div className="flex gap-2 justify-end">
                          <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] bg-primary/10 text-foreground/70 italic">
                            {liveTranscript}
                          </div>
                        </div>
                      )}

                      {loading && (
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="w-3 h-3 text-primary" />
                          </div>
                          <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1 items-center">
                              {[0, 1, 2].map((j) => (
                                <motion.span
                                  key={j}
                                  className="w-1.5 h-1.5 rounded-full bg-primary/40"
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ repeat: Infinity, duration: 0.6, delay: j * 0.12 }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* Chat Input */}
                    <div className="px-3 py-2.5 pb-safe">
                      {chatMode === 'voice' ? (
                        <div className="flex flex-col items-center gap-1.5 py-1">
                          <AnimatePresence mode="wait">
                            {loading ? (
                              <motion.div key="proc" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex flex-col items-center gap-1.5">
                                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                </div>
                                <span className="text-[11px] text-muted-foreground">Thinking...</span>
                              </motion.div>
                            ) : isListening ? (
                              <motion.div key="listen" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center gap-1.5">
                                <motion.button
                                  onClick={stopListening}
                                  className="relative w-12 h-12 rounded-full bg-destructive flex items-center justify-center"
                                >
                                  <Square className="w-4 h-4 text-destructive-foreground" />
                                </motion.button>
                                <div className="flex items-center gap-2">
                                  <VoiceWaveform />
                                  <span className="text-[11px] text-muted-foreground font-mono">{fmtDur(duration)}</span>
                                </div>
                              </motion.div>
                            ) : (
                              <motion.div key="idle" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} className="flex flex-col items-center gap-1.5">
                                <motion.button
                                  whileTap={{ scale: 0.92 }}
                                  onClick={startListening}
                                  className="w-12 h-12 rounded-full btn-gradient flex items-center justify-center"
                                >
                                  <Mic className="w-5 h-5 text-primary-foreground" />
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
                            className="flex-1 h-10 rounded-xl bg-secondary/50 border-0 px-3.5 text-[13px] text-foreground placeholder:text-muted-foreground/50
                              focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50"
                          />
                          <button
                            onClick={() => sendToAI(input)}
                            disabled={!input.trim() || loading}
                            className="h-10 w-10 shrink-0 rounded-xl btn-gradient flex items-center justify-center disabled:opacity-40"
                          >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" /> : <Send className="w-4 h-4 text-primary-foreground" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
                    {/* Note mode toggle */}
                    <div className="flex bg-secondary/40 rounded-xl p-0.5">
                      {([
                        { key: 'text' as const, icon: PenLine, label: 'Type' },
                        { key: 'template' as const, icon: LayoutTemplate, label: 'Template' },
                      ]).map((m) => (
                        <button
                          key={m.key}
                          onClick={() => setNoteMode(m.key)}
                          className={`relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[13px] font-medium transition-all ${
                            noteMode === m.key ? 'text-foreground' : 'text-muted-foreground'
                          }`}
                        >
                          {noteMode === m.key && (
                            <motion.div
                              layoutId="note-mode-pill"
                              className="absolute inset-0 bg-background rounded-xl shadow-sm"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <m.icon className="w-4 h-4 relative z-10" />
                          <span className="relative z-10">{m.label}</span>
                        </button>
                      ))}
                    </div>

                    <CapsuleDatePicker value={capsuleDate} onChange={setCapsuleDate} />

                    <AnimatePresence mode="wait">
                      {noteMode === 'template' ? (
                        <motion.div key="template" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <MemoryTemplates onSelect={handleTemplateSelect} />
                        </motion.div>
                      ) : (
                        <motion.div key="text" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <TextNoteInput
                            onSubmit={(text) => processNote(text, templatePrefill?.category)}
                            isProcessing={isProcessing}
                            defaultValue={templatePrefill?.text}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Extracted Actions */}
                    {lastActions && lastActions.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="native-card-elevated p-4 space-y-2">
                        <p className="text-[13px] font-semibold text-foreground flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          Extracted Actions
                        </p>
                        {lastActions.map((action: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            <span className="text-primary">•</span>
                            <span>{action.text}</span>
                            <span className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md capitalize">{action.type}</span>
                          </div>
                        ))}
                        <button onClick={handleClose} className="text-[13px] text-primary font-medium mt-2">
                          Done →
                        </button>
                      </motion.div>
                    )}

                    {conflicts && conflicts.length > 0 && lastSavedMemory && (
                      <MemoryConflicts
                        conflicts={conflicts}
                        newMemoryId={lastSavedMemory.id}
                        newMemoryTitle={lastSavedMemory.title}
                        onDismiss={handleClose}
                      />
                    )}

                    {/* Tips */}
                    <div className="native-card p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[12px] font-semibold text-foreground">Tips</span>
                      </div>
                      <ul className="space-y-1 text-[12px] text-muted-foreground">
                        <li>• "Remind me to renew my passport on March 15 every year"</li>
                        <li>• "WiFi password for the office is starlight42"</li>
                        <li>• Enable Time Capsule to lock a memory until a future date 🔒</li>
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default UnifiedCommandPanel;
