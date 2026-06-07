import { useState, useEffect, useContext, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes, css } from 'styled-components'
import { ChatContext } from '../../../context/ChatContext'
import { useSystemConfig } from '../../../context/SystemConfigContext'
import { getSocket } from '../../../utils/socket'
import { api } from '../../../utils/api'
import { parseDateValue } from '../../../utils/dateUtils'

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

const popIn = keyframes`
  from { opacity: 0; transform: scale(0.88) translateY(20px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`

const AnnouncementOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`

const AnnouncementCard = styled.div`
  position: relative;
  background: linear-gradient(160deg, #0d1b4b 0%, #060a18 100%);
  border: 1px solid rgba(45, 125, 255, 0.3);
  border-radius: 24px;
  padding: 28px 24px 24px;
  width: min(440px, 100%);
  text-align: center;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(45,125,255,0.1);
  animation: ${popIn} 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
`

const AnnouncementClose = styled.button`
  position: absolute;
  top: 14px;
  right: 14px;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  color: #94a3b8;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.18s ease, color 0.18s ease;
  &:hover { background: rgba(255,255,255,0.12); color: #f8fafc; }
`

const AnnouncementTitle = styled.div`
  font-size: 24px;
  font-weight: 800;
  color: #f8fafc;
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin-bottom: 8px;
`

const AnnouncementDesc = styled.div`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.55);
  line-height: 1.55;
  margin-bottom: 16px;
`

const AnnouncementPrize = styled.div`
  display: inline-block;
  background: rgba(45, 125, 255, 0.18);
  border: 1px solid rgba(45, 125, 255, 0.32);
  border-radius: 999px;
  padding: 8px 20px;
  font-weight: 800;
  color: #dbeafe;
  font-size: 16px;
  margin-bottom: 14px;
`

const AnnouncementInfo = styled.div`
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.45);
  margin-top: 4px;
  line-height: 1.6;
`

const AnnouncementBtn = styled.button`
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 14px 0;
  border-radius: 14px;
  border: none;
  background: linear-gradient(180deg, #2d7dff 0%, #1e5ee8 100%);
  color: #fff;
  font-weight: 800;
  font-size: 15px;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition: opacity 0.18s ease, transform 0.18s ease;
  &:hover { opacity: 0.88; transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`

// ─── Styled components ────────────────────────────────────────────────────────
const FloatBtn = styled.button`
  position: fixed;
  bottom: 1.5rem;
  right: calc(1.5rem + ${({ $chatOffset }) => $chatOffset}px + 8px);
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

const SegmentTabs = styled.div`
  display: inline-flex;
  gap: 6px;
  padding: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const SegmentBtn = styled.button`
  border: 0;
  border-radius: 999px;
  padding: 8px 12px;
  min-width: 88px;
  background: ${({ $active }) => ($active ? 'linear-gradient(135deg,#2563eb,#3b82f6)' : 'transparent')};
  color: ${({ $active }) => ($active ? '#fff' : 'rgba(255,255,255,0.7)')};
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, transform 0.2s ease;
  &:hover { transform: translateY(-1px); }
`

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
`

const HistoryCard = styled.div`
  background: ${COLOR.card};
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 18px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const HistoryTop = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
`

const HistoryTitleBlock = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
`

const HistoryTitle = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${COLOR.text1};
  line-height: 1.2;
`

const HistorySubtitle = styled.div`
  font-size: 12px;
  color: ${COLOR.text2};
  line-height: 1.4;
`

const HistoryBadgeRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`

const HistoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 8px;
  border-radius: 999px;
  border: 1px solid ${({ $tone }) => (
    $tone === 'good' ? 'rgba(16,185,129,0.25)'
    : $tone === 'warn' ? 'rgba(245,158,11,0.25)'
    : $tone === 'bad' ? 'rgba(239,68,68,0.25)'
    : 'rgba(148,163,184,0.18)'
  )};
  background: ${({ $tone }) => (
    $tone === 'good' ? 'rgba(16,185,129,0.08)'
    : $tone === 'warn' ? 'rgba(245,158,11,0.08)'
    : $tone === 'bad' ? 'rgba(239,68,68,0.08)'
    : 'rgba(148,163,184,0.08)'
  )};
  color: ${({ $tone }) => (
    $tone === 'good' ? '#6ee7b7'
    : $tone === 'warn' ? '#fbbf24'
    : $tone === 'bad' ? '#fca5a5'
    : '#cbd5e1'
  )};
  font-size: 10.5px;
  font-weight: 800;
`

const HistoryDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
`

const HistoryDetail = styled.div`
  padding: 10px 11px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.05);
  min-width: 0;
  strong {
    display: block;
    font-size: 11px;
    font-weight: 800;
    color: ${COLOR.text1};
    margin-top: 2px;
  }
  span {
    display: block;
    font-size: 10.5px;
    color: ${COLOR.text2};
    line-height: 1.35;
  }
`

const HistoryTimeline = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 4px;

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`

const HistoryStep = styled.div`
  position: relative;
  padding: 11px 11px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid ${({ $active }) => ($active ? 'rgba(59,130,246,0.26)' : 'rgba(255,255,255,0.05)')};
  overflow: hidden;
`

const HistoryStepHead = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
`

const HistoryStepDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $state }) => (
    $state === 'done' ? 'linear-gradient(135deg,#10b981,#34d399)'
    : $state === 'current' ? 'linear-gradient(135deg,#3b82f6,#60a5fa)'
    : 'rgba(148,163,184,0.35)'
  )};
  box-shadow: ${({ $state }) => (
    $state === 'done' ? '0 0 0 4px rgba(16,185,129,0.12)'
    : $state === 'current' ? '0 0 0 4px rgba(59,130,246,0.14)'
    : 'none'
  )};
`

const HistoryStepLine = styled.span`
  height: 2px;
  flex: 1;
  border-radius: 999px;
  background: ${({ $state }) => (
    $state === 'done' ? 'linear-gradient(90deg,#10b981,#60a5fa)'
    : 'rgba(255,255,255,0.08)'
  )};
`

const HistoryStepLabel = styled.div`
  font-size: 11px;
  font-weight: 900;
  color: ${COLOR.text1};
  text-transform: uppercase;
  letter-spacing: 0.03em;
`

const HistoryStepText = styled.div`
  font-size: 11px;
  color: ${COLOR.text2};
  line-height: 1.35;
`

const HistoryActions = styled.div`
  display: flex;
  justify-content: flex-end;
`

const HistoryActionBtn = styled.button`
  border: 1px solid rgba(59, 130, 246, 0.28);
  background: rgba(59, 130, 246, 0.12);
  color: #dbeafe;
  padding: 8px 11px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease;
  &:hover { transform: translateY(-1px); background: rgba(59, 130, 246, 0.18); }
`

const HistoryEmpty = styled.div`
  padding: 28px 16px;
  text-align: center;
  border: 1px dashed rgba(255,255,255,0.10);
  border-radius: 16px;
  color: ${COLOR.text2};
  background: rgba(255,255,255,0.03);
`

// ─── Helpers ──────────────────────────────────────────────────────────────────
const parseCfg = (v) => {
  if (!v) return {}
  if (typeof v === 'object') return v
  try { return JSON.parse(v) } catch { return {} }
}

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
  const { clientSession, isOpen: chatIsOpen } = useContext(ChatContext)
  const { activeClientEvent, setActiveClientEvent } = useContext(ChatContext)
  const { systemConfig } = useSystemConfig()
  const bubbleStyle = systemConfig?.bubbleConfig?.style || 'default'
  const [chatOffset, setChatOffset] = useState(62)
  const [events, setEvents] = useState([])
  const [history, setHistory] = useState([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelView, setPanelView] = useState('active')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [announcementEvent, setAnnouncementEvent] = useState(null)
  const announcedRef = useRef(new Set())

  // Measure the actual chat bubble width from the DOM so positioning is always exact
  useEffect(() => {
    const measure = () => {
      const el = document.querySelector('[data-chat-bubble-wrap]')
      if (!el) return
      const { width } = el.getBoundingClientRect()
      if (width > 0) setChatOffset(Math.ceil(width))
    }
    measure()
    const el = document.querySelector('[data-chat-bubble-wrap]')
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [bubbleStyle, chatIsOpen])

  const isEventExpired = useCallback((ev, now = Date.now()) => {
    if (!ev) return false

    const endsAt = ev.ends_at ? parseDateValue(ev.ends_at) : null
    if (endsAt) return endsAt.getTime() <= now

    const startsAt = ev.starts_at ? parseDateValue(ev.starts_at) : null
    if (startsAt && ev.duration_minutes) {
      return startsAt.getTime() + Number(ev.duration_minutes) * 60_000 <= now
    }

    return false
  }, [])

  const fetchEvents = useCallback(async () => {
    try {
      const data = await api.get('/api/client/events/active')
      const nextEvents = data.events || []
      setEvents(nextEvents)
      setActiveClientEvent((current) => {
        if (!current) return current
        const refreshed = nextEvents.find((ev) => Number(ev.id) === Number(current.id))
        return refreshed || current
      })
    } catch {
      // silent — overlay should never crash the page
    }
  }, [setActiveClientEvent])

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true)
    try {
      const data = await api.get('/api/client/events/history')
      setHistory(data.history || [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Fetch on mount + refresh every 30 s
  useEffect(() => {
    fetchEvents()
    if (clientSession) fetchHistory()
    const id = setInterval(fetchEvents, 30_000)
    return () => clearInterval(id)
  }, [fetchEvents, fetchHistory, clientSession])

  // Prune expired events from local state every 5 s without a server round-trip
  useEffect(() => {
    const id = setInterval(() => {
      const now = Date.now()
      setEvents((prev) => prev.filter((ev) => !isEventExpired(ev, now)))
    }, 5_000)
    return () => clearInterval(id)
  }, [isEventExpired])

  const paidHistoryEventIds = useMemo(() => new Set(
    history
      .filter((item) => item?.event?.id && (item.state === 'receipt_paid' || item.state === 'reward_paid'))
      .map((item) => Number(item.event.id))
  ), [history])

  const rewardPaidHistoryEventIds = useMemo(() => new Set(
    history
      .filter((item) => item?.event?.id && item.state === 'reward_paid')
      .map((item) => Number(item.event.id))
  ), [history])

  const historyByEventId = useMemo(() => {
    const map = new Map()
    for (const item of history) {
      if (!item?.event?.id) continue
      map.set(Number(item.event.id), item)
    }
    return map
  }, [history])

  const receiptGateTypes = useMemo(() => new Set(['briefcase', 'treasure_chest']), [])

  const openSelectedEvent = useCallback((event) => {
    if (!event) return
    setActiveClientEvent(event)
  }, [setActiveClientEvent])

  const closeSelectedEvent = useCallback((reason = 'manual') => {
    const current = activeClientEvent
    console.log('[EventsOverlay] closeSelectedEvent', {
      reason,
      currentId: current?.id,
      currentType: current?.type,
    })
    if (reason !== 'manual') {
      console.trace('[EventsOverlay] closeSelectedEvent trace')
    }
    if (String(current?.type || '').toLowerCase() === 'scratch' && reason !== 'manual') {
      return
    }
    setActiveClientEvent(null)
  }, [activeClientEvent, setActiveClientEvent])

  // Show announcement modal for new/unannounced events the client can participate in
  useEffect(() => {
    if (!clientSession || !events.length) return
    const paidIds = new Set(
      history
        .filter((item) => item?.event?.id && (item.state === 'receipt_paid' || item.state === 'reward_paid'))
        .map((item) => Number(item.event.id))
    )
    const first = events.find((e) =>
      !announcedRef.current.has(Number(e.id))
      && (!e.receipt_status || e.receipt_retryable)
      && !paidIds.has(Number(e.id))
      && (!e.has_played || e.receipt_retryable)
    )
    if (first) {
      announcedRef.current.add(Number(first.id))
      setAnnouncementEvent(first)
    }
  }, [events, history, clientSession])

  useEffect(() => {
    if (!activeClientEvent) return
    const currentEvent = events.find((ev) => Number(ev.id) === Number(activeClientEvent.id))
    const activeType = String(activeClientEvent.type || '').toLowerCase()
    if (activeType === 'scratch' || activeType === 'roulette' || activeType === 'slots' || receiptGateTypes.has(activeType)) return
    // Close the modal only when explicitly paid — NOT when the event disappears from the
    // active list, which happens as soon as a reward is marked paid (hiding it from
    // getActiveEvents). Closing on !currentEvent would interrupt scratch/quiz games
    // mid-play whenever the 30-second fetchEvents interval fires after settlement.
    if (currentEvent?.receipt_status === 'paid' || paidHistoryEventIds.has(Number(activeClientEvent.id))) {
      closeSelectedEvent('auto')
    }
  }, [activeClientEvent, closeSelectedEvent, events, paidHistoryEventIds, receiptGateTypes])

  useEffect(() => {
    if (!activeClientEvent) return
    const activeType = String(activeClientEvent.type || '').toLowerCase()
    if (!receiptGateTypes.has(activeType)) return

    const historyEntry = historyByEventId.get(Number(activeClientEvent.id))
    if (!historyEntry) return

    const nextReceiptStatus = String(historyEntry.receipt?.status || '').toLowerCase()
    const nextRewardPaid = historyEntry.state === 'reward_paid' || historyEntry.reward?.paid
    const shouldUnlockVoting = nextReceiptStatus === 'paid' || nextRewardPaid

    const nextEvent = {
      ...activeClientEvent,
      receipt_status: shouldUnlockVoting ? 'paid' : (nextReceiptStatus || activeClientEvent.receipt_status || null),
      receipt_retryable: shouldUnlockVoting ? false : Boolean(historyEntry.receipt?.retryable ?? activeClientEvent.receipt_retryable),
      has_pending_receipt: shouldUnlockVoting ? false : Boolean(historyEntry.receipt?.pending ?? activeClientEvent.has_pending_receipt),
      has_played: true,
      is_played_locked: shouldUnlockVoting ? false : Boolean(historyEntry.receipt?.pending ?? activeClientEvent.is_played_locked),
    }

    const currentReceiptStatus = String(activeClientEvent.receipt_status || '').toLowerCase()
    const currentUnlockState = Boolean(activeClientEvent.has_pending_receipt)
    const nextUnlockState = Boolean(nextEvent.has_pending_receipt)
    const changed = (
      currentReceiptStatus !== String(nextEvent.receipt_status || '').toLowerCase()
      || currentUnlockState !== nextUnlockState
      || Boolean(activeClientEvent.receipt_retryable) !== Boolean(nextEvent.receipt_retryable)
      || Boolean(activeClientEvent.is_played_locked) !== Boolean(nextEvent.is_played_locked)
    )

    if (changed) {
      setActiveClientEvent(nextEvent)
    }
  }, [activeClientEvent, historyByEventId, receiptGateTypes, setActiveClientEvent])

  // Socket: react to live event changes
  useEffect(() => {
    const socket = getSocket('client')
    const handler = () => {
      fetchEvents()
      fetchHistory()
    }
    const rewardHandler = () => { fetchEvents(); fetchHistory() }
    const receiptHandler = () => {
      fetchEvents()
      fetchHistory()
    }
    socket.on('event:new', handler)
    socket.on('event:finished', handler)
    socket.on('event:reward_paid', rewardHandler)
    socket.on('event:receipt_result', receiptHandler)
    return () => {
      socket.off('event:new', handler)
      socket.off('event:finished', handler)
      socket.off('event:reward_paid', rewardHandler)
      socket.off('event:receipt_result', receiptHandler)
    }
  }, [fetchEvents, fetchHistory])

  const availableEvents = events.filter((e) => {
    const type = String(e.type || '').toLowerCase()
    const isReceiptGate = receiptGateTypes.has(type)

    if (isReceiptGate) {
      return !rewardPaidHistoryEventIds.has(Number(e.id)) && !e.has_voted
    }

    return (!e.receipt_status || e.receipt_retryable)
      && !paidHistoryEventIds.has(Number(e.id))
      && (!e.has_played || e.receipt_retryable)
  })
  const availableCount = availableEvents.length
  const historyCount = history.length
  const showButton = clientSession && availableCount > 0

  const showAnnouncement = Boolean(announcementEvent && clientSession)

  if (!showButton && !showAnnouncement) return null

  return createPortal(
    <>
      {/* Announcement modal — shown on new event or page load */}
      {showAnnouncement && (() => {
        const ev = announcementEvent
        const cfg = parseCfg(ev.config_json)
        const minDeposit = Number(ev.min_deposit_amount || cfg.min_deposit_amount || 0)
        const prizeAmount = Number(ev.prize_amount || 0)
        const prizeType = ev.prize_type || 'fichas'
        return (
          <AnnouncementOverlay onClick={() => setAnnouncementEvent(null)}>
            <AnnouncementCard onClick={(e) => e.stopPropagation()}>
              <AnnouncementClose onClick={() => setAnnouncementEvent(null)} aria-label="Cerrar">×</AnnouncementClose>

              {cfg.image_url && (
                <img
                  src={cfg.image_url}
                  alt=""
                  style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 14, marginBottom: 16 }}
                />
              )}

              <AnnouncementTitle>{ev.title || 'Nuevo evento'}</AnnouncementTitle>

              {ev.description && (
                <AnnouncementDesc>{ev.description}</AnnouncementDesc>
              )}

              <AnnouncementPrize>
                🏆 {prizeAmount > 0 ? `${prizeAmount.toLocaleString('es-AR')} ${prizeType}` : 'Premio especial'}
              </AnnouncementPrize>

              {(minDeposit > 0 || ev.duration_minutes) && (
                <AnnouncementInfo>
                  {minDeposit > 0 && <div>Depósito mínimo: ${minDeposit.toLocaleString('es-AR')}</div>}
                  {ev.duration_minutes && <div>Duración: {ev.duration_minutes} min</div>}
                </AnnouncementInfo>
              )}

              <AnnouncementBtn
                onClick={() => {
                  setAnnouncementEvent(null)
                  openSelectedEvent(ev)
                }}
              >
                PARTICIPAR
              </AnnouncementBtn>
            </AnnouncementCard>
          </AnnouncementOverlay>
        )
      })()}

      {/* Floating button + panel + game modal (only when there are available events) */}
      {showButton && <>
      <FloatBtn
        onClick={() => {
          const opening = !panelOpen
          if (opening) {
            fetchEvents()
            if (clientSession) fetchHistory()
          }
          setPanelView(availableCount > 0 ? 'active' : 'history')
          setPanelOpen((p) => !p)
        }}
        $open={panelOpen}
        $pulse={availableCount > 0}
        $chatOffset={chatOffset}
        aria-label="Abrir eventos"
      >
        🎮 <span>{availableCount > 0 ? 'Juegos' : 'Eventos'}</span>
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

            <PanelHeader style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <span>{panelView === 'active' ? '🎮 Juegos disponibles' : '📜 Historial de eventos'}</span>
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
              </div>

              <SegmentTabs>
                <SegmentBtn
                  type="button"
                  $active={panelView === 'active'}
                  onClick={() => setPanelView('active')}
                >
                  Juegos {availableCount > 0 ? `(${availableCount})` : ''}
                </SegmentBtn>
                <SegmentBtn
                  type="button"
                  $active={panelView === 'history'}
                  onClick={() => setPanelView('history')}
                >
                  Historial {historyCount > 0 ? `(${historyCount})` : ''}
                </SegmentBtn>
              </SegmentTabs>
            </PanelHeader>

            {panelView === 'active' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {availableEvents.length > 0 ? availableEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    onClick={() => {
                      openSelectedEvent(event)
                      setPanelOpen(false)
                    }}
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

                    {event.receipt_retryable ? (
                      <PlayBtn
                        onClick={(e) => {
                          e.stopPropagation()
                          openSelectedEvent(event)
                          setPanelOpen(false)
                        }}
                      >
                        Reenviar comprobante
                      </PlayBtn>
                    ) : (
                      <PlayBtn
                        onClick={(e) => {
                          e.stopPropagation()
                          openSelectedEvent(event)
                          setPanelOpen(false)
                        }}
                      >
                        Jugar
                      </PlayBtn>
                    )}
                  </EventCard>
                )) : (
                  <HistoryEmpty>No hay juegos activos por ahora.</HistoryEmpty>
                )}
              </div>
            ) : (
              <HistoryList>
                {historyLoading ? (
                  <HistoryEmpty>Cargando historial...</HistoryEmpty>
                ) : history.length > 0 ? history.map((item) => {
                  const receipt = item.receipt || {}
                  const reward = item.reward || {}
                  const statusTone = item.state === 'reward_paid' ? 'good' : item.state === 'receipt_retryable' || item.state === 'receipt_pending' ? 'warn' : 'bad'
                  const timeline = [
                    {
                      key: 'play',
                      label: 'Participación',
                      text: item.participant.played_at
                        ? new Date(item.participant.played_at).toLocaleDateString('es-AR')
                        : 'Registrada',
                      state: 'done',
                    },
                    {
                      key: 'receipt',
                      label: 'Comprobante',
                      text: receipt.status === 'paid' || item.state === 'reward_paid'
                        ? 'Acreditado'
                        : (receipt.status || 'Pendiente'),
                      state: receipt.status === 'paid' || item.state === 'reward_paid' ? 'done' : (receipt.retryable || receipt.pending ? 'current' : 'pending'),
                    },
                    {
                      key: 'reward',
                      label: 'Premio',
                      text: reward.status === 'paid'
                        ? 'Pagado'
                        : reward.status || 'Pendiente',
                      state: reward.status === 'paid' ? 'done' : (reward.status ? 'current' : 'pending'),
                    },
                  ]
                  return (
                    <HistoryCard key={`history-${item.participant.id}-${item.event.id}`}>
                      <HistoryTop>
                        <EventEmoji $type={item.event.type} style={{ width: 44, height: 44 }}>
                          {GAME_EMOJI[item.event.type] || '🎮'}
                        </EventEmoji>

                        <HistoryTitleBlock>
                          <HistoryTitle>{item.event.title}</HistoryTitle>
                          <HistorySubtitle>
                            {item.event.description || 'Sin descripción del evento.'}
                          </HistorySubtitle>
                          <HistoryBadgeRow>
                            <HistoryBadge $tone={statusTone}>
                              {item.state === 'reward_paid' ? 'Premio acreditado' : item.state === 'receipt_retryable' ? 'Reenviar comprobante' : item.state === 'receipt_pending' ? 'Comprobante pendiente' : 'Evento finalizado'}
                            </HistoryBadge>
                            <HistoryBadge $tone={item.event.status === 'active' ? 'good' : 'wait'}>
                              {item.event.status}
                            </HistoryBadge>
                            {receipt.status && item.state !== 'reward_paid' && (
                              <HistoryBadge $tone={receipt.status === 'paid' ? 'good' : 'warn'}>
                                Comprobante: {receipt.status}
                              </HistoryBadge>
                            )}
                          </HistoryBadgeRow>
                        </HistoryTitleBlock>
                      </HistoryTop>

                      <HistoryTimeline>
                        {timeline.map((step, index) => (
                          <HistoryStep key={step.key} $active={step.state !== 'pending'}>
                            <HistoryStepHead>
                              <HistoryStepDot $state={step.state} />
                              {index < timeline.length - 1 && <HistoryStepLine $state={step.state === 'done' ? 'done' : 'wait'} />}
                            </HistoryStepHead>
                            <HistoryStepLabel>{step.label}</HistoryStepLabel>
                            <HistoryStepText>{step.text}</HistoryStepText>
                          </HistoryStep>
                        ))}
                      </HistoryTimeline>

                      <HistoryDetails>
                        <HistoryDetail>
                          <span>Participaste</span>
                          <strong>{item.participant.played_at ? new Date(item.participant.played_at).toLocaleString('es-AR') : 'Sin fecha'}</strong>
                        </HistoryDetail>
                        <HistoryDetail>
                          <span>Comprobante</span>
                          <strong>{receipt.uploaded_at ? new Date(receipt.uploaded_at).toLocaleString('es-AR') : 'No subido'}</strong>
                        </HistoryDetail>
                        <HistoryDetail>
                          <span>Premio</span>
                          <strong>{reward.amount != null ? `${reward.amount} fichas` : (item.event.prize_amount ? `${item.event.prize_amount} ${item.event.prize_type || 'fichas'}` : 'Sin premio')}</strong>
                        </HistoryDetail>
                        <HistoryDetail>
                          <span>Resultado</span>
                          <strong>{reward.status ? reward.status : item.state}</strong>
                        </HistoryDetail>
                      </HistoryDetails>

                      {(receipt.retryable || (item.event.type !== 'sorteo' && receipt.pending)) && !paidHistoryEventIds.has(Number(item.event.id)) && (
                        <HistoryActions>
                          <HistoryActionBtn
                            type="button"
                          onClick={() => {
                            const activeEvent = events.find((ev) => Number(ev.id) === Number(item.event.id)) || {
                              ...item.event,
                              has_played: false,
                              receipt_retryable: receipt.retryable,
                              has_pending_receipt: receipt.pending,
                              receipt_status: receipt.status || null,
                              receipt_processing_reason: receipt.processing_reason || null,
                            }
                            openSelectedEvent(activeEvent)
                            setPanelOpen(false)
                          }}
                          >
                            {receipt.retryable ? 'Reenviar comprobante' : 'Revisar comprobante'}
                          </HistoryActionBtn>
                        </HistoryActions>
                      )}
                    </HistoryCard>
                  )
                }) : (
                  <HistoryEmpty>No hay historial de eventos todavía.</HistoryEmpty>
                )}
              </HistoryList>
            )}
          </Panel>
        </>
      )}

      </>}
    </>,
    document.body
  )
}
