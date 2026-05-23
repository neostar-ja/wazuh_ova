import { useAuthStore, setAuthData, clearAuthData } from '../store/authStore'
import { authApi } from '../services/api'
import { User, AuthContextValue } from '../types/auth'

export function useAuth(): AuthContextValue {
  const { user, isAuthenticated } = useAuthStore()

  const login = async (username: string, password: string): Promise<User> => {
    const res = await authApi.login(username, password)
    const { access_token, user: userData } = res.data
    setAuthData(userData, access_token)
    return userData
  }

  const logout = async (): Promise<void> => {
    try { await authApi.logout() } catch {}
    clearAuthData()
  }

  return { user, isAuthenticated, login, logout }
}
