import { useCallback, useEffect, useRef, useState } from 'react'
import SearchIcon        from '@mui/icons-material/Search'
import AddIcon           from '@mui/icons-material/Add'
import EditOutlinedIcon  from '@mui/icons-material/EditOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import CloseIcon         from '@mui/icons-material/Close'
import MenuIcon          from '@mui/icons-material/Menu'
import ChevronLeftIcon   from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon  from '@mui/icons-material/ChevronRight'
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined'
import PowerSettingsNewIcon       from '@mui/icons-material/PowerSettingsNew'
import VisibilityOutlinedIcon     from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon  from '@mui/icons-material/VisibilityOffOutlined'
import HistoryOutlinedIcon        from '@mui/icons-material/HistoryOutlined'
import ContentCopyIcon            from '@mui/icons-material/ContentCopy'
import CheckIcon                  from '@mui/icons-material/Check'
import { api } from '../../../utils/api'
import { useToast, useConfirm } from '../../../context/ToastContext'
import { getPaginationItems } from '../../../utils/pagination'
import {
  PageWrap, PageScroll, PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub, AddBtn,
  BankTabsBar, BankTab, BankTabDot, BankTabCount,
  FiltersBar, SearchBox, SrchIcon, SearchInput, FilterSelect, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  AccountCell, AccountAvatar, AccountMeta, AccountName, AccountEmail,
  MonoText, MonoLabel,
  StatusBadge, TokenBadge, ExpiredBadge,
  ActionBtns, ActionBtn,
  Pagination, PaginInfo, PaginBtns, PaginBtn,
  EmptyRow, EmptyCell,
  Overlay, ModalCard, ModalHead, ModalBankBadge, ModalHeadText, ModalTitle, ModalSub, ModalClose,
  ModalBody, ModalFoot, FootLeft, FootRight, ModalBtn,
  SecLabel, FormGrid, Field, FieldLabel, FieldInput, InputWrap, InputSuffix,
  StatusRow, StatusRowLabel, StatusRowTitle, StatusRowSub, Toggle, ToggleThumb,
  CopyRow, CopyVal, CopyBtn,
  MovOverlay, MovPanel, MovPanelHead, MovAccBadge, MovPanelTitleGroup, MovPanelTitle, MovPanelSub, MovPanelClose,
  MovInfoBar, MovInfoItem, MovInfoLabel, MovInfoValRow, MovInfoVal, MovInfoSep, MovBalCard, MovBalLabel, MovBalVal,
  MovFilters, MovDateInput, MovFilterLabel, MovFilterSelect, MovPresetBtn,
  MovSearchBox, MovSrchIcon, MovSearchInput, MovResultCount,
  MovTableWrap, MovTableScroll,
  MovStatusBadge, MovSpinner, MovEmpty,
  ToastWrap, ToastIcon, ToastMsg, ToastClose,
} from './BanksPage.styles'

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const fmtAmount = (n) =>
  n == null ? '—' : `$${new Intl.NumberFormat('es-AR').format(n)}`

const fmtMovDate = (str) => {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d)) return '—'
  return `${d.getDate()}/${d.getMonth() + 1}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const STATUS_LABEL = { paid: 'Pagado', pending: 'Pendiente', rejected: 'Rechazado' }

/* ── CopyField ── */
function CopyField({ value, display, mono, small }) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>—</span>
  const handleCopy = (e) => {
    e.stopPropagation()
    navigator.clipboard?.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <CopyRow>
      <CopyVal $mono={mono} $small={small}>{display ?? value}</CopyVal>
      <CopyBtn onClick={handleCopy} className={copied ? 'copied' : ''} title={copied ? 'Copiado!' : 'Copiar'}>
        {copied ? <CheckIcon /> : <ContentCopyIcon />}
      </CopyBtn>
    </CopyRow>
  )
}

/* ── InfoCopyBtn (icon-only copy for the info bar) ── */
function InfoCopyBtn({ value }) {
  const [copied, setCopied] = useState(false)
  if (!value) return null
  return (
    <CopyBtn
      onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(value).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      className={copied ? 'copied' : ''}
      title={copied ? 'Copiado!' : 'Copiar'}
      style={{ width: 22, height: 22 }}
    >
      {copied ? <CheckIcon /> : <ContentCopyIcon />}
    </CopyBtn>
  )
}

const BANKS = [
  {
    id: 'hgcash',
    label: 'HGCash',
    color: '#818cf8', bg: 'rgba(99,102,241,0.12)', br: 'rgba(99,102,241,0.28)',
    avatarBg: 'linear-gradient(135deg,#4f46e5,#6366f1)',
    avatarBr: 'rgba(99,102,241,0.35)',
  },
  {
    id: 'mercadopago',
    label: 'Mercado Pago',
    color: '#38bdf8', bg: 'rgba(14,165,233,0.12)', br: 'rgba(14,165,233,0.28)',
    avatarBg: 'linear-gradient(135deg,#0284c7,#38bdf8)',
    avatarBr: 'rgba(14,165,233,0.35)',
  },
  // { id: 'telepagos', ... },  // hidden — not in use
  {
    id: 'manual',
    label: 'Cuentas Manuales',
    color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', br: 'rgba(148,163,184,0.22)',
    avatarBg: 'linear-gradient(135deg,#475569,#64748b)',
    avatarBr: 'rgba(148,163,184,0.28)',
  },
]

const ROWS = 8
const EMPTY_COUNTS = { hgcash: 0, mercadopago: 0, telepagos: 0, manual: 0 }

const maskCBU   = (v) => v ? `${v.slice(0, 8)}...${v.slice(-4)}` : '-'
const maskToken = (v) => v ? `${v.slice(0, 10)}...${v.slice(-4)}` : '-'
const isExpired = (d) => d && new Date(d) < new Date()
const fmtDate   = (d) => d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : null

const initForm = (bank, account = null) => {
  if (bank === 'hgcash') {
    return {
      nombre_titular: account?.nombre_titular ?? '',
      email: account?.email ?? '',
      password: '',
      cuit: account?.cuit ?? '',
      alias: account?.alias ?? '',
      cbu: account?.cbu ?? '',
      webhook_enabled: Boolean(account?.webhook_enabled || account?.webhook_secret),
      webhook_secret: account?.webhook_secret ?? '',
      api_token: '',
      estatus: account?.estatus ?? 'activa',
    }
  }

  if (bank === 'mercadopago') {
    return {
      nombre_titular: account?.nombre_titular ?? '',
      token: account?.token ?? '',
      alias: account?.alias ?? '',
      cbu: account?.cbu ?? '',
      estatus: account?.estatus ?? 'activa',
    }
  }

  if (bank === 'telepagos') {
    return {
      nombre_titular: account?.nombre_titular ?? '',
      email: account?.email ?? '',
      password: '',
      cuit: account?.cuit ?? '',
      alias: account?.alias ?? '',
      cbu: account?.cbu ?? '',
      token: account?.token ?? '',
      expires_at: account?.expires_at ?? '',
      estatus: account?.estatus ?? 'activa',
    }
  }

  return {
    nombre_titular: account?.nombre_titular ?? '',
    email: account?.email ?? '',
    cuit: account?.cuit ?? '',
    alias: account?.alias ?? '',
    cbu: account?.cbu ?? '',
    estatus: account?.estatus ?? 'activa',
  }
}

const validateForm = (bank, form, editing) => {
  const required = {
    mercadopago: ['nombre_titular', 'alias', 'cbu', 'token'],
    manual: ['nombre_titular', 'alias', 'cbu'],
    hgcash: ['nombre_titular', 'email', 'cuit', 'alias', 'cbu'],
    telepagos: ['nombre_titular', 'email', 'cuit', 'alias', 'cbu', 'token', 'expires_at'],
  }[bank]

  const missing = required.filter(key => !String(form[key] ?? '').trim())
  if (missing.length) return 'Completa todos los campos obligatorios antes de guardar.'
  if ((bank === 'hgcash' || bank === 'telepagos') && !editing && !String(form.password ?? '').trim()) {
    return 'La contrasena es obligatoria para crear esta cuenta.'
  }
  if (bank === 'hgcash' && form.webhook_enabled && !String(form.webhook_secret ?? '').trim()) {
    return 'Agrega el webhook secret o desactiva el uso de webhook.'
  }
  return null
}

const BanksPage = ({ onMenuOpen }) => {
  const toast = useToast()
  const confirm = useConfirm()
  const [activeBank, setActiveBank] = useState('hgcash')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [accounts, setAccounts] = useState([])
  const [counts, setCounts] = useState(EMPTY_COUNTS)
  const [pagination, setPagination] = useState({ page: 1, limit: ROWS, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modalOpen, setModal] = useState(false)
  const [editAcc, setEditAcc] = useState(null)
  const [form, setForm] = useState({})
  const [showPw, setShowPw] = useState({})

  /* ── movements panel ── */
  const [movAcc,       setMovAcc]       = useState(null)
  const [movData,      setMovData]      = useState({ movements: [], balance: 0, pagination: { page: 1, total: 0, totalPages: 1 } })
  const [movLoading,   setMovLoading]   = useState(false)
  const [movPage,      setMovPage]      = useState(1)
  const [movStatus,    setMovStatus]    = useState('all')
  const [movSearch,    setMovSearch]    = useState('')
  const [movDateFrom,  setMovDateFrom]  = useState(todayStr())
  const [movDateTo,    setMovDateTo]    = useState(todayStr())
  const [movPreset,    setMovPreset]    = useState('today')
  const [hgLive,        setHgLive]        = useState(null)
  const [hgLiveLoading, setHgLiveLoading] = useState(false)
  const [hgSyncing,     setHgSyncing]     = useState(false)
  const [localToast,    setLocalToast]    = useState(null)   // { msg, type: 'success'|'error' }
  const toastTimerRef = useRef(null)
  const movDebRef = useRef(null)

  const showToast = (msg, type = 'success') => {
    clearTimeout(toastTimerRef.current)
    setLocalToast({ msg, type })
    toastTimerRef.current = setTimeout(() => setLocalToast(null), 3800)
  }

  const bankCfg = BANKS.find(b => b.id === activeBank)
  const totalCount = Object.values(counts).reduce((sum, value) => sum + Number(value || 0), 0)

  const loadAccounts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        provider: activeBank,
        page: String(page),
        limit: String(ROWS),
        status: statusFilter,
      })
      if (search.trim()) params.set('search', search.trim())

      const data = await api.get(`/api/bank-accounts?${params.toString()}`)
      setAccounts(data.accounts || [])
      setCounts({ ...EMPTY_COUNTS, ...(data.counts || {}) })
      setPagination(data.pagination || { page: 1, limit: ROWS, total: 0, totalPages: 1 })
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las cuentas bancarias.')
    } finally {
      setLoading(false)
    }
  }, [activeBank, page, search, statusFilter])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadAccounts()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadAccounts])

  const fetchMovements = useCallback(async (acc, opts = {}) => {
    if (!acc) return
    setMovLoading(true)
    try {
      const p  = opts.page      ?? movPage
      const s  = opts.status    ?? movStatus
      const q  = opts.search    ?? movSearch
      const df = opts.dateFrom  ?? movDateFrom
      const dt = opts.dateTo    ?? movDateTo
      const qs = new URLSearchParams({ page: p, limit: 20, status: s, search: q, dateFrom: df, dateTo: dt }).toString()
      const res = await api.get(`/api/bank-accounts/${acc.id}/movements?${qs}`)
      setMovData({ movements: res.movements || [], balance: res.balance || 0, pagination: res.pagination || { page: 1, total: 0, totalPages: 1 } })
    } catch (err) {
      showToast(err.message || 'No se pudieron cargar los movimientos', 'error')
    } finally {
      setMovLoading(false)
    }
  }, [movPage, movStatus, movSearch, movDateFrom, movDateTo])

  const fetchHgLive = async (acc) => {
    setHgLive(null)
    setHgLiveLoading(true)
    try {
      const res = await api.get(`/api/bank-accounts/${acc.id}/hg-balance`)
      setHgLive(res.account || null)
    } catch {
      setHgLive(null)
    } finally {
      setHgLiveLoading(false)
    }
  }

  const SYNC_ENDPOINT = { hgcash: 'hgcash', mercadopago: 'mercadopago' }

  const syncAccount = async (acc) => {
    const provider = acc.provider || activeBank
    const endpoint = SYNC_ENDPOINT[provider]
    if (!endpoint) return
    setHgSyncing(true)
    try {
      const res = await api.post(`/api/${endpoint}/${acc.id}/sync`, {})
      await fetchMovements(acc, { page: 1, status: movStatus, search: movSearch, dateFrom: movDateFrom, dateTo: movDateTo })
      showToast(res.synced > 0 ? `${res.synced} movimiento${res.synced !== 1 ? 's' : ''} importado${res.synced !== 1 ? 's' : ''}` : 'Sin movimientos nuevos por ahora', 'success')
    } catch (err) {
      showToast(err.message || 'Error al sincronizar', 'error')
    } finally {
      setHgSyncing(false)
    }
  }

  const openMovements = (acc) => {
    const enriched = { ...acc, provider: activeBank }
    setMovAcc(enriched)
    setHgLive(null)
    setHgSyncing(false)
    setMovPage(1); setMovStatus('all'); setMovSearch('')
    setMovDateFrom(todayStr()); setMovDateTo(todayStr()); setMovPreset('today')
    fetchMovements(acc, { page: 1, status: 'all', search: '', dateFrom: todayStr(), dateTo: todayStr() })
    if (activeBank === 'hgcash' && acc.has_api_token) fetchHgLive(acc)
    // MercadoPago: no live balance API — use DB values only
  }

  const applyMovPreset = (val) => {
    setMovPreset(val)
    const today = todayStr()
    const yest  = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10) })()
    const wkSt  = (() => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().slice(0, 10) })()
    const mnSt  = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10)
    const map   = { today: [today, today], ayer: [yest, yest], semana: [wkSt, today], mes: [mnSt, today] }
    if (map[val]) {
      const [df, dt] = map[val]
      setMovDateFrom(df); setMovDateTo(dt)
      setMovPage(1)
      fetchMovements(movAcc, { page: 1, dateFrom: df, dateTo: dt })
    }
  }

  const changeFilter = (setter) => (e) => {
    setter(e.target.value)
    setPage(1)
  }

  const openAdd = () => {
    setEditAcc(null)
    setForm(initForm(activeBank))
    setShowPw({})
    setModal(true)
  }

  const openEdit = (acc) => {
    setEditAcc(acc)
    setForm(initForm(activeBank, acc))
    setShowPw({})
    setModal(true)
  }

  const close = () => {
    if (!saving) setModal(false)
  }

  const setField = (key, value) => setForm(prev => ({ ...prev, [key]: value }))
  const togglePw = (key) => setShowPw(prev => ({ ...prev, [key]: !prev[key] }))

  const handleSave = async () => {
    const error = validateForm(activeBank, form, Boolean(editAcc))
    if (error) {
      toast.error(error)
      return
    }

    setSaving(true)
    try {
      const payload = { provider: activeBank, ...form }
      if (editAcc) {
        await api.put(`/api/bank-accounts/${editAcc.id}`, payload)
      } else {
        await api.post('/api/bank-accounts', payload)
      }
      setModal(false)
      await loadAccounts()
    } catch (err) {
      toast.error(err.payload?.details?.[0] || err.message || 'No se pudo guardar la cuenta.')
    } finally {
      setSaving(false)
    }
  }

  const deleteAcc = async (id) => {
    const ok = await confirm({ title: 'Eliminar cuenta', body: '¿Eliminar esta cuenta bancaria?', confirmLabel: 'Eliminar', danger: true })
    if (!ok) return
    try {
      await api.delete(`/api/bank-accounts/${id}`)
      setModal(false)
      await loadAccounts()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la cuenta.')
    }
  }

  const toggleStatus = async (acc) => {
    try {
      await api.put(`/api/bank-accounts/${acc.id}`, {
        ...acc,
        password: '',
        estatus: acc.estatus === 'activa' ? 'inactiva' : 'activa',
      })
      await loadAccounts()
    } catch (err) {
      toast.error(err.message || 'No se pudo cambiar el estado.')
    }
  }

  const switchBank = (id) => {
    setActiveBank(id)
    setSearch('')
    setStatus('all')
    setPage(1)
  }

  const addLabel = {
    hgcash: 'Nueva HGCash',
    mercadopago: 'Nueva MP',
    telepagos: 'Nueva Telepagos',
    manual: 'Cuenta manual',
  }

  const totalPages = Math.max(1, pagination.totalPages || 1)
  const safePage = Math.min(page, totalPages)
  const pageItems = getPaginationItems({ currentPage: safePage, totalPages })

  return (
    <PageWrap>
      <PageScroll>
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && <MenuBtn type="button" onClick={onMenuOpen}><MenuIcon /></MenuBtn>}
            <TitleBlock>
              <PageTitle>Cuentas bancarias</PageTitle>
              <PageSub>{totalCount} cuentas en el sistema</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn type="button" onClick={openAdd}>
            <AddIcon />{addLabel[activeBank]}
          </AddBtn>
        </PageHeader>

        <BankTabsBar>
          {BANKS.map(b => {
            const isActive = activeBank === b.id
            return (
              <BankTab
                key={b.id} type="button"
                $active={isActive} $color={b.color} $bg={b.bg} $br={b.br}
                onClick={() => switchBank(b.id)}
              >
                <BankTabDot $color={b.color} $active={isActive} />
                {b.label}
                <BankTabCount $active={isActive} $color={b.color} $bg={b.bg} $br={b.br}>
                  {counts[b.id] || 0}
                </BankTabCount>
              </BankTab>
            )
          })}
        </BankTabsBar>

        <FiltersBar>
          <SearchBox>
            <SrchIcon><SearchIcon /></SrchIcon>
            <SearchInput
              type="text" placeholder="Buscar cuenta..."
              value={search} onChange={changeFilter(setSearch)}
            />
          </SearchBox>
          <FilterSelect value={statusFilter} onChange={changeFilter(setStatus)}>
            <option value="all">Todos los estados</option>
            <option value="activa">Activas</option>
            <option value="inactiva">Inactivas</option>
          </FilterSelect>
          <ResultCount>{pagination.total || 0} resultado{pagination.total !== 1 ? 's' : ''}</ResultCount>
        </FiltersBar>

        <TableCard key={activeBank}>
          <TableScroll>
            <Table>
              <Thead>
                <tr>
                  <Th>Titular</Th>
                  {activeBank !== 'mercadopago' && <Th>CUIT</Th>}
                  <Th>Alias / CBU</Th>
                  {activeBank === 'mercadopago' && <Th>Token</Th>}
                  {activeBank === 'hgcash' && <Th>Cookie / Webhook</Th>}
                  {activeBank === 'telepagos' && <Th>Token / Vence</Th>}
                  <Th $center>Estado</Th>
                  <Th $center>Acciones</Th>
                </tr>
              </Thead>
              <Tbody>
                {accounts.length === 0 ? (
                  <EmptyRow>
                    <EmptyCell colSpan={7}>{loading ? 'Cargando cuentas...' : 'No se encontraron cuentas'}</EmptyCell>
                  </EmptyRow>
                ) : accounts.map(acc => (
                  <Tr key={acc.id}>
                    <Td>
                      <AccountCell>
                        <AccountAvatar $bg={bankCfg.avatarBg} $br={bankCfg.avatarBr}>
                          {(acc.nombre_titular || '?')[0].toUpperCase()}
                        </AccountAvatar>
                        <AccountMeta>
                          <AccountName>{acc.nombre_titular}</AccountName>
                          {acc.email && <AccountEmail>{acc.email}</AccountEmail>}
                        </AccountMeta>
                      </AccountCell>
                    </Td>

                    {activeBank !== 'mercadopago' && (
                      <Td><MonoText>{acc.cuit || '-'}</MonoText></Td>
                    )}

                    <Td>
                      <CopyField value={acc.alias} />
                      <CopyField value={acc.cbu} display={maskCBU(acc.cbu)} mono small />
                    </Td>

                    {activeBank === 'mercadopago' && (
                      <Td>
                        <MonoText>{maskToken(acc.token)}</MonoText>
                        <div style={{ marginTop: 4 }}>
                          {acc.token ? <TokenBadge $ok>Activo</TokenBadge> : <TokenBadge>Sin token</TokenBadge>}
                        </div>
                      </Td>
                    )}

                    {activeBank === 'hgcash' && (
                      <Td>
                        {acc.cookie_expires_at ? (
                          isExpired(acc.cookie_expires_at)
                            ? <ExpiredBadge>Cookie expirada</ExpiredBadge>
                            : <TokenBadge $ok>Cookie activa</TokenBadge>
                        ) : <TokenBadge>Sin cookie</TokenBadge>}
                        {acc.webhook_enabled && (
                          <div style={{ marginTop: 4 }}>
                            <TokenBadge $ok>Webhook activo</TokenBadge>
                          </div>
                        )}
                      </Td>
                    )}

                    {activeBank === 'telepagos' && (
                      <Td>
                        {acc.token
                          ? <MonoText style={{ fontSize: 11 }}>{maskToken(acc.token)}</MonoText>
                          : <MonoText>-</MonoText>}
                        {acc.expires_at && (
                          <div style={{ marginTop: 4 }}>
                            {isExpired(acc.expires_at)
                              ? <ExpiredBadge>Vencido {fmtDate(acc.expires_at)}</ExpiredBadge>
                              : <TokenBadge $ok>Vence {fmtDate(acc.expires_at)}</TokenBadge>}
                          </div>
                        )}
                      </Td>
                    )}

                    <Td $center>
                      <StatusBadge $on={acc.estatus === 'activa'}>
                        {acc.estatus === 'activa' ? 'Activa' : 'Inactiva'}
                      </StatusBadge>
                    </Td>

                    <Td $center>
                      <ActionBtns style={{ justifyContent: 'center' }}>
                        <ActionBtn type="button" title="Ver movimientos" onClick={() => openMovements(acc)}>
                          <HistoryOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn type="button" title="Editar" onClick={() => openEdit(acc)}>
                          <EditOutlinedIcon />
                        </ActionBtn>
                        <ActionBtn
                          type="button"
                          $v={acc.estatus === 'activa' ? 'danger' : 'success'}
                          title={acc.estatus === 'activa' ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleStatus(acc)}
                        >
                          <PowerSettingsNewIcon />
                        </ActionBtn>
                        <ActionBtn
                          type="button" $v="danger" title="Eliminar"
                          onClick={() => deleteAcc(acc.id)}
                        >
                          <DeleteOutlineIcon />
                        </ActionBtn>
                      </ActionBtns>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TableScroll>

          <Pagination>
            <PaginInfo>
              {pagination.total === 0 ? '0 cuentas'
                : `${(safePage - 1) * ROWS + 1}-${Math.min(safePage * ROWS, pagination.total)} de ${pagination.total}`}
            </PaginInfo>
            <PaginBtns>
              <PaginBtn type="button" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}>
                <ChevronLeftIcon />
              </PaginBtn>
              {pageItems.map(item => item.type === 'ellipsis' ? (
                <PaginBtn key={item.key} type="button" disabled>...</PaginBtn>
              ) : (
                <PaginBtn key={item.key} type="button" $active={item.page === safePage} onClick={() => setPage(item.page)}>{item.page}</PaginBtn>
              ))}
              <PaginBtn type="button" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}>
                <ChevronRightIcon />
              </PaginBtn>
            </PaginBtns>
          </Pagination>
        </TableCard>
      </PageScroll>

      {movAcc && (() => {
        const cfg   = BANKS.find(b => b.id === (movAcc.provider || activeBank))
        const hasCbu = ['hgcash','mercadopago','telepagos'].includes(movAcc.provider || activeBank)
        const { movements, pagination: mp } = movData
        const movTotalPages = Math.max(1, mp.totalPages || 1)

        return (
          <MovOverlay onClick={() => setMovAcc(null)}>
            <MovPanel onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>

              {/* toast */}
              {localToast && (
                <ToastWrap $type={localToast.type}>
                  <ToastIcon>{localToast.type === 'success' ? '✓' : '✕'}</ToastIcon>
                  <ToastMsg>{localToast.msg}</ToastMsg>
                  <ToastClose onClick={() => setLocalToast(null)}><CloseIcon /></ToastClose>
                </ToastWrap>
              )}

              {/* header */}
              <MovPanelHead>
                <MovAccBadge $bg={cfg?.bg} $br={cfg?.br} $cl={cfg?.color}>
                  <AccountBalanceOutlinedIcon />
                </MovAccBadge>
                <MovPanelTitleGroup>
                  <MovPanelTitle>Movimientos · {cfg?.label}</MovPanelTitle>
                  <MovPanelSub>{movAcc.nombre_titular}</MovPanelSub>
                </MovPanelTitleGroup>
                <MovPanelClose onClick={() => setMovAcc(null)}><CloseIcon /></MovPanelClose>
              </MovPanelHead>

              {/* account info strip */}
              {hasCbu && (
                <MovInfoBar>
                  <MovInfoItem>
                    <MovInfoLabel>Alias</MovInfoLabel>
                    <MovInfoValRow>
                      <MovInfoVal>{hgLive?.alias || movAcc.alias || '—'}</MovInfoVal>
                      <InfoCopyBtn value={hgLive?.alias || movAcc.alias} />
                    </MovInfoValRow>
                  </MovInfoItem>

                  <MovInfoSep />

                  <MovInfoItem>
                    <MovInfoLabel>CBU / CVU</MovInfoLabel>
                    <MovInfoValRow>
                      <MovInfoVal $mono>{hgLive?.number || movAcc.cbu || '—'}</MovInfoVal>
                      <InfoCopyBtn value={hgLive?.number || movAcc.cbu} />
                    </MovInfoValRow>
                  </MovInfoItem>

                  {/* Balance — HGCash only */}
                  {(movAcc.provider || activeBank) === 'hgcash' && (
                    <MovBalCard>
                      <MovBalLabel>{hgLive ? 'Saldo actual' : 'Saldo'}</MovBalLabel>
                      <MovBalVal>
                        {hgLiveLoading ? '…' : hgLive ? fmtAmount(hgLive.balance) : '—'}
                      </MovBalVal>
                    </MovBalCard>
                  )}

                  {/* Sync button — HGCash and MercadoPago */}
                  {['hgcash', 'mercadopago'].includes(movAcc.provider || activeBank) && (
                    <button
                      onClick={() => syncAccount(movAcc)}
                      disabled={hgSyncing}
                      title="Importar movimientos desde HGCash"
                      style={{
                        marginLeft: 8, height: 30, padding: '0 10px', borderRadius: 8,
                        border: '1px solid rgba(99,102,241,0.40)', background: 'rgba(99,102,241,0.18)',
                        color: hgSyncing ? 'rgba(255,255,255,0.25)' : '#c7d2fe',
                        fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                        cursor: hgSyncing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {hgSyncing ? '⏳ Sincronizando…' : '⬇ Importar'}
                    </button>
                  )}

                  {movAcc.has_api_token && (
                    <button
                      onClick={() => fetchHgLive(movAcc)}
                      disabled={hgLiveLoading}
                      title="Actualizar saldo desde HGCash API"
                      style={{
                        marginLeft: 4, height: 30, padding: '0 10px', borderRadius: 8,
                        border: '1px solid rgba(99,102,241,0.30)', background: 'rgba(99,102,241,0.10)',
                        color: hgLiveLoading ? 'rgba(255,255,255,0.25)' : '#a5b4fc',
                        fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                        cursor: hgLiveLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {hgLiveLoading ? 'Cargando…' : '↻ Saldo'}
                    </button>
                  )}
                </MovInfoBar>
              )}

              {/* filters */}
              <MovFilters>
                <MovFilterLabel>De:</MovFilterLabel>
                <MovDateInput
                  type="date" value={movDateFrom} max={movDateTo}
                  onChange={e => { setMovDateFrom(e.target.value); setMovPreset('custom') }}
                />
                <MovFilterLabel>A:</MovFilterLabel>
                <MovDateInput
                  type="date" value={movDateTo} min={movDateFrom} max={todayStr()}
                  onChange={e => { setMovDateTo(e.target.value); setMovPreset('custom') }}
                />
                {['today','ayer','semana','mes'].map(p => (
                  <MovPresetBtn key={p} $active={movPreset === p} onClick={() => applyMovPreset(p)}>
                    {{ today:'Hoy', ayer:'Ayer', semana:'Semana', mes:'Mes' }[p]}
                  </MovPresetBtn>
                ))}
                <MovFilterSelect
                  value={movStatus}
                  onChange={e => {
                    setMovStatus(e.target.value); setMovPage(1)
                    fetchMovements(movAcc, { page: 1, status: e.target.value })
                  }}
                >
                  <option value="all">Todos</option>
                  <option value="paid">Pagados</option>
                  <option value="pending">Pendientes</option>
                  <option value="rejected">Rechazados</option>
                </MovFilterSelect>
                <MovSearchBox>
                  <MovSrchIcon><SearchIcon /></MovSrchIcon>
                  <MovSearchInput
                    placeholder="Usuario / referencia…"
                    value={movSearch}
                    onChange={e => {
                      setMovSearch(e.target.value)
                      clearTimeout(movDebRef.current)
                      movDebRef.current = setTimeout(() => {
                        setMovPage(1)
                        fetchMovements(movAcc, { page: 1, search: e.target.value })
                      }, 380)
                    }}
                  />
                </MovSearchBox>
                <MovResultCount>{mp.total} movimientos</MovResultCount>
              </MovFilters>

              {/* table */}
              <MovTableWrap>
                <MovTableScroll>
                  <Table style={{ minWidth: 700 }}>
                    <Thead>
                      <tr>
                        <Th style={{ width: 60 }}>#</Th>
                        <Th>FECHA</Th>
                        <Th $right>MONTO</Th>
                        <Th>ESTADO</Th>
                        <Th>REFERENCIA</Th>
                        <Th>USUARIO</Th>
                      </tr>
                    </Thead>
                    <Tbody>
                      {movLoading ? (
                        <tr><td colSpan={6}><MovSpinner /></td></tr>
                      ) : movements.length === 0 ? (
                        <tr><td colSpan={6}><MovEmpty>Sin movimientos en el período seleccionado</MovEmpty></td></tr>
                      ) : movements.map(m => (
                        <Tr key={m.id}>
                          <Td><MonoText style={{ fontSize: 11 }}>{m.id}</MonoText></Td>
                          <Td style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{fmtMovDate(m.createdAt)}</Td>
                          <Td $right>
                            <span style={{ fontWeight: 700, color: m.status === 'paid' ? '#c7d9ff' : 'rgba(255,255,255,0.55)', fontSize: 13 }}>
                              {fmtAmount(m.amount)}
                            </span>
                          </Td>
                          <Td><MovStatusBadge $s={m.status}>{STATUS_LABEL[m.status] ?? m.status}</MovStatusBadge></Td>
                          <Td>
                            {m.refId
                              ? <CopyField value={m.refId} mono small />
                              : <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>—</span>}
                          </Td>
                          <Td>
                            {m.clientUsername
                              ? <span style={{ fontSize: 12.5, fontWeight: 600, color: '#60a5fa' }}>{m.clientUsername}</span>
                              : <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 11 }}>—</span>}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </MovTableScroll>

                {!movLoading && movTotalPages > 1 && (
                  <Pagination>
                    <PaginInfo>Pág {mp.page} de {movTotalPages} · {mp.total} movimientos</PaginInfo>
                    <PaginBtns>
                      <PaginBtn type="button" disabled={movPage <= 1}
                        onClick={() => { const p = movPage - 1; setMovPage(p); fetchMovements(movAcc, { page: p }) }}>
                        <ChevronLeftIcon />
                      </PaginBtn>
                      <PaginBtn type="button" disabled={movPage >= movTotalPages}
                        onClick={() => { const p = movPage + 1; setMovPage(p); fetchMovements(movAcc, { page: p }) }}>
                        <ChevronRightIcon />
                      </PaginBtn>
                    </PaginBtns>
                  </Pagination>
                )}
              </MovTableWrap>

            </MovPanel>
          </MovOverlay>
        )
      })()}

      {modalOpen && (
        <Overlay onClick={close}>
          <ModalCard onClick={e => e.stopPropagation()}>
            <ModalHead>
              <ModalBankBadge $bg={bankCfg.bg} $br={bankCfg.br} $cl={bankCfg.color}>
                <AccountBalanceOutlinedIcon />
              </ModalBankBadge>
              <ModalHeadText>
                <ModalTitle>{editAcc ? `Editar cuenta ${bankCfg.label}` : `Nueva cuenta ${bankCfg.label}`}</ModalTitle>
                <ModalSub>{editAcc ? `Modificando datos de ${editAcc.nombre_titular}` : 'Completa los datos de la nueva cuenta'}</ModalSub>
              </ModalHeadText>
              <ModalClose type="button" onClick={close}><CloseIcon /></ModalClose>
            </ModalHead>

            <ModalBody>
              <div>
                <SecLabel>Titular</SecLabel>
                <FormGrid style={{ marginTop: 12 }}>
                  <Field $full>
                    <FieldLabel>Nombre completo del titular</FieldLabel>
                    <FieldInput
                      type="text" placeholder="Juan Garcia"
                      value={form.nombre_titular ?? ''}
                      onChange={e => setField('nombre_titular', e.target.value)}
                    />
                  </Field>
                  {form.email !== undefined && (
                    <Field $full>
                      <FieldLabel>Correo electronico {activeBank === 'manual' && '(opcional)'}</FieldLabel>
                      <FieldInput
                        type="email" placeholder="cuenta@gmail.com"
                        value={form.email ?? ''}
                        onChange={e => setField('email', e.target.value)}
                      />
                    </Field>
                  )}
                  {form.password !== undefined && (
                    <Field $full>
                      <FieldLabel>
                        Contrasena&nbsp;
                        {editAcc && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>dejar vacio para no cambiar</span>}
                      </FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.pw ? 'text' : 'password'}
                          placeholder="********"
                          value={form.password ?? ''}
                          onChange={e => setField('password', e.target.value)}
                          autoComplete="new-password"
                          style={{ paddingRight: 40 }}
                        />
                        <InputSuffix type="button" onClick={() => togglePw('pw')} tabIndex={-1}>
                          {showPw.pw ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                  )}
                </FormGrid>
              </div>

              <div>
                <SecLabel>Datos bancarios</SecLabel>
                <FormGrid style={{ marginTop: 12 }}>
                  {form.cuit !== undefined && (
                    <Field>
                      <FieldLabel>CUIT {activeBank === 'manual' && '(opcional)'}</FieldLabel>
                      <FieldInput
                        type="text" placeholder="20-12345678-9"
                        value={form.cuit ?? ''}
                        onChange={e => setField('cuit', e.target.value)}
                        $mono
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel>Alias</FieldLabel>
                    <FieldInput
                      type="text" placeholder="alias.banco"
                      value={form.alias ?? ''}
                      onChange={e => setField('alias', e.target.value)}
                      $mono
                    />
                  </Field>
                  <Field $full={form.cuit === undefined}>
                    <FieldLabel>CBU</FieldLabel>
                    <FieldInput
                      type="text" placeholder="0070999120000012345678"
                      value={form.cbu ?? ''}
                      onChange={e => setField('cbu', e.target.value)}
                      $mono
                    />
                  </Field>
                </FormGrid>
              </div>

              {form.token !== undefined && (
                <div>
                  <SecLabel>Credenciales API</SecLabel>
                  <FormGrid style={{ marginTop: 12 }}>
                    <Field $full>
                      <FieldLabel>{activeBank === 'mercadopago' ? 'Token de acceso (APP_USR-...)' : 'Token de autenticacion'}</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.token ? 'text' : 'password'}
                          placeholder={activeBank === 'mercadopago' ? 'APP_USR-...' : 'tp_live_...'}
                          value={form.token ?? ''}
                          onChange={e => setField('token', e.target.value)}
                          autoComplete="off"
                          style={{ paddingRight: 40, fontFamily: "'Courier New', monospace", fontSize: 12 }}
                        />
                        <InputSuffix type="button" onClick={() => togglePw('token')} tabIndex={-1}>
                          {showPw.token ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                    {activeBank === 'telepagos' && (
                      <Field $full>
                        <FieldLabel>Fecha de vencimiento</FieldLabel>
                        <FieldInput
                          type="date"
                          value={form.expires_at ?? ''}
                          onChange={e => setField('expires_at', e.target.value)}
                        />
                      </Field>
                    )}
                  </FormGrid>
                </div>
              )}

              {form.api_token !== undefined && (
                <div>
                  <SecLabel>Token API HGCash</SecLabel>
                  <FormGrid style={{ marginTop: 12 }}>
                    <Field $full>
                      <FieldLabel>
                        Bearer token&nbsp;
                        {editAcc?.has_api_token && (
                          <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 10, color: 'rgba(255,255,255,0.22)' }}>
                            dejar vacío para no cambiar
                          </span>
                        )}
                      </FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.api_token ? 'text' : 'password'}
                          placeholder={editAcc?.has_api_token ? '••••••••••••••••' : 'eyJhbGci...'}
                          value={form.api_token ?? ''}
                          onChange={e => setField('api_token', e.target.value)}
                          autoComplete="off"
                          style={{ paddingRight: 40, fontFamily: "'Courier New', monospace", fontSize: 12 }}
                        />
                        <InputSuffix type="button" onClick={() => togglePw('api_token')} tabIndex={-1}>
                          {showPw.api_token ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 4, display: 'block' }}>
                        Permite consultar saldo real desde la API de HGCash
                      </span>
                    </Field>
                  </FormGrid>
                </div>
              )}

              {form.webhook_enabled !== undefined && (
                <div>
                  <SecLabel>Webhook</SecLabel>
                  <StatusRow style={{ marginTop: 12 }}>
                    <StatusRowLabel>
                      <StatusRowTitle>Usar webhook</StatusRowTitle>
                      <StatusRowSub>Activalo solo para cuentas que recibiran notificaciones automaticas</StatusRowSub>
                    </StatusRowLabel>
                    <Toggle
                      type="button"
                      $on={form.webhook_enabled}
                      onClick={() => setForm(prev => ({
                        ...prev,
                        webhook_enabled: !prev.webhook_enabled,
                        webhook_secret: prev.webhook_enabled ? '' : prev.webhook_secret,
                      }))}
                    >
                      <ToggleThumb $on={form.webhook_enabled} />
                    </Toggle>
                  </StatusRow>

                  {form.webhook_enabled && (
                    <FormGrid style={{ marginTop: 12 }}>
                      <Field $full>
                        <FieldLabel>Webhook Secret</FieldLabel>
                        <InputWrap>
                          <FieldInput
                            type={showPw.wh ? 'text' : 'password'}
                            placeholder="whsec_..."
                            value={form.webhook_secret ?? ''}
                            onChange={e => setField('webhook_secret', e.target.value)}
                            autoComplete="off"
                            style={{ paddingRight: 40, fontFamily: "'Courier New', monospace", fontSize: 12 }}
                          />
                          <InputSuffix type="button" onClick={() => togglePw('wh')} tabIndex={-1}>
                            {showPw.wh ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                          </InputSuffix>
                        </InputWrap>
                      </Field>
                    </FormGrid>
                  )}
                </div>
              )}

              <StatusRow>
                <StatusRowLabel>
                  <StatusRowTitle>Cuenta activa</StatusRowTitle>
                  <StatusRowSub>La cuenta puede operar y recibir transacciones</StatusRowSub>
                </StatusRowLabel>
                <Toggle type="button" $on={form.estatus === 'activa'} onClick={() => setField('estatus', form.estatus === 'activa' ? 'inactiva' : 'activa')}>
                  <ToggleThumb $on={form.estatus === 'activa'} />
                </Toggle>
              </StatusRow>
            </ModalBody>

            <ModalFoot>
              <FootLeft>
                {editAcc && (
                  <ModalBtn type="button" $v="danger" onClick={() => deleteAcc(editAcc.id)} disabled={saving}>
                    Eliminar
                  </ModalBtn>
                )}
              </FootLeft>
              <FootRight>
                <ModalBtn type="button" onClick={close} disabled={saving}>Cancelar</ModalBtn>
                <ModalBtn type="button" $v="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Guardando...' : editAcc ? 'Guardar cambios' : 'Crear cuenta'}
                </ModalBtn>
              </FootRight>
            </ModalFoot>
          </ModalCard>
        </Overlay>
      )}
    </PageWrap>
  )
}

export default BanksPage
