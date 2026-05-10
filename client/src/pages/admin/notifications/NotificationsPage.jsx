import { useState, useMemo, useCallback, useEffect } from 'react'
import { api } from '../../../utils/api'
import MenuIcon from '@mui/icons-material/Menu'
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import SendIcon from '@mui/icons-material/Send'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import { getPaginationItems } from '../../../utils/pagination'
import { useSystemConfig } from '../../../context/SystemConfigContext'
import {
  PageWrap, PageScroll,
  PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub, AddBtn,
  StatsStrip, StatCard, StatIconWrap, StatInfo, StatValue, StatLabel,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  NotifCell, NotifIconBadge, NotifMeta, NotifTitle, NotifBodyPreview,
  AudienceBadge, StatusBadge,
  DateText, DateSub,
  ActionBtns, ActionBtn,
  Pagination, PaginInfo, PaginBtns, PaginBtn,
  EmptyRow, EmptyCell,
  Overlay, ModalCard, ModalHead, ModalIconBadge, ModalHeadText, ModalTitle, ModalSub, ModalClose,
  ModalBody, ModalFoot, FootLeft, FootRight, ModalBtn,
  Field, FieldLabel, FieldInput, FieldTextarea, FieldSelect, CharCount,
  PreviewCard, PreviewAppIcon, PreviewContent, PreviewAppName, PreviewTime,
  PreviewTitle, PreviewBody, PreviewLabel,
  ScheduleToggleRow, ScheduleRowLabel, ScheduleRowTitle, ScheduleRowSub,
  Toggle, ToggleThumb, ScheduleFields,
  ConfirmBanner, ConfirmTitle, ConfirmSub, ConfirmBtns, ConfirmBtn,
} from './NotificationsPage.styles'

const PAGE_SIZE = 8
const BLANK_FORM = { title: '', body: '', audience: 'all', scheduled: false, schedDate: '', schedTime: '' }

const AUDIENCE_OPTIONS = [
  { value: 'all',        label: 'Todos los usuarios', icon: '🌐' },
  { value: 'active',     label: 'Usuarios activos',   icon: '✅' },
  { value: 'depositors', label: 'Con depósitos',      icon: '💰' },
  { value: 'vip',        label: 'Clientes VIP',       icon: '⭐' },
  { value: 'inactive',   label: 'Usuarios inactivos', icon: '😴' },
]

const audienceLabel = (v) => AUDIENCE_OPTIONS.find(o => o.value === v)?.label ?? v


const fmtDate = (iso) => {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
const fmtTime = (iso) => {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
}

const statusLabel = (s) =>
  s === 'enviada' ? 'Enviada' : s === 'programada' ? 'Programada' : 'Borrador'

const NotificationsPage = ({ onMenuOpen, embedded }) => {
  const { systemConfig } = useSystemConfig()
  const [notifs, setNotifs]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [sending, setSending]           = useState(false)
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]                 = useState(1)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editNotif, setEditNotif]       = useState(null)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [confirmStep, setConfirmStep]   = useState(false)

  /* ── load history from API ── */
  const loadHistory = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.get('/api/push/history?limit=50')
      const rows = (data?.history || []).map(h => ({
        id:           h.id,
        title:        h.title,
        body:         h.body,
        audience:     h.campaignName || 'all',
        status:       'enviada',
        sentAt:       h.sentAt,
        scheduledFor: null,
        sentCount:    h.sentCount,
        failedCount:  h.failedCount,
      }))
      setNotifs(rows)
    } catch { /* silently ignore */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadHistory() }, [loadHistory])

  /* ── derived ── */
  const filtered = useMemo(() => notifs.filter(n => {
    const q = search.toLowerCase()
    const matchSearch = !q || n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    const matchStatus = !statusFilter || n.status === statusFilter
    return matchSearch && matchStatus
  }), [notifs, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = getPaginationItems({ currentPage: page, totalPages })
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const stats = useMemo(() => ({
    enviadas:    notifs.filter(n => n.status === 'enviada').length,
    programadas: notifs.filter(n => n.status === 'programada').length,
    borradores:  notifs.filter(n => n.status === 'borrador').length,
  }), [notifs])

  /* ── modal ── */
  const openNew = () => {
    setEditNotif(null)
    setForm(BLANK_FORM)
    setConfirmStep(false)
    setModalOpen(true)
  }

  const openEdit = (notif) => {
    setEditNotif(notif)
    setForm({
      title:     notif.title,
      body:      notif.body,
      audience:  notif.audience,
      scheduled: !!notif.scheduledFor,
      schedDate: notif.scheduledFor ? notif.scheduledFor.slice(0, 10) : '',
      schedTime: notif.scheduledFor ? notif.scheduledFor.slice(11, 16) : '',
    })
    setConfirmStep(false)
    setModalOpen(true)
  }

  const closeModal = () => { setModalOpen(false); setConfirmStep(false) }

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  /* ── actions ── */
  const saveDraft = () => {
    // drafts are local-only (no DB persistence needed for drafts)
    const draft = {
      id: Date.now(),
      title: form.title, body: form.body, audience: form.audience,
      status: 'borrador', sentAt: null, scheduledFor: null,
    }
    setNotifs(ns => [draft, ...ns])
    closeModal()
  }

  const doSend = async (save = false) => {
    setSending(true)
    try {
      const result = await api.post('/api/push/send-direct', {
        title:    form.title,
        body:     form.body,
        audience: form.audience,
      })
      const entry = {
        id:          Date.now(),
        title:       form.title,
        body:        form.body,
        audience:    form.audience,
        status:      'enviada',
        sentAt:      new Date().toISOString(),
        scheduledFor: null,
        sentCount:   result.sent,
        failedCount: result.failed,
      }
      if (editNotif) {
        setNotifs(ns => ns.map(n => n.id === editNotif.id ? entry : n))
      } else if (save) {
        setNotifs(ns => [entry, ...ns])
      }
      closeModal()
    } catch (err) {
      window.alert(err.message || 'Error al enviar la notificación')
    } finally {
      setSending(false)
    }
  }

  const handleSend = () => {
    if (editNotif) { doSend(true) } else { setConfirmStep(true) }
  }

  const deleteNotif = (id) => setNotifs(ns => ns.filter(n => n.id !== id))

  const isValid   = form.title.trim() && form.body.trim()
  const sendLabel = sending ? 'Enviando...' : (form.scheduled ? 'Programar' : 'Enviar ahora')

  const inner = (
    <>
        {/* ── header ── */}
        {!embedded && (
          <PageHeader>
            <HeaderLeft>
              {onMenuOpen && <MenuBtn onClick={onMenuOpen}><MenuIcon /></MenuBtn>}
              <TitleBlock>
                <PageTitle>Notificaciones Push</PageTitle>
                <PageSub>Gestiona y programa tus campañas de notificaciones</PageSub>
              </TitleBlock>
            </HeaderLeft>
            <AddBtn onClick={openNew}>
              <AddIcon /> Nueva notificación
            </AddBtn>
          </PageHeader>
        )}

        {embedded && (
          <PageHeader style={{ paddingTop: 0 }}>
            <HeaderLeft>
              <TitleBlock>
                <PageSub style={{ marginTop: 0 }}>Crea, programa y gestiona push individuales</PageSub>
              </TitleBlock>
            </HeaderLeft>
            <AddBtn onClick={openNew}>
              <AddIcon /> Nueva notificación
            </AddBtn>
          </PageHeader>
        )}

        {/* ── stats strip ── */}
        <StatsStrip>
          <StatCard>
            <StatIconWrap $bg="rgba(34,197,94,0.10)" $br="rgba(34,197,94,0.20)" $cl="#4ade80">
              <DoneAllOutlinedIcon />
            </StatIconWrap>
            <StatInfo>
              <StatValue>{stats.enviadas}</StatValue>
              <StatLabel>Enviadas</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(14,165,233,0.10)" $br="rgba(14,165,233,0.20)" $cl="#38bdf8">
              <AccessTimeOutlinedIcon />
            </StatIconWrap>
            <StatInfo>
              <StatValue>{stats.programadas}</StatValue>
              <StatLabel>Programadas</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(255,255,255,0.05)" $br="rgba(255,255,255,0.10)" $cl="rgba(255,255,255,0.35)">
              <ArticleOutlinedIcon />
            </StatIconWrap>
            <StatInfo>
              <StatValue>{stats.borradores}</StatValue>
              <StatLabel>Borradores</StatLabel>
            </StatInfo>
          </StatCard>
        </StatsStrip>

        {/* ── filters ── */}
        <FiltersBar>
          <SearchBox>
            <SrchIcon><SearchIcon /></SrchIcon>
            <SearchInput
              placeholder="Buscar notificaciones..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </SearchBox>
          <FilterSelect
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          >
            <option value="">Todos los estados</option>
            <option value="enviada">Enviadas</option>
            <option value="programada">Programadas</option>
            <option value="borrador">Borradores</option>
          </FilterSelect>
          <ResultCount>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        {/* ── table ── */}
        <TableCard>
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Notificación</Th>
                  <Th>Audiencia</Th>
                  <Th>Programada para</Th>
                  <Th>Enviada</Th>
                  <Th>Estado</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {paginated.length === 0 ? (
                  <EmptyRow>
                    <EmptyCell colSpan={6}>No hay notificaciones que mostrar</EmptyCell>
                  </EmptyRow>
                ) : paginated.map(n => (
                  <Tr key={n.id}>
                    <Td>
                      <NotifCell>
                        <NotifIconBadge $s={n.status}>
                          <NotificationsOutlinedIcon />
                        </NotifIconBadge>
                        <NotifMeta>
                          <NotifTitle>{n.title}</NotifTitle>
                          <NotifBodyPreview>{n.body}</NotifBodyPreview>
                        </NotifMeta>
                      </NotifCell>
                    </Td>
                    <Td>
                      <AudienceBadge>
                        <PeopleOutlinedIcon style={{ fontSize: 13 }} />
                        {audienceLabel(n.audience)}
                      </AudienceBadge>
                    </Td>
                    <Td>
                      {n.scheduledFor ? (
                        <>
                          <DateText>{fmtDate(n.scheduledFor)}</DateText>
                          <DateSub>{fmtTime(n.scheduledFor)}</DateSub>
                        </>
                      ) : (
                        <DateText style={{ color: 'rgba(255,255,255,0.14)' }}>—</DateText>
                      )}
                    </Td>
                    <Td>
                      {n.sentAt ? (
                        <>
                          <DateText>{fmtDate(n.sentAt)}</DateText>
                          <DateSub>{fmtTime(n.sentAt)}</DateSub>
                        </>
                      ) : (
                        <DateText style={{ color: 'rgba(255,255,255,0.14)' }}>—</DateText>
                      )}
                    </Td>
                    <Td>
                      <StatusBadge $s={n.status}>{statusLabel(n.status)}</StatusBadge>
                    </Td>
                    <Td $center>
                      <ActionBtns style={{ justifyContent: 'center' }}>
                        <ActionBtn title="Editar" onClick={() => openEdit(n)}>
                          <EditOutlinedIcon />
                        </ActionBtn>
                        {n.status === 'enviada' && (
                          <ActionBtn title="Reenviar" $v="send" onClick={() => openEdit(n)}>
                            <ReplayOutlinedIcon />
                          </ActionBtn>
                        )}
                        <ActionBtn title="Eliminar" $v="danger" onClick={() => deleteNotif(n.id)}>
                          <DeleteOutlinedIcon />
                        </ActionBtn>
                      </ActionBtns>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>

          {totalPages > 1 && (
            <Pagination>
              <PaginInfo>
                Mostrando {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} de {filtered.length}
              </PaginInfo>
              <PaginBtns>
                <PaginBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  <ChevronLeftIcon />
                </PaginBtn>
                {pageItems.map(item => item.type === 'ellipsis' ? (
                  <PaginBtn key={item.key} type="button" disabled>...</PaginBtn>
                ) : (
                  <PaginBtn key={item.key} type="button" $active={item.page === page} onClick={() => setPage(item.page)}>{item.page}</PaginBtn>
                ))}
                <PaginBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  <ChevronRightIcon />
                </PaginBtn>
              </PaginBtns>
            </Pagination>
          )}
        </TableCard>

      {/* ══ MODAL ══ */}
      {modalOpen && (
        <Overlay onClick={e => e.target === e.currentTarget && closeModal()}>
          <ModalCard>

            <ModalHead>
              <ModalIconBadge><NotificationsOutlinedIcon /></ModalIconBadge>
              <ModalHeadText>
                <ModalTitle>{editNotif ? 'Editar notificación' : 'Nueva notificación'}</ModalTitle>
                <ModalSub>
                  {editNotif
                    ? `Estado actual: ${statusLabel(editNotif.status)}`
                    : 'Redacta y envía o guarda como borrador'}
                </ModalSub>
              </ModalHeadText>
              <ModalClose onClick={closeModal}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>

              {/* live preview */}
              <div>
                <PreviewLabel>Vista previa</PreviewLabel>
                <PreviewCard>
                  <PreviewAppIcon><NotificationsOutlinedIcon /></PreviewAppIcon>
                  <PreviewContent>
                    <PreviewAppName>
                      {systemConfig.appName}
                      <PreviewTime>ahora</PreviewTime>
                    </PreviewAppName>
                    <PreviewTitle>{form.title || 'Título de la notificación'}</PreviewTitle>
                    <PreviewBody>{form.body || 'El cuerpo de tu mensaje aparecerá aquí...'}</PreviewBody>
                  </PreviewContent>
                </PreviewCard>
              </div>

              {/* title */}
              <Field $full>
                <FieldLabel>Título</FieldLabel>
                <FieldInput
                  placeholder="Ej: ¡Nueva promoción disponible!"
                  maxLength={80}
                  value={form.title}
                  onChange={e => setField('title', e.target.value)}
                />
                <CharCount $warn={form.title.length > 60}>{form.title.length}/80</CharCount>
              </Field>

              {/* body */}
              <Field $full>
                <FieldLabel>Mensaje</FieldLabel>
                <FieldTextarea
                  placeholder="Escribe el cuerpo de la notificación..."
                  maxLength={240}
                  value={form.body}
                  onChange={e => setField('body', e.target.value)}
                />
                <CharCount $warn={form.body.length > 180}>{form.body.length}/240</CharCount>
              </Field>

              {/* audience */}
              <Field $full>
                <FieldLabel>Audiencia</FieldLabel>
                <FieldSelect value={form.audience} onChange={e => setField('audience', e.target.value)}>
                  {AUDIENCE_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.icon} {o.label}</option>
                  ))}
                </FieldSelect>
              </Field>

              {/* schedule toggle */}
              <ScheduleToggleRow>
                <ScheduleRowLabel>
                  <ScheduleRowTitle>Programar envío</ScheduleRowTitle>
                  <ScheduleRowSub>Define una fecha y hora para el envío automático</ScheduleRowSub>
                </ScheduleRowLabel>
                <Toggle $on={form.scheduled} onClick={() => setField('scheduled', !form.scheduled)}>
                  <ToggleThumb $on={form.scheduled} />
                </Toggle>
              </ScheduleToggleRow>

              {form.scheduled && (
                <ScheduleFields>
                  <Field>
                    <FieldLabel>Fecha</FieldLabel>
                    <FieldInput
                      type="date"
                      value={form.schedDate}
                      onChange={e => setField('schedDate', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Hora</FieldLabel>
                    <FieldInput
                      type="time"
                      value={form.schedTime}
                      onChange={e => setField('schedTime', e.target.value)}
                    />
                  </Field>
                </ScheduleFields>
              )}

              {/* confirm banner (new notifications only) */}
              {confirmStep && (
                <ConfirmBanner>
                  <ConfirmTitle>¿Guardar para uso futuro?</ConfirmTitle>
                  <ConfirmSub>
                    Puedes conservar esta notificación en tu biblioteca para reenviarla fácilmente cuando quieras.
                  </ConfirmSub>
                  <ConfirmBtns>
                    <ConfirmBtn onClick={() => doSend(false)}>Solo enviar</ConfirmBtn>
                    <ConfirmBtn $primary onClick={() => doSend(true)}>Guardar y enviar</ConfirmBtn>
                  </ConfirmBtns>
                </ConfirmBanner>
              )}

            </ModalBody>

            {!confirmStep && (
              <ModalFoot>
                <FootLeft>
                  <ModalBtn $v="ghost" onClick={closeModal}>Cancelar</ModalBtn>
                </FootLeft>
                <FootRight>
                  <ModalBtn
                    onClick={saveDraft}
                    disabled={!isValid}
                    style={{ opacity: isValid ? 1 : 0.42 }}
                  >
                    <SaveOutlinedIcon style={{ fontSize: 16 }} /> Guardar borrador
                  </ModalBtn>
                  <ModalBtn
                    $v="primary"
                    onClick={handleSend}
                    disabled={!isValid || sending}
                    style={{ opacity: (isValid && !sending) ? 1 : 0.42 }}
                  >
                    <SendIcon style={{ fontSize: 16 }} /> {sendLabel}
                  </ModalBtn>
                </FootRight>
              </ModalFoot>
            )}

          </ModalCard>
        </Overlay>
      )}
    </>
  )

  if (embedded) return <>{inner}</>

  return (
    <PageWrap>
      <PageScroll>{inner}</PageScroll>
    </PageWrap>
  )
}

export default NotificationsPage
