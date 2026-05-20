import { useState, useEffect, useCallback, useRef } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import { createPortal } from 'react-dom'
import MenuIcon from '@mui/icons-material/Menu'
import SorteoForm from './components/forms/SorteoForm.jsx'
import QuizForm from './components/forms/QuizForm.jsx'
import ScratchForm from './components/forms/ScratchForm.jsx'
import RouletteForm from './components/forms/RouletteForm.jsx'
import SlotsForm from './components/forms/SlotsForm.jsx'
import RedBlackForm from './components/forms/RedBlackForm.jsx'
import BriefcaseForm from './components/forms/BriefcaseForm.jsx'
import TreasureChestForm from './components/forms/TreasureChestForm.jsx'
import RankingForm from './components/forms/RankingForm.jsx'
import GamePreview from './components/GamePreview.jsx'
import AgendaPanel from './components/AgendaPanel.jsx'
import StatsPanel from './components/StatsPanel.jsx'
import RewardsPanel from './components/RewardsPanel.jsx'
import { eventsApi } from './services/eventsApi.js'
import {
  PageWrap, ScrollArea, PageHeader, HeaderLeft, HeaderTitle, HeaderSubtitle, MenuBtn,
  TabBar, TabBtn, SubTabBar, SubTabBtn,
  ContentWrap, Split, FormSide, PreviewSide,
  Card, CardTitle, CardDesc, BtnRow, Btn, Badge,
  TableWrap, Table, Th, Td, EmptyState, Divider,
} from './EventsPage.styles.js'
import styled from 'styled-components'

/* ─── inline styled components only needed in this file ─── */
const AlertBox = styled.div`
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid;
  ${({ $type }) =>
    $type === 'error'
      ? 'background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.25);color:#fca5a5;'
      : 'background:rgba(16,185,129,0.08);border-color:rgba(16,185,129,0.25);color:#6ee7b7;'}
`

const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(4px);
`

const ConfirmCard = styled.div`
  position: fixed;
  z-index: 9001;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: #131826;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 32px 28px 24px;
  width: min(400px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  animation: _cfm-in 0.2s cubic-bezier(0.32, 0.72, 0, 1) both;

  @keyframes _cfm-in {
    from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)) scale(0.96); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
`

const ConfirmIconWrap = styled.div`
  font-size: 40px;
  line-height: 1;
  filter: ${({ $danger }) => $danger ? 'drop-shadow(0 0 12px rgba(239,68,68,0.5))' : 'none'};
`

const ConfirmMessage = styled.p`
  margin: 0;
  font-size: 15px;
  font-weight: 500;
  color: #e2e8f0;
  text-align: center;
  line-height: 1.5;
`

const ConfirmBtns = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 8px;
  width: 100%;
`

const TrRow = styled.tr`
  &:hover td { background: rgba(255,255,255,0.02); }
`

/* ─── tab definitions ─── */
const GAME_TABS = [
  { id: 'sorteo',        label: '🎰 Sorteos' },
  { id: 'quiz',          label: '🧠 Quiz' },
  { id: 'scratch',       label: '🎫 Raspa y Gana' },
  { id: 'roulette',      label: '⚙️ Ruleta' },
  { id: 'slots',         label: '🎰 Slots' },
  { id: 'red_black',     label: '🔴 Rojo/Negro' },
  { id: 'briefcase',     label: '💼 Maletín' },
  { id: 'treasure_chest',label: '💎 Cofre' },
  { id: 'ranking',       label: '🏆 Ranking' },
]

const EVENT_SECTIONS = [
  { id: 'agenda', label: '🗓️ Agenda' },
  { id: 'stats', label: '📊 Estadísticas' },
  { id: 'rewards', label: '🎁 Premios' },
]

/* ─── default form values per game type ─── */
const GAME_DEFAULTS = {
  sorteo: {
    title: 'Sorteo de Bienvenida',
    description: 'Participá con un depósito mínimo y ganá premios increíbles.',
    prize_type: 'fichas',
    prize_amount: 100,
    duration_minutes: 60,
    min_deposit_amount: 2000,
    starts_at: '',
    ends_at: '',
    config_json: {
      image_url: '',
      min_deposit_amount: 2000,
      prize_description: 'Premio especial del sorteo',
    },
  },
  quiz: {
    title: 'Quiz Express',
    description: 'Respondé correcto y ganá fichas.',
    prize_type: 'fichas',
    prize_amount: 50,
    duration_minutes: 30,
    starts_at: '',
    ends_at: '',
    config_json: {
      question: '¿Cuál es la opción correcta?',
      options: [
        { key: 'A', text: 'Primera opción' },
        { key: 'B', text: 'Segunda opción' },
        { key: 'C', text: 'Tercera opción' },
        { key: 'D', text: 'Cuarta opción' },
      ],
      correct_option: 'A',
      answer_time_seconds: 15,
    },
  },
  scratch: {
    title: 'Raspa y Gana',
    description: 'Premios instantáneos para todos los jugadores.',
    prize_type: 'fichas',
    prize_amount: 0,
    duration_minutes: 45,
    starts_at: '',
    ends_at: '',
    config_json: {
      prizes: [
        { icon: '🏆', label: 'Premio Mayor',  prize_type: 'fichas', amount: 500, probability: 5  },
        { icon: '🥈', label: 'Premio Medio',  prize_type: 'fichas', amount: 100, probability: 15 },
        { icon: '🥉', label: 'Premio Menor',  prize_type: 'fichas', amount: 20,  probability: 30 },
        { icon: '✨', label: 'Sin premio',    prize_type: 'none',   amount: 0,   probability: 50 },
      ],
    },
  },
  roulette: {
    title: 'Ruleta VIP',
    description: 'Girá la ruleta y descubrí tu premio.',
    prize_type: 'fichas',
    prize_amount: 0,
    duration_minutes: 60,
    starts_at: '',
    ends_at: '',
    config_json: {
      segments: [
        { color: '#ef4444', label: 'Premio Mayor', icon: '🏆', prize_type: 'fichas',  amount: 500, probability: 10 },
        { color: '#f59e0b', label: 'Premio Medio', icon: '🥈', prize_type: 'fichas',  amount: 100, probability: 20 },
        { color: '#10b981', label: 'Premio Menor', icon: '🥉', prize_type: 'fichas',  amount: 20,  probability: 30 },
        { color: '#1d4ed8', label: 'Bonus 200%',  icon: '🎁', prize_type: 'bono_200', amount: 0,   probability: 10 },
        { color: '#6d28d9', label: 'Sin premio',  icon: '⚪', prize_type: 'none',     amount: 0,   probability: 30 },
      ],
    },
  },
  slots: {
    title: 'Slots 777',
    description: 'Alineá los símbolos y ganá el jackpot.',
    prize_type: 'fichas',
    prize_amount: 0,
    duration_minutes: 60,
    starts_at: '',
    ends_at: '',
    config_json: {
      symbols: [
        { icon: '7',  label: 'Siete'    },
        { icon: '🍒', label: 'Cereza'   },
        { icon: '⭐', label: 'Estrella' },
        { icon: '🔔', label: 'Campana'  },
        { icon: '💎', label: 'Diamante' },
      ],
      prizes: [
        { icon: '7',  label: 'Jackpot',    prize_type: 'fichas', amount: 1000, probability: 2,  combo: ['7',  '7',  '7']  },
        { icon: '💎', label: 'Diamantes',  prize_type: 'fichas', amount: 300,  probability: 5,  combo: ['💎', '💎', '💎'] },
        { icon: '⭐', label: 'Estrellas',  prize_type: 'fichas', amount: 100,  probability: 15, combo: ['⭐', '⭐', '⭐'] },
      ],
      win_rate: 35,
      primary_color: '#1e3a8a',
      secondary_color: '#0f172a',
      preview_title: 'Slots BetChat',
      button_text: 'JUGAR',
    },
  },
  red_black: {
    title: 'Rojo o Negro',
    description: 'Apostá al color correcto y ganás.',
    prize_type: 'fichas',
    prize_amount: 50,
    duration_minutes: 30,
    starts_at: '',
    ends_at: '',
    config_json: {
      options: [
        { label: 'Rojo',  color: '#ef4444', icon: '🔴' },
        { label: 'Negro', color: '#111827', icon: '⚫' },
      ],
      win_rate: 50,
    },
  },
  briefcase: {
    title: 'Maletín Millonario',
    description: 'El número con menos votos gana.',
    prize_type: 'fichas',
    prize_amount: 500,
    duration_minutes: 30,
    min_deposit_amount: 2000,
    starts_at: '',
    ends_at: '',
    config_json: {
      min_deposit_amount: 2000,
      numbers_count: 5,
    },
  },
  treasure_chest: {
    title: 'Cofre del Tesoro',
    description: 'La opción con menos votos gana.',
    prize_type: 'fichas',
    prize_amount: 500,
    duration_minutes: 30,
    min_deposit_amount: 2000,
    starts_at: '',
    ends_at: '',
    config_json: {
      min_deposit_amount: 2000,
      options: [
        { label: 'Diamantes', icon: '💎' },
        { label: 'Monedas',   icon: '💰' },
        { label: 'Joyas',     icon: '💍' },
      ],
    },
  },
  ranking: {
    title: 'Ranking Semanal',
    description: 'Completá misiones y subí en el ranking.',
    prize_type: 'fichas',
    prize_amount: 1000,
    duration_minutes: 10080,
    starts_at: '',
    ends_at: '',
    config_json: {
      mission_type: 'deposit_count',
      goal_amount: 10,
      period_type: 'weekly',
      emoji: '🏆',
    },
  },
}

/* ─── status badge helper ─── */
const STATUS_LABEL = {
  draft:     'Borrador',
  scheduled: 'Programado',
  active:    'Activo',
  finished:  'Finalizado',
  cancelled: 'Cancelado',
}

/* ─── inline event history table ─── */
function EventHistoryTable({ events, loading, onActivate, onFinish, onCancel, onDelete }) {
  if (loading) {
    return <EmptyState>Cargando eventos...</EmptyState>
  }
  if (!events.length) {
    return <EmptyState>No hay eventos para este filtro.</EmptyState>
  }
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Título</Th>
            <Th>Estado</Th>
            <Th>Inicio</Th>
            <Th>Duración</Th>
            <Th>Premio</Th>
            <Th>Acciones</Th>
          </tr>
        </thead>
        <tbody>
          {events.map(ev => (
            <TrRow key={ev.id}>
              <Td style={{ fontWeight: 600, color: '#f1f5f9' }}>{ev.title}</Td>
              <Td><Badge $v={ev.status}>{STATUS_LABEL[ev.status] ?? ev.status}</Badge></Td>
              <Td style={{ color: '#94a3b8', fontSize: 12 }}>
                {ev.starts_at ? new Date(ev.starts_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', ...(timezone && { timeZone: timezone }) }) : '—'}
              </Td>
              <Td style={{ color: '#94a3b8', fontSize: 12 }}>
                {ev.duration_minutes ? `${ev.duration_minutes} min` : '—'}
              </Td>
              <Td style={{ color: '#f59e0b', fontSize: 12 }}>
                {ev.prize_amount ? `${Number(ev.prize_amount).toLocaleString('es-AR')} ${ev.prize_type ?? ''}` : '—'}
              </Td>
              <Td>
                <BtnRow style={{ gap: 6 }}>
                  {ev.status === 'draft' || ev.status === 'scheduled' ? (
                    <Btn $v="success" $small onClick={() => onActivate(ev.id)}>Activar</Btn>
                  ) : null}
                  {ev.status === 'active' ? (
                    <Btn $small onClick={() => onFinish(ev.id)}>Finalizar</Btn>
                  ) : null}
                  {ev.status !== 'cancelled' && ev.status !== 'finished' ? (
                    <Btn $v="warning" $small onClick={() => onCancel(ev.id)}>Cancelar</Btn>
                  ) : null}
                  <Btn $v="danger" $small onClick={() => onDelete(ev.id)}>Eliminar</Btn>
                </BtnRow>
              </Td>
            </TrRow>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  )
}

/* ─── main form map ─── */
const FORM_COMPONENTS = {
  sorteo:         SorteoForm,
  quiz:           QuizForm,
  scratch:        ScratchForm,
  roulette:       RouletteForm,
  slots:          SlotsForm,
  red_black:      RedBlackForm,
  briefcase:      BriefcaseForm,
  treasure_chest: TreasureChestForm,
  ranking:        RankingForm,
}

/* ═══════════════════════════════════════════════════════════════
   EVENTS PAGE
═══════════════════════════════════════════════════════════════ */
const EventsPage = ({ onMenuOpen, activeSubsection = 'games' }) => {
  const { timezone }                = useDateFormat()
  const [activeTab, setActiveTab]   = useState('sorteo')
  const [sectionTab, setSectionTab] = useState(activeSubsection)
  const [subTab,    setSubTab]      = useState('create')
  const [form,      setForm]        = useState(GAME_DEFAULTS.sorteo)
  const [events,    setEvents]      = useState([])
  const [loading,   setLoading]     = useState(false)
  const [saving,    setSaving]      = useState(false)
  const [alert,     setAlert]       = useState(null) // { type:'error'|'success', msg }
  const [confirmDialog, setConfirmDialog] = useState({ open: false, message: '', danger: false })
  const resolveConfirmRef = useRef(null)

  const askConfirm = (message, danger = true) =>
    new Promise((resolve) => {
      resolveConfirmRef.current = resolve
      setConfirmDialog({ open: true, message, danger })
    })

  const closeConfirm = (result) => {
    setConfirmDialog(d => ({ ...d, open: false }))
    resolveConfirmRef.current?.(result)
    resolveConfirmRef.current = null
  }

  const isGameTab = GAME_TABS.some(t => t.id === activeTab)
  const isSectionTab = EVENT_SECTIONS.some(s => s.id === sectionTab)

  /* ── load events list ── */
  const loadEvents = useCallback(async (statusFilter) => {
    if (!isGameTab) return
    setLoading(true)
    try {
      const params = { type: activeTab }
      if (statusFilter) params.status = statusFilter
      const data = await eventsApi.listEvents(params)
      setEvents(data.events ?? [])
    } catch (e) {
      setAlert({ type: 'error', msg: e.message ?? 'Error al cargar eventos.' })
    } finally {
      setLoading(false)
    }
  }, [activeTab, isGameTab])

  /* ── reset form and events when game tab changes ── */
  useEffect(() => {
    setForm(GAME_DEFAULTS[activeTab] ?? GAME_DEFAULTS.sorteo)
    setSubTab('create')
    setAlert(null)
    setEvents([])
    setSectionTab('games')
    if (GAME_TABS.some(t => t.id === activeTab)) {
      loadEvents()
    }
  }, [activeTab]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── sync sectionTab when parent navigates via sidebar ── */
  useEffect(() => {
    setSectionTab(activeSubsection || 'games')
  }, [activeSubsection])

  useEffect(() => {
    setSectionTab(activeSubsection || 'games')
  }, [activeSubsection])

  /* ── subtab change ── */
  const handleSubTab = (st) => {
    setSubTab(st)
    setAlert(null)
    if (st === 'active')  loadEvents('active')
    if (st === 'history') loadEvents()
    if (st === 'create')  setEvents([])
  }

  /* ── save event ── */
  const handleSave = async (status = 'draft') => {
    if (!form.title?.trim()) {
      setAlert({ type: 'error', msg: 'El título del evento es obligatorio.' })
      return
    }
    const hasFutureStart =
      form.starts_at && new Date(form.starts_at).getTime() > Date.now()
    const nextStatus = hasFutureStart && status === 'active' ? 'scheduled' : status
    setSaving(true)
    setAlert(null)
    try {
      await eventsApi.createEvent({
        type:               activeTab,
        title:              form.title.trim(),
        description:        form.description || null,
        status:             nextStatus,
        prize_type:         form.prize_type  || null,
        prize_amount:       form.prize_amount ?? null,
        duration_minutes:   form.duration_minutes ?? null,
        min_deposit_amount: form.min_deposit_amount ?? null,
        starts_at:          form.starts_at || null,
        ends_at:            form.ends_at   || null,
        config_json:        form.config_json ?? {},
      })
      const label =
        nextStatus === 'draft'
          ? 'Borrador guardado'
          : nextStatus === 'scheduled'
            ? 'Evento programado'
            : 'Evento creado'
      setAlert({ type: 'success', msg: `✓ ${label} correctamente.` })
      if (nextStatus === 'active') {
        handleSubTab('active')
      } else {
        loadEvents()
      }
    } catch (e) {
      setAlert({ type: 'error', msg: e.message ?? 'Error al guardar el evento.' })
    } finally {
      setSaving(false)
    }
  }

  /* ── save template ── */
  const handleSaveTemplate = async () => {
    if (!form.title?.trim()) {
      setAlert({ type: 'error', msg: 'El título es obligatorio para guardar un template.' })
      return
    }
    setSaving(true)
    setAlert(null)
    try {
      await eventsApi.templates.create({
        name:        `${form.title.trim()} — Template`,
        event_type:  activeTab,
        config_json: { ...form, type: activeTab },
      })
      setAlert({ type: 'success', msg: '✓ Template guardado correctamente.' })
    } catch (e) {
      setAlert({ type: 'error', msg: e.message ?? 'Error al guardar el template.' })
    } finally {
      setSaving(false)
    }
  }

  /* ── event status actions ── */
  const handleActivate = async (id) => {
    try {
      await eventsApi.activateEvent(id)
      loadEvents(subTab === 'active' ? 'active' : undefined)
    } catch (e) {
      setAlert({ type: 'error', msg: e.message })
    }
  }

  const handleFinish = async (id) => {
    try {
      await eventsApi.finishEvent(id)
      loadEvents(subTab === 'active' ? 'active' : undefined)
    } catch (e) {
      setAlert({ type: 'error', msg: e.message })
    }
  }

  const handleCancel = async (id) => {
    if (!await askConfirm('¿Cancelar este evento?')) return
    try {
      await eventsApi.cancelEvent(id)
      loadEvents(subTab === 'active' ? 'active' : undefined)
    } catch (e) {
      setAlert({ type: 'error', msg: e.message })
    }
  }

  const handleDelete = async (id) => {
    if (!await askConfirm('¿Eliminar este evento? Esta acción no se puede deshacer.')) return
    try {
      await eventsApi.deleteEvent(id)
      loadEvents(subTab === 'active' ? 'active' : undefined)
    } catch (e) {
      setAlert({ type: 'error', msg: e.message })
    }
  }

  /* ── render form for current game ── */
  const GameForm = FORM_COMPONENTS[activeTab]

  /* ── sub-tab labels for game tabs ── */
  const activeCount   = events.filter(e => e.status === 'active').length
  const historyCount  = events.length

  /* ═══════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════ */
  return (
    <PageWrap data-tour="events-page">

      {/* ── header ── */}
      <PageHeader>
        <MenuBtn onClick={onMenuOpen} aria-label="Abrir menú">
          <MenuIcon fontSize="small" />
        </MenuBtn>
        <HeaderLeft>
          <HeaderTitle>Eventos / Juegos / Premios</HeaderTitle>
          <HeaderSubtitle>
            Mini juegos configurables, agenda, estadísticas y gestión de premios.
          </HeaderSubtitle>
        </HeaderLeft>
      </PageHeader>

      {/* ── main tab bar ── */}
      <TabBar role="tablist" data-tour="events-tabs">
        {GAME_TABS.map(tab => (
          <TabBtn
            key={tab.id}
            $active={activeTab === tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => { setActiveTab(tab.id); setSectionTab('games') }}
          >
            {tab.label}
          </TabBtn>
        ))}
      </TabBar>

      {/* ── section sub-tab bar ── */}
      <SubTabBar>
        {EVENT_SECTIONS.map((section) => (
          <SubTabBtn
            key={section.id}
            $active={sectionTab === section.id}
            onClick={() => setSectionTab(section.id)}
          >
            {section.label}
          </SubTabBtn>
        ))}
      </SubTabBar>

      {/* ── sub-tab bar (only for game tabs, not section views) ── */}
      {isGameTab && !isSectionTab && (
        <SubTabBar>
          <SubTabBtn $active={subTab === 'create'} onClick={() => handleSubTab('create')}>
            + Crear
          </SubTabBtn>
          <SubTabBtn $active={subTab === 'active'} onClick={() => handleSubTab('active')}>
            Activos {activeCount > 0 && `(${activeCount})`}
          </SubTabBtn>
          <SubTabBtn $active={subTab === 'history'} onClick={() => handleSubTab('history')}>
            Historial {historyCount > 0 && `(${historyCount})`}
          </SubTabBtn>
        </SubTabBar>
      )}

      {/* ── scrollable content ── */}
      <ScrollArea>
        <ContentWrap data-tour="events-content">

          {/* alert banner */}
          {alert && (
            <AlertBox $type={alert.type}>{alert.msg}</AlertBox>
          )}

          {/* ── GAME TAB — CREATE VIEW ── */}
          {isGameTab && !isSectionTab && subTab === 'create' && (
            <Split>
              <FormSide>
                {/* game-specific form */}
                {GameForm && <GameForm form={form} onChange={setForm} />}

                {/* save actions card */}
                <Card>
                  <CardTitle>Guardar / Lanzar</CardTitle>
                  <CardDesc>
                    Guardá como borrador para editar luego, lanzá para activarlo ahora,
                    o guardá como template para reutilizarlo en el futuro.
                  </CardDesc>
                  <BtnRow>
                    <Btn
                      onClick={() => handleSave('draft')}
                      disabled={saving}
                      $loading={saving}
                    >
                      {saving ? '...' : 'Guardar borrador'}
                    </Btn>
                    <Btn
                      $v="primary"
                      onClick={() => handleSave('active')}
                      disabled={saving}
                      $loading={saving}
                    >
                      {saving ? '...' : 'Crear y lanzar'}
                    </Btn>
                    <Btn
                      onClick={handleSaveTemplate}
                      disabled={saving}
                      $loading={saving}
                    >
                      {saving ? '...' : 'Guardar como template'}
                    </Btn>
                  </BtnRow>
                </Card>
              </FormSide>

              {/* live preview */}
              <PreviewSide>
                <GamePreview gameType={activeTab} form={form} />
              </PreviewSide>
            </Split>
          )}

          {/* ── GAME TAB — ACTIVE / HISTORY VIEW ── */}
          {isGameTab && !isSectionTab && (subTab === 'active' || subTab === 'history') && (
            <Card>
              <CardTitle>
                {subTab === 'active' ? 'Eventos activos' : 'Historial de eventos'}
              </CardTitle>
              <CardDesc>
                {subTab === 'active'
                  ? 'Eventos en curso para este tipo de juego.'
                  : 'Todos los eventos creados para este tipo de juego.'}
              </CardDesc>
              <Divider />
              <EventHistoryTable
                events={events}
                loading={loading}
                onActivate={handleActivate}
                onFinish={handleFinish}
                onCancel={handleCancel}
                onDelete={handleDelete}
              />
            </Card>
          )}

          {/* ── AGENDA ── */}
          {isSectionTab && sectionTab === 'agenda' && (
            <AgendaPanel
              onUseTemplate={(tpl) => {
                const type = tpl.event_type
                const cfg  = tpl.config_json || {}
                if (GAME_TABS.some(t => t.id === type)) {
                  setActiveTab(type)
                  setForm(cfg.config_json ? cfg : { ...(GAME_DEFAULTS[type] ?? {}), ...cfg })
                  setSubTab('create')
                  setAlert({ type: 'success', msg: `✓ Template "${tpl.name}" cargado.` })
                }
              }}
            />
          )}

          {/* ── ESTADÍSTICAS ── */}
          {isSectionTab && sectionTab === 'stats' && <StatsPanel />}

          {/* ── PREMIOS ── */}
          {isSectionTab && sectionTab === 'rewards' && <RewardsPanel />}

        </ContentWrap>
      </ScrollArea>

      {/* ── custom confirm dialog ── */}
      {confirmDialog.open && createPortal(
        <>
          <ConfirmOverlay onClick={() => closeConfirm(false)} />
          <ConfirmCard>
            <ConfirmIconWrap $danger={confirmDialog.danger}>
              {confirmDialog.danger ? '⚠️' : '❓'}
            </ConfirmIconWrap>
            <ConfirmMessage>{confirmDialog.message}</ConfirmMessage>
            <ConfirmBtns>
              <Btn
                style={{ flex: 1 }}
                onClick={() => closeConfirm(false)}
              >
                Cancelar
              </Btn>
              <Btn
                $v={confirmDialog.danger ? 'danger' : 'primary'}
                style={{ flex: 1 }}
                onClick={() => closeConfirm(true)}
              >
                Confirmar
              </Btn>
            </ConfirmBtns>
          </ConfirmCard>
        </>,
        document.body
      )}

    </PageWrap>
  )
}

export default EventsPage
