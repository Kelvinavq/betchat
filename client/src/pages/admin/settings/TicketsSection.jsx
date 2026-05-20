import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDateFormat } from '../../../hooks/useDateFormat'
import useAuth from '../../../hooks/useAuth'
import AddIcon from '@mui/icons-material/Add'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import SendIcon from '@mui/icons-material/Send'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import CloseIcon from '@mui/icons-material/Close'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import PersonOffOutlinedIcon from '@mui/icons-material/PersonOffOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  TicketsWrap, TicketsTopBar, TicketsCount, NewTicketBtn,
  FilterBar, FilterTab,
  TicketRow, TkIconWrap, TkBody, TkTopRow, TkNumber, TkStatusBadge, TkTitle,
  TkMeta, TkMetaItem, TkPriorityDot, TkChevron,
  TicketsEmpty, EmptyGlyph, EmptyTitle, EmptySub,
  DetailWrap, DetailHeader, BackBtn, DetailTitleBlock, DetailNumber, DetailTitle,
  DetailStatusSelect, DetailMetaRow, MetaChip, MetaDivider,
  ThreadWrap, MessageBubble, MsgHeader, MsgSenderAvatar, MsgSender, MsgTime,
  MsgBody, MsgAttachments, MsgThumb, MsgThumbLabel, StatusEvent,
  ReplyBar, AttachPreviewBar, AttachThumb, AttachRemoveBtn,
  ReplyTextarea, ReplyFooter, ReplyLeftActions, ReplyIconBtn, ReplySendBtn,
  ModalOverlay, ModalCard, ModalHead, ModalTitle, ModalSub, ModalCloseBtn,
  ModalBody, ModalField, ModalFieldGrid, ModalLabel, ModalInput, ModalTextarea, ModalSelect,
  AttachZone, AttachZoneIcon, AttachZoneText, AttachZoneSub, AttachPreviewList,
  ModalFoot, ModalCancelBtn, ModalSubmitBtn,
  LightboxOverlay, LightboxImg, LightboxClose,
  CPickerWrap, CPickerTrigger, CPickerArrow, CPickerPlaceholder,
  CPickerSelectedLabel, CPickerSelectedName, CPickerSelectedSub,
  CPickerDropdown, CPickerSearchWrap, CPickerSearchInput, CPickerList,
  CPickerItem, CPickerAvatar, CPickerItemInfo, CPickerItemName, CPickerItemSub,
  CPickerClearItem, CPickerClearDot, CPickerLoadMore, CPickerEmpty, CPickerSpinner,
} from './TicketsSection.styles'
import { api } from '../../../utils/api'
import { getSocket } from '../../../utils/socket'

const SUPPORT_API_BASE = '/api/support'
const SUPPORT_SERVER_URL = (
  import.meta.env.VITE_SUPPORT_SOCKET_URL
  || import.meta.env.VITE_SUPPORT_API_URL
  || 'http://localhost:4000'
).replace(/\/api\/?$/, '').replace(/\/+$/, '')

const resolveSupportAsset = (url = '') => {
  if (!url || /^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) return url
  return `${SUPPORT_SERVER_URL}${url.startsWith('/') ? url : `/${url}`}`
}


const supportRequest = async (endpoint, options = {}) => {
  const res = await fetch(`${SUPPORT_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const payload = await res.json().catch(() => null)
    throw new Error(payload?.error || `HTTP ${res.status}`)
  }
  return res.json()
}

const makeTicketMessageId = (prefix = 'ticket-msg') => {
  const cryptoId = crypto?.randomUUID?.()
  return `${prefix}-${cryptoId || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`
}

const SUPPORT_OPTIONALS = {
  domains: [],
  clients: [],
}

const CATEGORIES = [
  { id: 'other', label: 'Otro' },
  { id: 'payments', label: 'Pagos y transacciones' },
  { id: 'account', label: 'Cuenta y acceso' },
  { id: 'technical', label: 'Problema técnico' },
  { id: 'bot', label: 'Bot / automatización' },
]

const PRIORITIES = [
  { id: 'low', label: 'Baja' },
  { id: 'medium', label: 'Media' },
  { id: 'high', label: 'Alta' },
]

const STATUS_CFG = {
  open: { label: 'Abierto', icon: <ReportProblemOutlinedIcon style={{ fontSize: 16 }} /> },
  in_progress: { label: 'En progreso', icon: <AutorenewIcon style={{ fontSize: 16 }} /> },
  resolved: { label: 'Resuelto', icon: <CheckCircleOutlinedIcon style={{ fontSize: 16 }} /> },
  closed: { label: 'Cerrado', icon: <LockOutlinedIcon style={{ fontSize: 16 }} /> },
  waiting: { label: 'En espera', icon: <LockOutlinedIcon style={{ fontSize: 16 }} /> },
}

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'open', label: 'Abiertos' },
  { id: 'in_progress', label: 'En progreso' },
  { id: 'resolved', label: 'Resueltos' },
  { id: 'closed', label: 'Cerrados' },
]

const fmt = (iso, tz) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', ...(tz && { timeZone: tz }) })
    + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', ...(tz && { timeZone: tz }) })
}
const fmtShort = (iso, tz) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', ...(tz && { timeZone: tz }) })
}
const catLabel = (id) => CATEGORIES.find(c => c.id === id)?.label ?? id
const priLabel = (id) => PRIORITIES.find(p => p.id === id)?.label ?? id
const toIntOrNull = (value) => {
  const n = Number.parseInt(String(value ?? '').trim(), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

const resolveAppDomainId = (domains = []) => {
  if (!domains.length) return null
  const hostname = window.location.hostname.toLowerCase()
  const origin = window.location.origin.toLowerCase()
  const match = domains.find(domain => {
    const url = String(domain.url || '').toLowerCase()
    const slug = String(domain.slug || '').toLowerCase()
    const name = String(domain.name || '').toLowerCase()
    return (
      (url && (origin.includes(url.replace(/^https?:\/\//, '')) || hostname.includes(url.replace(/^https?:\/\//, ''))))
      || (slug && hostname.includes(slug))
      || (name && hostname.includes(name.replace(/\s+/g, '')))
    )
  })
  return match?.id || domains.find(domain => domain.is_active !== 0)?.id || domains[0]?.id || null
}

// ── ClientPicker ──────────────────────────────────────────────────────────────
const CLIENT_LIMIT = 10

const initials = (str = '') => str.trim().slice(0, 2).toUpperCase() || '?'

function ClientPicker({ value, onChange }) {
  const [open,     setOpen]    = useState(false)
  const [search,   setSearch]  = useState('')
  const [clients,  setClients] = useState([])
  const [page,     setPage]    = useState(1)
  const [hasMore,  setHasMore] = useState(false)
  const [loading,  setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const wrapRef   = useRef(null)
  const searchRef = useRef(null)
  const debRef    = useRef(null)

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  useEffect(() => { if (open) setTimeout(() => searchRef.current?.focus(), 40) }, [open])

  const fetchClients = useCallback(async (q, pg) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pg, limit: CLIENT_LIMIT, status: 'all' })
      if (q) params.set('search', q)
      const res = await api.get(`/api/clients?${params}`)
      const list = res.clients || []
      setClients(prev => pg === 1 ? list : [...prev, ...list])
      const tp = res.pagination?.totalPages ?? res.pagination?.pages ?? 1
      setHasMore(pg < tp)
      setPage(pg)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!open) return
    clearTimeout(debRef.current)
    debRef.current = setTimeout(() => fetchClients(search, 1), 260)
    return () => clearTimeout(debRef.current)
  }, [search, open, fetchClients])

  const pick = (client) => {
    setSelected(client)
    onChange(client ? String(client.id) : '')
    setOpen(false)
    setSearch('')
  }

  const isFilled = !!selected || !!value

  return (
    <CPickerWrap ref={wrapRef}>
      <CPickerTrigger
        type="button"
        $open={open}
        $filled={isFilled}
        onClick={() => setOpen(v => !v)}
      >
        {selected ? (
          <>
            <CPickerAvatar>{initials(selected.username)}</CPickerAvatar>
            <CPickerSelectedLabel>
              <CPickerSelectedName>{selected.username}</CPickerSelectedName>
              {selected.fullName && <CPickerSelectedSub>{selected.fullName}</CPickerSelectedSub>}
            </CPickerSelectedLabel>
          </>
        ) : (
          <CPickerPlaceholder>Sin cliente asociado</CPickerPlaceholder>
        )}
        <CPickerArrow $open={open}><ExpandMoreIcon /></CPickerArrow>
      </CPickerTrigger>

      {open && (
        <CPickerDropdown>
          <CPickerSearchWrap>
            <SearchIcon />
            <CPickerSearchInput
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por usuario…"
            />
          </CPickerSearchWrap>

          <CPickerList>
            <CPickerClearItem onClick={() => pick(null)}>
              <CPickerClearDot><PersonOffOutlinedIcon /></CPickerClearDot>
              <CPickerItemInfo>
                <CPickerItemName style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontStyle: 'italic' }}>
                  Sin cliente asociado
                </CPickerItemName>
              </CPickerItemInfo>
            </CPickerClearItem>

            {loading && clients.length === 0 && (
              <CPickerSpinner>Buscando clientes…</CPickerSpinner>
            )}

            {!loading && clients.length === 0 && (
              <CPickerEmpty>
                <PersonOffOutlinedIcon />
                Sin resultados para "{search || 'todos'}"
              </CPickerEmpty>
            )}

            {clients.map(c => (
              <CPickerItem
                key={c.id}
                $active={String(c.id) === value}
                onClick={() => pick(c)}
              >
                <CPickerAvatar>{initials(c.username)}</CPickerAvatar>
                <CPickerItemInfo>
                  <CPickerItemName>{c.username}</CPickerItemName>
                  {c.fullName && <CPickerItemSub>{c.fullName}</CPickerItemSub>}
                </CPickerItemInfo>
              </CPickerItem>
            ))}

            {!loading && hasMore && (
              <CPickerLoadMore type="button" onClick={() => fetchClients(search, page + 1)}>
                <ExpandMoreIcon /> Ver más resultados
              </CPickerLoadMore>
            )}
          </CPickerList>
        </CPickerDropdown>
      )}
    </CPickerWrap>
  )
}

const CreateModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({ subject: '', description: '', category: 'other', priority: 'medium', clientId: '', domainId: '' })
  const [domains, setDomains] = useState([])
  const [attachments, setAttachments] = useState([])
  const fileRef = useRef(null)

  useEffect(() => {
    supportRequest('/domains')
      .then(d => setDomains(d.domains || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!domains.length || form.domainId) return
    const nextDomainId = resolveAppDomainId(domains)
    if (nextDomainId) setForm(f => ({ ...f, domainId: String(nextDomainId) }))
  }, [domains, form.domainId])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => setAttachments(a => [...a, { id: `${Date.now()}-${Math.random()}`, name: file.name, dataUrl: e.target.result }])
      reader.readAsDataURL(file)
    })
  }
  const handleSubmit = () => {
    if (!form.subject.trim() || !form.description.trim()) return
    onCreate({
      subject: form.subject.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      client_id: toIntOrNull(form.clientId),
      domain_id: toIntOrNull(form.domainId),
      attachments,
    })
  }

  return (
    <ModalOverlay onClick={e => e.target === e.currentTarget && onClose()}>
      <ModalCard onClick={e => e.stopPropagation()}>
        <ModalHead>
          <div>
            <ModalTitle>Nuevo ticket de soporte</ModalTitle>
            <ModalSub>Describí el problema con el mayor detalle posible</ModalSub>
          </div>
          <ModalCloseBtn onClick={onClose}><CloseIcon /></ModalCloseBtn>
        </ModalHead>
        <ModalBody>
          <ModalField>
            <ModalLabel>Título del problema</ModalLabel>
            <ModalInput value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Ej: Depósito no acreditado" />
          </ModalField>
          <ModalField>
            <ModalLabel>Descripción detallada</ModalLabel>
            <ModalTextarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describí qué ocurre, cuándo comenzó y qué pasos seguiste..." />
          </ModalField>
          <ModalFieldGrid>
            <ModalField>
              <ModalLabel>Categoría</ModalLabel>
              <ModalSelect value={form.category} onChange={e => set('category', e.target.value)}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</ModalSelect>
            </ModalField>
            <ModalField>
              <ModalLabel>Prioridad</ModalLabel>
              <ModalSelect value={form.priority} onChange={e => set('priority', e.target.value)}>{PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</ModalSelect>
            </ModalField>
          </ModalFieldGrid>
          <ModalFieldGrid>
            <ModalField>
              <ModalLabel>Cliente (opcional)</ModalLabel>
              <ClientPicker value={form.clientId} onChange={id => set('clientId', id)} />
            </ModalField>
            <ModalField>
              <ModalLabel>Dominio detectado</ModalLabel>
              <ModalInput
                value={
                  window.location.hostname ||
                  (domains.find(d => String(d.id) === String(form.domainId))?.name || '')
                    .replace(/^https?:\/\//, '') ||
                  'Detectando dominio de la app...'
                }
                readOnly
              />
            </ModalField>
          </ModalFieldGrid>
          <ModalField>
            <ModalLabel>Capturas de pantalla</ModalLabel>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => handleFiles(e.target.files)} />
            <AttachZone onClick={() => fileRef.current?.click()} onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}>
              <AttachZoneIcon><ImageOutlinedIcon /></AttachZoneIcon>
              <AttachZoneText>Hacé clic o arrastrá imágenes aquí</AttachZoneText>
              <AttachZoneSub>PNG, JPG, WEBP · máx. 10 MB por archivo</AttachZoneSub>
            </AttachZone>
            {attachments.length > 0 && (
              <AttachPreviewList>
                {attachments.map(a => (
                  <AttachThumb key={a.id} style={{ width: 64, height: 50 }}>
                    <img src={a.dataUrl} alt={a.name} />
                    <AttachRemoveBtn onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}>×</AttachRemoveBtn>
                  </AttachThumb>
                ))}
              </AttachPreviewList>
            )}
          </ModalField>
        </ModalBody>
        <ModalFoot>
          <ModalCancelBtn onClick={onClose}>Cancelar</ModalCancelBtn>
          <ModalSubmitBtn onClick={handleSubmit}><HeadsetMicOutlinedIcon style={{ fontSize: 16 }} /> Enviar ticket</ModalSubmitBtn>
        </ModalFoot>
      </ModalCard>
    </ModalOverlay>
  )
}

const TicketDetail = ({ ticket, onBack, onUpdate }) => {
  const { timezone } = useDateFormat()
  const [replyText, setReplyText] = useState('')
  const [attachments, setAttachments] = useState([])
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const threadRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => { threadRef.current && (threadRef.current.scrollTop = threadRef.current.scrollHeight) }, [ticket?.messages?.length])

  const handleSendReply = async () => {
    if (!replyText.trim() && attachments.length === 0) return
    try {
      await onUpdate(ticket.id, { reply: replyText.trim(), attachments })
      setReplyText('')
      setAttachments([])
    } catch (err) {
      console.error('Error sending reply:', err)
    }
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <DetailWrap>
      <DetailHeader>
        <BackBtn onClick={onBack}><ArrowBackIcon /> Volver</BackBtn>
        <DetailTitleBlock>
          <DetailNumber>{ticket.reference_code}</DetailNumber>
          <DetailTitle>{ticket.subject}</DetailTitle>
        </DetailTitleBlock>
        <TkStatusBadge $status={ticket.status} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
          {STATUS_CFG[ticket.status]?.icon}
          {STATUS_CFG[ticket.status]?.label}
        </TkStatusBadge>
      </DetailHeader>
      <DetailMetaRow>
        <MetaChip><CategoryOutlinedIcon /><strong>{catLabel(ticket.category)}</strong></MetaChip>
        <MetaDivider />
        <MetaChip><TkPriorityDot $priority={ticket.priority} as="span" /><strong>{priLabel(ticket.priority)}</strong></MetaChip>
        {ticket.client_name && (<><MetaDivider /><MetaChip><PersonOutlinedIcon /><strong>{ticket.client_name}</strong></MetaChip></>)}
        <MetaDivider />
        <MetaChip><AccessTimeOutlinedIcon /> Creado {fmtShort(ticket.created_at, timezone)}</MetaChip>
      </DetailMetaRow>
      <ThreadWrap ref={threadRef}>
        {(ticket.messages || []).length === 0 && ticket.description && (
          <StatusEvent>
            <ReportProblemOutlinedIcon style={{ fontSize: 16 }} />
            <span style={{ marginLeft: 6 }}>Descripción inicial del ticket</span>
            <strong style={{ marginLeft: 6, color: 'rgba(255,255,255,0.55)' }}>{ticket.description}</strong>
          </StatusEvent>
        )}
        {(ticket.messages || []).map(msg => {
          if (msg.type === 'status') {
            return <StatusEvent key={msg.id}>{STATUS_CFG[msg.to]?.icon} Estado cambiado a <strong style={{ color: 'rgba(255,255,255,0.55)', marginLeft: 4 }}>{STATUS_CFG[msg.to]?.label}</strong></StatusEvent>
          }
          const isOwn = msg.sender_type !== 'client' && Number(msg.sender_id) === 0
          const displayName = isOwn
            ? (msg.sender_name || 'Soporte')
            : msg.sender_type === 'client'
              ? (msg.sender_name || 'Cliente')
              : 'Soporte'
          return (
            <MessageBubble key={msg.id || `${msg.created_at}-${msg.content}`} $isStaff={isOwn}>
              <MsgHeader $isStaff={isOwn}>
                <MsgSenderAvatar $isStaff={isOwn}>{displayName[0].toUpperCase()}</MsgSenderAvatar>
                <MsgSender>{displayName}</MsgSender>
                <MsgTime>{fmt(msg.created_at || msg.timestamp, timezone)}</MsgTime>
              </MsgHeader>
              {msg.content && <MsgBody $isStaff={isOwn}>{msg.content}</MsgBody>}
              {msg.attachments?.length > 0 && (
                <MsgAttachments>
                  {msg.attachments.map(att => (
                    att.dataUrl || att.file_url ? (
                      <MsgThumb key={att.id} onClick={() => setLightboxSrc(att.dataUrl || resolveSupportAsset(att.file_url))}>
                        <img src={att.dataUrl || resolveSupportAsset(att.file_url)} alt={att.name || att.file_name || 'adjunto'} />
                      </MsgThumb>
                    ) : (
                      <MsgThumbLabel key={att.id}><ImageOutlinedIcon /> {att.name || att.file_name || 'archivo'}</MsgThumbLabel>
                    )
                  ))}
                </MsgAttachments>
              )}
            </MessageBubble>
          )
        })}
      </ThreadWrap>
      {!isClosed ? (
        <ReplyBar>
          {attachments.length > 0 && (
            <AttachPreviewBar>
              {attachments.map(a => (
                <AttachThumb key={a.id}>
                  <img src={a.dataUrl} alt={a.name} />
                  <AttachRemoveBtn onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}>×</AttachRemoveBtn>
                </AttachThumb>
              ))}
            </AttachPreviewBar>
          )}
          <ReplyTextarea
            placeholder="Escribe una respuesta… (Ctrl+Enter para enviar)"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={e => { if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleSendReply() } }}
          />
          <ReplyFooter>
            <ReplyLeftActions>
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => {
                Array.from(e.target.files || []).forEach(file => {
                  const reader = new FileReader()
                  reader.onload = ev => setAttachments(a => [...a, { id: `${Date.now()}-${Math.random()}`, name: file.name, dataUrl: ev.target.result }])
                  reader.readAsDataURL(file)
                })
              }} />
              <ReplyIconBtn type="button" onClick={() => fileRef.current?.click()} title="Adjuntar imagen"><AttachFileIcon /></ReplyIconBtn>
            </ReplyLeftActions>
            <ReplySendBtn type="button" disabled={!replyText.trim() && attachments.length === 0} onClick={handleSendReply}><SendIcon /> Responder</ReplySendBtn>
          </ReplyFooter>
        </ReplyBar>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.18)', fontSize: 12.5, color: ticket.status === 'resolved' ? 'rgba(52,211,153,0.75)' : 'rgba(255,255,255,0.38)' }}>
          <LockOutlinedIcon style={{ fontSize: 15 }} />
          Ticket {ticket.status === 'resolved' ? 'resuelto' : 'cerrado'} — no se pueden enviar más mensajes
        </div>
      )}
      {lightboxSrc && <LightboxOverlay onClick={() => setLightboxSrc(null)}><LightboxClose onClick={() => setLightboxSrc(null)}><CloseIcon /></LightboxClose><LightboxImg src={lightboxSrc} alt="Captura" /></LightboxOverlay>}
    </DetailWrap>
  )
}

const TicketsSection = () => {
  const { timezone } = useDateFormat()
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tickets, setTickets] = useState([])
  const selectedId = searchParams.get('ticket') ? Number(searchParams.get('ticket')) : null
  const setSelectedId = (id) => setSearchParams(id ? { ticket: id } : {}, { replace: false })
  const [filter, setFilter] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')

  const selectedTicket = tickets.find(t => t.id === selectedId) ?? null
  const filtered = tickets.filter(t => (filter === 'all' ? true : t.status === filter) && (
    !search.trim()
    || String(t.reference_code || '').toLowerCase().includes(search.toLowerCase())
    || String(t.subject || '').toLowerCase().includes(search.toLowerCase())
    || String(t.client_name || '').toLowerCase().includes(search.toLowerCase())
    || String(t.client_username || '').toLowerCase().includes(search.toLowerCase())
  ))
  const countFor = (f) => f === 'all' ? tickets.length : tickets.filter(t => t.status === f).length

  const loadTickets = useCallback(async () => {
    const data = await supportRequest('/tickets?limit=100&sort=updated_at')
    setTickets(data.tickets || [])
  }, [])

  const loadDetail = useCallback(async (id) => {
    if (!id) return null
    const [detail, msgs] = await Promise.all([
      supportRequest(`/tickets/${id}`),
      supportRequest(`/tickets/${id}/messages`),
    ])
    const ticket = detail.ticket || null
    if (ticket) ticket.messages = msgs.messages || []
    return ticket
  }, [])

  const mergeTicketMessage = useCallback((ticketId, incomingMessage) => {
    setTickets(prev => prev.map(ticket => {
      if (ticket.id !== ticketId) return ticket
      const currentMessages = Array.isArray(ticket.messages) ? ticket.messages : []
      const nextMessages = [...currentMessages]
      const clientMessageId = incomingMessage?.clientMessageId ? String(incomingMessage.clientMessageId) : ''
      const dbId = Number(incomingMessage?.id)
      const existingIndex = nextMessages.findIndex(msg =>
        (clientMessageId && (String(msg.clientMessageId || '') === clientMessageId || String(msg.id || '') === clientMessageId))
        || (dbId && Number(msg.id) === dbId)
      )
      if (existingIndex !== -1) {
        nextMessages[existingIndex] = incomingMessage
      } else {
        nextMessages.push(incomingMessage)
      }
      return { ...ticket, messages: nextMessages }
    }))
  }, [])

  useEffect(() => { loadTickets() }, [loadTickets])

  useEffect(() => {
    if (!selectedId) return
    loadDetail(selectedId).then(refreshed => {
      if (refreshed) setTickets(prev => prev.map(t => t.id === selectedId ? { ...t, ...refreshed } : t))
    }).catch(() => {})
  }, [selectedId, loadDetail])

  useEffect(() => {
    const socket = getSocket('support')
    const onCreated = (ticket) => setTickets(prev => [ticket, ...prev.filter(t => t.id !== ticket.id)])
    const onUpdated = (ticket) => {
      setTickets(prev => prev.map(t => t.id === ticket.id ? { ...ticket, messages: t.messages } : t))
    }
    const onMessage = (message) => {
      if (!message?.ticket_id) return
      mergeTicketMessage(Number(message.ticket_id), message)
    }
    const onAttachment = (attachment) => {
      if (!attachment?.message_id || !attachment?.ticket_id) return
      setTickets(prev => prev.map(ticket => {
        if (ticket.id !== Number(attachment.ticket_id)) return ticket
        return {
          ...ticket,
          messages: (ticket.messages || []).map(msg =>
            Number(msg.id) !== Number(attachment.message_id) ? msg
            : { ...msg, attachments: [...(msg.attachments || []), attachment] }
          ),
        }
      }))
    }
    socket.on('ticket:created', onCreated)
    socket.on('ticket:updated', onUpdated)
    socket.on('ticket:message', onMessage)
    socket.on('ticket:attachment', onAttachment)
    return () => {
      socket.off('ticket:created', onCreated)
      socket.off('ticket:updated', onUpdated)
      socket.off('ticket:message', onMessage)
      socket.off('ticket:attachment', onAttachment)
    }
  }, [mergeTicketMessage, selectedId])

  const handleCreate = async (payload) => {
    const body = {
      subject: payload.subject,
      description: payload.description,
      category: payload.category,
      priority: payload.priority,
      client_id: payload.client_id,
      domain_id: payload.domain_id,
    }
    const { ticket } = await supportRequest('/tickets', {
      method: 'POST',
      body: JSON.stringify(body),
    })
    if (payload.attachments?.length) {
      // Keep the modal experience, but attachment upload is handled later in the full ticket flow.
    }
    setTickets(prev => [ticket, ...prev.filter(t => t.id !== ticket.id)])
    setSelectedId(ticket.id)
    setShowCreate(false)
  }

  const handleUpdate = async (id, patch) => {
    const current = tickets.find(t => t.id === id)
    if (!current) return
    if (patch.reply || patch.attachments?.length) {
      const clientMessageId = makeTicketMessageId('ticket-reply')
      const adminName = user?.full_name || user?.username || 'Soporte'
      const optimisticMessage = {
        id: clientMessageId,
        clientMessageId,
        ticket_id: id,
        sender_type: 'agent',
        sender_id: 0,
        sender_name: adminName,
        content: patch.reply || '',
        is_internal: 0,
        attachments: (patch.attachments || []).map(a => ({ id: a.id, dataUrl: a.dataUrl, file_name: a.name })),
        created_at: new Date().toISOString(),
      }
      mergeTicketMessage(id, optimisticMessage)
      const attachmentsPayload = (patch.attachments || []).map(att => {
        const [meta, b64] = att.dataUrl.split(',')
        const type = meta.match(/:(.*?);/)[1]
        return { name: att.name, type, data: b64 }
      })
      const { message } = await supportRequest(`/tickets/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({
          content: patch.reply || ' ',
          clientMessageId,
          is_internal: 0,
          sender_name: adminName,
          attachments: attachmentsPayload,
        }),
      })
      mergeTicketMessage(id, message)
      const refreshed = await loadDetail(id)
      if (refreshed) setTickets(prev => prev.map(t => t.id === id ? { ...t, ...refreshed } : t))
    }
  }

  return (
    <TicketsWrap>
      {selectedTicket ? (
        <TicketDetail ticket={selectedTicket} onBack={() => setSelectedId(null)} onUpdate={handleUpdate} />
      ) : (
        <>
          <TicketsTopBar>
            <TicketsCount>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} en total</TicketsCount>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <SearchIcon style={{ position: 'absolute', left: 10, top: 9, fontSize: 16, color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar tickets…" style={{ padding: '8px 12px 8px 32px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', outline: 'none' }} />
              </div>
              <NewTicketBtn onClick={() => setShowCreate(true)}><AddIcon /> Nuevo ticket</NewTicketBtn>
              <button onClick={loadTickets} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.65)', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.12)'} onMouseLeave={e => e.currentTarget.style.background='rgba(255,255,255,0.06)'}><RefreshIcon style={{ fontSize: 18 }} /></button>
            </div>
          </TicketsTopBar>
          <FilterBar>
            {FILTERS.map(f => (
              <FilterTab key={f.id} type="button" $active={filter === f.id} onClick={() => setFilter(f.id)}>
                {f.label}
                {countFor(f.id) > 0 && <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: filter === f.id ? 'rgba(96,165,250,0.20)' : 'rgba(255,255,255,0.07)', color: filter === f.id ? '#60a5fa' : 'rgba(255,255,255,0.30)' }}>{countFor(f.id)}</span>}
              </FilterTab>
            ))}
          </FilterBar>
          {filtered.length === 0 ? (
            <TicketsEmpty>
              <EmptyGlyph>🎫</EmptyGlyph>
              <EmptyTitle>{filter === 'all' ? 'No hay tickets aún' : `No hay tickets ${FILTERS.find(f => f.id === filter)?.label.toLowerCase()}`}</EmptyTitle>
              <EmptySub>{filter === 'all' ? 'Cuando tengas un problema creá un ticket y nuestro equipo te asistirá.' : 'Cambiá el filtro para ver otros tickets.'}</EmptySub>
            </TicketsEmpty>
          ) : (
            filtered.map((ticket, i) => (
              <TicketRow key={ticket.id} $priority={ticket.priority} $i={i} onClick={() => setSelectedId(ticket.id)}>
                <TkIconWrap $status={ticket.status}>{STATUS_CFG[ticket.status]?.icon}</TkIconWrap>
                <TkBody>
                  <TkTopRow>
                    <TkNumber>{ticket.reference_code}</TkNumber>
                    <TkStatusBadge $status={ticket.status}>{STATUS_CFG[ticket.status]?.label}</TkStatusBadge>
                  </TkTopRow>
                  <TkTitle>{ticket.subject}</TkTitle>
                  <TkMeta>
                    <TkMetaItem><CategoryOutlinedIcon />{catLabel(ticket.category)}</TkMetaItem>
                    <TkMetaItem><TkPriorityDot $priority={ticket.priority}>{priLabel(ticket.priority)}</TkPriorityDot></TkMetaItem>
                    {ticket.client_name && <TkMetaItem><PersonOutlinedIcon />{ticket.client_name}</TkMetaItem>}
                    <TkMetaItem><AccessTimeOutlinedIcon />{fmtShort(ticket.created_at, timezone)}</TkMetaItem>
                    {ticket.message_count > 0 && <TkMetaItem>{ticket.message_count} mensajes</TkMetaItem>}
                  </TkMeta>
                </TkBody>
                <TkChevron><ChevronRightIcon style={{ fontSize: 18 }} /></TkChevron>
              </TicketRow>
            ))
          )}
        </>
      )}
      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
    </TicketsWrap>
  )
}

export default TicketsSection
