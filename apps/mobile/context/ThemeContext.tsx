import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  mode: ThemeMode;
  background: string;
  surface: string;
  card: string;
  cardElevated: string;
  border: string;
  borderSubtle: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primaryButton: string;
  primaryButtonText: string;
  secondaryButton: string;
  secondaryButtonText: string;
  inputBg: string;
  inputBorder: string;
  inputPlaceholder: string;
  accent: string;
  accentGlow: string;
  badgeBg: string;
  badgeText: string;
  tabBar: string;
  tabBarBorder: string;
  statusBar: 'light' | 'dark';
}

export const ShadcnDark: ThemeColors = {
  mode: 'dark',
  background: '#09090B',       // zinc-950 (Shadcn Dark Root)
  surface: '#121215',          // slightly elevated
  card: '#18181B',             // zinc-900 (Shadcn Card)
  cardElevated: '#27272A',     // zinc-800
  border: '#27272A',           // zinc-800
  borderSubtle: '#3F3F46',     // zinc-700
  text: '#FAFAFA',             // zinc-50
  textSecondary: '#D4D4D8',    // zinc-300
  textMuted: '#A1A1AA',        // zinc-400
  primaryButton: '#FAFAFA',    // zinc-50 (Shadcn High-Contrast White)
  primaryButtonText: '#09090B',// zinc-950
  secondaryButton: '#27272A',  // zinc-800
  secondaryButtonText: '#FAFAFA',
  inputBg: '#121215',
  inputBorder: '#27272A',
  inputPlaceholder: '#71717A', // zinc-500
  accent: '#38BDF8',           // Neon Cyan-Blue Pulse (from logo)
  accentGlow: 'rgba(56, 189, 248, 0.15)',
  badgeBg: 'rgba(255, 255, 255, 0.08)',
  badgeText: '#FAFAFA',
  tabBar: '#09090B',
  tabBarBorder: '#27272A',
  statusBar: 'light',
};

export const ShadcnLight: ThemeColors = {
  mode: 'light',
  background: '#FFFFFF',       // Clean White
  surface: '#F8FAFC',          // slate-50
  card: '#FFFFFF',             // White card
  cardElevated: '#F4F4F5',     // zinc-100
  border: '#E4E4E7',           // zinc-200
  borderSubtle: '#D4D4D8',     // zinc-300
  text: '#09090B',             // zinc-950
  textSecondary: '#3F3F46',    // zinc-700
  textMuted: '#71717A',        // zinc-500
  primaryButton: '#09090B',    // zinc-950 (Shadcn High-Contrast Black)
  primaryButtonText: '#FFFFFF',
  secondaryButton: '#F4F4F5',  // zinc-100
  secondaryButtonText: '#09090B',
  inputBg: '#FFFFFF',
  inputBorder: '#E4E4E7',
  inputPlaceholder: '#A1A1AA', // zinc-400
  accent: '#0284C7',           // Royal Blue
  accentGlow: 'rgba(2, 132, 199, 0.12)',
  badgeBg: 'rgba(9, 9, 11, 0.06)',
  badgeText: '#09090B',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E4E4E7',
  statusBar: 'dark',
};

interface ThemeContextType {
  theme: ThemeColors;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const THEME_STORE_KEY = 'medsync_active_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  theme: ShadcnDark,
  isDark: true,
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('dark');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load persisted theme preference
    SecureStore.getItemAsync(THEME_STORE_KEY).then((saved) => {
      if (saved === 'dark' || saved === 'light') {
        setModeState(saved);
      } else if (systemScheme === 'light') {
        setModeState('light');
      } else {
        setModeState('dark');
      }
      setLoaded(true);
    }).catch(() => {
      setLoaded(true);
    });
  }, [systemScheme]);

  const setTheme = (newMode: ThemeMode) => {
    setModeState(newMode);
    SecureStore.setItemAsync(THEME_STORE_KEY, newMode).catch(() => {});
  };

  const toggleTheme = () => {
    setTheme(mode === 'dark' ? 'light' : 'dark');
  };

  const activeTheme = mode === 'dark' ? ShadcnDark : ShadcnLight;

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, isDark: mode === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

