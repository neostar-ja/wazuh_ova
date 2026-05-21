import { useAuthStore, setAuthData, clearAuthData } from '../store/authStore'
import { authApi } from '../services/api'

export function useAuth() {
  const { user, isAuthenticated } = useAuthStore()

  const login = async (username, password) => {
    const res = await authApi.login(username, password)
    const { access_token, user: userData } = res.data
    setAuthData(userData, access_token)
    return userData
  }

  const logout = async () => {
    try { await authApi.logout() } catch {}
    clearAuthData()
  }

  return { user, isAuthenticated, login, logout }
}
