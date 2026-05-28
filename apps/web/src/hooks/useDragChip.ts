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

// Module-level flag to suppress click after a completed drag
let suppressClickUntil = 0;

export function useDragChip() {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  const wasDraggingRef = useRef(false);

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
        wasDraggingRef.current = true;
      }
      return;
    }
    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, []);

  const endDrag = useCallback(() => {
    if (dragState?.isDragging || wasDraggingRef.current) {
      suppressClickUntil = Date.now() + 300;
    }
    pendingRef.current = null;
    wasDraggingRef.current = false;
    setDragState(null);
  }, [dragState?.isDragging]);

  const wasDragging = useCallback(() => {
    if (Date.now() < suppressClickUntil) {
      suppressClickUntil = 0;
      return true;
    }
    return false;
  }, []);

  return { dragState, startDrag, moveDrag, endDrag, wasDragging };
}
