import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
// Touch-based mobile devices (phones, tablets) can have widths well over 768px
// when held in landscape. Use `pointer: coarse` to catch touch devices regardless
// of orientation, while still ignoring desktop monitors with touch overlays.
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT * 2}px) and (pointer: coarse), (max-width: ${MOBILE_BREAKPOINT}px)`;

function computeIsMobile(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(MOBILE_QUERY).matches;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(computeIsMobile);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const handler = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
