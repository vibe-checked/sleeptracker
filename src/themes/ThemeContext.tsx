import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { themes, midnight, type Theme, type ThemeName } from './themes';
import { load, save, KEYS } from '../data/persistence';

interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: midnight,
  themeName: 'midnight',
  setThemeName: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<ThemeName>('midnight');
  const theme = themes[themeName] ?? midnight;

  useEffect(() => {
    load<ThemeName>(KEYS.theme, 'midnight').then(name => {
      if (themes[name]) setThemeNameState(name);
    });
  }, []);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
    save(KEYS.theme, name);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setThemeName }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
