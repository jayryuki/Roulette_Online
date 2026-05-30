import { useState, useCallback, useRef } from 'react';

export interface DragState {
  isDragging: boolean;
  amount: number;
  currentX: number;
  currentY: number;
  /** Snapped X position on the grid (cell center, edge, or corner). */
  snapX: number;
  /** Snapped Y position on the grid (cell center, edge, or corner). */
  snapY: number;
  chipColorIndex: number;
}

interface PendingDrag {
  amount: number;
  chipColorIndex: number;
  startX: number;
  startY: number;
}

const DRAG_THRESHOLD = 5;

let suppressClickUntil = 0;

export function useDragChip() {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const pendingRef = useRef<PendingDrag | null>(null);
  // Ref that always mirrors the latest dragState so global event handlers
  // can read the current value without stale closures.
  const dragRef = useRef<DragState | null>(null);

  const startDrag = useCallback((amount: number, chipColorIndex: number, x: number, y: number) => {
    pendingRef.current = { amount, chipColorIndex, startX: x, startY: y };
  }, []);

  const moveDrag = useCallback((x: number, y: number, snapX?: number, snapY?: number) => {
    const pending = pendingRef.current;
    if (pending) {
      const dx = x - pending.startX;
      const dy = y - pending.startY;
      if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
        const newState = { isDragging: true, amount: pending.amount, currentX: x, currentY: y, snapX: snapX ?? x, snapY: snapY ?? y, chipColorIndex: pending.chipColorIndex };
        dragRef.current = newState;
        setDragState(newState);
        pendingRef.current = null;
      }
      return;
    }
    if (dragRef.current?.isDragging) {
      const newState = { ...dragRef.current, currentX: x, currentY: y, snapX: snapX ?? dragRef.current.snapX, snapY: snapY ?? dragRef.current.snapY };
      dragRef.current = newState;
      setDragState(newState);
    }
  }, []);

  const endDrag = useCallback(() => {
    if (dragRef.current?.isDragging) {
      suppressClickUntil = Date.now() + 300;
    }
    pendingRef.current = null;
    dragRef.current = null;
    setDragState(null);
  }, []);

  const wasDragging = useCallback(() => {
    if (Date.now() < suppressClickUntil) {
      suppressClickUntil = 0;
      return true;
    }
    return false;
  }, []);

  const isPending = useCallback(() => pendingRef.current !== null, []);

  return { dragState, dragRef, startDrag, moveDrag, endDrag, wasDragging, isPending };
}
