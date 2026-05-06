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
