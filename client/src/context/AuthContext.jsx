import { createContext, useEffect, useState } from 'react'

const STORAGE_KEY = 'betchat_auth'

export const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (saved?.user && saved?.token) {
        setUser(saved.user)
        setToken(saved.token)
      }
    } catch (error) {
      console.warn('No se pudo cargar auth desde localStorage:', error)
    }
  }, [])

  useEffect(() => {
    if (user && token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user, token }))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [user, token])

  const login = (userData, authToken) => {
    setUser(userData)
    setToken(authToken)
  }

  const logout = () => {
    setUser(null)
    setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}
