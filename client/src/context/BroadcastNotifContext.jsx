import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { getSocket } from '../utils/socket'

const BroadcastNotifContext = createContext(null)

export function BroadcastNotifProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const timersRef = useRef({})

  function scheduleRemoval(id, expiresAt) {
    const ms = new Date(expiresAt).getTime() - Date.now()
    if (ms <= 0) return
    clearTimeout(timersRef.current[id])
    timersRef.current[id] = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
      delete timersRef.current[id]
    }, ms)
  }

  function addNotification(notif) {
    setNotifications(prev => {
      const exists = prev.some(n => n.id === notif.id)
      if (exists) return prev
      return [notif, ...prev]
    })
    scheduleRemoval(notif.id, notif.expires_at)
  }

  function removeNotification(id) {
    clearTimeout(timersRef.current[id])
    delete timersRef.current[id]
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  useEffect(() => {
    const socket = getSocket('admin')

    const onNew = (notif) => {
      addNotification(notif)
    }

    const onActive = (list) => {
      list.forEach(addNotification)
    }

    const onCancelled = ({ id }) => {
      removeNotification(id)
    }

    socket.on('broadcast:notification', onNew)
    socket.on('broadcast:active', onActive)
    socket.on('broadcast:cancelled', onCancelled)

    return () => {
      socket.off('broadcast:notification', onNew)
      socket.off('broadcast:active', onActive)
      socket.off('broadcast:cancelled', onCancelled)
    }
  }, [])

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearTimeout)
    }
  }, [])

  return (
    <BroadcastNotifContext.Provider value={{ notifications }}>
      {children}
    </BroadcastNotifContext.Provider>
  )
}

export function useBroadcastNotif() {
  return useContext(BroadcastNotifContext)
}
