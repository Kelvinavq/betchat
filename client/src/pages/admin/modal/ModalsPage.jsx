import { useCallback, useEffect, useState } from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SendIcon from '@mui/icons-material/Send'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import PeopleOutlinedIcon from '@mui/icons-material/PeopleOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import SearchIcon from '@mui/icons-material/Search'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import { api } from '../../../utils/api'
import { getPaginationItems } from '../../../utils/pagination'
import {
  PageWrap, PageScroll, PageHeader, HeaderLeft, MenuBtn, AddBtn, TitleBlock, PageTitle, PageSub,
  StatsStrip, StatCard, StatIconWrap, StatInfo, StatValue, StatLabel,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  NotifCell, NotifIconBadge, NotifMeta, NotifTitle, NotifBodyPreview,
  AudienceBadge, StatusBadge, DateText, DateSub, ActionBtns, ActionBtn,
  Pagination, PaginInfo, PaginBtns, PaginBtn,
  Overlay, ModalCard, ModalHead, ModalIconBadge, ModalHeadText, ModalTitle, ModalSub,
  ModalClose, ModalBody, ModalFoot, FootLeft, FootRight, ModalBtn,
  Field, FieldLabel, FieldInput, FieldTextarea, FieldSelect, CharCount,
  ScheduleToggleRow, ScheduleRowLabel, ScheduleRowTitle, ScheduleRowSub,
  Toggle, ToggleThumb, ScheduleFields, ConfirmBanner, ConfirmTitle,
  ConfirmSub, ConfirmBtns, ConfirmBtn,
} from './ModalsPage.styles'

const PAGE_SIZE = 8
const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Todos', icon: 'Global' },
  { value: 'active', label: 'Activos', icon: 'OK' },
  { value: 'vip', label: 'VIP', icon: 'VIP' },
]

const BLANK_FORM = {
  title: '',
  body: '',
  img: '',
  audience: 'all',
  scheduled: false,
  schedDate: '',
  schedTime: '',
  dismissible: true,
  ctaLabel: '',
  ctaUrl: '',
}

const audienceLabel = value => AUDIENCE_OPTIONS.find(option => option.value === value)?.label ?? value
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : null
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null
const statusLabel = status => status === 'enviada' ? 'Mostrado' : status === 'programada' ? 'Programado' : 'Borrador'

const toInputDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

const toInputTime = (iso) => {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(11, 16)
}

const ModalsPage = ({ onMenuOpen }) => {
  const [modals, setModals] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModal, setEditModal] = useState(null)
  const [form, setForm] = useState(BLANK_FORM)
  const [confirmStep, setConfirmStep] = useState(false)
  const [stats, setStats] = useState({ enviadas: 0, programadas: 0, borradores: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })

  const loadModals = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        search: search.trim(),
        status: statusFilter,
      })
      const data = await api.get('/api/modals?' + params.toString())
      setModals(data.modals || [])
      setStats(data.stats || { enviadas: 0, programadas: 0, borradores: 0 })
      setPagination(data.pagination || { page, limit: PAGE_SIZE, total: data.modals?.length || 0, totalPages: 1 })
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => {
    queueMicrotask(() => { loadModals() })
  }, [loadModals])

  const totalPages = pagination.totalPages
  const pages = getPaginationItems({ currentPage: pagination.page, totalPages })

  const openNew = () => {
    setEditModal(null)
    setForm(BLANK_FORM)
    setConfirmStep(false)
    setModalOpen(true)
  }

  const openEdit = (modal) => {
    setEditModal(modal)
    setForm({
      title: modal.title,
      body: modal.body,
      img: modal.img,
      audience: modal.audience,
      scheduled: Boolean(modal.scheduledFor),
      schedDate: toInputDate(modal.scheduledFor),
      schedTime: toInputTime(modal.scheduledFor),
      dismissible: modal.dismissible ?? true,
      ctaLabel: modal.ctaLabel ?? '',
      ctaUrl: modal.ctaUrl ?? '',
    })
    setConfirmStep(false)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setConfirmStep(false)
    setEditModal(null)
  }

  const setField = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const buildPayload = (status) => {
    const scheduledFor = form.scheduled && form.schedDate
      ? new Date(`${form.schedDate}T${form.schedTime || '00:00'}:00`).toISOString()
      : null
    const resolvedStatus = scheduledFor ? 'programada' : status

    return {
      name: form.title,
      title: form.title,
      body: form.body,
      img: form.img,
      audience: form.audience,
      status: resolvedStatus,
      sentAt: resolvedStatus === 'enviada' ? new Date().toISOString() : null,
      scheduledFor,
      dismissible: Boolean(form.dismissible),
      ctaLabel: form.ctaLabel,
      ctaUrl: form.ctaUrl,
    }
  }

  const persistModal = async (payload) => {
    setSaving(true)
    try {
      if (editModal) await api.put('/api/modals/' + editModal.id, payload)
      else {
        await api.post('/api/modals', payload)
        setPage(1)
      }
      closeModal()
      await loadModals()
    } finally {
      setSaving(false)
    }
  }

  const saveDraft = () => {
    persistModal({ ...buildPayload('borrador'), status: 'borrador', sentAt: null, scheduledFor: null })
  }

  const doSend = (save = false) => {
    if (editModal || save) persistModal(buildPayload('enviada'))
    else closeModal()
  }

  const handleSend = () => {
    if (editModal) doSend(true)
    else setConfirmStep(true)
  }

  const deleteModal = async (id) => {
    await api.delete('/api/modals/' + id)
    await loadModals()
  }

  const isValid = form.title.trim() && form.body.trim()
  const sendLabel = form.scheduled ? 'Programar' : 'Mostrar ahora'

  return (
    <PageWrap>
      <PageScroll>
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && (
              <MenuBtn type="button" onClick={onMenuOpen} aria-label="Menú">
                <MenuIcon />
              </MenuBtn>
            )}
            <TitleBlock>
              <PageTitle>Ventanas Promocionales</PageTitle>
              <PageSub>Crea ventanas emergentes que se muestran en tu sitio web</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn type="button" onClick={openNew}><AddIcon /> Nueva ventana</AddBtn>
        </PageHeader>

        <StatsStrip>
          <StatCard>
            <StatIconWrap $bg="rgba(34,197,94,0.10)" $br="rgba(34,197,94,0.20)" $cl="#4ade80"><NotificationsNoneOutlinedIcon /></StatIconWrap>
            <StatInfo><StatValue>{stats.enviadas}</StatValue><StatLabel>Mostradas</StatLabel></StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(14,165,233,0.10)" $br="rgba(14,165,233,0.20)" $cl="#38bdf8"><NotificationsNoneOutlinedIcon /></StatIconWrap>
            <StatInfo><StatValue>{stats.programadas}</StatValue><StatLabel>Programadas</StatLabel></StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(255,255,255,0.03)" $br="rgba(255,255,255,0.06)" $cl="rgba(255,255,255,0.35)"><NotificationsNoneOutlinedIcon /></StatIconWrap>
            <StatInfo><StatValue>{stats.borradores}</StatValue><StatLabel>Borradores</StatLabel></StatInfo>
          </StatCard>
        </StatsStrip>

        <FiltersBar>
          <SearchBox>
            <SrchIcon><SearchIcon /></SrchIcon>
            <SearchInput placeholder="Buscar ventanas..." value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} />
          </SearchBox>
          <FilterSelect value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }}>
            <option value="">Todos los estados</option>
            <option value="enviada">Mostradas</option>
            <option value="programada">Programadas</option>
            <option value="borrador">Borradores</option>
          </FilterSelect>
          <ResultCount>{pagination.total} ventana{pagination.total !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        <TableCard>
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Ventana</Th>
                  <Th>Audiencia</Th>
                  <Th>Programada</Th>
                  <Th>Mostrada</Th>
                  <Th>Estado</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>Cargando ventanas...</td></tr>
                ) : modals.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No hay ventanas</td></tr>
                ) : modals.map(modal => (
                  <Tr key={modal.id}>
                    <Td>
                      <NotifCell>
                        <NotifIconBadge $s={modal.status}><NotificationsNoneOutlinedIcon /></NotifIconBadge>
                        <NotifMeta>
                          <NotifTitle>{modal.title}</NotifTitle>
                          <NotifBodyPreview>{modal.body}</NotifBodyPreview>
                        </NotifMeta>
                      </NotifCell>
                    </Td>
                    <Td><AudienceBadge><PeopleOutlinedIcon style={{ fontSize: 13 }} />{audienceLabel(modal.audience)}</AudienceBadge></Td>
                    <Td>{modal.scheduledFor ? (<><DateText>{fmtDate(modal.scheduledFor)}</DateText><DateSub>{fmtTime(modal.scheduledFor)}</DateSub></>) : (<DateText style={{ color: 'rgba(255,255,255,0.14)' }}>-</DateText>)}</Td>
                    <Td>{modal.sentAt ? (<><DateText>{fmtDate(modal.sentAt)}</DateText><DateSub>{fmtTime(modal.sentAt)}</DateSub></>) : (<DateText style={{ color: 'rgba(255,255,255,0.14)' }}>-</DateText>)}</Td>
                    <Td><StatusBadge $s={modal.status}>{statusLabel(modal.status)}</StatusBadge></Td>
                    <Td $center>
                      <ActionBtns style={{ justifyContent: 'center' }}>
                        <ActionBtn type="button" title="Editar" onClick={() => openEdit(modal)}><EditOutlinedIcon /></ActionBtn>
                        <ActionBtn type="button" title="Eliminar" $v="danger" onClick={() => deleteModal(modal.id)}><DeleteOutlinedIcon /></ActionBtn>
                      </ActionBtns>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>
          <Pagination>
            <PaginInfo>
              {pagination.total === 0
                ? '0 ventanas'
                : `${(pagination.page - 1) * PAGE_SIZE + 1}-${Math.min(pagination.page * PAGE_SIZE, pagination.total)} de ${pagination.total}`
              }
            </PaginInfo>
            <PaginBtns>
              <PaginBtn type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={pagination.page === 1}>
                <ChevronLeftIcon />
              </PaginBtn>
              {pages.map(item => item.type === 'ellipsis' ? (
                <PaginBtn key={item.key} type="button" disabled>
                  ...
                </PaginBtn>
              ) : (
                <PaginBtn key={item.key} type="button" $active={item.page === pagination.page} onClick={() => setPage(item.page)}>
                  {item.page}
                </PaginBtn>
              ))}
              <PaginBtn type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={pagination.page === totalPages}>
                <ChevronRightIcon />
              </PaginBtn>
            </PaginBtns>
          </Pagination>
        </TableCard>
      </PageScroll>

      {modalOpen && (
        <Overlay onClick={event => event.target === event.currentTarget && closeModal()}>
          <ModalCard style={{ maxWidth: 580 }}>
            <ModalHead>
              <ModalIconBadge><NotificationsNoneOutlinedIcon /></ModalIconBadge>
              <ModalHeadText>
                <ModalTitle>{editModal ? 'Editar ventana' : 'Nueva ventana'}</ModalTitle>
                <ModalSub>{editModal ? `Estado: ${statusLabel(editModal.status)}` : 'Configura cómo se mostrará en la web'}</ModalSub>
              </ModalHeadText>
              <ModalClose type="button" onClick={closeModal}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{
                  display: 'inline-block', width: 300, minHeight: 240, background: '#111', color: '#fff',
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.5)', padding: 20, textAlign: 'left',
                  position: 'relative',
                }}>
                  {form.img && <img src={form.img} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginBottom: 12 }} />}
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>{form.title || 'Título'}</div>
                  <div style={{ fontSize: 13, color: '#aaa', lineHeight: 1.4, marginBottom: 12 }}>{form.body || 'Contenido del mensaje...'}</div>
                  {(form.ctaLabel || form.ctaUrl) && (
                    <button type="button" style={{ background: '#1e86ff', color: '#fff', padding: '6px 10px', borderRadius: 8, border: 'none', fontSize: 12, cursor: 'pointer', width: '100%' }}>
                      {form.ctaLabel || 'Ir'}
                    </button>
                  )}
                  {form.dismissible !== false && (
                    <button type="button" style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none', borderRadius: 100, width: 24, height: 24, cursor: 'pointer', fontSize: 16 }}>x</button>
                  )}
                </div>
              </div>

              <Field $full>
                <FieldLabel>Título</FieldLabel>
                <FieldInput placeholder="Ej: Nueva promoción" maxLength={80} value={form.title} onChange={event => setField('title', event.target.value)} />
                <CharCount $warn={form.title.length > 60}>{form.title.length}/80</CharCount>
              </Field>

              <Field $full>
                <FieldLabel>Mensaje</FieldLabel>
                <FieldTextarea placeholder="Texto principal..." maxLength={300} value={form.body} onChange={event => setField('body', event.target.value)} />
                <CharCount $warn={form.body.length > 240}>{form.body.length}/300</CharCount>
              </Field>

              <Field>
                <FieldLabel>Imagen URL</FieldLabel>
                <FieldInput placeholder="https://ejemplo.com/imagen.jpg" value={form.img} onChange={event => setField('img', event.target.value)} />
              </Field>

              <Field>
                <FieldLabel>Botón CTA</FieldLabel>
                <FieldInput placeholder="Texto del botón" value={form.ctaLabel} onChange={event => setField('ctaLabel', event.target.value)} style={{ marginBottom: 8 }} />
                <FieldInput placeholder="https://destino.com" value={form.ctaUrl} onChange={event => setField('ctaUrl', event.target.value)} />
              </Field>

              <Field $full>
                <FieldLabel>Audiencia</FieldLabel>
                <FieldSelect value={form.audience} onChange={event => setField('audience', event.target.value)}>
                  {AUDIENCE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.icon} {option.label}</option>)}
                </FieldSelect>
              </Field>

              <ScheduleToggleRow>
                <ScheduleRowLabel>
                  <ScheduleRowTitle>Programar visualización</ScheduleRowTitle>
                  <ScheduleRowSub>Define fecha y hora para que se muestre automáticamente</ScheduleRowSub>
                </ScheduleRowLabel>
                <Toggle type="button" $on={form.scheduled} onClick={() => setField('scheduled', !form.scheduled)}><ToggleThumb $on={form.scheduled} /></Toggle>
              </ScheduleToggleRow>

              {form.scheduled && (
                <ScheduleFields>
                  <Field>
                    <FieldLabel>Fecha</FieldLabel>
                    <FieldInput type="date" value={form.schedDate} onChange={event => setField('schedDate', event.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Hora</FieldLabel>
                    <FieldInput type="time" value={form.schedTime} onChange={event => setField('schedTime', event.target.value)} />
                  </Field>
                </ScheduleFields>
              )}

              <Field>
                <FieldLabel>¿Se puede cerrar?</FieldLabel>
                <Toggle type="button" $on={form.dismissible} onClick={() => setField('dismissible', !form.dismissible)} style={{ width: 60 }}><ToggleThumb $on={form.dismissible} /></Toggle>
              </Field>

              {confirmStep && (
                <ConfirmBanner>
                  <ConfirmTitle>¿Guardar en librería?</ConfirmTitle>
                  <ConfirmSub>Puedes guardar esta ventana para usarla después.</ConfirmSub>
                  <ConfirmBtns>
                    <ConfirmBtn type="button" onClick={() => doSend(false)}>Solo mostrar</ConfirmBtn>
                    <ConfirmBtn type="button" $primary onClick={() => doSend(true)}>Guardar y mostrar</ConfirmBtn>
                  </ConfirmBtns>
                </ConfirmBanner>
              )}
            </ModalBody>

            {!confirmStep && (
              <ModalFoot>
                <FootLeft><ModalBtn type="button" $v="ghost" onClick={closeModal}>Cancelar</ModalBtn></FootLeft>
                <FootRight>
                  <ModalBtn type="button" onClick={saveDraft} disabled={!isValid || saving} style={{ opacity: isValid ? 1 : 0.42 }}><SaveOutlinedIcon style={{ fontSize: 16 }} /> Guardar borrador</ModalBtn>
                  <ModalBtn type="button" $v="primary" onClick={handleSend} disabled={!isValid || saving} style={{ opacity: isValid ? 1 : 0.42 }}><SendIcon style={{ fontSize: 16 }} /> {saving ? 'Guardando...' : sendLabel}</ModalBtn>
                </FootRight>
              </ModalFoot>
            )}
          </ModalCard>
        </Overlay>
      )}
    </PageWrap>
  )
}

export default ModalsPage
