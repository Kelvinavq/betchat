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
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0);    }
`
const spinRing = keyframes`
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
`
const dotBounce = keyframes`
  0%, 60%, 100% { transform: translateY(0);   opacity: 0.4; }
  30%           { transform: translateY(-5px); opacity: 1;   }
`
const indeterminate = keyframes`
  0%   { left: -50%; }
  100% { left: 110%; }
`
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`

/* ── overlay ── */
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: var(--bc-client-body-bg, #000);
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
  background: rgba(var(--bc-client-accent-rgb, 30,110,255), 0.06);
  box-shadow: 0 0 0 48px rgba(var(--bc-client-accent-rgb, 30,110,255), 0.02);
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
  border: 1.5px solid rgba(var(--bc-client-accent-rgb, 50,130,255), 0.45);
  animation: ${ringExpand} 2.4s ease-out infinite;
  animation-delay: ${({ $delay }) => $delay || '0s'};
`

const Orb = styled.div`
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bc-client-accent, #2563eb);
  box-shadow:
    0 0 0 1px rgba(var(--bc-client-accent-rgb, 80,150,255), 0.25),
    0 0 24px rgba(var(--bc-client-accent-rgb, 40,110,255), 0.35);
  animation: ${orbPulse} 2.4s ease-in-out infinite;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 800;
  color: var(--bc-client-on-accent, rgba(255,255,255,0.9));
  letter-spacing: -0.02em;
  user-select: none;
  flex-shrink: 0;
`

const AppName = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: var(--bc-client-text, #ffffff);
  letter-spacing: -0.03em;
  animation: ${slideUp} 0.5s 0.15s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const LoadingText = styled.div`
  margin-top: 8px;
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--bc-client-text-2, rgba(255,255,255,0.7));
  animation: ${slideUp} 0.5s 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const ProgressBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(var(--bc-client-accent-rgb, 30,110,255), 0.10);
  overflow: hidden;
`
const ProgressFill = styled.div`
  height: 100%;
  background: var(--bc-client-accent, #2563eb);
  width: ${({ $pct }) => $pct}%;
  transition: width 0.6s ease;
`

/* ── auth session loading overlay ── */
const AuthOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9998;
  background: var(--bc-client-body-bg, #000);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: ${({ $out }) => $out ? 'none' : 'all'};
  animation: ${({ $out }) => $out ? css`${fadeOut} 0.65s cubic-bezier(0.4,0,0.2,1) forwards` : css`${fadeIn} 0.3s ease both`};
`
const AuthAmbient = styled.div`
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: rgba(var(--bc-client-accent-rgb, 90,70,255), 0.05);
  box-shadow: 0 0 0 80px rgba(var(--bc-client-accent-rgb, 90,70,255), 0.02);
  pointer-events: none;
`
const AuthAmbient2 = styled.div`
  position: absolute;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: rgba(var(--bc-client-accent-rgb, 60,180,255), 0.04);
  transform: translate(120px, -80px);
  pointer-events: none;
`
const AuthOrbWrap = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 108px;
  height: 108px;
  margin-bottom: 40px;
`
const AuthSpinner = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 3px solid rgba(var(--bc-client-accent-rgb, 140,110,255), 0.20);
  border-top-color: var(--bc-client-accent, #f59e0b);
  animation: ${spinRing} 1.5s linear infinite;
`
const AuthOrb = styled.div`
  position: relative;
  z-index: 1;
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: var(--bc-client-accent, #2563eb);
  box-shadow:
    0 0 0 1px rgba(var(--bc-client-accent-rgb, 145,130,255), 0.20),
    0 0 34px rgba(var(--bc-client-accent-rgb, 115,100,255), 0.26);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 800;
  color: var(--bc-client-on-accent, rgba(255,255,255,0.95));
  letter-spacing: -0.02em;
  user-select: none;
`
const AuthTitle = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: var(--bc-client-text, #ffffff);
  letter-spacing: -0.025em;
  animation: ${slideUp} 0.45s 0.05s cubic-bezier(0.16,1,0.3,1) both;
`
const AuthSub = styled.div`
  margin-top: 9px;
  font-size: 11.5px;
  font-weight: 500;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--bc-client-text-2, rgba(255,255,255,0.62));
  animation: ${slideUp} 0.45s 0.2s cubic-bezier(0.16,1,0.3,1) both;
`
const AuthDots = styled.div`
  display: flex;
  gap: 9px;
  margin-top: 30px;
`
const AuthDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(var(--bc-client-accent-rgb, 140,128,255), 0.62);
  animation: ${dotBounce} 1.45s ease-in-out infinite;
  animation-delay: ${({ $d }) => $d};
`
const AuthBarWrap = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: rgba(var(--bc-client-accent-rgb, 30,110,255), 0.08);
  overflow: hidden;
`
const AuthBarFill = styled.div`
  position: absolute;
  height: 100%;
  width: 46%;
  background: var(--bc-client-accent, #f59e0b);
  animation: ${indeterminate} 2.3s ease-in-out infinite;
`

/* ── component ── */
const ClientPage = () => {
  const {
    clientSession,
    setClientSession,
    setIsOpen,
    setClientAuthLoading,
    iframeLoginData,
    setIframeLoginData,
  } = useContext(ChatContext)
  const { systemConfig, configLoading } = useSystemConfig()
  const iframeUrl = systemConfig?.iframeUrl || ''
  const appName   = systemConfig?.appName   || 'BetChat'
  const logoUrl   = systemConfig?.logoUrl   || ''
  const { triggerPush } = usePushNotification(clientSession?.id ?? null)
  const loggingInRef = useRef(null)
  const [popups, setPopups] = useState([])

  /* ── initial loading screen state ── */
  const [loadingOut, setLoadingOut]   = useState(false)
  const [gone, setGone]               = useState(false)
  const [progress, setProgress]       = useState(8)
  const safetyTimerRef   = useRef(null)
  const progressTimerRef = useRef(null)
  const readyCalledRef   = useRef(false)
  const iframeRef        = useRef(null)

  /* ── auth session loading overlay state ── */
  const [authOverlayGone, setAuthOverlayGone] = useState(true)
  const [authOverlayOut,  setAuthOverlayOut]  = useState(false)
  const authDismissRef  = useRef(null)
  const prevLoginDataRef = useRef(null)
  const iframeLoadedAtRef = useRef(0)

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

  const dismissAuthOverlay = useCallback(() => {
    clearTimeout(authDismissRef.current)
    setAuthOverlayOut(true)
    authDismissRef.current = setTimeout(() => {
      setAuthOverlayGone(true)
      setAuthOverlayOut(false)
    }, 680)
  }, [])

  /* show auth overlay when credentials change after initial load */
  useEffect(() => {
    const prev = prevLoginDataRef.current
    prevLoginDataRef.current = iframeLoginData
    if (!gone || !iframeUrl || !iframeLoginData) return
    if (prev?.username === iframeLoginData?.username && prev?.password === iframeLoginData?.password) return
    clearTimeout(authDismissRef.current)
    setAuthOverlayOut(false)
    setAuthOverlayGone(false)
  }, [iframeLoginData, gone, iframeUrl]) // eslint-disable-line

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
    iframeLoadedAtRef.current = Date.now()
    if (!configLoading) markReady()
    dismissAuthOverlay()
  }, [configLoading, markReady, dismissAuthOverlay])

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
      setIframeLoginData(null)
      setClientSession(null)
      setIsOpen(false)
    }
  }, [setClientSession, setIframeLoginData, setIsOpen])

  const hostOrigin = iframeUrl
    ? (() => { try { return new URL(iframeUrl).origin } catch { return null } })()
    : null

  const iframeSrc = (() => {
    if (!iframeUrl) return ''
    const username = String(iframeLoginData?.username || '').trim()
    const password = String(iframeLoginData?.password || '')
    if (!username && !password) return iframeUrl

    try {
      const url = new URL(iframeUrl, window.location.href)
      if (username) url.searchParams.set('u', username)
      if (password) url.searchParams.set('p', password)
      return url.toString()
    } catch {
      const params = new URLSearchParams()
      if (username) params.set('u', username)
      if (password) params.set('p', password)
      const joiner = iframeUrl.includes('?') ? '&' : '?'
      return `${iframeUrl}${joiner}${params.toString()}`
    }
  })()

  const handleHostMessage = useCallback(async (eventOrBus) => {
    const origin = eventOrBus?.origin
    const data   = eventOrBus?.data
    if (origin && hostOrigin && origin !== hostOrigin) return
    try {
      if (data?.tipo === 'login' && data.usuario) {
        const username = String(data.usuario || '').trim()
        const token = String(data.token || '')
        localStorage.setItem('__HOST_USERNAME__', username)
        if (token) localStorage.setItem('__HOST_TOKEN__', token)
        await doAutoLogin(username)
        return
      }
      if (data?.tipo === 'logout') {
        const justLoaded = Date.now() - iframeLoadedAtRef.current < 5000
        if (justLoaded) return
        await handleLogout()
      }
    } catch (error) {
      console.error('[CLIENT] Error procesando mensaje del host:', error)
    }
  }, [doAutoLogin, handleLogout, hostOrigin])

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const session = await api.get('/api/client/auth/me')
        applySession(session)
        setIsOpen(true)
        return
      } catch {
        const fallbackUsername = String(iframeLoginData?.username || '').trim()

        if (fallbackUsername) {
          try {
            const session = await api.post('/api/client/auth/auto-login', { username: fallbackUsername })
            applySession(session)
            setIsOpen(true)
            return
          } catch (fallbackError) {
            console.warn('[CLIENT] No se pudo rehidratar la sesion de cliente:', fallbackError)
          }
        }

        localStorage.removeItem('clientUsername')
        localStorage.removeItem('clientId')
        localStorage.removeItem('chatId')
        setClientSession(null)
      }
    }
    restoreSession()
  }, [applySession, iframeLoginData?.username, setClientSession, setIsOpen])

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
          src={iframeSrc}
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

      {!authOverlayGone && (
        <AuthOverlay $out={authOverlayOut}>
          <AuthAmbient />
          <AuthAmbient2 />

          <AuthOrbWrap>
            <AuthSpinner />
            <AuthOrb>
              {logoUrl
                ? <img src={logoUrl} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 6 }} />
                : orbLabel
              }
            </AuthOrb>
          </AuthOrbWrap>

          <AuthTitle>Iniciando sesión</AuthTitle>
          <AuthSub>Preparando tu experiencia</AuthSub>

          <AuthDots>
            <AuthDot $d="0s" />
            <AuthDot $d="0.24s" />
            <AuthDot $d="0.48s" />
          </AuthDots>

          <AuthBarWrap>
            <AuthBarFill />
          </AuthBarWrap>
        </AuthOverlay>
      )}
    </div>
  )
}

export default ClientPage
