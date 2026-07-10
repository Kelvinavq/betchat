import { createContext, useEffect, useState } from 'react'
import { api } from '../utils/api'
import { getSocket } from '../utils/socket'

export const AuthContext = createContext(null)

const ADMIN_SESSION_STORAGE_KEYS = {
  role: 'admin_role',
  canTransfer: 'admin_can_transfer_client_data',
}

function syncAdminSessionStorage(user) {
  try {
    if (!user) {
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEYS.role)
      localStorage.removeItem(ADMIN_SESSION_STORAGE_KEYS.canTransfer)
      return
    }
    localStorage.setItem(ADMIN_SESSION_STORAGE_KEYS.role, String(user.role || ''))
    localStorage.setItem(
      ADMIN_SESSION_STORAGE_KEYS.canTransfer,
      user.canTransferClientData ? '1' : '0'
    )
  } catch {
    // ignore storage failures
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    localStorage.removeItem('betchat_auth_token')

    const verifySession = async () => {
      try {
        const response = await api.get('/api/auth/me')
        setUser(response.user)
        syncAdminSessionStorage(response.user)
      } catch {
        setUser(null)
        syncAdminSessionStorage(null)
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

  useEffect(() => {
    if (!user) return

    const socket = getSocket('admin')
    const onForceLogout = (payload = {}) => {
      sessionStorage.setItem('login_force_logout_alert', JSON.stringify({
        reason: payload?.reason || 'admin_force_logout',
      }))
      setUser(null)
    }

    socket.on('session:force-logout', onForceLogout)
    return () => socket.off('session:force-logout', onForceLogout)
  }, [user])

  const login = (userData) => {
    setUser(userData)
    syncAdminSessionStorage(userData)
  }

  const logout = async () => {
    try {
      await api.post('/api/auth/logout')
    } catch (error) {
      console.warn('Error al cerrar sesión:', error)
    } finally {
      setUser(null)
      syncAdminSessionStorage(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser, initializing }}>
      {children}
    </AuthContext.Provider>
  )
}
