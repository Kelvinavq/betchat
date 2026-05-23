import { useEffect, useRef, useState } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { useBroadcastNotif } from '../../context/BroadcastNotifContext'

// ── Animations ────────────────────────────────────────────────────────────────
const slideIn = keyframes`
  from { opacity: 0; transform: translateX(60px) scale(0.94); }
  to   { opacity: 1; transform: translateX(0)    scale(1); }
`
const pulseRing = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(249,115,22,0.55); }
  70%  { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
  100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
`
const progressAnim = (pct) => keyframes`
  from { width: 100%; }
  to   { width: ${pct}%; }
`
const breathe = keyframes`
  0%,100% { opacity: 1; }
  50%      { opacity: 0.6; }
`

// ── Styled components ─────────────────────────────────────────────────────────
const Container = styled.div`
  position: fixed;
  right: 22px;
  bottom: 22px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-end;
  pointer-events: none;

  @media (max-width: 480px) {
    right: 10px;
    bottom: 10px;
    left: 10px;
    align-items: stretch;
  }
`

const Card = styled.div`
  width: 340px;
  pointer-events: all;
  background: rgba(10, 10, 18, 0.97);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(249, 115, 22, 0.28);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 0 0 1px rgba(249,115,22,0.08),
    0 8px 32px rgba(0,0,0,0.6),
    0 2px 8px rgba(0,0,0,0.4);
  animation: ${slideIn} 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;

  @media (max-width: 480px) { width: 100%; }
`

const AccentBar = styled.div`
  height: 3px;
  background: linear-gradient(90deg, #f97316 0%, #ef4444 50%, #f97316 100%);
  background-size: 200% 100%;
`

const Body = styled.div`
  padding: 14px 16px 12px;
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
`

const SourceBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 99px;
  background: rgba(249,115,22,0.15);
  border: 1px solid rgba(249,115,22,0.35);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #f97316;
  flex-shrink: 0;
`

const PulseDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f97316;
  flex-shrink: 0;
  animation: ${pulseRing} 1.8s ease infinite;
`

const TimeLeft = styled.span`
  margin-left: auto;
  font-size: 11px;
  color: rgba(255,255,255,0.38);
  white-space: nowrap;
`

const NotifTitle = styled.p`
  font-size: 14px;
  font-weight: 700;
  color: #f1f5f9;
  line-height: 1.35;
  margin-bottom: 6px;
  letter-spacing: -0.01em;
`

const NotifMessage = styled.p`
  font-size: 12.5px;
  color: rgba(203,213,225,0.82);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
`

const ProgressTrack = styled.div`
  margin-top: 12px;
  height: 3px;
  border-radius: 99px;
  background: rgba(255,255,255,0.07);
  overflow: hidden;
`

const ProgressBar = styled.div`
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #10b981, #f59e0b, #ef4444);
  transition: width 1s linear;
  width: ${({ $pct }) => $pct}%;
`

const NoCloseNote = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 8px;
  font-size: 10.5px;
  color: rgba(100,116,139,0.7);
  user-select: none;
`

const LockIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
  </svg>
)

// ── Per-notification countdown hook ──────────────────────────────────────────
function useCountdown(expiresAt) {
  const [msLeft, setMsLeft] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()))

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, new Date(expiresAt).getTime() - Date.now())
      setMsLeft(remaining)
    }
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return msLeft
}

function formatMs(ms) {
  const totalSec = Math.ceil(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m > 0) return `${m}m ${s < 10 ? '0' : ''}${s}s`
  return `${s}s`
}

// ── Single notification card ──────────────────────────────────────────────────
function NotifCard({ notif }) {
  const msLeft = useCountdown(notif.expires_at)
  const totalMs = notif.duration_minutes * 60 * 1000
  const pct = Math.max(0, Math.min(100, (msLeft / totalMs) * 100))

  return (
    <Card>
      <AccentBar />
      <Body>
        <TopRow>
          <SourceBadge>
            <PulseDot />
            FlowHG Support
          </SourceBadge>
          <TimeLeft>{msLeft > 0 ? `Expira en ${formatMs(msLeft)}` : 'Expirando...'}</TimeLeft>
        </TopRow>

        <NotifTitle>{notif.title}</NotifTitle>
        <NotifMessage>{notif.message}</NotifMessage>

        <ProgressTrack>
          <ProgressBar $pct={pct} />
        </ProgressTrack>

        <NoCloseNote>
          <LockIcon />
          Esta notificación se cerrará automáticamente
        </NoCloseNote>
      </Body>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BroadcastNotifBubble() {
  const { notifications } = useBroadcastNotif()

  if (!notifications.length) return null

  return (
    <Container>
      {notifications.map(n => (
        <NotifCard key={n.id} notif={n} />
      ))}
    </Container>
  )
}
