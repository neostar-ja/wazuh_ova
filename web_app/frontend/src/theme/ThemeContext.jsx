import { createContext, useContext, useState, useMemo, useEffect } from 'react'
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

  const toggleTheme = () => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('soc-theme-mode', next)
      // Update HTML class for Tailwind dark mode
      if (next === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
      return next
    })
  }

  // Create MUI theme
  const muiTheme = useMemo(() => createSOCTheme(mode), [mode])

  // Sync Tailwind dark class on initial render and mode change
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark')
      } else {
        document.documentElement.classList.remove('dark')
      }
    }
  }, [mode])

  return (
    <ThemeCtx.Provider value={{ mode, toggleTheme }}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeCtx.Provider>
  )
}

export const useThemeMode = () => useContext(ThemeCtx)
