import React from 'react';
import { CheckCircle2, Bell, Lightbulb, GitBranch } from 'lucide-react';

interface ExtractedAction {
  text: string;
  type: 'task' | 'reminder' | 'fact' | 'decision';
}

interface ExtractedActionsProps {
  actions: ExtractedAction[];
}

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  task: { icon: CheckCircle2, color: 'text-primary', label: 'Task' },
  reminder: { icon: Bell, color: 'text-orange-500', label: 'Reminder' },
  fact: { icon: Lightbulb, color: 'text-yellow-500', label: 'Fact' },
  decision: { icon: GitBranch, color: 'text-purple-500', label: 'Decision' },
};

const ExtractedActions: React.FC<ExtractedActionsProps> = ({ actions }) => {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
        Extracted Actions
      </p>
      <div className="space-y-1">
        {actions.map((action, i) => {
          const config = typeConfig[action.type] || typeConfig.fact;
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-start gap-2 bg-secondary/30 rounded-lg px-3 py-2">
              <Icon className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${config.color}`} />
              <div className="min-w-0">
                <p className="text-[12px] text-foreground leading-snug">{action.text}</p>
                <p className={`text-[10px] font-medium mt-0.5 ${config.color}`}>{config.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ExtractedActions;
