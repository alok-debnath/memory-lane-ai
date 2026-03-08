import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isProcessing: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const recognitionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const transcriptRef = useRef('');
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        title: 'Not supported',
        description: 'Speech recognition requires Chrome, Edge, or Safari. Please use one of those browsers.',
        variant: 'destructive',
      });
      return;
    }

    // Request microphone permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we just needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access in your browser settings to use voice recording.',
        variant: 'destructive',
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;
    transcriptRef.current = '';

    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      transcriptRef.current = transcript;
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast({
          title: 'Microphone blocked',
          description: 'Please enable microphone access in your browser settings.',
          variant: 'destructive',
        });
      }
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (transcriptRef.current.trim()) {
        onTranscriptionComplete(transcriptRef.current.trim());
      }
    };

    try {
      recognition.start();
      setIsRecording(true);
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error('Failed to start recognition:', err);
      toast({
        title: 'Error',
        description: 'Failed to start voice recognition. Please try again.',
        variant: 'destructive',
      });
    }
  }, [onTranscriptionComplete, toast]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isRecording]);

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <AnimatePresence mode="wait">
        {isProcessing ? (
          <motion.div
            key="processing"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-accent flex items-center justify-center"
          >
            <Sparkles className="w-10 h-10 text-primary animate-pulse" />
          </motion.div>
        ) : isRecording ? (
          <motion.button
            key="recording"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            onClick={stopRecording}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-destructive flex items-center justify-center cursor-pointer pulse-ring"
          >
            <Square className="w-8 h-8 text-destructive-foreground" />
          </motion.button>
        ) : (
          <motion.button
            key="idle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={startRecording}
            className="w-28 h-28 sm:w-32 sm:h-32 rounded-full btn-gradient flex items-center justify-center cursor-pointer"
          >
            <Mic className="w-10 h-10 text-primary-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      <div className="text-center">
        {isRecording && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <p className="text-2xl font-display font-bold text-foreground">{formatDuration(duration)}</p>
            <p className="text-sm text-muted-foreground">Recording... Tap to stop</p>
          </motion.div>
        )}
        {isProcessing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <p className="text-sm">AI is processing your memory...</p>
          </motion.div>
        )}
        {!isRecording && !isProcessing && (
          <p className="text-muted-foreground text-sm">Tap the microphone to start speaking</p>
        )}
      </div>
    </div>
  );
};

export default VoiceRecorder;
