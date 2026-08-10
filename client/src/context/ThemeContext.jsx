/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

function getInitialTheme() {
  const saved = localStorage.getItem('careerai-theme');
  return saved || 'system';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);
  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  useEffect(() => {
    const root = document.documentElement;
    const dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    localStorage.setItem('careerai-theme', theme);
  }, [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
