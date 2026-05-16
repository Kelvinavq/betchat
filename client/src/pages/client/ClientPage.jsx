import { useCallback, useContext, useEffect, useRef, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import ChatBubble from '../../components/chat/ChatBubble'
import { ChatContext } from '../../context/ChatContext'
import { useSystemConfig } from '../../context/SystemConfigContext'
import { api } from '../../utils/api'
import { getSocket } from '../../utils/socket'
import { usePushNotification } from '../../hooks/usePushNotification'
import PushPrompt from '../../components/chat/PushPrompt'
import CasinoPopup from '../../components/client/CasinoPopup'
import EventsOverlay from '../../components/client/events/EventsOverlay'

const POPUP_POLL_MS = 120_000
const MAX_LOAD_MS   = 10_000   // safety: never block longer than 10s

/* ── keyframes ── */
const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`
const orbPulse = keyframes`
  0%, 100% { transform: scale(1);    opacity: 0.85; }
  50%       { transform: scale(1.08); opacity: 1;    }
`
const ringExpand = keyframes`
  0%   { transform: scale(1);   opacity: 0.55; }
  100% { transform: scale(2.2); opacity: 0;    }
`
const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
`
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
`

/* ── overlay ── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0;
  pointer-events: ${({ $out }) => $out ? 'none' : 'all'};
  ${({ $out }) => $out && css`
    animation: ${fadeOut} 0.55s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  `}
`

/* subtle radial glow behind everything */
const BackGlow = styled.div`
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(30, 110, 255, 0.12) 0%,
    rgba(80, 60, 255, 0.06) 50%,
    transparent 70%
  );
  pointer-events: none;
`

const OrbWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  margin-bottom: 32px;
`

/* expanding rings — positioned absolute around orb */
const Ring = styled.span`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(50, 130, 255, 0.45);
  animation: ${ringExpand} 2.4s ease-out infinite;
  animation-delay: ${({ $delay }) => $delay || '0s'};
`

const Orb = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    rgba(80, 160, 255, 0.95) 0%,
    rgba(30, 80, 230, 0.85) 45%,
    rgba(15, 40, 180, 0.6) 100%
  );
  box-shadow:
    0 0 0 1px rgba(80, 150, 255, 0.25),
    0 0 24px rgba(40, 110, 255, 0.5),
    0 0 60px rgba(40, 90, 255, 0.2);
  animation: ${orbPulse} 2.4s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.9);
  letter-spacing: -0.02em;
  user-select: none;
  flex-shrink: 0;
`

const AppName = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: -0.03em;
  animation: ${slideUp} 0.5s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const LoadingText = styled.div`
  margin-top: 8px;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 500;
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.18) 0%,
    rgba(255,255,255,0.55) 40%,
    rgba(255,255,255,0.18) 80%
  );
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation:
    ${slideUp}  0.5s 0.3s  cubic-bezier(0.16, 1, 0.3, 1) both,
    ${shimmer}  2.2s 0.8s  linear infinite;
`

const ProgressBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(255,255,255,0.05);
  overflow: hidden;
`
const ProgressFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, rgba(30,110,255,0.8) 0%, rgba(100,180,255,0.9) 100%);
  width: ${({ $pct }) => $pct}%;
  transition: width 0.6s ease;
`

/* ── component ── */
const ClientPage = () => {
  const { clientSession, setClientSession, setIsOpen, setClientAuthLoading } = useContext(ChatContext)
  const { systemConfig, configLoading } = useSystemConfig()
  const iframeUrl = systemConfig?.iframeUrl || ''
  const appName   = systemConfig?.appName   || 'BetChat'
  const logoUrl   = systemConfig?.logoUrl   || ''
  const { triggerPush } = usePushNotification(clientSession?.id ?? null)
  const loggingInRef = useRef(null)
  const [popups, setPopups] = useState([])

  /* ── loading screen state ── */
  const [loadingOut, setLoadingOut]   = useState(false)
  const [gone, setGone]               = useState(false)
  const [progress, setProgress]       = useState(8)
  const safetyTimerRef   = useRef(null)
  const progressTimerRef = useRef(null)
  const readyCalledRef   = useRef(false)
  const iframeRef        = useRef(null)

  const markReady = useCallback(() => {
    if (readyCalledRef.current) return
    readyCalledRef.current = true
    clearTimeout(safetyTimerRef.current)
    clearInterval(progressTimerRef.current)
    setProgress(100)
    setTimeout(() => {
      setLoadingOut(true)
      setTimeout(() => setGone(true), 580)
    }, 220)
  }, [])

  /* advance progress bar gradually while waiting */
  useEffect(() => {
    if (gone) return
    progressTimerRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 88) { clearInterval(progressTimerRef.current); return p }
        return p + (Math.random() * 6 + 2)
      })
    }, 400)
    safetyTimerRef.current = setTimeout(markReady, MAX_LOAD_MS)
    return () => {
      clearInterval(progressTimerRef.current)
      clearTimeout(safetyTimerRef.current)
    }
  }, []) // eslint-disable-line

  /* once config is loaded, decide next trigger */
  useEffect(() => {
    if (configLoading) return
    // if no iframe to wait for → we're done
    if (!iframeUrl) {
      setTimeout(markReady, 150)
    }
  }, [configLoading, iframeUrl, markReady])

  const handleIframeLoad = useCallback(() => {
    if (!configLoading) markReady()
    // if config still loading, markReady will fire from the configLoading effect
  }, [configLoading, markReady])

  /* ── session ── */
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

  const hostOrigin = iframeUrl
    ? (() => { try { return new URL(iframeUrl).origin } catch { return null } })()
    : null

  const handleHostMessage = useCallback(async (eventOrBus) => {
    const origin = eventOrBus?.origin
    const data   = eventOrBus?.data
    if (origin && hostOrigin && origin !== hostOrigin) return
    try {
      if (data?.tipo === 'login' && data.usuario) {
        const username = String(data.usuario || '').trim()
        localStorage.setItem('__HOST_USERNAME__', username)
        if (data.token) localStorage.setItem('__HOST_TOKEN__', String(data.token))
        await doAutoLogin(username)
        return
      }
      if (data?.tipo === 'logout') await handleLogout()
    } catch (error) {
      console.error('[CLIENT] Error procesando mensaje del host:', error)
    }
  }, [doAutoLogin, handleLogout, hostOrigin])

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

  useEffect(() => {
    let cancelled = false
    const fetchPopups = async () => {
      try {
        const data = await api.get('/api/client/popups/active')
        if (!cancelled) setPopups(data.popups || [])
      } catch { /* silent */ }
    }
    fetchPopups()
    const id = setInterval(fetchPopups, POPUP_POLL_MS)
    const socket = getSocket('client')
    const handleNewPopup = (popup) => {
      setPopups((current) => {
        const next = current.filter((item) => item.id !== popup.id)
        return [popup, ...next]
      })
    }
    socket.on('popup:new', handleNewPopup)
    return () => {
      cancelled = true
      clearInterval(id)
      socket.off('popup:new', handleNewPopup)
    }
  }, [])

  const handlePopupCta = useCallback((popup) => {
    const action = popup.ctaAction
    if (!action || action === 'open_chat' || action === 'deposit' ||
        action === 'promotions' || action === 'lottery' || action === 'roulette') {
      setIsOpen(true)
    } else if (action === 'custom_url' && popup.ctaUrl) {
      window.open(popup.ctaUrl, '_blank', 'noopener,noreferrer')
    }
  }, [setIsOpen])

  /* first two letters of app name for orb fallback */
  const orbLabel = appName.slice(0, 2).toUpperCase()

  return (
    <div className="client-page" style={{ background: '#000' }}>
      {iframeUrl && (
        <iframe
          ref={iframeRef}
          className="slots-iframe"
          src={iframeUrl}
          title="Cliente"
          allowFullScreen
          onLoad={handleIframeLoad}
        />
      )}
      <ChatBubble />
      <PushPrompt clientId={clientSession?.id ?? null} onActivate={triggerPush} />
      <CasinoPopup popups={popups} onCtaClick={handlePopupCta} />
      <EventsOverlay />

      {!gone && (
        <Overlay $out={loadingOut}>
          <BackGlow />

          <OrbWrap>
            <Ring $delay="0s" />
            <Ring $delay="0.8s" />
            <Ring $delay="1.6s" />
            <Orb>
              {logoUrl
                ? <img src={logoUrl} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 4 }} />
                : orbLabel
              }
            </Orb>
          </OrbWrap>

          <AppName>{appName}</AppName>
          <LoadingText>Cargando</LoadingText>

          <ProgressBar>
            <ProgressFill $pct={progress} />
          </ProgressBar>
        </Overlay>
      )}
    </div>
  )
}

export default ClientPage
