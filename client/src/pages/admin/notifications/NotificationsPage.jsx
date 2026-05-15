import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import { api, resolveApiAsset } from '../../../utils/api'
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
import HttpsOutlinedIcon from '@mui/icons-material/HttpsOutlined'
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import { getPaginationItems } from '../../../utils/pagination'
import { useSystemConfig } from '../../../context/SystemConfigContext'
import { useToast, useConfirm } from '../../../context/ToastContext'
import {
  PageWrap, PageScroll, EmbeddedShell,
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
  PreviewShell, PreviewHero, PreviewBodyRow, PreviewAppIcon, PreviewContent, PreviewAppName, PreviewTime,
  PreviewTitle, PreviewBody, PreviewLabel, PreviewCaption,
  ImageDropRoot, ImageUploadZone, ImageUploadIconWrap, ImageUploadTitle, ImageUploadHint,
  ImageUploadHiddenInput, ImageUploadSpinner, ImageAttachedRow, ImageAttachedThumb, ImageAttachedMeta,
  ImageAttachedLabel, ImageAttachedSub, ImageGhostBtn, ImageRemoveBtn, UploadErrorBanner,
  ScheduleToggleRow, ScheduleRowLabel, ScheduleRowTitle, ScheduleRowSub,
  Toggle, ToggleThumb, ScheduleFields,
  ConfirmBanner, ConfirmTitle, ConfirmSub, ConfirmBtns, ConfirmBtn,
  MainTabsWrap, MainTabBtn, SubsSubTabsWrap, SubsSubTabBtn, CellMuted, TruncateCell,
  SubsAvatar, avatarGradient, SubsClientCell, SubsNameBlock, SubsName, SubsIdLine,
  SubsStatusPill, SubsActionBtn, DeviceChip,
  Toast, ToastIconBox, ToastBody, ToastTitle, ToastMsg, ToastClose,
} from './NotificationsPage.styles'

const ROWS_PER_PAGE = 8
const TAB_ENVIOS = 'envios'
const TAB_SUBS = 'suscriptores'
const BLANK_FORM = { title: '', body: '', image: '', audience: 'all', scheduled: false, schedDate: '', schedTime: '' }

const AUDIENCE_OPTIONS = [
  { value: 'all',        label: 'Todos los usuarios', icon: '🌐' },
  { value: 'active',     label: 'Usuarios activos',   icon: '✅' },
  { value: 'depositors', label: 'Con depósitos',      icon: '💰' },
  { value: 'vip',        label: 'Clientes VIP',       icon: '⭐' },
  { value: 'inactive',   label: 'Usuarios inactivos', icon: '😴' },
]

const audienceLabel = (v) => AUDIENCE_OPTIONS.find(o => o.value === v)?.label ?? v


const fmtDate = (iso, tz) => {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', ...(tz && { timeZone: tz }) })
}
const fmtTime = (iso, tz) => {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', ...(tz && { timeZone: tz }) })
}

const statusLabel = (s) =>
  s === 'enviada' ? 'Enviada' : s === 'programada' ? 'Programada' : 'Borrador'

const NotificationsPage = ({ onMenuOpen, embedded }) => {
  const { systemConfig }  = useSystemConfig()
  const { timezone }      = useDateFormat()
  const toast = useToast()
  const confirm = useConfirm()
  const [mainTab, setMainTab]           = useState(TAB_ENVIOS)
  const [drafts, setDrafts]             = useState([])
  const [historyItems, setHistoryItems] = useState([])
  const [histLoading, setHistLoading]   = useState(true)
  const [histPagination, setHistPagination] = useState({
    page: 1, limit: ROWS_PER_PAGE, total: 0, totalPages: 1,
  })
  const [subsListView, setSubsListView] = useState('activos')
  const [subscribers, setSubscribers]   = useState([])
  const [blockedClients, setBlockedClients] = useState([])
  const [subLoading, setSubLoading]     = useState(false)
  const [subPagination, setSubPagination] = useState({
    page: 1, limit: ROWS_PER_PAGE, total: 0, totalPages: 1,
  })
  const [blockedPagination, setBlockedPagination] = useState({
    page: 1, limit: ROWS_PER_PAGE, total: 0, totalPages: 1,
  })
  const [localToast, setLocalToast]      = useState(null)
  const [sending, setSending]           = useState(false)
  const [search, setSearch]             = useState('')
  const [debouncedQ, setDebouncedQ]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage]                 = useState(1)
  const [subPage, setSubPage]           = useState(1)
  const [modalOpen, setModalOpen]       = useState(false)
  const [editNotif, setEditNotif]       = useState(null)
  const [form, setForm]                 = useState(BLANK_FORM)
  const [confirmStep, setConfirmStep]   = useState(false)
  const [uploadError, setUploadError]   = useState('')
  const [uploading, setUploading]       = useState(false)
  const [imgDrag, setImgDrag]           = useState(false)
  const inputRef = useRef()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 380)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    if (!localToast) return
    const t = setTimeout(() => setLocalToast(null), 4200)
    return () => clearTimeout(t)
  }, [localToast])

  const notify = (message, type = 'success') => setLocalToast({ message, type })

  const useApiHistory = mainTab === TAB_ENVIOS && statusFilter !== 'borrador' && statusFilter !== 'programada'

  const loadHistory = useCallback(async (pageNum = 1) => {
    setHistLoading(true)
    try {
      const q = encodeURIComponent(debouncedQ)
      const data = await api.get(`/api/push/history?page=${pageNum}&limit=${ROWS_PER_PAGE}&q=${q}`)
      const rows = (data?.history || []).map(h => ({
        id:           h.id,
        title:        h.title,
        body:         h.body,
        image:        h.image || '',
        audience:     h.campaignName || 'all',
        status:       'enviada',
        sentAt:       h.sentAt,
        scheduledFor: null,
        sentCount:    h.sentCount,
        failedCount:  h.failedCount,
        isDraft:      false,
      }))
      setHistoryItems(rows)
      if (data?.pagination) setHistPagination(data.pagination)
    } catch { /* ignore */ } finally {
      setHistLoading(false)
    }
  }, [debouncedQ])

  useEffect(() => {
    if (!useApiHistory) {
      setHistLoading(false)
      return
    }
    loadHistory(page)
  }, [useApiHistory, page, loadHistory])

  const loadSubscribers = useCallback(async (pageNum = 1) => {
    setSubLoading(true)
    try {
      const q = encodeURIComponent(debouncedQ)
      const data = await api.get(`/api/push/subscribers?page=${pageNum}&limit=${ROWS_PER_PAGE}&q=${q}`)
      setSubscribers(data?.subscribers || [])
      if (data?.pagination) setSubPagination(data.pagination)
    } catch { setSubscribers([]) } finally {
      setSubLoading(false)
    }
  }, [debouncedQ])

  const loadBlockedClients = useCallback(async (pageNum = 1) => {
    setSubLoading(true)
    try {
      const q = encodeURIComponent(debouncedQ)
      const data = await api.get(`/api/push/blocked-subscribers?page=${pageNum}&limit=${ROWS_PER_PAGE}&q=${q}`)
      setBlockedClients(data?.blocked || [])
      if (data?.pagination) setBlockedPagination(data.pagination)
    } catch { setBlockedClients([]) } finally {
      setSubLoading(false)
    }
  }, [debouncedQ])

  useEffect(() => {
    if (mainTab !== TAB_SUBS) return
    if (subsListView === 'bloqueados') loadBlockedClients(subPage)
    else loadSubscribers(subPage)
  }, [mainTab, subPage, subsListView, loadSubscribers, loadBlockedClients])

  useEffect(() => {
    setPage(1)
    setSubPage(1)
  }, [statusFilter, mainTab, subsListView])

  const localFiltered = useMemo(() => {
    if (statusFilter !== 'borrador' && statusFilter !== 'programada') return []
    const q = search.toLowerCase()
    return drafts.filter((d) => {
      if (statusFilter === 'borrador' && d.status !== 'borrador') return false
      if (statusFilter === 'programada' && d.status !== 'programada') return false
      return !q || d.title.toLowerCase().includes(q) || d.body.toLowerCase().includes(q)
    })
  }, [drafts, statusFilter, search])

  const localTotalPages = Math.max(1, Math.ceil(localFiltered.length / ROWS_PER_PAGE))
  const localPaginated = localFiltered.slice((page - 1) * ROWS_PER_PAGE, page * ROWS_PER_PAGE)

  const tableRows = useApiHistory ? historyItems : localPaginated
  const totalPages = useApiHistory ? histPagination.totalPages : localTotalPages
  const pageItems = getPaginationItems({ currentPage: page, totalPages })
  const subsDataPagination = subsListView === 'activos' ? subPagination : blockedPagination
  const subsPageItems = getPaginationItems({ currentPage: subPage, totalPages: subsDataPagination.totalPages })
  const listLoading = useApiHistory ? histLoading : false

  const stats = useMemo(() => ({
    enviadas:    histPagination.total,
    programadas: drafts.filter(d => d.status === 'programada').length,
    borradores:  drafts.filter(d => d.status === 'borrador').length,
  }), [histPagination.total, drafts])

  /* ── modal ── */
  const openNew = () => {
    setEditNotif(null)
    setForm(BLANK_FORM)
    setConfirmStep(false)
    setUploadError('')
    setImgDrag(false)
    setModalOpen(true)
  }

  const openEdit = (notif) => {
    setEditNotif(notif)
    const iso = notif.scheduledFor && typeof notif.scheduledFor === 'string' ? notif.scheduledFor : ''
    setForm({
      title:     notif.title,
      body:      notif.body,
      image:     notif.image || '',
      audience:  notif.audience,
      scheduled: !!iso,
      schedDate: iso ? iso.slice(0, 10) : '',
      schedTime: iso ? iso.slice(11, 16) : '',
    })
    setConfirmStep(false)
    setUploadError('')
    setImgDrag(false)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setConfirmStep(false)
    setUploadError('')
    setImgDrag(false)
  }

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  /* ── actions ── */
  const saveDraft = () => {
    const scheduledFor = form.scheduled && form.schedDate
      ? `${form.schedDate}T${form.schedTime || '09:00'}:00`
      : null
    const st = form.scheduled && form.schedDate ? 'programada' : 'borrador'
    const draft = {
      id:           `draft-${Date.now()}`,
      isDraft:      true,
      title:        form.title,
      body:         form.body,
      image:        form.image,
      audience:     form.audience,
      status:       st,
      sentAt:       null,
      scheduledFor,
      sentCount:    null,
      failedCount:  null,
    }
    setDrafts(d => [draft, ...d])
    closeModal()
  }

  const doSend = async () => {
    setSending(true)
    try {
      await api.post('/api/push/send-direct', {
        title:    form.title,
        body:     form.body,
        image:    form.image,
        audience: form.audience,
      })
      if (editNotif?.isDraft) {
        setDrafts(d => d.filter(x => x.id !== editNotif.id))
      }
      closeModal()
      setPage(1)
      await loadHistory(1)
    } catch (err) {
      toast.error(err.message || 'Error al enviar la notificación')
    } finally {
      setSending(false)
    }
  }

  const handleSend = () => {
    if (editNotif) { doSend() } else { setConfirmStep(true) }
  }

  const deleteNotif = (row) => {
    if (row?.isDraft) setDrafts(d => d.filter(x => x.id !== row.id))
  }

  const revokeSubscriber = async (s) => {
    const ok = await confirm({ title: 'Confirmar', body: '¿Quitar esta suscripción? El dispositivo dejará de recibir push. El cliente puede volver a activarlas desde la app si no está bloqueado.', confirmLabel: 'Confirmar', danger: true })
    if (!ok) return
    try {
      await api.delete(`/api/push/token/${s.tokenId}`)
      notify('Suscripción quitada')
      loadSubscribers(subPage)
    } catch (e) {
      notify(e.message || 'No se pudo quitar la suscripción', 'danger')
    }
  }

  const blockSubscriber = async (s) => {
    const ok = await confirm({ title: 'Confirmar', body: `¿Bloquear notificaciones push para ${s.fullName}? No recibirá envíos y la app no podrá registrar un nuevo token hasta que lo desbloquees.`, confirmLabel: 'Confirmar', danger: true })
    if (!ok) return
    try {
      await api.post(`/api/push/client/${s.clientId}/block-push`, {})
      notify('Cliente bloqueado para push')
      loadSubscribers(subPage)
    } catch (e) {
      notify(e.message || 'Error al bloquear', 'danger')
    }
  }

  const unblockClientPush = async (c) => {
    try {
      await api.post(`/api/push/client/${c.clientId}/unblock-push`, {})
      notify('Cliente desbloqueado. Ya puede activar push de nuevo desde la app.')
      loadBlockedClients(subPage)
    } catch (e) {
      notify(e.message || 'Error al desbloquear', 'danger')
    }
  }

  const isValid   = form.title.trim() && form.body.trim()
  const sendLabel = sending ? 'Enviando...' : (form.scheduled ? 'Programar' : 'Enviar ahora')

  const previewImgSrc = form.image ? resolveApiAsset(form.image) : ''
  const previewHasHero = Boolean(previewImgSrc)

  const uploadImageFile = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      setUploadError('Elegí un archivo de imagen (PNG, JPG, WebP, GIF…).')
      return
    }
    setUploading(true)
    setUploadError('')
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await api.post('/api/push/upload-image', formData)
      setField('image', res.imageUrl)
    } catch (err) {
      setUploadError(err.message || 'Error al subir la imagen')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

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
        {mainTab === TAB_ENVIOS ? (
          <StatsStrip>
            <StatCard>
              <StatIconWrap $bg="rgba(34,197,94,0.10)" $br="rgba(34,197,94,0.20)" $cl="#4ade80">
                <DoneAllOutlinedIcon />
              </StatIconWrap>
              <StatInfo>
                <StatValue>{stats.enviadas}</StatValue>
                <StatLabel>Enviadas (total)</StatLabel>
              </StatInfo>
            </StatCard>
            <StatCard>
              <StatIconWrap $bg="rgba(14,165,233,0.10)" $br="rgba(14,165,233,0.20)" $cl="#38bdf8">
                <AccessTimeOutlinedIcon />
              </StatIconWrap>
              <StatInfo>
                <StatValue>{stats.programadas}</StatValue>
                <StatLabel>Programadas (local)</StatLabel>
              </StatInfo>
            </StatCard>
            <StatCard>
              <StatIconWrap $bg="rgba(255,255,255,0.05)" $br="rgba(255,255,255,0.10)" $cl="rgba(255,255,255,0.35)">
                <ArticleOutlinedIcon />
              </StatIconWrap>
              <StatInfo>
                <StatValue>{stats.borradores}</StatValue>
                <StatLabel>Borradores (local)</StatLabel>
              </StatInfo>
            </StatCard>
          </StatsStrip>
        ) : (
          <StatsStrip>
            <StatCard>
              <StatIconWrap $bg="rgba(99,102,241,0.12)" $br="rgba(99,102,241,0.22)" $cl="#a5b4fc">
                <HttpsOutlinedIcon />
              </StatIconWrap>
              <StatInfo>
                <StatValue>{subsListView === 'activos' ? subPagination.total : blockedPagination.total}</StatValue>
                <StatLabel>
                  {subsListView === 'activos' ? 'Suscriptores con token activo' : 'Clientes bloqueados para push'}
                </StatLabel>
              </StatInfo>
            </StatCard>
          </StatsStrip>
        )}

        <MainTabsWrap>
          <MainTabBtn type="button" $active={mainTab === TAB_ENVIOS} onClick={() => setMainTab(TAB_ENVIOS)}>
            <NotificationsOutlinedIcon style={{ fontSize: 18 }} />
            Envíos y borradores
          </MainTabBtn>
          <MainTabBtn type="button" $active={mainTab === TAB_SUBS} onClick={() => setMainTab(TAB_SUBS)}>
            <PeopleOutlinedIcon style={{ fontSize: 18 }} />
            Suscriptores activos
          </MainTabBtn>
        </MainTabsWrap>

        {mainTab === TAB_ENVIOS ? (
          <>
            <FiltersBar>
              <SearchBox>
                <SrchIcon><SearchIcon /></SrchIcon>
                <SearchInput
                  placeholder="Buscar en historial (título, mensaje, audiencia)…"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                />
              </SearchBox>
              <FilterSelect
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="">Historial de envíos</option>
                <option value="programada">Programadas (esta sesión)</option>
                <option value="borrador">Borradores (esta sesión)</option>
              </FilterSelect>
              <ResultCount>
                {useApiHistory
                  ? `${histPagination.total} registro${histPagination.total !== 1 ? 's' : ''}`
                  : `${localFiltered.length} en esta vista`}
              </ResultCount>
            </FiltersBar>

            <TableCard $embedded={embedded}>
              <TableScroll $embedded={embedded}>
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
                    {listLoading ? (
                      <EmptyRow>
                        <EmptyCell colSpan={6}>Cargando historial…</EmptyCell>
                      </EmptyRow>
                    ) : tableRows.length === 0 ? (
                      <EmptyRow>
                        <EmptyCell colSpan={6}>
                          {useApiHistory ? 'No hay envíos en el historial' : 'No hay borradores o programadas con este filtro'}
                        </EmptyCell>
                      </EmptyRow>
                    ) : tableRows.map(n => (
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
                              <DateText>{fmtDate(n.scheduledFor, timezone)}</DateText>
                              <DateSub>{fmtTime(n.scheduledFor, timezone)}</DateSub>
                            </>
                          ) : (
                            <DateText style={{ color: 'rgba(255,255,255,0.14)' }}>—</DateText>
                          )}
                        </Td>
                        <Td>
                          {n.sentAt ? (
                            <>
                              <DateText>{fmtDate(n.sentAt, timezone)}</DateText>
                              <DateSub>{fmtTime(n.sentAt, timezone)}</DateSub>
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
                            {n.isDraft && (
                              <ActionBtn title="Eliminar" $v="danger" onClick={() => deleteNotif(n)}>
                                <DeleteOutlinedIcon />
                              </ActionBtn>
                            )}
                          </ActionBtns>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </TableScroll>

              <Pagination>
                <PaginInfo>
                  {useApiHistory ? (
                    histPagination.total === 0
                      ? '0 envíos'
                      : `${(page - 1) * ROWS_PER_PAGE + 1}–${Math.min(page * ROWS_PER_PAGE, histPagination.total)} de ${histPagination.total}`
                  ) : (
                    localFiltered.length === 0
                      ? '0 en esta vista'
                      : `${(page - 1) * ROWS_PER_PAGE + 1}–${Math.min(page * ROWS_PER_PAGE, localFiltered.length)} de ${localFiltered.length}`
                  )}
                </PaginInfo>
                <PaginBtns>
                  <PaginBtn type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeftIcon />
                  </PaginBtn>
                  {pageItems.map(item => item.type === 'ellipsis' ? (
                    <PaginBtn key={item.key} type="button" disabled>...</PaginBtn>
                  ) : (
                    <PaginBtn key={item.key} type="button" $active={item.page === page} onClick={() => setPage(item.page)}>{item.page}</PaginBtn>
                  ))}
                  <PaginBtn type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRightIcon />
                  </PaginBtn>
                </PaginBtns>
              </Pagination>
            </TableCard>
          </>
        ) : (
          <>
            <SubsSubTabsWrap>
              <SubsSubTabBtn type="button" $active={subsListView === 'activos'} onClick={() => setSubsListView('activos')}>
                Suscripciones activas
              </SubsSubTabBtn>
              <SubsSubTabBtn type="button" $active={subsListView === 'bloqueados'} onClick={() => setSubsListView('bloqueados')}>
                Bloqueados para push
              </SubsSubTabBtn>
            </SubsSubTabsWrap>

            <FiltersBar>
              <SearchBox>
                <SrchIcon><SearchIcon /></SrchIcon>
                <SearchInput
                  placeholder={subsListView === 'activos'
                    ? 'Cliente, usuario, ID, CUIL, dispositivo…'
                    : 'Buscar entre bloqueados…'}
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSubPage(1) }}
                />
              </SearchBox>
              <ResultCount>
                {subsListView === 'activos'
                  ? `${subPagination.total} suscriptor${subPagination.total !== 1 ? 'es' : ''}`
                  : `${blockedPagination.total} bloqueado${blockedPagination.total !== 1 ? 's' : ''}`}
              </ResultCount>
            </FiltersBar>

            <TableCard $embedded={embedded}>
              <TableScroll $embedded={embedded}>
                <Table>
                  {subsListView === 'activos' ? (
                    <>
                      <Thead>
                        <tr>
                          <Th>Cliente</Th>
                          <Th>Usuario</Th>
                          <Th>ID externo</Th>
                          <Th>Última vista</Th>
                          <Th>Dispositivo</Th>
                          <Th $center>Acciones</Th>
                        </tr>
                      </Thead>
                      <Tbody>
                        {subLoading ? (
                          <EmptyRow>
                            <EmptyCell colSpan={6}>Cargando suscriptores…</EmptyCell>
                          </EmptyRow>
                        ) : subscribers.length === 0 ? (
                          <EmptyRow>
                            <EmptyCell colSpan={6}>No hay suscripciones push activas</EmptyCell>
                          </EmptyRow>
                        ) : subscribers.map(s => {
                          const initials = ((s.fullName || s.username || '#')[0] + (s.fullName?.split(' ')[1]?.[0] || '')).toUpperCase()
                          return (
                          <Tr key={s.tokenId}>
                            <Td>
                              <SubsClientCell>
                                <SubsAvatar $gradient={avatarGradient(s.clientId)}>{initials}</SubsAvatar>
                                <SubsNameBlock>
                                  <SubsName title={s.fullName}>{s.fullName || s.username || `#${s.clientId}`}</SubsName>
                                  <SubsIdLine>ID #{s.clientId}</SubsIdLine>
                                </SubsNameBlock>
                              </SubsClientCell>
                            </Td>
                            <Td>
                              <TruncateCell title={s.username} style={{ color: 'rgba(255,255,255,.55)', fontSize: 12 }}>
                                {s.username ? `@${s.username}` : '—'}
                              </TruncateCell>
                            </Td>
                            <Td><CellMuted>{s.externalId || '—'}</CellMuted></Td>
                            <Td>
                              {s.tokenLastSeen ? (
                                <>
                                  <DateText>{fmtDate(s.tokenLastSeen, timezone)}</DateText>
                                  <DateSub>{fmtTime(s.tokenLastSeen, timezone)}</DateSub>
                                </>
                              ) : <DateText style={{ color: 'rgba(255,255,255,.14)' }}>—</DateText>}
                            </Td>
                            <Td>
                              {s.device
                                ? <DeviceChip title={s.device}>{s.device.slice(0, 38)}{s.device.length > 38 ? '…' : ''}</DeviceChip>
                                : <CellMuted>—</CellMuted>}
                            </Td>
                            <Td $center>
                              <ActionBtns style={{ justifyContent: 'center', gap: 6 }}>
                                <SubsActionBtn $variant="revoke" type="button" title="Quitar esta suscripción" onClick={() => revokeSubscriber(s)}>
                                  <LinkOffOutlinedIcon />Quitar
                                </SubsActionBtn>
                                <SubsActionBtn $variant="block" type="button" title="Bloquear push para este cliente" onClick={() => blockSubscriber(s)}>
                                  <BlockOutlinedIcon />Bloquear
                                </SubsActionBtn>
                              </ActionBtns>
                            </Td>
                          </Tr>
                          )
                        })}
                      </Tbody>
                    </>
                  ) : (
                    <>
                      <Thead>
                        <tr>
                          <Th>Cliente</Th>
                          <Th>Usuario</Th>
                          <Th>ID externo</Th>
                          <Th>CUIL</Th>
                          <Th>Estado</Th>
                          <Th $center>Acciones</Th>
                        </tr>
                      </Thead>
                      <Tbody>
                        {subLoading ? (
                          <EmptyRow>
                            <EmptyCell colSpan={6}>Cargando…</EmptyCell>
                          </EmptyRow>
                        ) : blockedClients.length === 0 ? (
                          <EmptyRow>
                            <EmptyCell colSpan={6}>No hay clientes bloqueados para push</EmptyCell>
                          </EmptyRow>
                        ) : blockedClients.map(c => {
                          const initials = ((c.fullName || c.username || '#')[0] + (c.fullName?.split(' ')[1]?.[0] || '')).toUpperCase()
                          return (
                          <Tr key={c.clientId} style={{ opacity: .7 }}>
                            <Td>
                              <SubsClientCell>
                                <SubsAvatar $gradient={avatarGradient(c.clientId)} style={{ opacity: .6 }}>{initials}</SubsAvatar>
                                <SubsNameBlock>
                                  <SubsName title={c.fullName}>{c.fullName || c.username || `#${c.clientId}`}</SubsName>
                                  <SubsIdLine>ID #{c.clientId}</SubsIdLine>
                                </SubsNameBlock>
                              </SubsClientCell>
                            </Td>
                            <Td><TruncateCell title={c.username} style={{ color: 'rgba(255,255,255,.45)', fontSize: 12 }}>{c.username ? `@${c.username}` : '—'}</TruncateCell></Td>
                            <Td><CellMuted>{c.externalId || '—'}</CellMuted></Td>
                            <Td><CellMuted>{c.cuil || '—'}</CellMuted></Td>
                            <Td>
                              <SubsStatusPill $active={false}>⛔ Bloqueado</SubsStatusPill>
                            </Td>
                            <Td $center>
                              <SubsActionBtn $variant="unblock" type="button" onClick={() => unblockClientPush(c)}>
                                <CheckCircleOutlinedIcon />Desbloquear
                              </SubsActionBtn>
                            </Td>
                          </Tr>
                          )
                        })}
                      </Tbody>
                    </>
                  )}
                </Table>
              </TableScroll>

              <Pagination>
                <PaginInfo>
                  {subsDataPagination.total === 0
                    ? (subsListView === 'activos' ? '0 suscriptores' : '0 bloqueados')
                    : `${(subPage - 1) * ROWS_PER_PAGE + 1}–${Math.min(subPage * ROWS_PER_PAGE, subsDataPagination.total)} de ${subsDataPagination.total}`}
                </PaginInfo>
                <PaginBtns>
                  <PaginBtn type="button" onClick={() => setSubPage(p => Math.max(1, p - 1))} disabled={subPage === 1}>
                    <ChevronLeftIcon />
                  </PaginBtn>
                  {subsPageItems.map(item => item.type === 'ellipsis' ? (
                    <PaginBtn key={item.key} type="button" disabled>...</PaginBtn>
                  ) : (
                    <PaginBtn key={item.key} type="button" $active={item.page === subPage} onClick={() => setSubPage(item.page)}>{item.page}</PaginBtn>
                  ))}
                  <PaginBtn type="button" onClick={() => setSubPage(p => Math.min(subsDataPagination.totalPages, p + 1))} disabled={subPage === subsDataPagination.totalPages}>
                    <ChevronRightIcon />
                  </PaginBtn>
                </PaginBtns>
              </Pagination>
            </TableCard>
          </>
        )}

      {localToast && (
        <Toast $type={localToast.type}>
          <ToastIconBox $type={localToast.type}>
            {localToast.type === 'danger' ? <ErrorOutlinedIcon /> : <CheckCircleOutlinedIcon />}
          </ToastIconBox>
          <ToastBody>
            <ToastTitle>{localToast.type === 'danger' ? 'Error' : 'Listo'}</ToastTitle>
            <ToastMsg>{localToast.message}</ToastMsg>
          </ToastBody>
          <ToastClose type="button" aria-label="Cerrar" onClick={() => setLocalToast(null)}><CloseIcon /></ToastClose>
        </Toast>
      )}

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

              {/* live preview — hero image como en Web Push (Chrome/Edge) */}
              <div>
                <PreviewLabel>Vista previa</PreviewLabel>
                <PreviewCaption>
                  Así se verá en el dispositivo del cliente: imagen grande arriba (si hay) y texto debajo, similar a las notificaciones del navegador.
                </PreviewCaption>
                <PreviewShell>
                  {previewHasHero && (
                    <PreviewHero>
                      <img src={previewImgSrc} alt="" />
                    </PreviewHero>
                  )}
                  <PreviewBodyRow $withHero={previewHasHero}>
                    <PreviewAppIcon><NotificationsOutlinedIcon /></PreviewAppIcon>
                    <PreviewContent>
                      <PreviewAppName>
                        {systemConfig.appName}
                        <PreviewTime>ahora</PreviewTime>
                      </PreviewAppName>
                      <PreviewTitle>{form.title || 'Título de la notificación'}</PreviewTitle>
                      <PreviewBody>{form.body || 'El cuerpo de tu mensaje aparecerá aquí...'}</PreviewBody>
                    </PreviewContent>
                  </PreviewBodyRow>
                </PreviewShell>
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

              {/* image */}
              <Field $full>
                <FieldLabel>Imagen (opcional)</FieldLabel>
                <ImageDropRoot
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setImgDrag(true) }}
                  onDragEnter={(e) => { e.preventDefault(); setImgDrag(true) }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    if (!e.currentTarget.contains(e.relatedTarget)) setImgDrag(false)
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setImgDrag(false)
                    const f = e.dataTransfer.files?.[0]
                    if (f) uploadImageFile(f)
                  }}
                >
                  <ImageUploadHiddenInput
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (!file) {
                        setField('image', '')
                        return
                      }
                      uploadImageFile(file)
                    }}
                  />
                  {form.image ? (
                    <ImageAttachedRow>
                      <ImageAttachedThumb src={resolveApiAsset(form.image)} alt="" />
                      <ImageAttachedMeta>
                        <ImageAttachedLabel>Imagen lista</ImageAttachedLabel>
                        <ImageAttachedSub>
                          Aparece arriba en la vista previa y como imagen grande en la notificación (según el navegador).
                        </ImageAttachedSub>
                      </ImageAttachedMeta>
                      <ImageGhostBtn
                        type="button"
                        disabled={uploading}
                        onClick={() => inputRef.current?.click()}
                      >
                        Reemplazar
                      </ImageGhostBtn>
                      <ImageRemoveBtn
                        type="button"
                        disabled={uploading}
                        title="Quitar imagen"
                        onClick={() => {
                          setField('image', '')
                          setUploadError('')
                          if (inputRef.current) inputRef.current.value = ''
                        }}
                      >
                        <DeleteOutlinedIcon />
                      </ImageRemoveBtn>
                    </ImageAttachedRow>
                  ) : (
                    <ImageUploadZone
                      type="button"
                      $drag={imgDrag}
                      $disabled={uploading}
                      disabled={uploading}
                      onClick={() => !uploading && inputRef.current?.click()}
                    >
                      {uploading ? (
                        <ImageUploadSpinner />
                      ) : (
                        <ImageUploadIconWrap>
                          <AddPhotoAlternateOutlinedIcon />
                        </ImageUploadIconWrap>
                      )}
                      <ImageUploadTitle>
                        {uploading ? 'Subiendo imagen…' : 'Arrastrá una imagen o hacé clic para elegir'}
                      </ImageUploadTitle>
                      <ImageUploadHint>
                        PNG, JPG, WebP o GIF · recomendado 16:9 o 1200×630 px · máx. según servidor
                      </ImageUploadHint>
                    </ImageUploadZone>
                  )}
                </ImageDropRoot>
              </Field>
              {uploadError && <UploadErrorBanner role="alert">{uploadError}</UploadErrorBanner>}

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
                  <ConfirmTitle>¿Enviar esta notificación?</ConfirmTitle>
                  <ConfirmSub>
                    Se enviará a la audiencia elegida. El envío quedará registrado en el historial.
                  </ConfirmSub>
                  <ConfirmBtns>
                    <ConfirmBtn onClick={() => setConfirmStep(false)}>Volver a editar</ConfirmBtn>
                    <ConfirmBtn $primary onClick={() => doSend()}>Enviar ahora</ConfirmBtn>
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

  if (embedded) return <EmbeddedShell>{inner}</EmbeddedShell>

  return (
    <PageWrap>
      <PageScroll>{inner}</PageScroll>
    </PageWrap>
  )
}

export default NotificationsPage
