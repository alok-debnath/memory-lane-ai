import React, { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface DiaryTextInputProps {
  onSubmit: (text: string) => void;
  isProcessing: boolean;
}

const DiaryTextInput: React.FC<DiaryTextInputProps> = ({ onSubmit, isProcessing }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim() || isProcessing) return;
    onSubmit(text.trim());
    setText('');
  };

  return (
    <div className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Write about your day, thoughts, feelings, or anything on your mind..."
        className="min-h-[140px] bg-secondary/40 border-0 text-[14px] rounded-xl resize-none placeholder:text-muted-foreground/50 focus-visible:ring-1 focus-visible:ring-primary/30"
        disabled={isProcessing}
      />
      <Button
        onClick={handleSubmit}
        disabled={!text.trim() || isProcessing}
        className="w-full rounded-xl"
        variant="gradient"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            AI is analyzing...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Save & Analyze
          </>
        )}
      </Button>
    </div>
  );
};

export default DiaryTextInput;
