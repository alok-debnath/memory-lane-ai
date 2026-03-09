import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeEdge } from '@/lib/invokeEdge';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useTTS } from '@/hooks/useTTS';
import { useToast } from '@/hooks/use-toast';

export interface ChatAttachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: ChatAttachment[];
}

export function useAIChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string>(() =>
    localStorage.getItem('memora-conv-id') || crypto.randomUUID()
  );
  const [ttsEnabled, setTtsEnabled] = useState(() => localStorage.getItem('memora-tts') !== 'false');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { speak, stop, speaking } = useTTS();
  const { toast } = useToast();
  const streamIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    localStorage.setItem('memora-conv-id', conversationId);
  }, [conversationId]);

  useEffect(() => {
    localStorage.setItem('memora-tts', ttsEnabled ? 'true' : 'false');
  }, [ttsEnabled]);

  // Load chat history
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;
    const load = async () => {
      try {
        const { data } = await (supabase as any).from('chat_messages')
          .select('role, content, attachments')
          .eq('user_id', user.id)
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })
          .limit(100);
        if (data?.length) {
          setMessages(data.map((m: any) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
            attachments: m.attachments || [],
          })));
        }
      } catch {
        // Table may not exist yet
      }
    };
    load();
  }, [user, conversationId]);

  const saveMessage = useCallback(async (msg: ChatMessage) => {
    if (!user) return;
    try {
      await (supabase as any).from('chat_messages').insert({
        user_id: user.id,
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        attachments: msg.attachments || [],
      });
    } catch {
      // Silently fail if table not ready
    }
  }, [user, conversationId]);

  const revealText = useCallback((fullText: string, onComplete?: () => void) => {
    setStreaming(true);
    let i = 0;
    const chunkSize = Math.max(2, Math.floor(fullText.length / 60));

    streamIntervalRef.current = setInterval(() => {
      i += chunkSize;
      if (i >= fullText.length) {
        i = fullText.length;
        if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
        setStreaming(false);
        onComplete?.();
      }
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant') {
          return [...prev.slice(0, -1), { ...last, content: fullText.slice(0, i) }];
        }
        return [...prev, { role: 'assistant', content: fullText.slice(0, i) }];
      });
    }, 12);
  }, []);

  const sendMessage = useCallback(async (text: string, attachments?: ChatAttachment[]) => {
    if (!text.trim() || loading || !user) return;
    stop();

    const userMsg: ChatMessage = { role: 'user', content: text.trim(), attachments };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveMessage(userMsg);
    setLoading(true);

    try {
      const { data, error } = await invokeEdge('memory-chat', {
        messages: newMessages.map(m => ({
          role: m.role,
          content: m.role === 'user' && m.attachments?.length
            ? `${m.content}\n\n${m.attachments.map(a => `[Attached file: ${a.name} (${a.type}) — URL: ${a.url}]`).join('\n')}`
            : m.content,
        })),
        userId: user.id,
      });

      if (error) throw error;
      const reply = data.error ? `⚠️ ${data.error}` : data.reply;
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply };

      revealText(reply, () => {
        saveMessage(assistantMsg);
        if (ttsEnabled && !data.error) speak(reply);
      });

      if (data.mutated) queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
    } catch (err: any) {
      const errorMsg: ChatMessage = { role: 'assistant', content: `Something went wrong. ${err.message}` };
      setMessages(prev => [...prev, errorMsg]);
      saveMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [loading, user, messages, queryClient, ttsEnabled, speak, stop, saveMessage, revealText]);

  const uploadFile = useCallback(async (file: File): Promise<ChatAttachment | null> => {
    if (!user) return null;
    const path = `chat/${user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from('memory-attachments').upload(path, file);
    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    }
    const { data: urlData } = supabase.storage.from('memory-attachments').getPublicUrl(path);
    return { url: urlData.publicUrl, name: file.name, type: file.type, size: file.size };
  }, [user, toast]);

  const clearChat = useCallback(async () => {
    stop();
    if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    setMessages([]);
    setStreaming(false);
    if (user) {
      try {
        await (supabase as any).from('chat_messages').delete()
          .eq('user_id', user.id)
          .eq('conversation_id', conversationId);
      } catch {}
    }
    const newId = crypto.randomUUID();
    setConversationId(newId);
    loadedRef.current = false;
  }, [user, conversationId, stop]);

  const toggleTTS = useCallback(() => {
    setTtsEnabled(v => !v);
    if (speaking) stop();
  }, [speaking, stop]);

  return {
    messages, loading, streaming, ttsEnabled, speaking,
    sendMessage, clearChat, uploadFile, toggleTTS, speak, stop,
  };
}
