import { createContext, useContext, useState, useMemo } from 'react'
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'

const ThemeCtx = createContext({ mode: 'dark', toggleTheme: () => {} })

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem('theme') || 'dark')

  const toggleTheme = () => {
    setMode(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      document.documentElement.classList.toggle('dark', next === 'dark')
      return next
    })
  }

  const muiTheme = useMemo(() =>
    createTheme({
      palette: {
        mode,
        primary: { main: mode === 'dark' ? '#3b82f6' : '#1d4ed8' },
        background: {
          default: mode === 'dark' ? '#0f172a' : '#f1f5f9',
          paper: mode === 'dark' ? '#1e293b' : '#ffffff',
        },
        text: {
          primary: mode === 'dark' ? '#e2e8f0' : '#0f172a',
          secondary: mode === 'dark' ? '#94a3b8' : '#475569',
        },
        divider: mode === 'dark' ? '#334155' : '#e2e8f0',
        error: { main: '#ef4444' },
        warning: { main: '#f59e0b' },
        success: { main: '#10b981' },
      },
      typography: {
        fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        fontSize: 14,
      },
      shape: { borderRadius: 8 },
      components: {
        MuiButton: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500 } } },
        MuiCard: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: `1px solid ${mode === 'dark' ? '#334155' : '#e2e8f0'}`,
            },
          },
        },
        MuiChip: { styleOverrides: { root: { fontFamily: '"IBM Plex Sans", sans-serif' } } },
      },
    }),
  [mode])

  // Sync Tailwind dark class on initial render
  if (mode === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')

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
