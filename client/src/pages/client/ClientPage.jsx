import { useCallback, useContext, useEffect, useRef } from 'react'
import ChatBubble from '../../components/chat/ChatBubble'
import { ChatContext } from '../../context/ChatContext'
import { api } from '../../utils/api'
import { usePushNotification } from '../../hooks/usePushNotification'
import PushPrompt from '../../components/chat/PushPrompt'

const HOST_ORIGIN = 'https://463.life'

const ClientPage = () => {
  const { clientSession, setClientSession, setIsOpen, setClientAuthLoading } = useContext(ChatContext)
  const { triggerPush } = usePushNotification(clientSession?.id ?? null)
  const loggingInRef = useRef(null)

  const applySession = useCallback((session) => {
    setClientSession(session?.client || null)
    if (session?.client) {
      localStorage.setItem('clientUsername', session.client.username)
      localStorage.setItem('clientId', String(session.client.id))
      localStorage.setItem('chatId', String(session.client.chatId || ''))
    }
  }, [setClientSession])

  const doAutoLogin = useCallback(async (username) => {
    const cleanUsername = String(username || '').trim()
    if (!cleanUsername) return null

    if (loggingInRef.current === cleanUsername) return null
    loggingInRef.current = cleanUsername
    setClientAuthLoading(true)
    setIsOpen(true)

    try {
      const session = await api.post('/api/client/auth/auto-login', { username: cleanUsername })
      applySession(session)
      setIsOpen(true)
      return session
    } finally {
      loggingInRef.current = null
      setClientAuthLoading(false)
    }
  }, [applySession, setClientAuthLoading, setIsOpen])

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/api/client/auth/logout', {})
    } catch (error) {
      console.error('[CLIENT] Error cerrando sesion de cliente:', error)
    } finally {
      localStorage.removeItem('clientUsername')
      localStorage.removeItem('clientId')
      localStorage.removeItem('chatId')
      localStorage.removeItem('__HOST_USERNAME__')
      localStorage.removeItem('__HOST_TOKEN__')
      setClientSession(null)
      setIsOpen(false)
    }
  }, [setClientSession, setIsOpen])

  const handleHostMessage = useCallback(async (eventOrBus) => {
    const origin = eventOrBus?.origin
    const data = eventOrBus?.data

    if (origin && origin !== HOST_ORIGIN) return

    try {
      console.log('[CLIENT] host msg received', origin, data)

      if (data?.tipo === 'login' && data.usuario) {
        const username = String(data.usuario || '').trim()
        localStorage.setItem('__HOST_USERNAME__', username)
        if (data.token) localStorage.setItem('__HOST_TOKEN__', String(data.token))
        await doAutoLogin(username)
        return
      }

      if (data?.tipo === 'logout') {
        await handleLogout()
      }
    } catch (error) {
      console.error('[CLIENT] Error procesando mensaje del host:', error)
    }
  }, [doAutoLogin, handleLogout])

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await api.get('/api/client/auth/me')
        applySession(session)
      } catch {
        localStorage.removeItem('clientUsername')
        localStorage.removeItem('clientId')
        localStorage.removeItem('chatId')
        setClientSession(null)
      }
    }

    restoreSession()
  }, [applySession, setClientSession])

  useEffect(() => {
    window.addEventListener('message', handleHostMessage)
    return () => window.removeEventListener('message', handleHostMessage)
  }, [handleHostMessage])

  return (
    <div className="client-page" style={{background: "#000"}}>
      <iframe
        className="slots-iframe"
        src={HOST_ORIGIN}
        title="463"
        allowFullScreen
      />
      <ChatBubble />
      <PushPrompt clientId={clientSession?.id ?? null} onActivate={triggerPush} />
    </div>
  )
}

export default ClientPage
