import { createContext, useContext, useState, useMemo, useEffect, useCallback } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import createSOCTheme from './muiTheme'

const ThemeCtx = createContext({ mode: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('soc-theme-mode')
      if (stored) return stored
      // Check system preference
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  })

  const toggleTheme = useCallback(() => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('soc-theme-mode', next)
      return next
    })
  }, [])

  // Create MUI theme
  const muiTheme = useMemo(() => createSOCTheme(mode), [mode])

  // Sync Tailwind dark class & CSS custom properties on mode change
  useEffect(() => {
    if (typeof document === 'undefined') return

    const root = document.documentElement
    if (mode === 'dark') {
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
  }, [mode, muiTheme])

  // Listen for system preference changes (auto-detect)
  useEffect(() => {
    if (typeof window === 'undefined') return
    // Only auto-switch if user hasn't explicitly set a preference
    const stored = localStorage.getItem('soc-theme-mode')
    if (stored) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setMode(e.matches ? 'dark' : 'light')
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const value = useMemo(() => ({ mode, toggleTheme }), [mode, toggleTheme])

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
