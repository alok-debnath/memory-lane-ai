import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TextNoteInputProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
}

const TextNoteInput: React.FC<TextNoteInputProps> = ({ onSubmit, isProcessing }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (text.trim()) {
      onSubmit(text.trim());
      setText('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-4"
    >
      <div className="flex items-start gap-3">
        <PenLine className="w-5 h-5 text-muted-foreground mt-2.5 shrink-0" />
        <div className="flex-1">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a memory note... e.g. 'Remind me to renew my passport on March 15 every year'"
            className="min-h-[80px] bg-transparent border-0 resize-none focus-visible:ring-0 p-0 text-foreground placeholder:text-muted-foreground/60"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
            }}
          />
        </div>
        <Button
          variant="gradient"
          size="icon"
          onClick={handleSubmit}
          disabled={!text.trim() || isProcessing}
          className="shrink-0 mt-1"
        >
          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </motion.div>
  );
};

export default TextNoteInput;
