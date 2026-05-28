import { useState, useCallback, useRef } from 'react';

export interface DragState {
  isDragging: boolean;
  amount: number;
  currentX: number;
  currentY: number;
  chipColorIndex: number;
}

interface PendingDrag {
  amount: number;
  chipColorIndex: number;
  startX: number;
  startY: number;
}

const DRAG_THRESHOLD = 5;

export function useDragChip() {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);

  const startDrag = useCallback((amount: number, chipColorIndex: number, x: number, y: number) => {
    pendingRef.current = { amount, chipColorIndex, startX: x, startY: y };
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    const pending = pendingRef.current;
    if (pending) {
      const dx = x - pending.startX;
      const dy = y - pending.startY;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        setDragState({ isDragging: true, amount: pending.amount, currentX: x, currentY: y, chipColorIndex: pending.chipColorIndex });
        pendingRef.current = null;
      }
      return;
    }
    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, []);

  const endDrag = useCallback(() => {
    pendingRef.current = null;
    setDragState(null);
  }, []);

  const isPending = useCallback(() => pendingRef.current !== null, []);

  return { dragState, startDrag, moveDrag, endDrag, isPending };
}
