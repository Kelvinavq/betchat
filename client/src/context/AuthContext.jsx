import { createContext, useEffect, useState } from 'react'
import { api } from '../utils/api'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    localStorage.removeItem('betchat_auth_token')

    const verifySession = async () => {
      try {
        const response = await api.get('/api/auth/me')
        setUser(response.user)
      } catch {
        setUser(null)
      } finally {
        setInitializing(false)
      }
    }

    verifySession()
  }, [])

  useEffect(() => {
    const handleExpired = (e) => {
      const { code, data } = e.detail || {}
      if (code === 'OUTSIDE_SCHEDULE' && data?.access_start && data?.access_end) {
        sessionStorage.setItem('login_schedule_alert', JSON.stringify({
          access_start: data.access_start,
          access_end: data.access_end,
        }))
      }
      setUser(null)
    }
    window.addEventListener('auth:session-expired', handleExpired)
    return () => window.removeEventListener('auth:session-expired', handleExpired)
  }, [])

  const login = (userData) => {
    setUser(userData)
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (error) {
      console.warn('Error al cerrar sesión:', error)
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser, initializing }}>
      {children}
    </AuthContext.Provider>
  )
}
