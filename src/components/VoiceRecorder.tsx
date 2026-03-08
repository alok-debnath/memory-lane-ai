import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Square, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
  onTranscriptionComplete: (text: string) => void;
  isProcessing: boolean;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        // Convert to base64 and send for processing
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          onTranscriptionComplete(base64);
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      intervalRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch (err) {
      console.error('Microphone access denied:', err);
    }
  }, [onTranscriptionComplete]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-1"
          >
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
