import React, { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface CapsuleDatePickerProps {
  value: string | null;
  onChange: (date: string | null) => void;
}

const CapsuleDatePicker: React.FC<CapsuleDatePickerProps> = ({ value, onChange }) => {
  const [enabled, setEnabled] = useState(!!value);

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (!checked) onChange(null);
  };

  // Minimum date = tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().slice(0, 10);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between bg-secondary/30 rounded-xl px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          {enabled ? (
            <Lock className="w-4 h-4 text-primary" />
          ) : (
            <Unlock className="w-4 h-4 text-muted-foreground" />
          )}
          <div>
            <Label htmlFor="capsule-toggle" className="text-[13px] font-medium cursor-pointer">
              Time Capsule
            </Label>
            <p className="text-[11px] text-muted-foreground">Lock until a future date</p>
          </div>
        </div>
        <Switch id="capsule-toggle" checked={enabled} onCheckedChange={handleToggle} />
      </div>
      {enabled && (
        <Input
          type="date"
          min={minDateStr}
          value={value || ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-10 rounded-xl bg-secondary/40 border-0 text-[13px]"
        />
      )}
    </div>
  );
};

export default CapsuleDatePicker;
