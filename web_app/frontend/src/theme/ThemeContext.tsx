import React, { createContext, useContext, useState, useMemo, useEffect, useCallback, ReactNode } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import createSOCTheme from './muiTheme'
import { ThemeMode, ThemeContextValue } from '../types/theme'
import { safeStorage } from '../utils/safeStorage'

const ThemeCtx = createContext<ThemeContextValue>({
  themeMode: 'dark',
  setThemeMode: () => {},
  actualTheme: 'dark',
  mode: 'dark',
  toggleTheme: () => {},
})

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const stored = safeStorage.getItem('soc-theme-mode') as ThemeMode | null
      if (stored && (stored === 'light' || stored === 'dark' || stored === 'system')) return stored
      return 'dark' // default to dark
    }
    return 'dark'
  })

  // Calculate actual theme ('light' | 'dark') based on themeMode
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>(() => {
    if (themeMode === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      }
      return 'dark'
    }
    return themeMode
  })

  useEffect(() => {
    if (themeMode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        setActualTheme(e.matches ? 'dark' : 'light')
      }
      mediaQuery.addEventListener('change', handler)
      setActualTheme(mediaQuery.matches ? 'dark' : 'light')
      return () => mediaQuery.removeEventListener('change', handler)
    } else {
      setActualTheme(themeMode)
    }
  }, [themeMode])

  const setThemeMode = useCallback((newMode: ThemeMode) => {
    setThemeModeState(newMode)
    safeStorage.setItem('soc-theme-mode', newMode)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeMode(actualTheme === 'dark' ? 'light' : 'dark')
  }, [actualTheme, setThemeMode])

  // Create MUI theme using the actual active theme mode ('light' | 'dark')
  const muiTheme = useMemo(() => createSOCTheme(actualTheme), [actualTheme])

  // Sync Tailwind dark class & CSS custom properties on mode change
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    if (actualTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    // Sync theme colors as CSS custom properties for use in TailwindCSS / vanilla CSS
    const p = muiTheme.palette
    root.style.setProperty('--soc-bg-default', p.background.default)
    root.style.setProperty('--soc-bg-paper', p.background.paper)
    root.style.setProperty('--soc-text-primary', p.text.primary)
    root.style.setProperty('--soc-text-secondary', p.text.secondary)
    root.style.setProperty('--soc-divider', p.divider)
    root.style.setProperty('--soc-primary', p.primary.main)
    root.style.setProperty('--soc-secondary', p.secondary.main)
  }, [actualTheme, muiTheme])

  const value = useMemo<ThemeContextValue>(() => ({
    themeMode,
    setThemeMode,
    actualTheme,
    mode: actualTheme,
    toggleTheme,
  }), [themeMode, setThemeMode, actualTheme, toggleTheme])

  return (
    <ThemeCtx.Provider value={value}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeCtx.Provider>
  )
}

export const useThemeMode = () => useContext(ThemeCtx)
