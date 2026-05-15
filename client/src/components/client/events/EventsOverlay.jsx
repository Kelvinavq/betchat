import { useState, useEffect, useContext, useCallback } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes, css } from 'styled-components'
import { ChatContext } from '../../../context/ChatContext'
import { getSocket } from '../../../utils/socket'
import { api } from '../../../utils/api'
import GameModal from './GameModal'

// ─── Design tokens ───────────────────────────────────────────────────────────
const COLOR = {
  bg: '#0c1220',
  card: '#111827',
  accent: '#3b82f6',
  gold: '#f59e0b',
  success: '#10b981',
  text1: '#f8fafc',
  text2: '#94a3b8',
}

// ─── Animations ──────────────────────────────────────────────────────────────
const pulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5), 0 4px 16px rgba(0,0,0,0.4); }
  50%       { box-shadow: 0 0 0 8px rgba(59,130,246,0),  0 4px 16px rgba(0,0,0,0.4); }
`

const slideUp = keyframes`
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
`

// ─── Styled components ────────────────────────────────────────────────────────
const FloatBtn = styled.button`
  position: fixed;
  bottom: 1.5rem;
  right: calc(1.5rem + 56px + 12px);
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 999px;
  border: none;
  cursor: pointer;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  background: ${({ $open }) =>
    $open
      ? 'linear-gradient(135deg, #2563eb, #3b82f6)'
      : 'linear-gradient(135deg, #1e40af, #1d4ed8)'};
  box-shadow: 0 0 0 0 rgba(59,130,246,0.5), 0 4px 16px rgba(0,0,0,0.4);
  transition: background 0.2s ease;

  ${({ $pulse }) =>
    $pulse &&
    css`
      animation: ${pulse} 2s ease-in-out infinite;
    `}

  &:hover {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
  }
`

const CountBadge = styled.span`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
`

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1098;
  background: rgba(0, 0, 0, 0.6);
`

const Panel = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1099;
  max-height: 80vh;
  background: ${COLOR.bg};
  border-radius: 24px 24px 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  overflow-y: auto;
  padding: 16px;
  animation: ${slideUp} 0.28s cubic-bezier(0.32, 0.72, 0, 1) both;

  @media (min-width: 768px) {
    bottom: 24px;
    left: 0;
    right: 0;
    width: min(92vw, 760px);
    max-height: calc(100vh - 160px);
    border-radius: 24px;
    animation: none;
    margin: 0 auto;
  }
`

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 700;
  font-size: 16px;
  color: ${COLOR.text1};
`

const EventCard = styled.div`
  background: ${COLOR.card};
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: border-color 0.18s ease, background 0.18s ease;

  &:hover {
    border-color: rgba(59, 130, 246, 0.4);
    background: #1a2336;
  }
`

const EventEmoji = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
  background: ${({ $type }) => {
    const map = {
      sorteo: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
      quiz: 'linear-gradient(135deg,#0891b2,#06b6d4)',
      scratch: 'linear-gradient(135deg,#d97706,#f59e0b)',
      roulette: 'linear-gradient(135deg,#dc2626,#ef4444)',
      slots: 'linear-gradient(135deg,#7c3aed,#a855f7)',
      red_black: 'linear-gradient(135deg,#1f2937,#374151)',
      briefcase: 'linear-gradient(135deg,#065f46,#10b981)',
      treasure_chest: 'linear-gradient(135deg,#92400e,#f59e0b)',
      ranking: 'linear-gradient(135deg,#1d4ed8,#3b82f6)',
    }
    return map[$type] || 'linear-gradient(135deg,#374151,#4b5563)'
  }};
`

const EventInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const PlayBtn = styled.button`
  flex-shrink: 0;
  padding: 6px 14px;
  border-radius: 999px;
  border: none;
  font-size: 12px;
  font-weight: 700;
  cursor: ${({ $played }) => ($played ? 'default' : 'pointer')};
  background: ${({ $played }) => ($played ? 'rgba(255,255,255,0.08)' : COLOR.accent)};
  color: ${({ $played }) => ($played ? COLOR.text2 : '#fff')};
  transition: background 0.18s ease, opacity 0.18s ease;

  &:hover {
    opacity: ${({ $played }) => ($played ? 1 : 0.85)};
  }
`

// ─── Helpers ──────────────────────────────────────────────────────────────────
const GAME_EMOJI = {
  sorteo: '🎰',
  quiz: '🧠',
  scratch: '🎫',
  roulette: '⚙️',
  slots: '🎰',
  red_black: '🔴',
  briefcase: '💼',
  treasure_chest: '💎',
  ranking: '🏆',
}

const GAME_LABEL = {
  sorteo: 'Sorteo',
  quiz: 'Quiz',
  scratch: 'Raspa y Gana',
  roulette: 'Ruleta',
  slots: 'Slots',
  red_black: 'Rojo/Negro',
  briefcase: 'Maletín',
  treasure_chest: 'Cofre del Tesoro',
  ranking: 'Ranking',
}

const PRIZE_LABEL = (type, amount) => {
  if (type === 'fichas') return `${Number(amount).toLocaleString('es-AR')} fichas`
  if (type === 'bono_200') return 'Bono 200%'
  return 'Premio especial'
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function EventsOverlay() {
  const { clientSession } = useContext(ChatContext)
  const [events, setEvents] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const fetchEvents = useCallback(async () => {
    try {
      const data = await api.get('/api/client/events/active')
      setEvents(data.events || [])
    } catch {
      // silent — overlay should never crash the page
    }
  }, [])

  // Fetch on mount + refresh every 60 s
  useEffect(() => {
    fetchEvents()
    const id = setInterval(fetchEvents, 60_000)
    return () => clearInterval(id)
  }, [fetchEvents])

  // Socket: react to live event changes
  useEffect(() => {
    const socket = getSocket('client')
    const handler = () => fetchEvents()
    socket.on('event:new', handler)
    socket.on('event:finished', handler)
    return () => {
      socket.off('event:new', handler)
      socket.off('event:finished', handler)
    }
  }, [fetchEvents])

  const availableCount = events.filter((e) => !e.has_played).length

  // Don't render when there are no active events
  if (events.length === 0) return null

  return createPortal(
    <>
      {/* Floating button */}
      <FloatBtn
        onClick={() => setPanelOpen((p) => !p)}
        $open={panelOpen}
        $pulse={availableCount > 0}
        aria-label="Abrir juegos disponibles"
      >
        🎮 <span>Juegos</span>
        {availableCount > 0 && <CountBadge>{availableCount}</CountBadge>}
      </FloatBtn>

      {/* Slide-up panel */}
      {panelOpen && (
        <>
          <Backdrop onClick={() => setPanelOpen(false)} />
          <Panel>
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 99,
                  background: 'rgba(255,255,255,0.15)',
                }}
              />
            </div>

            <PanelHeader>
              <span>🎮 Juegos disponibles</span>
              <button
                onClick={() => setPanelOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1,
                  padding: '4px 8px',
                }}
                aria-label="Cerrar panel"
              >
                ×
              </button>
            </PanelHeader>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  onClick={() => {
                    if (!event.has_played) {
                      setSelectedEvent(event)
                      setPanelOpen(false)
                    }
                  }}
                  style={{ opacity: event.has_played ? 0.6 : 1 }}
                >
                  <EventEmoji $type={event.type}>
                    {GAME_EMOJI[event.type] || '🎮'}
                  </EventEmoji>

                  <EventInfo>
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: 14 }}>
                      {event.title}
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                      {event.prize_amount
                        ? `Premio: ${PRIZE_LABEL(event.prize_type, event.prize_amount)}`
                        : GAME_LABEL[event.type]}
                    </div>
                  </EventInfo>

                  {event.has_played ? (
                    <PlayBtn $played>✓ Participaste</PlayBtn>
                  ) : (
                    <PlayBtn
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedEvent(event)
                        setPanelOpen(false)
                      }}
                    >
                      Jugar
                    </PlayBtn>
                  )}
                </EventCard>
              ))}
            </div>
          </Panel>
        </>
      )}

      {/* Game modal */}
      {selectedEvent && (
        <GameModal
          event={selectedEvent}
          clientId={clientSession?.id ?? null}
          onClose={() => {
            setSelectedEvent(null)
            fetchEvents()
          }}
        />
      )}
    </>,
    document.body
  )
}
