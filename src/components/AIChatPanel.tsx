import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Square, X, Send, Loader2, Bot, User,
  Keyboard, Brain, ArrowRight, Volume2, VolumeX,
  Trash2, Paperclip, Image,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useAIChat, ChatAttachment } from '@/hooks/useAIChat';
import { useVoiceInput } from '@/hooks/useVoiceInput';

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

const AIChatPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  const [input, setInput] = useState('');
  const [pendingFiles, setPendingFiles] = useState<{ file: File; preview?: string }[]>([]);

  const {
    messages, loading, streaming, ttsEnabled, speaking,
    sendMessage, clearChat, uploadFile, toggleTTS, speak, stop,
  } = useAIChat();

  const voiceInput = useVoiceInput((text) => sendMessage(text));

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, voiceInput.liveTranscript]);

  useEffect(() => {
    if (open && mode === 'text' && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open, mode]);

  useEffect(() => voiceInput.cleanup, [voiceInput.cleanup]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) { setOpen(false); stop(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, stop]);

  const handleSend = async () => {
    if (!input.trim() && !pendingFiles.length) return;
    let attachments: ChatAttachment[] | undefined;
    if (pendingFiles.length) {
      const uploaded = await Promise.all(pendingFiles.map(f => uploadFile(f.file)));
      attachments = uploaded.filter(Boolean) as ChatAttachment[];
      pendingFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
      setPendingFiles([]);
    }
    await sendMessage(input || 'Please process these files and save as memories.', attachments);
    setInput('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [
      ...prev,
      ...files.map(file => ({
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      })),
    ]);
    e.target.value = '';
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => {
      const f = prev[index];
      if (f.preview) URL.revokeObjectURL(f.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const fmtDur = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

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
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-[72px] right-4 sm:bottom-6 sm:right-6 z-50 h-14 w-14 rounded-full btn-gradient flex items-center justify-center lg:bottom-6"
          >
            <Mic className="w-6 h-6 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      <input
        type="file" ref={fileInputRef} onChange={handleFileSelect}
        multiple accept="image/*,.pdf,.doc,.docx,.txt"
        className="hidden"
      />

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/40 backdrop-blur-sm sm:hidden"
              onClick={() => { setOpen(false); stop(); }}
            />
            <motion.div
              initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed z-50 inset-x-0 bottom-0 sm:inset-auto sm:bottom-6 sm:right-6
                w-full sm:w-[420px] lg:w-[460px] h-[85vh] sm:h-[620px] lg:h-[680px]
                sm:rounded-2xl rounded-t-2xl bg-card border border-border/50 sm:border
                flex flex-col overflow-hidden"
              style={{ boxShadow: 'var(--shadow-lg)' }}
            >
              {/* Handle (mobile) */}
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
                    <h3 className="text-[14px] font-semibold text-foreground leading-tight">Memora AI</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">Always listening</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={toggleTTS}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all ${
                      ttsEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-secondary'
                    }`}>
                    {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setMode(mode === 'voice' ? 'text' : 'voice')}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all">
                    {mode === 'voice' ? <Keyboard className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                  {messages.length > 0 && (
                    <button onClick={clearChat}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
                      title="Clear conversation">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setOpen(false); stop(); }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="h-px bg-border/50" />

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                {messages.length === 0 && !voiceInput.isListening && (
                  <div className="flex flex-col items-center pt-8">
                    <div className="w-16 h-16 rounded-2xl bg-primary/8 flex items-center justify-center mb-4">
                      <Mic className="w-7 h-7 text-primary/60" />
                    </div>
                    <h4 className="text-[15px] font-semibold text-foreground mb-1">What's on your mind?</h4>
                    <p className="text-[12px] text-muted-foreground text-center max-w-[240px] mb-5">
                      Create, find, edit or remove any memory
                    </p>
                    <div className="w-full space-y-1">
                      {suggestions.map(q => (
                        <button key={q} onClick={() => sendMessage(q)}
                          className="flex items-center w-full text-left text-[13px] px-3.5 py-2.5 rounded-xl
                            bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground
                            transition-all active:scale-[0.98]">
                          <span className="flex-1 truncate">"{q}"</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-40 shrink-0 ml-2" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3 h-3 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-md'
                        : 'bg-secondary/60 text-foreground rounded-bl-md'
                    }`}>
                      {msg.attachments?.length ? (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {msg.attachments.map((a, j) => (
                            <div key={j} className="flex items-center gap-1 text-[11px] opacity-80 bg-background/20 rounded-lg px-2 py-1">
                              {a.type.startsWith('image/') ? <Image className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                              <span className="truncate max-w-[100px]">{a.name}</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>p:not(:last-child)]:mb-1.5 [&>ul]:my-1 [&>ol]:my-1 [&>li]:text-[13px]">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : msg.content}
                      {msg.role === 'assistant' && ttsEnabled && !streaming && (
                        <button onClick={() => speaking ? stop() : speak(msg.content)}
                          className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors">
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

                {voiceInput.isListening && voiceInput.liveTranscript && (
                  <div className="flex gap-2 justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-md px-3.5 py-2.5 text-[13px] bg-primary/10 text-foreground/70 italic">
                      {voiceInput.liveTranscript}
                    </div>
                  </div>
                )}

                {loading && !streaming && (
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-3 h-3 text-primary" />
                    </div>
                    <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-3">
                      <div className="flex gap-1 items-center">
                        {[0, 1, 2].map(i => (
                          <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-primary/40"
                            animate={{ y: [0, -4, 0] }}
                            transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.12 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-px bg-border/50" />

              {/* Pending files preview */}
              {pendingFiles.length > 0 && (
                <div className="px-3 pt-2 flex flex-wrap gap-1.5">
                  {pendingFiles.map((f, i) => (
                    <div key={i} className="relative group">
                      {f.preview ? (
                        <img src={f.preview} alt={f.file.name}
                          className="w-12 h-12 rounded-lg object-cover border border-border/50" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-secondary/60 border border-border/50 flex items-center justify-center">
                          <Paperclip className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <button onClick={() => removePendingFile(i)}
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="px-3 py-2.5 pb-safe">
                {mode === 'voice' ? (
                  <div className="flex flex-col items-center gap-1.5 py-1">
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.div key="proc" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1.5">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="w-5 h-5 text-primary animate-spin" />
                          </div>
                          <span className="text-[11px] text-muted-foreground">Thinking...</span>
                        </motion.div>
                      ) : voiceInput.isListening ? (
                        <motion.div key="listen" initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                          className="flex flex-col items-center gap-1.5">
                          <motion.button onClick={voiceInput.stop}
                            className="relative w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
                            <Square className="w-4 h-4 text-destructive-foreground" />
                          </motion.button>
                          <div className="flex items-center gap-2">
                            <VoiceWaveform />
                            <span className="text-[11px] text-muted-foreground font-mono">{fmtDur(voiceInput.duration)}</span>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="idle" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                          className="flex flex-col items-center gap-1.5">
                          <motion.button whileTap={{ scale: 0.92 }} onClick={() => { stop(); voiceInput.start(); }}
                            className="w-12 h-12 rounded-full btn-gradient flex items-center justify-center">
                            <Mic className="w-5 h-5 text-primary-foreground" />
                          </motion.button>
                          <span className="text-[11px] text-muted-foreground">Tap to speak</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex gap-2 items-center">
                    <button onClick={() => fileInputRef.current?.click()} disabled={loading}
                      className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary transition-all disabled:opacity-40">
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSend()}
                      placeholder="Type a message..." disabled={loading || streaming}
                      className="flex-1 h-10 rounded-xl bg-secondary/50 border-0 px-3.5 text-[13px] text-foreground placeholder:text-muted-foreground/50
                        focus:outline-none focus:ring-1 focus:ring-primary/30 transition-all disabled:opacity-50" />
                    <button onClick={handleSend}
                      disabled={(!input.trim() && !pendingFiles.length) || loading || streaming}
                      className="h-10 w-10 shrink-0 rounded-xl btn-gradient flex items-center justify-center disabled:opacity-40">
                      {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary-foreground" /> : <Send className="w-4 h-4 text-primary-foreground" />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatPanel;
