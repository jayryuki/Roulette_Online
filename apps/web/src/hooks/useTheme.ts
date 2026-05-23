import { useState, useCallback } from 'react';
import { getTheme, setTheme } from '../lib/theme';

export function useTheme() {
  const [theme, setThemeState] = useState(getTheme);

  const toggle = useCallback(() => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    setThemeState(next);
  }, [theme]);

  return { theme, toggle };
}
