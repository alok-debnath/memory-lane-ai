import { Sheet } from 'tamagui';
import { useState } from 'react';

interface SheetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  snapPoints?: number[];
}

export function SheetModal({ open, onOpenChange, children, snapPoints = [85, 50, 25] }: SheetModalProps) {
  const [position, setPosition] = useState(0);

  return (
    <Sheet
      forceRemoveScrollEnabled={open}
      modal={true}
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      position={position}
      onPositionChange={setPosition}
      dismissOnSnapToBottom
      zIndex={100_000}
      animation="medium"
    >
      <Sheet.Overlay animation="lazy" enterStyle={{ opacity: 0 }} exitStyle={{ opacity: 0 }} />
      <Sheet.Handle />
      <Sheet.Frame flex={1} padding="$4" gap="$4">
        {children}
      </Sheet.Frame>
    </Sheet>
  );
}
