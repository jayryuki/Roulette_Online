import React from 'react';

type ThemeMode = 'light' | 'dark';

function currentTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export default function RouletteThemeToggle({ style }: { style?: React.CSSProperties }) {
  const [theme, setThemeState] = React.useState<ThemeMode>(currentTheme);

  React.useEffect(() => {
    const observer = new MutationObserver(() => setThemeState(currentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const isLight = theme === 'light';

  const toggle = () => {
    const next: ThemeMode = isLight ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('games-theme', next);
    setThemeState(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      title={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      className="roulette-theme-toggle"
      style={style}
    >
      <span className="roulette-theme-toggle__icon" aria-hidden="true">
        {isLight ? '☾' : '☀'}
      </span>
      <span>{isLight ? 'Dark' : 'Light'}</span>
    </button>
  );
}
