import React, { createContext, useContext, useState, useCallback } from 'react';
import { themes, midnight, type Theme, type ThemeName } from './themes';

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
  const theme = themes[themeName];

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
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
