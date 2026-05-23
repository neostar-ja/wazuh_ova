import { useState, useEffect } from 'react'
import { User } from '../types/auth'

let globalUser: User | null = null
let globalListeners: ((user: User | null) => void)[] = []

function parseUser(): User | null {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null') as User | null
  } catch {
    return null
  }
}

export function getUser(): User | null {
  return globalUser || parseUser()
}

export function setAuthData(user: User, token: string): void {
  globalUser = user
  localStorage.setItem('user', JSON.stringify(user))
  localStorage.setItem('token', token)
  globalListeners.forEach(fn => fn(user))
}

export function clearAuthData(): void {
  globalUser = null
  localStorage.removeItem('user')
  localStorage.removeItem('token')
  globalListeners.forEach(fn => fn(null))
}

export function useAuthStore() {
  const [user, setUser] = useState<User | null>(parseUser)

  useEffect(() => {
    const listener = (u: User | null) => setUser(u)
    globalListeners.push(listener)
    return () => {
      globalListeners = globalListeners.filter(fn => fn !== listener)
    }
  }, [])

  return { user, isAuthenticated: !!user }
}
