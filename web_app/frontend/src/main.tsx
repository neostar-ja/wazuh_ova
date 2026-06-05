import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { ThemeProvider } from './theme/ThemeContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SnackbarProvider } from 'notistack'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
})

const BASE = (import.meta.env.VITE_BASE_PATH || '/wazuh').replace(/\/+$/, '')
const ENABLE_PUSH_SW = import.meta.env.VITE_ENABLE_PUSH_SW === 'true'

if ('serviceWorker' in navigator) {
  if (ENABLE_PUSH_SW) {
    navigator.serviceWorker.register(`${BASE}/sw.js`).catch(() => {/* SW registration is best-effort */})
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      const baseScope = `${window.location.origin}${BASE}/`
      registrations
        .filter((registration) => registration.scope.startsWith(baseScope))
        .forEach((registration) => {
          void registration.unregister()
        })
    }).catch(() => {/* ignore unregister errors */})
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SnackbarProvider maxSnack={4} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <App />
        </SnackbarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
)
