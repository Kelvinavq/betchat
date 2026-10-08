import { useCallback, useEffect, useRef, useState } from 'react'
import styled, { css, keyframes } from 'styled-components'
import { api } from '../../../utils/api.js'
import { useSystemConfig } from '../../../context/SystemConfigContext.jsx'

/* ── animations ── */
const fadeIn   = keyframes`from{opacity:0}to{opacity:1}`
const slideUp  = keyframes`from{opacity:0;transform:translateY(100%)}to{opacity:1;transform:translateY(0)}`
const slideIn  = keyframes`from{opacity:0;transform:translateX(18px)}to{opacity:1;transform:translateX(0)}`
const spin     = keyframes`to{transform:rotate(360deg)}`

/* ── tokens ── */
const T = {
  bg:      'var(--bc-client-body-bg, #0a0f1a)',
  surface: 'var(--bc-client-surface, #0e1525)',
  border:  'var(--bc-client-border, rgba(255,255,255,0.08))',
  t1:      'var(--bc-client-text, #f8fafc)',
  t2:      'var(--bc-client-text-2, #94a3b8)',
  t3:      'var(--bc-client-text-muted, rgba(255,255,255,0.28))',
  accent:  'var(--bc-client-accent, #3b82f6)',
  success: '#10b981',
  danger:  '#ef4444',
  gold:    '#f59e0b',
  warn:    '#f97316',
}

/* ── overlay & sheet ── */
const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 200;
  background: rgba(0,0,0,0.55);
  animation: ${fadeIn} 0.2s ease both;
`

const Sheet = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 201;
  max-height: 92%;
  background: ${T.bg};
  border-radius: 20px 20px 0 0;
  border-top: 1px solid ${T.border};
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: ${slideUp} 0.32s cubic-bezier(0.32, 0.72, 0, 1) both;
`

const Handle = styled.div`
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: rgba(255,255,255,0.15);
  margin: 10px auto 0;
  flex-shrink: 0;
`

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px 10px;
  flex-shrink: 0;
  border-bottom: 1px solid ${T.border};
`

const BackBtn = styled.button`
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: rgba(255,255,255,0.07);
  color: ${T.t2};
  font-size: 17px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.13); }
`

const SheetTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${T.t1};
  flex: 1;
`

const SheetBody = styled.div`
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
`

/* ── main menu list ── */
const MenuGroup = styled.div`
  background: ${T.surface};
  border-radius: 14px;
  margin: 14px 14px 0;
  overflow: hidden;
  border: 1px solid ${T.border};
`

const MenuItem = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 15px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid ${T.border};
  cursor: ${({ $disabled }) => $disabled ? 'default' : 'pointer'};
  text-align: left;
  transition: background 0.15s;
  &:last-child { border-bottom: none; }
  &:hover:not([disabled]) { background: rgba(255,255,255,0.04); }
`

const MenuItemIcon = styled.div`
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.08)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
`

const MenuItemText = styled.div`
  flex: 1;
  min-width: 0;
`

const MenuItemLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${T.t1};
`

const MenuItemSub = styled.div`
  font-size: 12px;
  color: ${T.t3};
  margin-top: 2px;
`

const MenuChevron = styled.span`
  font-size: 18px;
  color: ${T.t3};
  flex-shrink: 0;
`

const SoonBadge = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: ${T.t3};
  background: rgba(255,255,255,0.06);
  border-radius: 6px;
  padding: 2px 7px;
  border: 1px solid ${T.border};
`

/* ── history styles ── */
const HistSection = styled.div`
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`

const SectionLabel = styled.div`
  font-size: 11px;
  font-weight: 700;
  color: ${T.t3};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0 4px;
`

const HistGroup = styled.div`
  background: ${T.surface};
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid ${T.border};
`

const HistItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 14px;
  border-bottom: 1px solid ${T.border};
  animation: ${slideIn} 0.25s ease both;
  &:last-child { border-bottom: none; }
`

const HistIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.08)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
`

const HistInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const HistTitle = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${T.t1};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const HistSub = styled.div`
  font-size: 11px;
  color: ${T.t3};
  margin-top: 2px;
`

const HistRight = styled.div`
  text-align: right;
  flex-shrink: 0;
`

const HistAmount = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: ${({ $positive }) => $positive ? T.success : T.danger};
`

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  white-space: nowrap;
  background: ${({ $bg }) => $bg || 'rgba(255,255,255,0.06)'};
  color: ${({ $color }) => $color || T.t2};
  border: 1px solid ${({ $border }) => $border || T.border};
`

const EmptyBox = styled.div`
  text-align: center;
  padding: 32px 16px;
  color: ${T.t3};
  font-size: 13px;
`

const LoaderWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
`

const Spinner = styled.div`
  width: 22px;
  height: 22px;
  border: 2px solid rgba(255,255,255,0.1);
  border-top-color: ${T.accent};
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`

/* ── FAQ styles ── */
const FaqList = styled.div`
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const FaqItem = styled.div`
  background: ${T.surface};
  border-radius: 14px;
  border: 1px solid ${({ $open }) => $open ? 'rgba(var(--bc-client-accent-rgb, 59,130,246), 0.35)' : T.border};
  overflow: hidden;
  transition: border-color 0.2s;
`

const FaqQ = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  color: ${T.t1};
  font-size: 13px;
  font-weight: 600;
  line-height: 1.4;
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.03); }
`

const FaqChevron = styled.span`
  margin-left: auto;
  color: ${T.t3};
  font-size: 16px;
  flex-shrink: 0;
  transform: ${({ $open }) => $open ? 'rotate(90deg)' : 'rotate(0deg)'};
  transition: transform 0.2s;
`

const FaqA = styled.div`
  padding: 0 16px 14px;
  font-size: 13px;
  color: ${T.t2};
  line-height: 1.6;
  border-top: 1px solid ${T.border};
  padding-top: 12px;
  white-space: pre-wrap;
`

/* ── events view styles ── */
const EventCard = styled.div`
  background: ${T.surface};
  border: 1px solid ${T.border};
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  animation: ${slideIn} 0.22s ease both;
  transition: border-color 0.2s;
`

const EventCardRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const EventTypeIcon = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: ${({ $bg }) => $bg || 'rgba(var(--bc-client-accent-rgb, 59,130,246), 0.15)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`

const EventInfo = styled.div`
  flex: 1;
  min-width: 0;
`

const EventTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${T.t1};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const EventSubline = styled.div`
  font-size: 11px;
  color: ${T.t3};
  margin-top: 2px;
`

const SmallBadge = styled.span`
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  white-space: nowrap;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
  border: 1px solid ${({ $border }) => $border};
  flex-shrink: 0;
`

const ProgressTrack = styled.div`
  height: 7px;
  background: rgba(255,255,255,0.06);
  border-radius: 4px;
  overflow: hidden;
`

const ProgressFill = styled.div`
  height: 100%;
  border-radius: 4px;
  background: ${({ $done }) => $done
    ? 'linear-gradient(90deg,#10b981,#34d399)'
    : 'linear-gradient(90deg, var(--bc-client-accent, #3b82f6), rgba(var(--bc-client-accent-rgb, 59,130,246), 0.65))'};
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
  min-width: ${({ $pct }) => $pct > 0 ? '4px' : '0'};
`

const ProgressMeta = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: ${T.t3};
`

const PlayBtn = styled.button`
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px solid rgba(var(--bc-client-accent-rgb, 59,130,246), 0.35);
  background: rgba(var(--bc-client-accent-rgb, 59,130,246), 0.13);
  color: var(--bc-client-accent, #60a5fa);
  font-size: 12px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s;
  &:hover { background: rgba(var(--bc-client-accent-rgb, 59,130,246), 0.22); }
`

const LoadMoreBtn = styled.button`
  width: 100%;
  padding: 11px;
  border-radius: 10px;
  border: 1px solid ${T.border};
  background: rgba(255,255,255,0.04);
  color: ${T.t2};
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  margin-top: 8px;
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.08); }
  &:disabled { opacity: 0.5; cursor: default; }
`

const RefreshBtn = styled.button`
  background: none;
  border: none;
  color: ${T.t2};
  font-size: 20px;
  line-height: 1;
  padding: 4px 6px;
  cursor: pointer;
  transition: color 0.15s;
  &:hover { color: ${T.t1}; }
  &:disabled { color: ${T.t3}; cursor: default; }
  ${({ $spinning }) => $spinning && css`animation: ${spin} 0.7s linear infinite;`}
`

const ViewAllBtn = styled.button`
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(var(--bc-client-accent-rgb, 59,130,246), 0.32);
  background: rgba(var(--bc-client-accent-rgb, 59,130,246), 0.07);
  color: var(--bc-client-accent, #60a5fa);
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: background 0.15s;
  &:hover { background: rgba(var(--bc-client-accent-rgb, 59,130,246), 0.14); }
`

/* ── helpers ── */
const GAME_ICONS = {
  sorteo:'🎰', quiz:'🧠', scratch:'🎫', roulette:'⚙️',
  slots:'🎰', red_black:'🔴', briefcase:'💼', treasure_chest:'💎', ranking:'🏆',
}
const GAME_ICON_BG = {
  ranking: 'rgba(245,158,11,0.15)',
  quiz:    'rgba(139,92,246,0.15)',
  scratch: 'rgba(16,185,129,0.15)',
  sorteo:  'rgba(239,68,68,0.12)',
}

const MISSION_LABEL = {
  deposit_amount: 'Monto depositado',
  deposit_count:  'Depósitos realizados',
  charge_count:   'Cargas realizadas',
  other:          'Progreso',
}

const STATUS_MAP = {
  paid:       { label: 'Acreditado', color: T.success, bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  pending:    { label: 'En revisión', color: T.gold,   bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)' },
  approved:   { label: 'Aprobado',   color: T.success, bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)' },
  rejected:   { label: 'Rechazado',  color: T.danger,  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
  error:      { label: 'Error',      color: T.danger,  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
  duplicate:  { label: 'Duplicado',  color: T.warn,    bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)' },
  invalid:    { label: 'Inválido',   color: T.danger,  bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.25)' },
  amount_low: { label: 'Monto bajo', color: T.warn,    bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.25)' },
}

function fmtStatus(s) {
  return STATUS_MAP[s] || { label: s || '—', color: T.t3, bg: 'rgba(255,255,255,0.06)', border: T.border }
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function fmtAmount(n) {
  if (!n && n !== 0) return '—'
  return `$${new Intl.NumberFormat('es-AR').format(Number(n))}`
}

/* ══════════════════════════════════════════════════════════════
   SUB-VIEWS
══════════════════════════════════════════════════════════════ */

/* ── Ranking event card with live progress ── */
function RankingEventCard({ event }) {
  const [prog, setProg] = useState(null)

  useEffect(() => {
    api.get(`/api/client/events/${event.id}/ranking-progress`)
      .then(res => setProg(res))
      .catch(() => {})
  }, [event.id])

  const cfg = event.config_json || {}
  const goal = Number(prog?.goal ?? cfg.goal_amount ?? 0)
  const cur  = Number(prog?.progress ?? 0)
  const pct  = goal > 0 ? Math.min(Math.round(cur / goal * 100), 100) : 0
  const missionType = prog?.missionType ?? cfg.mission_type ?? 'deposit_amount'
  const isAmount = missionType === 'deposit_amount'
  const fmt = (v) => isAmount ? `$${Number(v).toLocaleString('es-AR')}` : String(Math.round(v))
  const mLabel = MISSION_LABEL[missionType] || 'Progreso'
  const done = pct >= 100

  return (
    <EventCard>
      <EventCardRow>
        <EventTypeIcon $bg="rgba(245,158,11,0.15)">🏆</EventTypeIcon>
        <EventInfo>
          <EventTitle>{event.title}</EventTitle>
          <EventSubline>Ranking · {mLabel}</EventSubline>
        </EventInfo>
        {done && (
          <SmallBadge $bg="rgba(16,185,129,0.15)" $color="#10b981" $border="rgba(16,185,129,0.3)">
            ✓ Meta cumplida
          </SmallBadge>
        )}
      </EventCardRow>

      {prog ? (
        <>
          <ProgressTrack>
            <ProgressFill $pct={pct} $done={done} />
          </ProgressTrack>
          <ProgressMeta>
            <span>{fmt(cur)} acumulado</span>
            <span>Meta {fmt(goal)} · <strong style={{ color: done ? T.success : '#60a5fa' }}>{pct}%</strong></span>
          </ProgressMeta>
        </>
      ) : (
        <ProgressTrack />
      )}
    </EventCard>
  )
}

/* ── Regular event card ── */
function OtherEventCard({ event, onOpenOverlay }) {
  const type = String(event.type || '').toLowerCase()
  const icon = GAME_ICONS[type] || '🎮'
  const iconBg = GAME_ICON_BG[type] || 'rgba(59,130,246,0.15)'

  return (
    <EventCard>
      <EventCardRow>
        <EventTypeIcon $bg={iconBg}>{icon}</EventTypeIcon>
        <EventInfo>
          <EventTitle>{event.title}</EventTitle>
          <EventSubline>
            {event.prize_amount
              ? `🏆 ${Number(event.prize_amount).toLocaleString('es-AR')} ${event.prize_type || 'fichas'}`
              : 'Evento disponible'}
          </EventSubline>
        </EventInfo>
        <PlayBtn type="button" onClick={onOpenOverlay}>
          Jugar →
        </PlayBtn>
      </EventCardRow>
    </EventCard>
  )
}

/* ── Events empty state ── */
function EventsEmptyState() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '52px 28px 36px', gap: 0, textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'rgba(59,130,246,0.08)',
        border: '1px solid rgba(59,130,246,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 34, marginBottom: 20,
      }}>
        🎮
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: T.t1, marginBottom: 8 }}>
        Sin eventos activos
      </div>
      <div style={{ fontSize: 13, color: T.t3, lineHeight: 1.65, maxWidth: 240 }}>
        Por ahora no hay promociones ni juegos disponibles. ¡Volvé pronto para no perderte nada!
      </div>
    </div>
  )
}

/* ── Events view ── */
function EventsView({ onBack, onOpenOverlay }) {
  const [events, setEvents]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/api/client/events/active')
      setEvents(res.events || [])
    } catch (e) {
      setError(e.message || 'Error al cargar eventos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const rankingEnrolled = events.filter(e => String(e.type).toLowerCase() === 'ranking' && e.has_played)
  const others          = events.filter(e => !(String(e.type).toLowerCase() === 'ranking' && e.has_played))

  return (
    <>
      <SheetHeader>
        <BackBtn type="button" onClick={onBack}>←</BackBtn>
        <SheetTitle>Eventos activos</SheetTitle>
        {events.length > 0 && (
          <button
            type="button"
            onClick={onOpenOverlay}
            style={{
              background: 'rgba(59,130,246,0.13)', border: '1px solid rgba(59,130,246,0.3)',
              borderRadius: 8, color: '#60a5fa', fontSize: 12, fontWeight: 700,
              fontFamily: 'inherit', cursor: 'pointer', padding: '5px 11px',
            }}
          >
            Ver todos
          </button>
        )}
      </SheetHeader>

      <SheetBody>
        {loading ? (
          <LoaderWrap><Spinner /></LoaderWrap>
        ) : error ? (
          <EmptyBox>{error}</EmptyBox>
        ) : events.length === 0 ? (
          <EventsEmptyState />
        ) : (
          <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rankingEnrolled.length > 0 && (
              <>
                <SectionLabel>Tu progreso</SectionLabel>
                {rankingEnrolled.map(e => <RankingEventCard key={e.id} event={e} />)}
              </>
            )}

            {others.length > 0 && (
              <>
                <SectionLabel style={{ marginTop: rankingEnrolled.length ? 4 : 0 }}>
                  {rankingEnrolled.length ? 'Otros eventos' : 'Disponibles ahora'}
                </SectionLabel>
                {others.map(e => <OtherEventCard key={e.id} event={e} onOpenOverlay={onOpenOverlay} />)}
              </>
            )}

            <ViewAllBtn type="button" onClick={onOpenOverlay}>
              <span>🎮</span> Abrir pantalla de eventos
            </ViewAllBtn>
          </div>
        )}
        <div style={{ height: 20 }} />
      </SheetBody>
    </>
  )
}

function useTabHistory(type) {
  const [items, setItems]       = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [hasMore, setHasMore]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const fetchPage = useCallback(async (p, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true)
    try {
      const res = await api.get(`/api/client/history/movements?type=${type}&page=${p}&limit=20`)
      setItems(prev => append ? [...prev, ...(res.items || [])] : (res.items || []))
      setTotal(res.total || 0)
      setHasMore(res.hasMore || false)
      setPage(p)
    } catch {
      if (!append) setItems([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [type])

  const loadMore = useCallback(() => fetchPage(page + 1, true), [fetchPage, page])
  const reload   = useCallback(() => fetchPage(1, false), [fetchPage])

  return { items, total, hasMore, loading, loadingMore, loadMore, reload }
}

function DepositItem({ d }) {
  const st = fmtStatus(d.status)
  return (
    <HistItem>
      <HistIcon $bg={d.status === 'paid' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.12)'}>
        {d.event ? '🎮' : '💳'}
      </HistIcon>
      <HistInfo>
        <HistTitle>{d.label || (d.event ? d.event.title || 'Evento' : 'Carga')}</HistTitle>
        <HistSub>
          {fmtDate(d.created_at)}
          {d.event && <span style={{ color: T.accent, marginLeft: 6 }}>• Evento</span>}
        </HistSub>
      </HistInfo>
      <HistRight>
        <HistAmount $positive={d.status === 'paid'}>{fmtAmount(d.amount)}</HistAmount>
        <div style={{ marginTop: 4 }}>
          <StatusBadge $bg={st.bg} $color={st.color} $border={st.border}>{st.label}</StatusBadge>
        </div>
      </HistRight>
    </HistItem>
  )
}

function WithdrawalItem({ w }) {
  const st = fmtStatus(w.status)
  const isAdj = w.kind === 'adjustment'
  return (
    <HistItem>
      <HistIcon $bg={isAdj ? 'rgba(99,102,241,0.13)' : w.status === 'approved' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)'}>
        {isAdj ? '⚙️' : '💸'}
      </HistIcon>
      <HistInfo>
        <HistTitle>{isAdj ? 'Ajuste de saldo' : 'Solicitud de retiro'}</HistTitle>
        <HistSub>{fmtDate(w.created_at)}</HistSub>
        {w.rejection_message && (
          <div style={{ fontSize: 11, color: T.danger, marginTop: 3 }}>{w.rejection_message}</div>
        )}
      </HistInfo>
      <HistRight>
        <HistAmount $positive={false}>{w.amount ? fmtAmount(w.amount) : '—'}</HistAmount>
        <div style={{ marginTop: 4 }}>
          <StatusBadge $bg={st.bg} $color={st.color} $border={st.border}>{st.label}</StatusBadge>
        </div>
      </HistRight>
    </HistItem>
  )
}

function MovementHistory({ onBack }) {
  const [tab, setTab] = useState('deposits')

  const deposits    = useTabHistory('deposits')
  const withdrawals = useTabHistory('withdrawals')

  useEffect(() => { deposits.reload()    }, [])  // eslint-disable-line
  useEffect(() => { withdrawals.reload() }, [])  // eslint-disable-line

  const active = tab === 'deposits' ? deposits : withdrawals

  return (
    <>
      <SheetHeader>
        <BackBtn type="button" onClick={onBack}>←</BackBtn>
        <SheetTitle>Cargas y retiros</SheetTitle>
      </SheetHeader>

      <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        {[
          { id: 'deposits',    label: `Cargas${deposits.total    ? ` (${deposits.total})`    : ''}` },
          { id: 'withdrawals', label: `Retiros${withdrawals.total ? ` (${withdrawals.total})` : ''}` },
        ].map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, padding: '11px 0',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.id ? T.accent : 'transparent'}`,
              color: tab === t.id ? '#60a5fa' : T.t3,
              fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              fontFamily: 'inherit', cursor: 'pointer',
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <SheetBody>
        {active.loading ? (
          <LoaderWrap><Spinner /></LoaderWrap>
        ) : active.items.length === 0 ? (
          <EmptyBox>{tab === 'deposits' ? 'Sin cargas registradas' : 'Sin retiros registrados'}</EmptyBox>
        ) : (
          <HistSection>
            <HistGroup>
              {tab === 'deposits'
                ? deposits.items.map(d => <DepositItem key={`dep-${d.id}`} d={d} />)
                : withdrawals.items.map(w => <WithdrawalItem key={`wd-${w.kind}-${w.id}`} w={w} />)
              }
            </HistGroup>
            {active.hasMore && (
              <LoadMoreBtn
                type="button"
                disabled={active.loadingMore}
                onClick={active.loadMore}
              >
                {active.loadingMore ? 'Cargando...' : 'Cargar más'}
              </LoadMoreBtn>
            )}
          </HistSection>
        )}
        <div style={{ height: 20 }} />
      </SheetBody>
    </>
  )
}

function FaqView({ onBack }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null)

  useEffect(() => {
    api.get('/api/faq').then(res => setItems(res.items || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <SheetHeader>
        <BackBtn type="button" onClick={onBack}>←</BackBtn>
        <SheetTitle>Preguntas frecuentes</SheetTitle>
      </SheetHeader>
      <SheetBody>
        {loading ? (
          <LoaderWrap><Spinner /></LoaderWrap>
        ) : items.length === 0 ? (
          <EmptyBox>No hay preguntas frecuentes disponibles.</EmptyBox>
        ) : (
          <FaqList>
            {items.map(item => (
              <FaqItem key={item.id} $open={open === item.id}>
                <FaqQ type="button" onClick={() => setOpen(open === item.id ? null : item.id)}>
                  <span style={{ flex: 1 }}>{item.question}</span>
                  <FaqChevron $open={open === item.id}>›</FaqChevron>
                </FaqQ>
                {open === item.id && <FaqA>{item.answer}</FaqA>}
              </FaqItem>
            ))}
          </FaqList>
        )}
        <div style={{ height: 20 }} />
      </SheetBody>
    </>
  )
}

function fmtMoney(n) {
  return new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n))
}

function GameRoundItem({ item }) {
  const bet = item.bet
  const win = item.win
  const net = win - bet
  const noActivity = bet === 0 && win === 0
  const won  = !noActivity && net > 0
  const lost = !noActivity && net < 0

  return (
    <HistItem>
      <HistIcon $bg={won ? 'rgba(16,185,129,0.15)' : lost ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.06)'}>
        🎮
      </HistIcon>
      <HistInfo>
        <HistTitle>{item.game || 'Juego'}</HistTitle>
        <HistSub>
          {item.label || item.provider}
          {item.datetime_close
            ? ` · ${fmtDate(item.datetime_close)}`
            : item.datetime_open ? ` · ${fmtDate(item.datetime_open)}` : ''}
        </HistSub>
      </HistInfo>
      <HistRight>
        {noActivity ? (
          <HistAmount style={{ color: T.t3 }}>—</HistAmount>
        ) : (
          <HistAmount $positive={won}>
            {won ? `+$${fmtMoney(net)}` : `-$${fmtMoney(net)}`}
          </HistAmount>
        )}
        <div style={{ marginTop: 4 }}>
          {!item.round_finished ? (
            <StatusBadge $bg="rgba(245,158,11,0.1)" $color={T.gold} $border="rgba(245,158,11,0.25)">
              En curso
            </StatusBadge>
          ) : noActivity ? (
            <StatusBadge $bg="rgba(255,255,255,0.05)" $color={T.t3} $border={T.border}>
              Sin apuesta
            </StatusBadge>
          ) : won ? (
            <StatusBadge $bg="rgba(16,185,129,0.12)" $color={T.success} $border="rgba(16,185,129,0.3)">
              ✓ Ganaste
            </StatusBadge>
          ) : (
            <StatusBadge $bg="rgba(239,68,68,0.1)" $color={T.danger} $border="rgba(239,68,68,0.25)">
              ✗ Perdiste
            </StatusBadge>
          )}
        </div>
      </HistRight>
    </HistItem>
  )
}

function GamesHistory({ onBack }) {
  const [items, setItems]             = useState([])
  const [page, setPage]               = useState(1)
  const [pageCount, setPageCount]     = useState(0)
  const [loading, setLoading]         = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState('')

  const fetchGames = useCallback(async (p, append = false) => {
    if (p === 1) setLoading(true); else setLoadingMore(true)
    setError('')
    try {
      const res = await api.get(`/api/client/history/games?page=${p}&limit=20`)
      setItems(prev => append ? [...prev, ...(res.items || [])] : (res.items || []))
      setPageCount(res.pageCount || 0)
      setPage(p)
    } catch (e) {
      setError(e.message || 'Error al cargar el historial')
      if (!append) setItems([])
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  useEffect(() => { fetchGames(1) }, [fetchGames])

  useEffect(() => {
    const onRefresh = () => fetchGames(1)
    window.addEventListener('client:games-refresh', onRefresh)
    return () => window.removeEventListener('client:games-refresh', onRefresh)
  }, [fetchGames])

  const hasMore = page < pageCount

  return (
    <>
      <SheetHeader>
        <BackBtn type="button" onClick={onBack}>←</BackBtn>
        <SheetTitle>Historial de juegos</SheetTitle>
        <RefreshBtn
          type="button"
          onClick={() => fetchGames(1)}
          disabled={loading}
          $spinning={loading}
          title="Actualizar"
        >
          ↻
        </RefreshBtn>
        <span style={{ fontSize: 11, color: T.t3 }}>Últimos 7 días</span>
      </SheetHeader>

      <SheetBody>
        {loading ? (
          <LoaderWrap><Spinner /></LoaderWrap>
        ) : error ? (
          <EmptyBox>
            <div style={{ fontSize: 30, marginBottom: 10 }}>⚠️</div>
            <div>{error}</div>
          </EmptyBox>
        ) : items.length === 0 ? (
          <EmptyBox>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
            <div style={{ color: T.t2, fontWeight: 600, marginBottom: 6 }}>Sin historial</div>
            <div>No se registraron partidas en los últimos 90 días.</div>
          </EmptyBox>
        ) : (
          <HistSection>
            <HistGroup>
              {items.map(item => <GameRoundItem key={item.id} item={item} />)}
            </HistGroup>
            {hasMore && (
              <LoadMoreBtn
                type="button"
                disabled={loadingMore}
                onClick={() => fetchGames(page + 1, true)}
              >
                {loadingMore ? 'Cargando...' : `Cargar más · pág. ${page + 1} de ${pageCount}`}
              </LoadMoreBtn>
            )}
          </HistSection>
        )}
        <div style={{ height: 20 }} />
      </SheetBody>
    </>
  )
}

/* ── Caudal deposit/withdrawal styled components ── */
const CaudalSection = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`

const TabRow = styled.div`
  display: flex;
  background: ${T.surface};
  border-radius: 10px;
  border: 1px solid ${T.border};
  overflow: hidden;
  flex-shrink: 0;
`

const TabBtn = styled.button`
  flex: 1;
  padding: 9px 0;
  background: ${({ $active }) => $active ? 'rgba(59,130,246,0.18)' : 'none'};
  border: none;
  color: ${({ $active }) => $active ? '#60a5fa' : T.t3};
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 700 : 500};
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
`

const DropZone = styled.div`
  border: 2px dashed ${({ $drag }) => $drag ? 'rgba(59,130,246,0.6)' : T.border};
  border-radius: 14px;
  background: ${({ $drag }) => $drag ? 'rgba(59,130,246,0.06)' : T.surface};
  padding: 28px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.18s, background 0.18s;
  &:hover { border-color: rgba(59,130,246,0.45); background: rgba(59,130,246,0.04); }
`

const DropIcon = styled.div`
  font-size: 32px;
  line-height: 1;
`

const DropLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${T.t1};
`

const DropSub = styled.div`
  font-size: 12px;
  color: ${T.t3};
`

const PreviewBox = styled.div`
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid ${T.border};
  background: ${T.surface};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
`

const PreviewImg = styled.img`
  max-width: 100%;
  max-height: 180px;
  border-radius: 8px;
  object-fit: contain;
`

const PdfPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 6px 4px;
`

const PdfName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${T.t1};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const FieldLabel = styled.label`
  font-size: 12px;
  font-weight: 700;
  color: ${T.t2};
  letter-spacing: 0.04em;
`

const FieldInput = styled.input`
  width: 100%;
  padding: 11px 13px;
  background: ${T.surface};
  border: 1px solid ${T.border};
  border-radius: 10px;
  color: ${T.t1};
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
  &:focus { border-color: rgba(59,130,246,0.55); }
  &::placeholder { color: ${T.t3}; }
`

const PrimaryBtn = styled.button`
  width: 100%;
  padding: 13px;
  border-radius: 12px;
  border: none;
  background: ${({ $danger }) => $danger
    ? 'linear-gradient(135deg,#ef4444,#dc2626)'
    : 'linear-gradient(135deg,#3b82f6,#2563eb)'};
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: opacity 0.15s;
  &:disabled { opacity: 0.55; cursor: default; }
`

const ResultCard = styled.div`
  border-radius: 14px;
  border: 1px solid ${({ $ok }) => $ok ? 'rgba(16,185,129,0.35)' : 'rgba(239,68,68,0.35)'};
  background: ${({ $ok }) => $ok ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)'};
  padding: 20px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
`

const ResultIcon = styled.div`
  font-size: 36px;
  line-height: 1;
`

const ResultTitle = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${({ $ok }) => $ok ? T.success : T.danger};
`

const ResultMsg = styled.div`
  font-size: 13px;
  color: ${T.t2};
  line-height: 1.55;
`

const SecondaryBtn = styled.button`
  padding: 9px 20px;
  border-radius: 10px;
  border: 1px solid ${T.border};
  background: rgba(255,255,255,0.06);
  color: ${T.t2};
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.11); }
`

const SmallSpinner = styled.div`
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255,255,255,0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
  flex-shrink: 0;
`

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

/* ── DepositCaudalView ── */
function DepositCaudalView({ onBack, chatId }) {
  const [tab, setTab]           = useState('upload')   // 'upload' | 'manual'
  const [file, setFile]         = useState(null)       // File object
  const [previewUrl, setPreviewUrl] = useState(null)
  const [drag, setDrag]         = useState(false)
  const [status, setStatus]     = useState('idle')     // idle | loading | success | error
  const [result, setResult]     = useState(null)
  const [errMsg, setErrMsg]     = useState('')
  // manual form
  const [amount, setAmount]     = useState('')
  const [fullName, setFullName] = useState('')
  const fileRef = useRef(null)

  const reset = () => {
    setFile(null)
    setPreviewUrl(null)
    setStatus('idle')
    setResult(null)
    setErrMsg('')
    setAmount('')
    setFullName('')
  }

  const handleFile = (f) => {
    if (!f) return
    if (f.size > MAX_FILE_SIZE) { setErrMsg('El archivo supera los 10 MB.'); return }
    setErrMsg('')
    setFile(f)
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f)
      setPreviewUrl(url)
    } else {
      setPreviewUrl(null)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const handleSubmitFile = async () => {
    if (!file) return
    setStatus('loading')
    setErrMsg('')
    try {
      const isPdf = file.type === 'application/pdf'
      const fd = new FormData()
      fd.append('file', file)
      const endpoint = isPdf
        ? `/api/client/chats/${chatId}/caudal/process-pdf`
        : `/api/client/chats/${chatId}/caudal/process-image`
      const res = await api.post(endpoint, fd)
      setResult(res)
      setStatus('success')
    } catch (e) {
      setErrMsg(e.message || 'Error al procesar el comprobante')
      setStatus('error')
    }
  }

  const handleSubmitManual = async () => {
    if (!amount || Number(amount) <= 0) { setErrMsg('Ingresá un monto válido.'); return }
    setStatus('loading')
    setErrMsg('')
    try {
      const body = { amount: Number(amount) }
      if (fullName.trim()) body.fullName = fullName.trim()
      const res = await api.post(`/api/client/chats/${chatId}/caudal/report-payment`, body)
      setResult(res)
      setStatus('success')
    } catch (e) {
      setErrMsg(e.message || 'Error al reportar el pago')
      setStatus('error')
    }
  }

  const isPdf = file?.type === 'application/pdf'

  const decisionMsg = () => {
    if (!result) return ''
    if (result.decision === 'paid') return 'Tu saldo fue acreditado exitosamente.'
    if (result.decision === 'pending') return 'Tu comprobante está en revisión. Te avisaremos cuando sea procesado.'
    return result.message || 'Operación registrada.'
  }

  return (
    <>
      <SheetHeader>
        <BackBtn type="button" onClick={onBack}>←</BackBtn>
        <SheetTitle>Reportar pago Caudal</SheetTitle>
      </SheetHeader>

      <SheetBody>
        <CaudalSection>
          {/* Tab selector */}
          <TabRow>
            <TabBtn $active={tab === 'upload'} type="button" onClick={() => { setTab('upload'); reset() }}>
              Subir comprobante
            </TabBtn>
            <TabBtn $active={tab === 'manual'} type="button" onClick={() => { setTab('manual'); reset() }}>
              Ingresar monto
            </TabBtn>
          </TabRow>

          {/* ── Upload tab ── */}
          {tab === 'upload' && status === 'idle' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])}
              />

              {!file ? (
                <DropZone
                  $drag={drag}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDrag(true) }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={handleDrop}
                >
                  <DropIcon>📎</DropIcon>
                  <DropLabel>Arrastrá tu comprobante aquí</DropLabel>
                  <DropSub>o hacé clic para seleccionar un archivo</DropSub>
                  <DropSub>JPG, PNG, WEBP, GIF, PDF · Máx. 10 MB</DropSub>
                </DropZone>
              ) : (
                <PreviewBox>
                  {!isPdf ? (
                    <PreviewImg src={previewUrl} alt="Comprobante" />
                  ) : (
                    <PdfPreview>
                      <span style={{ fontSize: 28 }}>📄</span>
                      <PdfName>{file.name}</PdfName>
                    </PdfPreview>
                  )}
                  <SecondaryBtn type="button" onClick={() => { setFile(null); setPreviewUrl(null); setErrMsg('') }}>
                    Cambiar archivo
                  </SecondaryBtn>
                </PreviewBox>
              )}

              {errMsg && <div style={{ fontSize: 12, color: T.danger }}>{errMsg}</div>}

              {file && (
                <PrimaryBtn type="button" onClick={handleSubmitFile}>
                  Subir comprobante
                </PrimaryBtn>
              )}
            </>
          )}

          {tab === 'upload' && status === 'loading' && (
            <LoaderWrap style={{ flexDirection: 'column', gap: 14 }}>
              <Spinner />
              <div style={{ fontSize: 13, color: T.t3 }}>Procesando comprobante…</div>
            </LoaderWrap>
          )}

          {tab === 'upload' && (status === 'success' || status === 'error') && (
            <ResultCard $ok={status === 'success'}>
              <ResultIcon>{status === 'success' ? '✅' : '❌'}</ResultIcon>
              <ResultTitle $ok={status === 'success'}>
                {status === 'success'
                  ? (result?.decision === 'paid' ? 'Saldo acreditado' : 'En revisión')
                  : 'Error al procesar'}
              </ResultTitle>
              <ResultMsg>{status === 'success' ? decisionMsg() : errMsg}</ResultMsg>
              <SecondaryBtn type="button" onClick={reset}>
                {status === 'success' ? 'Subir otro' : 'Reintentar'}
              </SecondaryBtn>
            </ResultCard>
          )}

          {/* ── Manual tab ── */}
          {tab === 'manual' && status === 'idle' && (
            <>
              <FormField>
                <FieldLabel htmlFor="caudal-amount">Monto *</FieldLabel>
                <FieldInput
                  id="caudal-amount"
                  type="number"
                  min="1"
                  placeholder="Ej: 5000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </FormField>

              <FormField>
                <FieldLabel htmlFor="caudal-fullname">Titular de la cuenta (opcional)</FieldLabel>
                <FieldInput
                  id="caudal-fullname"
                  type="text"
                  placeholder="Nombre completo del titular"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </FormField>

              {errMsg && <div style={{ fontSize: 12, color: T.danger }}>{errMsg}</div>}

              <PrimaryBtn type="button" onClick={handleSubmitManual} disabled={!amount}>
                Reportar pago
              </PrimaryBtn>
            </>
          )}

          {tab === 'manual' && status === 'loading' && (
            <LoaderWrap style={{ flexDirection: 'column', gap: 14 }}>
              <Spinner />
              <div style={{ fontSize: 13, color: T.t3 }}>Registrando pago…</div>
            </LoaderWrap>
          )}

          {tab === 'manual' && (status === 'success' || status === 'error') && (
            <ResultCard $ok={status === 'success'}>
              <ResultIcon>{status === 'success' ? '✅' : '❌'}</ResultIcon>
              <ResultTitle $ok={status === 'success'}>
                {status === 'success' ? 'Pago reportado' : 'Error al reportar'}
              </ResultTitle>
              <ResultMsg>{status === 'success' ? decisionMsg() : errMsg}</ResultMsg>
              <SecondaryBtn type="button" onClick={reset}>
                {status === 'success' ? 'Reportar otro' : 'Reintentar'}
              </SecondaryBtn>
            </ResultCard>
          )}
        </CaudalSection>
        <div style={{ height: 20 }} />
      </SheetBody>
    </>
  )
}

/* ── WithdrawalCaudalView ── */
function WithdrawalCaudalView({ onBack, chatId }) {
  const [destType, setDestType] = useState('CBU')   // 'CBU' | 'CVU'
  const [destination, setDestination] = useState('')
  const [amount, setAmount]     = useState('')
  const [holderName, setHolderName] = useState('')
  const [dni, setDni] = useState('')
  const [clientReferenceId, setClientReferenceId] = useState(() => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
  const [status, setStatus]     = useState('idle')  // idle | loading | success | error
  const [result, setResult]     = useState(null)
  const [errMsg, setErrMsg]     = useState('')

  const reset = () => {
    setDestination('')
    setAmount('')
    setHolderName('')
    setDni('')
    setClientReferenceId(globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`)
    setStatus('idle')
    setResult(null)
    setErrMsg('')
  }

  const handleSubmit = async () => {
    if (!amount || Number(amount) < 1) { setErrMsg('Ingresá un monto válido (mínimo 1).'); return }
    setStatus('loading')
    setErrMsg('')
    try {
      if (!/^\d{22}$/.test(destination.replace(/\D/g, ''))) throw new Error('Ingresá un CBU/CVU válido de 22 dígitos.')
      if (holderName.trim().split(/\s+/).length < 2) throw new Error('Ingresá el nombre y apellido del titular.')
      if (!/^\d{8}$/.test(dni.replace(/\D/g, ''))) throw new Error('Ingresá un DNI válido de 8 dígitos.')
      const body = {
        amount: Number(amount),
        holderName: holderName.trim(),
        dni: dni.replace(/\D/g, ''),
        method: destType.toLowerCase(),
        cbu: destination.replace(/\D/g, ''),
        clientReferenceId,
      }
      const res = await api.post(`/api/client/chats/${chatId}/caudal/withdrawal-request`, body)
      setResult(res)
      setStatus('success')
    } catch (e) {
      setErrMsg(e.message || 'Error al enviar la solicitud')
      setStatus('error')
    }
  }

  const statusLabel = () => {
    if (!result) return ''
    const s = result.status || ''
    if (s === 'REVIEW_PENDING') return 'Tu solicitud está en revisión.'
    if (s === 'INITIATED' || s === 'DISPATCHED') return 'Tu retiro está en proceso.'
    return result.message || 'Solicitud registrada.'
  }

  const hasRisk = result?.riskScore != null || result?.status === 'REVIEW_PENDING'

  return (
    <>
      <SheetHeader>
        <BackBtn type="button" onClick={onBack}>←</BackBtn>
        <SheetTitle>Solicitar retiro</SheetTitle>
      </SheetHeader>

      <SheetBody>
        <CaudalSection>
          {status === 'idle' && (
            <>
              {/* Destination type toggle */}
              <FormField>
                <FieldLabel>Tipo de destino</FieldLabel>
                <TabRow>
                  <TabBtn $active={destType === 'CBU'} type="button" onClick={() => { setDestType('CBU'); setDestination('') }}>
                    CBU
                  </TabBtn>
                  <TabBtn $active={destType === 'CVU'} type="button" onClick={() => { setDestType('CVU'); setDestination('') }}>
                    CVU
                  </TabBtn>
                </TabRow>
              </FormField>

              <FormField>
                <FieldLabel htmlFor="wd-destination">
                  {destType} (22 dígitos) *
                </FieldLabel>
                <FieldInput
                  id="wd-destination"
                  type="text"
                  inputMode="numeric"
                  maxLength={22}
                  placeholder="Ej: 0000003100012345678901"
                  value={destination}
                  onChange={e => setDestination(e.target.value.replace(/\D/g, '').slice(0, 22))}
                />
              </FormField>

              <FormField>
                <FieldLabel htmlFor="wd-holder">Nombre y apellido del titular *</FieldLabel>
                <FieldInput
                  id="wd-holder"
                  type="text"
                  placeholder="Ej: Juan Perez"
                  value={holderName}
                  onChange={e => setHolderName(e.target.value)}
                />
              </FormField>

              <FormField>
                <FieldLabel htmlFor="wd-dni">DNI del titular *</FieldLabel>
                <FieldInput
                  id="wd-dni"
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Ej: 30123456"
                  value={dni}
                  onChange={e => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </FormField>

              <FormField>
                <FieldLabel htmlFor="wd-amount">Monto *</FieldLabel>
                <FieldInput
                  id="wd-amount"
                  type="number"
                  min="1"
                  placeholder="Ej: 10000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
              </FormField>

              {errMsg && <div style={{ fontSize: 12, color: T.danger }}>{errMsg}</div>}

              <PrimaryBtn $danger type="button" onClick={handleSubmit} disabled={!amount || !destination || !holderName || !dni}>
                Solicitar retiro
              </PrimaryBtn>
            </>
          )}

          {status === 'loading' && (
            <LoaderWrap style={{ flexDirection: 'column', gap: 14 }}>
              <Spinner />
              <div style={{ fontSize: 13, color: T.t3 }}>Enviando solicitud…</div>
            </LoaderWrap>
          )}

          {(status === 'success' || status === 'error') && (
            <ResultCard $ok={status === 'success'}>
              <ResultIcon>{status === 'success' ? '✅' : '❌'}</ResultIcon>
              <ResultTitle $ok={status === 'success'}>
                {status === 'success'
                  ? (result?.status === 'REVIEW_PENDING' ? 'En revisión' : 'En proceso')
                  : 'Error en la solicitud'}
              </ResultTitle>
              <ResultMsg>{status === 'success' ? statusLabel() : errMsg}</ResultMsg>
              {hasRisk && status === 'success' && (
                <StatusBadge
                  $bg="rgba(245,158,11,0.12)"
                  $color={T.gold}
                  $border="rgba(245,158,11,0.3)"
                >
                  Sujeto a revisión de seguridad
                </StatusBadge>
              )}
              <SecondaryBtn type="button" onClick={reset}>
                {status === 'success' ? 'Nueva solicitud' : 'Reintentar'}
              </SecondaryBtn>
            </ResultCard>
          )}
        </CaudalSection>
        <div style={{ height: 20 }} />
      </SheetBody>
    </>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN MENU
══════════════════════════════════════════════════════════════ */

const MENU_ITEMS = [
  {
    id: 'events',
    icon: '🎮',
    iconBg: 'rgba(59,130,246,0.18)',
    label: 'Eventos activos',
    sub: 'Ver promociones y juegos disponibles',
  },
  {
    id: 'history',
    icon: '📋',
    iconBg: 'rgba(16,185,129,0.15)',
    label: 'Cargas y retiros',
    sub: 'Historial de movimientos de tu cuenta',
  },
  {
    id: 'games',
    icon: '🎯',
    iconBg: 'rgba(245,158,11,0.15)',
    label: 'Historial de juegos',
    sub: 'Tus partidas y resultados',
  },
  {
    id: 'faq',
    icon: '❓',
    iconBg: 'rgba(139,92,246,0.15)',
    label: 'Preguntas frecuentes',
    sub: 'Información y ayuda',
  },
  {
    id: 'deposit',
    icon: '💳',
    iconBg: 'rgba(16,185,129,0.15)',
    label: 'Reportar pago Caudal',
    sub: 'Subí tu comprobante de transferencia',
  },
  {
    id: 'withdrawal',
    icon: '💸',
    iconBg: 'rgba(239,68,68,0.10)',
    label: 'Solicitar retiro',
    sub: 'Transferencia a tu cuenta bancaria',
  },
]

export default function ClientMenu({ onClose, chatId }) {
  const { systemConfig } = useSystemConfig()
  const [view, setView] = useState('menu')
  const sheetRef = useRef(null)

  const handleBackdropClick = useCallback((e) => {
    if (sheetRef.current && !sheetRef.current.contains(e.target)) {
      onClose()
    }
  }, [onClose])

  const handleItemClick = (id) => {
    setView(id)
  }

  const openOverlay = useCallback(() => {
    window.dispatchEvent(new CustomEvent('client:open-events'))
    onClose()
  }, [onClose])

  return (
    <Backdrop onClick={handleBackdropClick}>
      <Sheet ref={sheetRef} onClick={e => e.stopPropagation()}>
        <Handle />

        {view === 'menu' && (
          <>
            <SheetHeader>
              <SheetTitle>Mi cuenta</SheetTitle>
              <button
                type="button"
                onClick={onClose}
                style={{ background: 'none', border: 'none', color: T.t3, fontSize: 20, cursor: 'pointer', padding: '0 0 0 8px' }}
              >
                ✕
              </button>
            </SheetHeader>
            <SheetBody>
              <MenuGroup>
                {MENU_ITEMS.filter(item => {
                  if (item.id === 'events'     && !systemConfig.clientMenuEvents)  return false
                  if (item.id === 'history'    && !systemConfig.clientMenuHistory) return false
                  if (item.id === 'faq'        && !systemConfig.clientMenuFaq)     return false
                  if (item.id === 'deposit'    && !systemConfig.clientMenuCaudal)  return false
                  if (item.id === 'withdrawal' && !systemConfig.clientMenuCaudal)  return false
                  return true
                }).map(item => (
                  <MenuItem
                    key={item.id}
                    type="button"
                    $disabled={item.soon}
                    onClick={() => !item.soon && handleItemClick(item.id)}
                  >
                    <MenuItemIcon $bg={item.iconBg}>{item.icon}</MenuItemIcon>
                    <MenuItemText>
                      <MenuItemLabel>{item.label}</MenuItemLabel>
                      <MenuItemSub>{item.sub}</MenuItemSub>
                    </MenuItemText>
                    {item.soon
                      ? <SoonBadge>Próx.</SoonBadge>
                      : <MenuChevron>›</MenuChevron>
                    }
                  </MenuItem>
                ))}
              </MenuGroup>
              <div style={{ height: 24 }} />
            </SheetBody>
          </>
        )}

        {view === 'events'     && <EventsView      onBack={() => setView('menu')} onOpenOverlay={openOverlay} />}
        {view === 'history'    && <MovementHistory  onBack={() => setView('menu')} />}
        {view === 'faq'        && <FaqView          onBack={() => setView('menu')} />}
        {view === 'games'      && <GamesHistory     onBack={() => setView('menu')} />}
        {view === 'deposit'    && <DepositCaudalView    onBack={() => setView('menu')} chatId={chatId} />}
        {view === 'withdrawal' && <WithdrawalCaudalView onBack={() => setView('menu')} chatId={chatId} />}
      </Sheet>
    </Backdrop>
  )
}
