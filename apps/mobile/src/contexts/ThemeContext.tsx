import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const stored = await AsyncStorage.getItem('memoria-theme');
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  }

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('memoria-theme', newTheme);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const colors = {
  dark: {
    background: '#000',
    card: '#1a1a1a',
    border: '#333',
    text: '#fff',
    textMuted: '#666',
    primary: '#8b5cf6',
  },
  light: {
    background: '#fff',
    card: '#f5f5f5',
    border: '#e5e5e5',
    text: '#000',
    textMuted: '#666',
    primary: '#8b5cf6',
  },
};

