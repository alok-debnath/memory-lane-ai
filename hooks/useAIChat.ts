import { useState } from 'react';
import { useMutation, useAction } from 'convex/react';
import { api } from '../convex/_generated/api';
import { useAuthStore } from '../store/authStore';

export function useAIChat() {
  const { userId } = useAuthStore();
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const qId = userId || "js93nf8201hns";

  // Calls the convex action that acts as an AI conversational agent
  const sendChatMessage = useAction(api.actions.memoryChat);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage = { role: 'user' as const, content };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const response = await sendChatMessage({
        userId: qId as any,
        message: content,
        history: messages,
      });

      if (response?.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I couldn't process that request." }]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred connecting to the AI." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return { messages, sendMessage, isTyping };
}
