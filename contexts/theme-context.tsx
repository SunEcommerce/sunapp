import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ColorScheme;
  isDarkMode: boolean;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: ColorScheme) => Promise<void>;
  isSystemMode: boolean;
  setSystemMode: (useSystem: boolean) => Promise<void>;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@app_theme_preference';
const SYSTEM_MODE_KEY = '@app_use_system_theme';

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useSystemColorScheme();
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const [isSystemMode, setIsSystemModeState] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved theme preference from storage
  useEffect(() => {
    const loadThemePreference = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        const savedSystemMode = await AsyncStorage.getItem(SYSTEM_MODE_KEY);

        if (savedSystemMode !== null) {
          const useSystem = savedSystemMode === 'true';
          setIsSystemModeState(useSystem);

          if (useSystem && systemColorScheme) {
            setColorScheme(systemColorScheme);
          } else if (savedTheme) {
            setColorScheme(savedTheme as ColorScheme);
          }
        } else if (savedTheme) {
          setColorScheme(savedTheme as ColorScheme);
          setIsSystemModeState(false);
        } else if (systemColorScheme) {
          setColorScheme(systemColorScheme);
        }
      } catch (error) {
        console.error('Error loading theme preference:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadThemePreference();
  }, [systemColorScheme]);

  const toggleTheme = async () => {
    try {
      const newTheme: ColorScheme = colorScheme === 'light' ? 'dark' : 'light';
      await setTheme(newTheme);
      setIsSystemModeState(false);
      await AsyncStorage.setItem(SYSTEM_MODE_KEY, 'false');
    } catch (error) {
      console.error('Error toggling theme:', error);
    }
  };

  const setTheme = async (theme: ColorScheme) => {
    try {
      setColorScheme(theme);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  };

  const setSystemMode = async (useSystem: boolean) => {
    try {
      setIsSystemModeState(useSystem);
      await AsyncStorage.setItem(SYSTEM_MODE_KEY, useSystem.toString());

      if (useSystem && systemColorScheme) {
        setColorScheme(systemColorScheme);
        await AsyncStorage.setItem(THEME_STORAGE_KEY, systemColorScheme);
      }
    } catch (error) {
      console.error('Error setting system mode:', error);
    }
  };

  if (isLoading) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        colorScheme,
        isDarkMode: colorScheme === 'dark',
        toggleTheme,
        setTheme,
        isSystemMode,
        setSystemMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};
