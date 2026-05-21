import { useState, useEffect } from 'react'

let globalUser = null
let globalListeners = []

function parseUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

export function getUser() {
  return globalUser || parseUser()
}

export function setAuthData(user, token) {
  globalUser = user
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('token', token)
  globalListeners.forEach(fn => fn(user))
}

export function clearAuthData() {
  globalUser = null
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  globalListeners.forEach(fn => fn(null))
}

export function useAuthStore() {
  const [user, setUser] = useState(parseUser)

  useEffect(() => {
    const listener = u => setUser(u)
    globalListeners.push(listener)
    return () => { globalListeners = globalListeners.filter(fn => fn !== listener) }
  }, [])

  return { user, isAuthenticated: !!user }
}
