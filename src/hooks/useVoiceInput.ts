import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export function useVoiceInput(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [duration, setDuration] = useState(0);
  const recognitionRef = useRef<any>(null);
  const finalTranscriptRef = useRef('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const start = useCallback(async () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast({ title: 'Not supported', description: 'Use Chrome, Edge, or Safari.', variant: 'destructive' });
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
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
      setIsListening(false);
      setLiveTranscript('');
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      const t = finalTranscriptRef.current.trim();
      setLiveTranscript('');
      if (t) onResult(t);
    };

    try {
      recognition.start();
      setIsListening(true);
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      toast({ title: 'Error', description: 'Failed to start voice.', variant: 'destructive' });
    }
  }, [onResult, toast]);

  const stop = useCallback(() => {
    if (recognitionRef.current && isListening) recognitionRef.current.stop();
  }, [isListening]);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) { try { recognitionRef.current.abort(); } catch {} }
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  return { isListening, liveTranscript, duration, start, stop, cleanup };
}
