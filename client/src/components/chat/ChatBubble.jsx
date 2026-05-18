import { useContext, useState, useEffect, useRef, useCallback } from 'react'
import styled, { css, keyframes } from 'styled-components'
import CloseIcon from '@mui/icons-material/Close'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import DescriptionIcon from '@mui/icons-material/Description'
import MicIcon from '@mui/icons-material/Mic'
import ChatWindow from './ChatWindow'
import { ChatContext } from '../../context/ChatContext'
import { useSystemConfig } from '../../context/SystemConfigContext'
import { getSocket } from '../../utils/socket'
import { ICON_MAP, DEFAULT_BUBBLE_CONFIG } from '../../utils/bubbleIcons'
import '../../css/chat.css'

const NOTIF_DURATION = 6000

/* ── keyframes ── */
const popIn = keyframes`
  from { opacity: 0; transform: scale(0.6) rotate(-20deg); }
  to   { opacity: 1; transform: scale(1)   rotate(0deg);   }
`
const slideUp = keyframes`
  from { opacity: 0; transform: translateY(16px) scale(0.96); }
  to   { opacity: 1; transform: translateY(0)    scale(1);    }
`
const shrinkBar = keyframes`
  from { transform: scaleX(1); }
  to   { transform: scaleX(0); }
`
const spin = keyframes`
  to { transform: rotate(360deg); }
`
const ping = keyframes`
  0%   { transform: scale(1);    opacity: 0.6; }
  80%  { transform: scale(1.55); opacity: 0;   }
  100% { transform: scale(1.55); opacity: 0;   }
`
const glow = keyframes`
  0%, 100% { box-shadow: 0 4px 20px rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.25), 0 2px 8px rgba(0,0,0,0.4); }
  50%       { box-shadow: 0 4px 28px rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.45), 0 2px 8px rgba(0,0,0,0.4); }
`
const glowUnread = keyframes`
  0%, 100% { box-shadow: 0 4px 24px rgba(239,68,68,0.35), 0 2px 8px rgba(0,0,0,0.4); }
  50%       { box-shadow: 0 4px 36px rgba(239,68,68,0.65), 0 2px 8px rgba(0,0,0,0.4); }
`

/* ── Layout ── */
const BubbleWrap = styled.div`
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 1000;
`

/* relative container so rings + badge are positioned around Bubble */
const BubbleInner = styled.div`
  position: relative;
  display: inline-flex;
`

/* spinning conic-gradient ring — only visible when there are unread messages */
const SpinRing = styled.span`
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  pointer-events: none;
  background: conic-gradient(
    rgba(239, 68, 68, 0.9) 0deg,
    rgba(239, 68, 68, 0.15) 120deg,
    rgba(239, 68, 68, 0.9) 360deg
  );
  /* mask: keep only the outer 3px ring */
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px));
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #fff calc(100% - 3px));
  animation: ${spin} 2.4s linear infinite;
`

/* expanding border ping ring */
const PingRing = styled.span`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(239, 68, 68, 0.55);
  pointer-events: none;
  animation: ${ping} 2s ease-out infinite;
`

const Bubble = styled.button`
  position: relative;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  overflow: hidden;
  cursor: pointer;
  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0b3361 0%, #1250f0 100%));
  border: 1px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.28);
  transition: width 0.42s cubic-bezier(0.16, 1, 0.3, 1), border-radius 0.42s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s;
  animation: ${({ $hasUnread }) => $hasUnread ? css`${glowUnread} 2.4s ease-in-out infinite` : css`${glow} 3s ease-in-out infinite`};

  ${({ $isOpen }) => !$isOpen && css`
    &:hover {
      width: 152px;
      border-radius: 32px;
      background: var(--bc-client-button-gradient, linear-gradient(135deg, #184a8a 0%, #1a62f8 100%));
    }
  `}
  &:active {
    background: var(--bc-client-button-gradient, linear-gradient(135deg, #1a8aee 0%, #0840cc 100%));
    transform: scale(0.96);
  }
`

const BubbleIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: ${popIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  svg { color: #ffffff; font-size: 1.5rem; }
`

const BubbleText = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.88rem;
  letter-spacing: 0.03em;
  white-space: nowrap;
  overflow: hidden;
  max-width: 0;
  opacity: 0;
  transition: max-width 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s 0.08s;
  ${Bubble}:hover & {
    max-width: 90px;
    opacity: 1;
  }
`

/* ── Style: open (pill siempre visible) ── */
const BubbleOpen = styled.button`
  position: relative;
  height: 56px;
  border-radius: 28px;
  padding: 0 20px 0 14px;
  display: flex;
  align-items: center;
  gap: 9px;
  overflow: visible;
  cursor: pointer;
  white-space: nowrap;
  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0b3361 0%, #1250f0 100%));
  border: 1px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.28);
  animation: ${({ $hasUnread }) => $hasUnread ? css`${glowUnread} 2.4s ease-in-out infinite` : css`${glow} 3s ease-in-out infinite`};
  transition: background 0.3s, transform 0.15s;
  &:hover { background: var(--bc-client-button-gradient, linear-gradient(135deg, #184a8a 0%, #1a62f8 100%)); }
  &:active { transform: scale(0.97); }
`

const OpenLabel = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.88rem;
  letter-spacing: 0.02em;
`

/* ── Style: wide (tarjeta ancha) ── */
const BubbleWide = styled.button`
  position: relative;
  width: 210px;
  height: 58px;
  border-radius: 18px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 11px;
  overflow: visible;
  cursor: pointer;
  background: var(--bc-client-button-gradient, linear-gradient(135deg, #0b3361 0%, #1250f0 100%));
  border: 1px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.28);
  animation: ${({ $hasUnread }) => $hasUnread ? css`${glowUnread} 2.4s ease-in-out infinite` : css`${glow} 3s ease-in-out infinite`};
  transition: background 0.3s, transform 0.15s;
  &:hover {
    background: var(--bc-client-button-gradient, linear-gradient(135deg, #184a8a 0%, #1a62f8 100%));
    transform: translateY(-1px);
  }
  &:active { transform: scale(0.97); }
`

const WideIconCircle = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  flex-shrink: 0;
  svg { color: #ffffff; font-size: 1.2rem; }
`

const WideLabel = styled.span`
  color: #ffffff;
  font-weight: 600;
  font-size: 0.85rem;
  letter-spacing: 0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

/* ── Style: minimal (ícono limpio cuadrado) ── */
const BubbleMinimal = styled.button`
  position: relative;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  cursor: pointer;
  background: rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.12);
  border: 1.5px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.38);
  transition: background 0.2s, transform 0.15s, border-color 0.2s;
  &:hover {
    background: rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.22);
    border-color: rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.60);
  }
  &:active { transform: scale(0.96); }
  svg { color: rgba(var(--bc-client-accent-rgb, 40, 140, 255), 1); font-size: 1.4rem; }
`

const UnreadBadge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
  border: 2.5px solid #000000;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.55);
  animation: ${popIn} 0.22s cubic-bezier(0.16, 1, 0.3, 1) both;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
`

/* ── Notification toast ── */
const NotifToast = styled.div`
  position: fixed;
  bottom: 6rem;
  right: 1.5rem;
  width: min(300px, calc(100vw - 3rem));
  border-radius: 20px;
  overflow: hidden;
  background: rgba(10, 12, 22, 0.97);
  backdrop-filter: blur(28px) saturate(1.5);
  -webkit-backdrop-filter: blur(28px) saturate(1.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.04),
    0 12px 48px rgba(0, 0, 0, 0.6),
    0 3px 12px rgba(0, 0, 0, 0.35);
  z-index: 1001;
  cursor: pointer;
  animation: ${slideUp} 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
  user-select: none;
  transition: border-color 0.2s;
  &:hover { border-color: rgba(255, 255, 255, 0.14); }
`

const NotifBody = styled.div`
  padding: 14px 12px 12px;
  display: flex;
  align-items: flex-start;
  gap: 11px;
`

const NotifAvatar = styled.div`
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(
    135deg,
    rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.25) 0%,
    rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.08) 100%
  );
  border: 1.5px solid rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    font-size: 19px;
    color: rgba(var(--bc-client-accent-rgb, 40, 140, 255), 1);
  }
`

const NotifContent = styled.div`
  flex: 1;
  min-width: 0;
  padding-top: 1px;
`

const NotifLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.9);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  margin-bottom: 3px;
`

const NotifText = styled.div`
  font-size: 13.5px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.45;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`

const NotifClose = styled.button`
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s, color 0.15s;
  &:hover { background: rgba(255, 255, 255, 0.14); color: rgba(255, 255, 255, 0.7); }
  svg { font-size: 15px; }
`

const NotifProgress = styled.div`
  height: 2.5px;
  background: linear-gradient(
    90deg,
    rgba(var(--bc-client-accent-rgb, 40, 140, 255), 1) 0%,
    rgba(var(--bc-client-accent-rgb, 40, 140, 255), 0.4) 100%
  );
  transform-origin: left center;
  animation: ${shrinkBar} ${NOTIF_DURATION}ms linear forwards;
`

/* ── helpers ── */
function getNotifPreview(notif) {
  if (!notif) return ''
  switch (notif.messageType) {
    case 'image': return '📷 Imagen'
    case 'pdf':   return '📄 Documento'
    case 'audio': return '🎙️ Audio'
    default:      return notif.content || ''
  }
}

function getNotifIcon(messageType) {
  switch (messageType) {
    case 'image': return <ImageOutlinedIcon />
    case 'pdf':   return <DescriptionIcon />
    case 'audio': return <MicIcon />
    default:      return <SupportAgentIcon />
  }
}

/* ── component ── */
const ChatBubble = () => {
  const { isOpen, setIsOpen } = useContext(ChatContext)
  const { systemConfig } = useSystemConfig()
  const appName = systemConfig?.appName || 'Soporte'
  const bubbleConfig = systemConfig?.bubbleConfig || DEFAULT_BUBBLE_CONFIG
  const activeStyle = bubbleConfig.style || 'default'
  const styleConf   = bubbleConfig[activeStyle] || {}
  const ActiveIcon  = ICON_MAP[styleConf.icon] || ICON_MAP.ChatOutlined
  const bubbleLabel = styleConf.text || appName
  const [notif, setNotif]     = useState(null)
  const [notifKey, setNotifKey] = useState(0)
  const [unread, setUnread]   = useState(0)
  const dismissTimer          = useRef(null)
  const isOpenRef             = useRef(isOpen)

  useEffect(() => { isOpenRef.current = isOpen }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setNotif(null)
      setUnread(0)
      window.clearTimeout(dismissTimer.current)
    }
  }, [isOpen])

  const dismiss = useCallback(() => {
    window.clearTimeout(dismissTimer.current)
    setNotif(null)
  }, [])

  const showNotif = useCallback((data) => {
    window.clearTimeout(dismissTimer.current)
    setNotif(data)
    setNotifKey(k => k + 1)
    dismissTimer.current = window.setTimeout(dismiss, NOTIF_DURATION)
  }, [dismiss])

  useEffect(() => {
    const socket = getSocket('client')

    const onNotify = (data) => {
      if (isOpenRef.current) return
      setUnread(prev => prev + 1)
      showNotif(data)
    }

    const onUnread = ({ count }) => {
      setUnread(Number(count) || 0)
    }

    socket.on('message:notify', onNotify)
    socket.on('notify:unread', onUnread)

    return () => {
      socket.off('message:notify', onNotify)
      socket.off('notify:unread', onUnread)
      window.clearTimeout(dismissTimer.current)
    }
  }, [showNotif])

  const openChat = () => {
    setIsOpen(true)
    dismiss()
  }

  const hasUnread = unread > 0

  return (
    <>
      {isOpen && <ChatWindow onClose={() => setIsOpen(false)} />}

      {!isOpen && notif && (
        <NotifToast key={notifKey} onClick={openChat}>
          <NotifBody>
            <NotifAvatar>{getNotifIcon(notif.messageType)}</NotifAvatar>
            <NotifContent>
              <NotifLabel>{appName}</NotifLabel>
              <NotifText>{getNotifPreview(notif)}</NotifText>
            </NotifContent>
            <NotifClose
              onClick={e => { e.stopPropagation(); dismiss() }}
              aria-label="Cerrar notificación"
            >
              <CloseIcon />
            </NotifClose>
          </NotifBody>
          <NotifProgress key={notifKey} />
        </NotifToast>
      )}

      <BubbleWrap>
        <BubbleInner>
          {/* Spin + ping rings solo en estilo default */}
          {!isOpen && hasUnread && activeStyle === 'default' && <SpinRing />}
          {!isOpen && hasUnread && activeStyle === 'default' && <PingRing />}
          {!isOpen && hasUnread && (
            <UnreadBadge>{unread > 99 ? '99+' : unread}</UnreadBadge>
          )}

          {/* Cuando el chat está abierto siempre mostramos el botón redondo de cierre */}
          {isOpen ? (
            <Bubble
              $isOpen
              $hasUnread={false}
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar chat"
            >
              <BubbleIcon key="close"><CloseIcon /></BubbleIcon>
            </Bubble>
          ) : activeStyle === 'open' ? (
            <BubbleOpen $hasUnread={hasUnread} onClick={openChat} aria-label="Abrir chat">
              <BubbleIcon key="icon"><ActiveIcon /></BubbleIcon>
              <OpenLabel>{bubbleLabel}</OpenLabel>
            </BubbleOpen>
          ) : activeStyle === 'wide' ? (
            <BubbleWide $hasUnread={hasUnread} onClick={openChat} aria-label="Abrir chat">
              <WideIconCircle><ActiveIcon /></WideIconCircle>
              <WideLabel>{bubbleLabel}</WideLabel>
            </BubbleWide>
          ) : activeStyle === 'minimal' ? (
            <BubbleMinimal $hasUnread={hasUnread} onClick={openChat} aria-label="Abrir chat">
              <ActiveIcon />
            </BubbleMinimal>
          ) : (
            /* default */
            <Bubble
              $isOpen={false}
              $hasUnread={hasUnread}
              onClick={openChat}
              aria-label="Abrir chat"
            >
              <BubbleIcon key="chat"><ActiveIcon /></BubbleIcon>
              <BubbleText>{bubbleLabel}</BubbleText>
            </Bubble>
          )}
        </BubbleInner>
      </BubbleWrap>
    </>
  )
}

export default ChatBubble
