import { useState, useCallback } from 'react';

export interface DragState {
  isDragging: boolean;
  amount: number;
  currentX: number;
  currentY: number;
  chipColorIndex: number;
}

export function useDragChip() {
  const [dragState, setDragState] = useState<DragState | null>(null);

  const startDrag = useCallback((amount: number, chipColorIndex: number, x: number, y: number) => {
    setDragState({ isDragging: true, amount, currentX: x, currentY: y, chipColorIndex });
  }, []);

  const moveDrag = useCallback((x: number, y: number) => {
    setDragState(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  }, []);

  const endDrag = useCallback(() => {
    setDragState(null);
  }, []);

  return { dragState, startDrag, moveDrag, endDrag };
}
