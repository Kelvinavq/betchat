import { useState, useRef, useEffect, useCallback } from 'react'
import AddIcon                  from '@mui/icons-material/Add'
import ArrowBackIcon             from '@mui/icons-material/ArrowBack'
import SendIcon                  from '@mui/icons-material/Send'
import AttachFileIcon            from '@mui/icons-material/AttachFile'
import CloseIcon                 from '@mui/icons-material/Close'
import ChevronRightIcon          from '@mui/icons-material/ChevronRight'
import PersonOutlinedIcon        from '@mui/icons-material/PersonOutlined'
import CategoryOutlinedIcon      from '@mui/icons-material/CategoryOutlined'
import AccessTimeOutlinedIcon    from '@mui/icons-material/AccessTimeOutlined'
import ImageOutlinedIcon         from '@mui/icons-material/ImageOutlined'
import CheckCircleOutlinedIcon   from '@mui/icons-material/CheckCircleOutlined'
import LockOutlinedIcon          from '@mui/icons-material/LockOutlined'
import AutorenewIcon             from '@mui/icons-material/Autorenew'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import HeadsetMicOutlinedIcon    from '@mui/icons-material/HeadsetMicOutlined'

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
} from './TicketsSection.styles'

/* ─────────────────────────────
   Static data
───────────────────────────── */
const MOCK_USERS = [
  { id: 1, name: 'Carlos Ruiz' },
  { id: 2, name: 'Ana García' },
  { id: 3, name: 'Luis Méndez' },
  { id: 4, name: 'María Torres' },
  { id: 5, name: 'Pedro Sánchez' },
]

const CATEGORIES = [
  { id: 'pagos',   label: 'Pagos y transacciones' },
  { id: 'cuenta',  label: 'Cuenta y acceso' },
  { id: 'tecnico', label: 'Problema técnico' },
  { id: 'bot',     label: 'Bot / automatización' },
  { id: 'otro',    label: 'Otro' },
]

const PRIORITIES = [
  { id: 'low',    label: 'Baja' },
  { id: 'medium', label: 'Media' },
  { id: 'high',   label: 'Alta' },
]

const STATUS_CFG = {
  open:        { label: 'Abierto',     icon: <ReportProblemOutlinedIcon style={{ fontSize: 16 }} /> },
  in_progress: { label: 'En progreso', icon: <AutorenewIcon style={{ fontSize: 16 }} /> },
  resolved:    { label: 'Resuelto',    icon: <CheckCircleOutlinedIcon style={{ fontSize: 16 }} /> },
  closed:      { label: 'Cerrado',     icon: <LockOutlinedIcon style={{ fontSize: 16 }} /> },
}

const FILTERS = [
  { id: 'all',        label: 'Todos'       },
  { id: 'open',       label: 'Abiertos'    },
  { id: 'in_progress',label: 'En progreso' },
  { id: 'resolved',   label: 'Resueltos'   },
  { id: 'closed',     label: 'Cerrados'    },
]

let nextId  = 3
let nextMsg = 10

const INITIAL_TICKETS = [
  {
    id: 1,
    number: 'TK-001',
    title: 'Depósito de cliente no acreditado',
    description: 'El cliente Carlos Ruiz realizó un depósito de $500 hace 3 horas y no fue acreditado. El comprobante fue enviado al chat pero el sistema no procesó la transacción.',
    category: 'pagos',
    priority: 'high',
    status: 'in_progress',
    relatedUser: { id: 1, name: 'Carlos Ruiz' },
    createdAt: '2026-05-03T10:30:00Z',
    updatedAt: '2026-05-03T11:00:00Z',
    attachments: [{ id: 'a1', name: 'comprobante.png', dataUrl: null }],
    messages: [
      {
        id: 'm1', isStaff: false, senderName: 'Admin',
        text: 'El cliente Carlos Ruiz realizó un depósito de $500 hace 3 horas y no fue acreditado. El comprobante fue enviado al chat pero el sistema no procesó la transacción.',
        timestamp: '2026-05-03T10:30:00Z', attachments: [],
      },
      {
        id: 'm2', isStaff: true, senderName: 'Soporte BetChat',
        text: 'Recibimos tu reporte. Estamos verificando la transacción con el banco procesador y revisando los logs del sistema. Te mantendremos informado en las próximas 2 horas.',
        timestamp: '2026-05-03T10:48:00Z', attachments: [],
      },
    ],
  },
  {
    id: 2,
    number: 'TK-002',
    title: 'Error de acceso al panel de administración',
    description: 'Desde ayer no puedo acceder al panel. Cambié la contraseña pero el sistema sigue rechazando el acceso.',
    category: 'cuenta',
    priority: 'medium',
    status: 'open',
    relatedUser: null,
    createdAt: '2026-05-04T08:15:00Z',
    updatedAt: '2026-05-04T08:15:00Z',
    attachments: [],
    messages: [
      {
        id: 'm3', isStaff: false, senderName: 'Admin',
        text: 'Desde ayer no puedo acceder al panel. Cambié la contraseña pero el sistema sigue rechazando el acceso con el mensaje "Credenciales incorrectas".',
        timestamp: '2026-05-04T08:15:00Z', attachments: [],
      },
    ],
  },
]

/* ─────────────────────────────
   Helpers
───────────────────────────── */
const makeId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`

const fmt = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
    + ' · ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const fmtShort = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

const catLabel = (id) => CATEGORIES.find(c => c.id === id)?.label ?? id
const priLabel = (id) => PRIORITIES.find(p => p.id === id)?.label ?? id

/* ═══════════════════════════════════
   Create Ticket Modal
═══════════════════════════════════ */
const CreateModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    title: '', description: '', category: 'pagos', priority: 'medium', userId: '',
  })
  const [attachments, setAttachments] = useState([])
  const fileRef = useRef(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        setAttachments(a => [...a, { id: makeId(), name: file.name, dataUrl: e.target.result }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleDrop = (e) => {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) return
    const relatedUser = form.userId
      ? MOCK_USERS.find(u => u.id === parseInt(form.userId)) ?? null
      : null
    onCreate({
      id: nextId++,
      number: `TK-${String(nextId - 1).padStart(3, '0')}`,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      status: 'open',
      relatedUser,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attachments: attachments.map(a => ({ id: a.id, name: a.name, dataUrl: a.dataUrl })),
      messages: [
        {
          id: `m${nextMsg++}`,
          isStaff: false,
          senderName: 'Admin',
          text: form.description.trim(),
          timestamp: new Date().toISOString(),
          attachments: attachments.map(a => ({ id: a.id, name: a.name, dataUrl: a.dataUrl })),
        },
      ],
    })
  }

  const canSubmit = form.title.trim() && form.description.trim()

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
          {/* title */}
          <ModalField>
            <ModalLabel>Título del problema</ModalLabel>
            <ModalInput
              autoFocus
              placeholder="Ej: Depósito de cliente no acreditado"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
          </ModalField>

          {/* description */}
          <ModalField>
            <ModalLabel>Descripción detallada</ModalLabel>
            <ModalTextarea
              placeholder="Describí qué ocurre, cuándo comenzó y qué pasos seguiste..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </ModalField>

          {/* category + priority */}
          <ModalFieldGrid>
            <ModalField>
              <ModalLabel>Categoría</ModalLabel>
              <ModalSelect value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </ModalSelect>
            </ModalField>
            <ModalField>
              <ModalLabel>Prioridad</ModalLabel>
              <ModalSelect value={form.priority} onChange={e => set('priority', e.target.value)}>
                {PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </ModalSelect>
            </ModalField>
          </ModalFieldGrid>

          {/* related user */}
          <ModalField>
            <ModalLabel>Usuario relacionado (opcional)</ModalLabel>
            <ModalSelect value={form.userId} onChange={e => set('userId', e.target.value)}>
              <option value="">Sin usuario asociado</option>
              {MOCK_USERS.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </ModalSelect>
          </ModalField>

          {/* screenshots */}
          <ModalField>
            <ModalLabel>Capturas de pantalla</ModalLabel>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={e => handleFiles(e.target.files)}
            />
            <AttachZone
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              <AttachZoneIcon><ImageOutlinedIcon /></AttachZoneIcon>
              <AttachZoneText>Hacé clic o arrastrá imágenes aquí</AttachZoneText>
              <AttachZoneSub>PNG, JPG, WEBP · máx. 10 MB por archivo</AttachZoneSub>
            </AttachZone>

            {attachments.length > 0 && (
              <AttachPreviewList>
                {attachments.map(a => (
                  <AttachThumb key={a.id} style={{ width: 64, height: 50 }}>
                    <img src={a.dataUrl} alt={a.name} />
                    <AttachRemoveBtn onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}>
                      ×
                    </AttachRemoveBtn>
                  </AttachThumb>
                ))}
              </AttachPreviewList>
            )}
          </ModalField>
        </ModalBody>

        <ModalFoot>
          <ModalCancelBtn onClick={onClose}>Cancelar</ModalCancelBtn>
          <ModalSubmitBtn onClick={handleSubmit} disabled={!canSubmit}>
            <HeadsetMicOutlinedIcon style={{ fontSize: 16 }} />
            Enviar ticket
          </ModalSubmitBtn>
        </ModalFoot>
      </ModalCard>
    </ModalOverlay>
  )
}

/* ═══════════════════════════════════
   Ticket Detail View
═══════════════════════════════════ */
const TicketDetail = ({ ticket, onBack, onUpdate }) => {
  const [replyText, setReplyText]   = useState('')
  const [attachments, setAttachments] = useState([])
  const [lightboxSrc, setLightboxSrc] = useState(null)
  const threadRef = useRef(null)
  const fileRef   = useRef(null)

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [ticket.messages.length])

  const handleStatusChange = (newStatus) => {
    const event = {
      id: makeId(), type: 'status',
      from: ticket.status, to: newStatus,
      timestamp: new Date().toISOString(),
    }
    onUpdate(ticket.id, {
      status: newStatus,
      updatedAt: new Date().toISOString(),
      messages: [...ticket.messages, event],
    })
  }

  const handleFiles = (files) => {
    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = (e) => {
        setAttachments(a => [...a, { id: makeId(), name: file.name, dataUrl: e.target.result }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleSendReply = () => {
    if (!replyText.trim() && attachments.length === 0) return
    const msg = {
      id: `m${nextMsg++}`,
      isStaff: false,
      senderName: 'Admin',
      text: replyText.trim(),
      timestamp: new Date().toISOString(),
      attachments: [...attachments],
    }
    onUpdate(ticket.id, {
      updatedAt: new Date().toISOString(),
      messages: [...ticket.messages, msg],
    })
    setReplyText('')
    setAttachments([])
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSendReply()
  }

  const isClosed = ticket.status === 'closed' || ticket.status === 'resolved'

  return (
    <DetailWrap>
      {/* header */}
      <DetailHeader>
        <BackBtn onClick={onBack}>
          <ArrowBackIcon /> Volver
        </BackBtn>
        <DetailTitleBlock>
          <DetailNumber>{ticket.number}</DetailNumber>
          <DetailTitle>{ticket.title}</DetailTitle>
        </DetailTitleBlock>
        <DetailStatusSelect
          $status={ticket.status}
          value={ticket.status}
          onChange={e => handleStatusChange(e.target.value)}
        >
          <option value="open">Abierto</option>
          <option value="in_progress">En progreso</option>
          <option value="resolved">Resuelto</option>
          <option value="closed">Cerrado</option>
        </DetailStatusSelect>
      </DetailHeader>

      {/* meta row */}
      <DetailMetaRow>
        <MetaChip>
          <CategoryOutlinedIcon />
          <strong>{catLabel(ticket.category)}</strong>
        </MetaChip>
        <MetaDivider />
        <MetaChip>
          <TkPriorityDot $priority={ticket.priority} as="span" />
          <strong>{priLabel(ticket.priority)}</strong>
        </MetaChip>
        {ticket.relatedUser && (
          <>
            <MetaDivider />
            <MetaChip>
              <PersonOutlinedIcon />
              <strong>{ticket.relatedUser.name}</strong>
            </MetaChip>
          </>
        )}
        <MetaDivider />
        <MetaChip>
          <AccessTimeOutlinedIcon />
          Creado {fmtShort(ticket.createdAt)}
        </MetaChip>
      </DetailMetaRow>

      {/* thread */}
      <ThreadWrap ref={threadRef}>
        {ticket.messages.map(msg => {
          if (msg.type === 'status') {
            return (
              <StatusEvent key={msg.id}>
                {STATUS_CFG[msg.to]?.icon}
                Estado cambiado a <strong style={{ color: 'rgba(255,255,255,0.55)', marginLeft: 4 }}>
                  {STATUS_CFG[msg.to]?.label}
                </strong>
                <span style={{ color: 'rgba(255,255,255,0.16)', marginLeft: 6 }}>{fmtShort(msg.timestamp)}</span>
              </StatusEvent>
            )
          }

          return (
            <MessageBubble key={msg.id} $isStaff={msg.isStaff}>
              <MsgHeader $isStaff={msg.isStaff}>
                <MsgSenderAvatar $isStaff={msg.isStaff}>
                  {(msg.senderName || 'A')[0].toUpperCase()}
                </MsgSenderAvatar>
                <MsgSender>{msg.senderName}</MsgSender>
                <MsgTime>{fmt(msg.timestamp)}</MsgTime>
              </MsgHeader>

              {msg.text && (
                <MsgBody $isStaff={msg.isStaff}>{msg.text}</MsgBody>
              )}

              {msg.attachments?.length > 0 && (
                <MsgAttachments>
                  {msg.attachments.map(att => (
                    att.dataUrl ? (
                      <MsgThumb key={att.id} onClick={() => setLightboxSrc(att.dataUrl)}>
                        <img src={att.dataUrl} alt={att.name} />
                      </MsgThumb>
                    ) : (
                      <MsgThumbLabel key={att.id}>
                        <ImageOutlinedIcon /> {att.name}
                      </MsgThumbLabel>
                    )
                  ))}
                </MsgAttachments>
              )}
            </MessageBubble>
          )
        })}
      </ThreadWrap>

      {/* reply bar */}
      {!isClosed ? (
        <ReplyBar>
          {attachments.length > 0 && (
            <AttachPreviewBar>
              {attachments.map(a => (
                <AttachThumb key={a.id}>
                  <img src={a.dataUrl} alt={a.name} />
                  <AttachRemoveBtn onClick={() => setAttachments(p => p.filter(x => x.id !== a.id))}>
                    ×
                  </AttachRemoveBtn>
                </AttachThumb>
              ))}
            </AttachPreviewBar>
          )}
          <ReplyTextarea
            placeholder="Escribe una respuesta… (Ctrl+Enter para enviar)"
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <ReplyFooter>
            <ReplyLeftActions>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={e => handleFiles(e.target.files)}
              />
              <ReplyIconBtn
                type="button"
                onClick={() => fileRef.current?.click()}
                title="Adjuntar imagen"
              >
                <AttachFileIcon />
              </ReplyIconBtn>
            </ReplyLeftActions>
            <ReplySendBtn
              type="button"
              disabled={!replyText.trim() && attachments.length === 0}
              onClick={handleSendReply}
            >
              <SendIcon /> Responder
            </ReplySendBtn>
          </ReplyFooter>
        </ReplyBar>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 8, padding: '12px 0', fontSize: 12,
          color: 'rgba(255,255,255,0.22)', fontStyle: 'italic',
        }}>
          <LockOutlinedIcon style={{ fontSize: 14 }} />
          Este ticket está {ticket.status === 'resolved' ? 'resuelto' : 'cerrado'} — solo lectura
        </div>
      )}

      {/* lightbox */}
      {lightboxSrc && (
        <LightboxOverlay onClick={() => setLightboxSrc(null)}>
          <LightboxClose onClick={() => setLightboxSrc(null)}><CloseIcon /></LightboxClose>
          <LightboxImg src={lightboxSrc} alt="Captura" onClick={e => e.stopPropagation()} />
        </LightboxOverlay>
      )}
    </DetailWrap>
  )
}

/* ═══════════════════════════════════
   Main TicketsSection
═══════════════════════════════════ */
const TicketsSection = () => {
  const [tickets, setTickets]           = useState(INITIAL_TICKETS)
  const [selectedId, setSelectedId]     = useState(null)
  const [filter, setFilter]             = useState('all')
  const [showCreate, setShowCreate]     = useState(false)

  const selectedTicket = tickets.find(t => t.id === selectedId) ?? null

  const filtered = tickets.filter(t =>
    filter === 'all' ? true : t.status === filter
  )

  const countFor = (f) => f === 'all' ? tickets.length : tickets.filter(t => t.status === f).length

  const handleCreate = useCallback((ticket) => {
    setTickets(p => [ticket, ...p])
    setShowCreate(false)
    setSelectedId(ticket.id)
  }, [])

  const handleUpdate = useCallback((id, patch) => {
    setTickets(p => p.map(t => t.id === id ? { ...t, ...patch } : t))
  }, [])

  if (selectedTicket) {
    return (
      <>
        <TicketDetail
          ticket={selectedTicket}
          onBack={() => setSelectedId(null)}
          onUpdate={handleUpdate}
        />
        {showCreate && (
          <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
        )}
      </>
    )
  }

  return (
    <TicketsWrap>
      {/* top bar */}
      <TicketsTopBar>
        <TicketsCount>{tickets.length} ticket{tickets.length !== 1 ? 's' : ''} en total</TicketsCount>
        <NewTicketBtn onClick={() => setShowCreate(true)}>
          <AddIcon /> Nuevo ticket
        </NewTicketBtn>
      </TicketsTopBar>

      {/* filter tabs */}
      <FilterBar>
        {FILTERS.map(f => (
          <FilterTab
            key={f.id}
            type="button"
            $active={filter === f.id}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            {countFor(f.id) > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700,
                padding: '1px 5px', borderRadius: 4,
                background: filter === f.id ? 'rgba(96,165,250,0.20)' : 'rgba(255,255,255,0.07)',
                color: filter === f.id ? '#60a5fa' : 'rgba(255,255,255,0.30)',
              }}>
                {countFor(f.id)}
              </span>
            )}
          </FilterTab>
        ))}
      </FilterBar>

      {/* list */}
      {filtered.length === 0 ? (
        <TicketsEmpty>
          <EmptyGlyph>🎫</EmptyGlyph>
          <EmptyTitle>
            {filter === 'all' ? 'No hay tickets aún' : `No hay tickets ${FILTERS.find(f => f.id === filter)?.label.toLowerCase()}`}
          </EmptyTitle>
          <EmptySub>
            {filter === 'all'
              ? 'Cuando tengas un problema creá un ticket y nuestro equipo te asistirá.'
              : 'Cambiá el filtro para ver otros tickets.'}
          </EmptySub>
        </TicketsEmpty>
      ) : (
        filtered.map((ticket, i) => (
          <TicketRow
            key={ticket.id}
            $priority={ticket.priority}
            $i={i}
            onClick={() => setSelectedId(ticket.id)}
          >
            <TkIconWrap $status={ticket.status}>
              {STATUS_CFG[ticket.status]?.icon}
            </TkIconWrap>

            <TkBody>
              <TkTopRow>
                <TkNumber>{ticket.number}</TkNumber>
                <TkStatusBadge $status={ticket.status}>
                  {STATUS_CFG[ticket.status]?.label}
                </TkStatusBadge>
              </TkTopRow>
              <TkTitle>{ticket.title}</TkTitle>
              <TkMeta>
                <TkMetaItem>
                  <CategoryOutlinedIcon />
                  {catLabel(ticket.category)}
                </TkMetaItem>
                <TkPriorityDot $priority={ticket.priority}>
                  {priLabel(ticket.priority)}
                </TkPriorityDot>
                {ticket.relatedUser && (
                  <TkMetaItem>
                    <PersonOutlinedIcon />
                    {ticket.relatedUser.name}
                  </TkMetaItem>
                )}
                <TkMetaItem>
                  <AccessTimeOutlinedIcon />
                  {fmtShort(ticket.createdAt)}
                </TkMetaItem>
                {ticket.messages.length > 1 && (
                  <TkMetaItem>
                    {ticket.messages.filter(m => !m.type).length} mensaje{ticket.messages.filter(m => !m.type).length !== 1 ? 's' : ''}
                  </TkMetaItem>
                )}
              </TkMeta>
            </TkBody>

            <TkChevron>
              <ChevronRightIcon style={{ fontSize: 18 }} />
            </TkChevron>
          </TicketRow>
        ))
      )}

      {showCreate && (
        <CreateModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </TicketsWrap>
  )
}

export default TicketsSection
