import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, ArrowRight, Check, X, Merge, Eye, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Conflict {
  existing_memory_id: string;
  existing_memory_title: string;
  conflict_type: 'factual' | 'decision' | 'schedule' | 'preference';
  description: string;
  suggestion: 'keep_new' | 'keep_old' | 'merge' | 'review';
}

interface MemoryConflictsProps {
  conflicts: Conflict[];
  newMemoryId: string;
  newMemoryTitle: string;
  onDismiss: () => void;
}

const typeColors: Record<string, string> = {
  factual: 'bg-destructive/10 text-destructive',
  decision: 'bg-primary/10 text-primary',
  schedule: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  preference: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
};

const typeLabels: Record<string, string> = {
  factual: '⚡ Factual',
  decision: '🔄 Decision',
  schedule: '📅 Schedule',
  preference: '💭 Preference',
};

const MemoryConflicts: React.FC<MemoryConflictsProps> = ({
  conflicts,
  newMemoryId,
  newMemoryTitle,
  onDismiss,
}) => {
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleResolve = async (conflict: Conflict, action: 'keep_new' | 'keep_old' | 'dismiss') => {
    setResolving(conflict.existing_memory_id);
    try {
      if (action === 'keep_new') {
        // Delete the old conflicting memory
        const { error } = await supabase
          .from('memory_notes')
          .delete()
          .eq('id', conflict.existing_memory_id);
        if (error) throw error;
        toast({ title: 'Resolved', description: `Removed old memory: "${conflict.existing_memory_title}"` });
      } else if (action === 'keep_old') {
        // Delete the new memory
        const { error } = await supabase
          .from('memory_notes')
          .delete()
          .eq('id', newMemoryId);
        if (error) throw error;
        toast({ title: 'Resolved', description: `Removed new memory: "${newMemoryTitle}"` });
      }

      queryClient.invalidateQueries({ queryKey: ['memory-notes'] });
      setResolved((prev) => new Set(prev).add(conflict.existing_memory_id));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setResolving(null);
    }
  };

  const unresolvedConflicts = conflicts.filter((c) => !resolved.has(c.existing_memory_id));

  if (unresolvedConflicts.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className="native-card-elevated border border-destructive/20 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <span className="text-[13px] font-semibold text-foreground">
            {unresolvedConflicts.length} Conflict{unresolvedConflicts.length !== 1 ? 's' : ''} Detected
          </span>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <AnimatePresence>
        {unresolvedConflicts.map((conflict) => (
          <motion.div
            key={conflict.existing_memory_id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-secondary/50 p-3 space-y-2"
          >
            <div className="flex items-start gap-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeColors[conflict.conflict_type]}`}>
                {typeLabels[conflict.conflict_type]}
              </span>
              <p className="text-[12px] text-muted-foreground flex-1">{conflict.description}</p>
            </div>

            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground truncate max-w-[120px]">"{conflict.existing_memory_title}"</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-foreground font-medium truncate max-w-[120px]">"{newMemoryTitle}"</span>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => handleResolve(conflict, 'keep_new')}
                disabled={resolving === conflict.existing_memory_id}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                <Check className="w-3 h-3" /> Keep New
              </button>
              <button
                onClick={() => handleResolve(conflict, 'keep_old')}
                disabled={resolving === conflict.existing_memory_id}
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3" /> Keep Old
              </button>
              <button
                onClick={() => handleResolve(conflict, 'dismiss')}
                disabled={resolving === conflict.existing_memory_id}
                className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 ml-auto"
              >
                <Eye className="w-3 h-3" /> Ignore
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default MemoryConflicts;
