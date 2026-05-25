// ============================================
// THEME CONTEXT
// ============================================

import { createContext, useContext, useState, useEffect } from 'react';
import type { Theme } from '../types';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ 
  theme: 'light', 
  toggleTheme: () => {} 
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      toggleTheme: () => setTheme(t => t === 'light' ? 'dark' : 'light') 
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
