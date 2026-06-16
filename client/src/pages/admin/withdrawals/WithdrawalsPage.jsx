import { useState, useEffect, useRef, useCallback } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import SettingsOutlinedIcon       from '@mui/icons-material/SettingsOutlined'
import BoltIcon                   from '@mui/icons-material/Bolt'
import SearchIcon                 from '@mui/icons-material/Search'
import KeyboardArrowDownIcon      from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon        from '@mui/icons-material/KeyboardArrowUp'
import CheckCircleOutlinedIcon    from '@mui/icons-material/CheckCircleOutlined'
import ShieldOutlinedIcon         from '@mui/icons-material/ShieldOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import WarningAmberOutlinedIcon    from '@mui/icons-material/WarningAmberOutlined'
import FilterListIcon              from '@mui/icons-material/FilterList'
import AutorenewIcon               from '@mui/icons-material/Autorenew'
import SyncIcon                    from '@mui/icons-material/Sync'
import MenuIcon                    from '@mui/icons-material/Menu'
import ChevronLeftIcon             from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon            from '@mui/icons-material/ChevronRight'
import { api } from '../../../utils/api'
import {
  PageWrap, PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub,
  Body,
  StickyTopBar, TabGroup, TabBtn, TabCount, TabSpacer, ModeLabel, ModeBadge,
  ConfigStrip, ConfigLabel, ConfigDivider, ConfigGroup, ConfigFieldLabel,
  ConfigInput, StepBtn, ConfigSaveBtn, ConfigHint,
  FilterBar, DateInput, FilterLabel, PresetSelect, FilterBtn,
  SearchRow, SearchBox, SrchIcon, SearchInput, ResultCount,
  TableCard, TableScroll, Table, Thead, Th, Tbody, Tr, Td,
  IdText, ClientLink, AmountText, CbuText, HolderText,
  StatusCell, StatusLine1, StatusLine2,
  Pipeline, PipeStage, PipeConnector,
  ProcessorText, ExpandBtn,
  DetailRow, DetailCell, DetailWrap, DetailCard, DetailCardTitle,
  DetailRow2, DetailKey, DetailVal, DetailValBlue, DetailValRed,
  CuilBadge,
  FraudBanner, RiskRow, RiskLabel, RiskValue, RiskBar, RiskFill,
  AlertsHeader, AlertsList, AlertBadge, NoAlerts, FraudFooter,
  ResolveSection, ResolveLabel, ResolveBtns, ApproveBtn, RejectBtn,
  RejectTextarea, ConfirmRow, ConfirmBtn, RefreshBtn, ReconcileBtn, StatusFilterSelect,
  LoadingWrap, Spinner, SkeletonRow,
  EmptyRow, EmptyCell,
  Pagination, PaginInfo, PaginBtns, PaginBtn,
  PlaceholderWrap,
  Toast,
} from './WithdrawalsPage.styles'

/* ────────────────────────────────────────────────
   helpers
──────────────────────────────────────────────── */
const todayStr = () => new Date().toISOString().slice(0, 10)

const fmtAmount = (n) => {
  if (n == null) return '—'
  return `$${new Intl.NumberFormat('es-AR').format(n)}`
}

const fmtDate = (str, tz) => {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d)) return '—'
  return d.toLocaleString('es', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit', ...(tz && { timeZone: tz }) })
}

const truncCbu = (s, max = 22) => {
  if (!s) return '—'
  return s.length > max ? s.slice(0, max) + '…' : s
}

/* ────────────────────────────────────────────────
   Status badge
──────────────────────────────────────────────── */
const STATUS_META = {
  pending:        { label: 'Pendiente',      sub: 'Revisión manual', variant: 'pending',    subVariant: 'manual' },
  review_pending: { label: 'En revisión',    sub: 'Motor de riesgo',  variant: 'pending',    subVariant: 'blocked' },
  approved:       { label: 'Aprobado',       sub: null,              variant: 'approved',   subVariant: null },
  initiated:      { label: 'Iniciado',       sub: 'Enviando a HG',   variant: 'approved',   subVariant: 'sent' },
  processing:     { label: 'Procesando',     sub: 'HG Cash',         variant: 'approved',   subVariant: 'sent' },
  done:           { label: 'Completado',     sub: 'HG Cash OK',      variant: 'approved',   subVariant: 'sent' },
  failed:         { label: 'Fallido',        sub: 'HG Cash error',   variant: 'rejected',   subVariant: 'blocked' },
  rejected:       { label: 'Rechazado',      sub: null,              variant: 'rejected',   subVariant: null },
  cancelled:      { label: 'Cancelado',      sub: null,              variant: 'rejected',   subVariant: null },
}

function StatusBadge({ w }) {
  const { status } = w
  const meta = STATUS_META[status] || { label: status, sub: null, variant: 'pending', subVariant: null }
  return (
    <StatusCell>
      <StatusLine1 $variant={meta.variant}>{meta.label}</StatusLine1>
      {meta.sub && <StatusLine2 $variant={meta.subVariant}>{meta.sub}</StatusLine2>}
    </StatusCell>
  )
}

/* ────────────────────────────────────────────────
   Progress pipeline
──────────────────────────────────────────────── */
function ProgressPipeline({ w }) {
  const { status, riskScore } = w
  const DISPATCHED = new Set(['initiated', 'processing', 'done', 'failed'])
  const REVIEWED   = new Set(['approved', 'initiated', 'processing', 'done', 'failed', 'rejected'])
  const s1 = true
  const s2 = riskScore != null || REVIEWED.has(status)
  const s3 = DISPATCHED.has(status)
  const s4 = status === 'done'
  const endColor = status === 'failed' || status === 'rejected' ? '#f87171' : '#4ade80'

  return (
    <Pipeline>
      <PipeStage $active={s1} $color="#60a5fa" title="Creado">
        <InsertDriveFileOutlinedIcon />
      </PipeStage>
      <PipeConnector $active={s2} />
      <PipeStage $active={s2} $color="#a78bfa" title="Evaluado">
        <ShieldOutlinedIcon />
      </PipeStage>
      <PipeConnector $active={s3} />
      <PipeStage $active={s3} $color="#fb923c" title="HG Cash">
        <BoltIcon />
      </PipeStage>
      <PipeConnector $active={s4} />
      <PipeStage $active={s4} $color={endColor} title="Completado">
        <CheckCircleOutlinedIcon />
      </PipeStage>
    </Pipeline>
  )
}

/* ────────────────────────────────────────────────
   Anti-fraud card
──────────────────────────────────────────────── */
function AntiFraudCard({ w, analysisData, analysisLoading }) {
  const riskScore  = analysisData?.riskScore  ?? w.riskScore
  const riskReason = analysisData?.riskReason ?? w.riskReason
  const reviewMode = analysisData?.reviewMode ?? w.reviewMode

  // Normalize: new system returns riskFlags [{code,label,severity}], legacy returns alerts string[]
  const rawFlags  = analysisData?.riskFlags ?? w.riskFlags
  const rawAlerts = analysisData?.alerts    ?? null
  const flags = Array.isArray(rawFlags) && rawFlags.length > 0
    ? rawFlags
    : Array.isArray(rawAlerts) && rawAlerts.length > 0
      ? rawAlerts.map(a => ({ code: a, label: a, severity: 'medium' }))
      : []

  const isLoading = analysisLoading && riskScore == null

  let bannerVariant = 'loading'
  let bannerText    = 'Analizando...'

  if (!isLoading && riskScore != null) {
    if (reviewMode === 'auto' && riskScore < 35) {
      bannerVariant = 'ok'
      bannerText    = 'Aprobado automáticamente'
    } else if (riskScore >= 80) {
      bannerVariant = 'warn'
      bannerText    = 'Rechazado por riesgo alto'
    } else {
      bannerVariant = 'warn'
      bannerText    = 'Enviado a revisión manual'
    }
  }

  const severityColor = (s) => s === 'high' ? '#f87171' : s === 'low' ? '#facc15' : '#fb923c'

  return (
    <DetailCard>
      <DetailCardTitle>Anti-Fraude</DetailCardTitle>

      {isLoading ? (
        <FraudBanner $variant="loading">
          <Spinner $sm />
          Analizando...
        </FraudBanner>
      ) : riskScore == null ? (
        <FraudBanner $variant="loading">
          Sin datos de análisis
        </FraudBanner>
      ) : (
        <FraudBanner $variant={bannerVariant}>
          {bannerVariant === 'ok'
            ? <CheckCircleOutlinedIcon />
            : <WarningAmberOutlinedIcon />
          }
          {bannerText}
        </FraudBanner>
      )}

      {riskScore != null && (
        <>
          <RiskRow>
            <RiskLabel>Puntaje de riesgo</RiskLabel>
            <RiskValue $score={riskScore}>{riskScore}/100</RiskValue>
          </RiskRow>
          <RiskBar>
            <RiskFill $pct={riskScore} $score={riskScore} />
          </RiskBar>
        </>
      )}

      {riskReason && (
        <div style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)', marginTop: 8 }}>
          {riskReason}
        </div>
      )}

      {flags.length > 0 && (
        <>
          <AlertsHeader>Alertas detectadas:</AlertsHeader>
          <AlertsList>
            {flags.map((f, i) => (
              <AlertBadge key={i} style={{ borderColor: `${severityColor(f.severity)}40`, color: severityColor(f.severity) }}>
                <WarningAmberOutlinedIcon style={{ fontSize: 13 }} />
                {f.label || f.code}
              </AlertBadge>
            ))}
          </AlertsList>
        </>
      )}

      {riskScore != null && flags.length === 0 && (
        <NoAlerts>Sin alertas — jugador limpio</NoAlerts>
      )}

      {riskScore != null && (
        <FraudFooter>
          {reviewMode === 'auto' ? 'Procesado automáticamente' : 'Requirió revisión manual'}
        </FraudFooter>
      )}
    </DetailCard>
  )
}

/* ────────────────────────────────────────────────
   Expanded detail row
──────────────────────────────────────────────── */
function ExpandedDetail({
  w, colCount,
  analysisData, analysisLoading,
  onResolve, resolving,
  onRefresh, refreshing,
}) {
  const { timezone }           = useDateFormat()
  const [action,    setAction]   = useState(null)
  const [rejectMsg, setRejectMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleApprove = () => setAction('approve')
  const handleReject  = () => setAction('reject')
  const handleCancel  = () => { setAction(null); setRejectMsg('') }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await onResolve(w.id, action === 'approve' ? 'approved' : 'rejected', rejectMsg || undefined)
      setAction(null); setRejectMsg('')
    } finally { setSubmitting(false) }
  }

  const canResolve   = w.status === 'pending' || w.status === 'review_pending'
  const canRefresh   = w.status === 'initiated' || w.status === 'processing'
  const hasHgDetails = w.bankTransactionId || w.correlationId || w.dispatchedAt

  return (
    <DetailRow>
      <DetailCell colSpan={colCount}>
        <DetailWrap>
          {/* ── Left card: withdrawal data ── */}
          <DetailCard>
            <DetailCardTitle>Datos del Retiro</DetailCardTitle>

            <DetailRow2>
              <DetailKey>Usuario</DetailKey>
              <DetailValBlue>{w.clientUsername || '—'}</DetailValBlue>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Monto</DetailKey>
              <DetailValBlue>{fmtAmount(w.amount)}</DetailValBlue>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>CBU / Alias</DetailKey>
              <DetailValBlue>{w.cbu || w.alias || '—'}</DetailValBlue>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Titular</DetailKey>
              <DetailVal>{w.holderName || '—'}</DetailVal>
            </DetailRow2>

            {w.method && (
              <DetailRow2>
                <DetailKey>Método</DetailKey>
                <DetailVal>{w.method}</DetailVal>
              </DetailRow2>
            )}

            {w.requestCountry && (
              <DetailRow2>
                <DetailKey>Origen</DetailKey>
                <DetailVal>{[w.requestCity, w.requestCountry].filter(Boolean).join(', ')}</DetailVal>
              </DetailRow2>
            )}

            <DetailRow2>
              <DetailKey>Creado</DetailKey>
              <DetailVal>{fmtDate(w.createdAt, timezone)}</DetailVal>
            </DetailRow2>

            {w.reviewedByUsername && (
              <DetailRow2>
                <DetailKey>Revisado por</DetailKey>
                <DetailVal>
                  <strong style={{ color: 'rgba(255,255,255,0.80)' }}>{w.reviewedByUsername}</strong>
                </DetailVal>
              </DetailRow2>
            )}

            {w.reviewNote && (
              <DetailRow2>
                <DetailKey>Nota</DetailKey>
                <DetailVal>{w.reviewNote}</DetailVal>
              </DetailRow2>
            )}

            {w.rejectionMessage && (
              <DetailRow2>
                <DetailKey>Motivo rechazo</DetailKey>
                <DetailValRed>{w.rejectionMessage}</DetailValRed>
              </DetailRow2>
            )}

            {/* HG Cash transaction details */}
            {hasHgDetails && (
              <>
                <DetailCardTitle style={{ marginTop: 14 }}>HG Cash</DetailCardTitle>

                {w.bankTransactionId && (
                  <DetailRow2>
                    <DetailKey>TX ID</DetailKey>
                    <DetailValBlue style={{ fontFamily: 'monospace', fontSize: 11 }}>{w.bankTransactionId}</DetailValBlue>
                  </DetailRow2>
                )}

                {w.correlationId && (
                  <DetailRow2>
                    <DetailKey>Correlation</DetailKey>
                    <DetailVal style={{ fontFamily: 'monospace', fontSize: 11 }}>{w.correlationId}</DetailVal>
                  </DetailRow2>
                )}

                {w.dispatchedAt && (
                  <DetailRow2>
                    <DetailKey>Enviado</DetailKey>
                    <DetailVal>{fmtDate(w.dispatchedAt, timezone)}</DetailVal>
                  </DetailRow2>
                )}

                {canRefresh && (
                  <RefreshBtn onClick={() => onRefresh(w.id)} disabled={refreshing}>
                    {refreshing ? <Spinner $sm /> : <AutorenewIcon style={{ fontSize: 14 }} />}
                    Refrescar estado
                  </RefreshBtn>
                )}
              </>
            )}

            {/* resolve section for pending / review_pending */}
            {canResolve && (
              <ResolveSection>
                <ResolveLabel>
                  {w.status === 'review_pending' ? 'Decisión de revisión' : 'Acción'}
                </ResolveLabel>

                {action === null && (
                  <ResolveBtns>
                    <ApproveBtn onClick={handleApprove} disabled={resolving}>
                      {w.status === 'review_pending' ? 'Aprobar y despachar' : 'Aprobar'}
                    </ApproveBtn>
                    <RejectBtn onClick={handleReject} disabled={resolving}>
                      Rechazar
                    </RejectBtn>
                  </ResolveBtns>
                )}

                {action === 'approve' && (
                  <>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                      {w.status === 'review_pending'
                        ? '¿Confirmar aprobación? Se despachará a HG Cash.'
                        : '¿Confirmar aprobación?'}
                    </p>
                    <ConfirmRow>
                      <ConfirmBtn $variant="confirm" onClick={handleConfirm} disabled={submitting}>
                        {submitting ? <Spinner $sm /> : 'Confirmar'}
                      </ConfirmBtn>
                      <ConfirmBtn onClick={handleCancel} disabled={submitting}>Cancelar</ConfirmBtn>
                    </ConfirmRow>
                  </>
                )}

                {action === 'reject' && (
                  <>
                    <RejectTextarea
                      placeholder="Motivo del rechazo (opcional)…"
                      value={rejectMsg}
                      onChange={e => setRejectMsg(e.target.value)}
                    />
                    <ConfirmRow>
                      <ConfirmBtn
                        $variant="confirm"
                        onClick={handleConfirm}
                        disabled={submitting}
                        style={{ borderColor: 'rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.14)', color: '#f87171' }}
                      >
                        {submitting ? <Spinner $sm /> : 'Confirmar rechazo'}
                      </ConfirmBtn>
                      <ConfirmBtn onClick={handleCancel} disabled={submitting}>Cancelar</ConfirmBtn>
                    </ConfirmRow>
                  </>
                )}
              </ResolveSection>
            )}
          </DetailCard>

          {/* ── Right card: anti-fraud ── */}
          <AntiFraudCard
            w={w}
            analysisData={analysisData}
            analysisLoading={analysisLoading}
          />
        </DetailWrap>
      </DetailCell>
    </DetailRow>
  )
}

/* ────────────────────────────────────────────────
   Main component
──────────────────────────────────────────────── */
export default function WithdrawalsPage({ onMenuOpen }) {
  const { timezone } = useDateFormat()
  /* ── config ── */
  const [config,        setConfig]        = useState({ mode: 'manual', manualThreshold: 80000, maxPerDay: 5 })
  const [thresholdDraft, setThresholdDraft] = useState(80000)
  const [maxPerDayDraft, setMaxPerDayDraft] = useState(5)
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [savingMaxPerDay,  setSavingMaxPerDay]  = useState(false)
  const [savingMode,       setSavingMode]       = useState(false)

  /* ── list ── */
  const [withdrawals, setWithdrawals] = useState([])
  const [pagination,  setPagination]  = useState({ page: 1, total: 0, totalPages: 1 })
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom,    setDateFrom]    = useState(todayStr())
  const [dateTo,      setDateTo]      = useState(todayStr())
  const [page,        setPage]        = useState(1)
  const [preset,      setPreset]      = useState('today')

  /* ── tabs ── */
  const [activeTab, setActiveTab] = useState('withdrawals') // 'withdrawals' | 'verify'

  /* ── detail / analysis ── */
  const [expandedId,      setExpandedId]      = useState(null)
  const [analysis,        setAnalysis]        = useState({})   // { [id]: { riskScore, alerts, reviewMode } }
  const [analysisLoading, setAnalysisLoading] = useState({})  // { [id]: bool }
  const [resolving,       setResolving]       = useState({})  // { [id]: bool }
  const [refreshing,      setRefreshing]      = useState({})  // { [id]: bool }
  const [reconciling,     setReconciling]     = useState(false)

  /* ── toast ── */
  const [toast, setToast] = useState(null)

  const debounceRef = useRef(null)
  const LIMIT = 20

  /* ── helpers ── */
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  /* ── fetch config ── */
  const fetchConfig = useCallback(async () => {
    try {
      const res = await api.get('/api/withdrawals/config')
      const c   = res.config
      setConfig(c)
      setThresholdDraft(c.manualThreshold)
      setMaxPerDayDraft(c.maxPerDay)
    } catch {
      // silent fail — keep defaults
    }
  }, [])

  /* ── fetch list ── */
  const fetchWithdrawals = useCallback(async (opts = {}) => {
    const p   = opts.page        ?? page
    const s   = opts.search      ?? search
    const df  = opts.dateFrom    ?? dateFrom
    const dt  = opts.dateTo      ?? dateTo
    const st  = opts.statusFilter ?? statusFilter

    setLoading(true)
    try {
      const qs = new URLSearchParams({
        dateFrom: df,
        dateTo:   dt,
        search:   s,
        status:   st,
        page:     p,
        limit:    LIMIT,
      }).toString()
      const res = await api.get(`/api/withdrawals?${qs}`)
      setWithdrawals(res.withdrawals || [])
      setPagination(res.pagination   || { page: 1, total: 0, totalPages: 1 })
    } catch (err) {
      showToast(err.message || 'Error al cargar retiros', 'error')
    } finally {
      setLoading(false)
    }
  }, [page, search, dateFrom, dateTo, statusFilter])

  /* ── on mount ── */
  useEffect(() => {
    fetchConfig()
    fetchWithdrawals()
  }, []) // eslint-disable-line

  /* ── debounced search ── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      fetchWithdrawals({ search, page: 1 })
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [search]) // eslint-disable-line

  /* ── filter ── */
  const handleFilter = () => {
    setPage(1)
    fetchWithdrawals({ page: 1 })
  }

  /* ── preset ── */
  const handlePreset = (val) => {
    setPreset(val)
    const today = todayStr()
    const yesterday = (() => {
      const d = new Date(); d.setDate(d.getDate() - 1)
      return d.toISOString().slice(0, 10)
    })()
    const weekStart = (() => {
      const d = new Date(); d.setDate(d.getDate() - d.getDay())
      return d.toISOString().slice(0, 10)
    })()
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().slice(0, 10)

    let df = dateFrom, dt = dateTo
    if (val === 'today')   { df = today;      dt = today }
    if (val === 'ayer')    { df = yesterday;  dt = yesterday }
    if (val === 'semana')  { df = weekStart;  dt = today }
    if (val === 'mes')     { df = monthStart; dt = today }

    if (val !== 'custom') {
      setDateFrom(df)
      setDateTo(dt)
    }
  }

  /* ── pagination ── */
  const gotoPage = (p) => {
    setPage(p)
    fetchWithdrawals({ page: p })
  }

  /* ── mode toggle ── */
  const toggleMode = async () => {
    const newMode = config.mode === 'auto' ? 'manual' : 'auto'
    setSavingMode(true)
    try {
      const res = await api.put('/api/withdrawals/config', { mode: newMode })
      setConfig(res.config)
      showToast(`Modo cambiado a ${newMode === 'auto' ? 'Automático' : 'Manual'}`)
    } catch (err) {
      showToast(err.message || 'Error al cambiar modo', 'error')
    } finally {
      setSavingMode(false)
    }
  }

  /* ── save threshold ── */
  const saveThreshold = async () => {
    setSavingThreshold(true)
    try {
      const res = await api.put('/api/withdrawals/config', { manualThreshold: thresholdDraft })
      setConfig(res.config)
      showToast('Umbral guardado')
    } catch (err) {
      showToast(err.message || 'Error al guardar umbral', 'error')
    } finally {
      setSavingThreshold(false)
    }
  }

  /* ── save max per day ── */
  const saveMaxPerDay = async () => {
    setSavingMaxPerDay(true)
    try {
      const res = await api.put('/api/withdrawals/config', { maxPerDay: maxPerDayDraft })
      setConfig(res.config)
      showToast('Máx. por día guardado')
    } catch (err) {
      showToast(err.message || 'Error al guardar', 'error')
    } finally {
      setSavingMaxPerDay(false)
    }
  }

  /* ── expand row ── */
  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }

    setExpandedId(id)

    // find the withdrawal
    const w = withdrawals.find(x => x.id === id)
    if (!w) return

    // if already has riskScore on the object, no need to call analyze
    if (w.riskScore != null && analysis[id]) return

    // if already analyzed, skip
    if (analysis[id]) return

    // call analyze
    setAnalysisLoading(prev => ({ ...prev, [id]: true }))
    try {
      const res = await api.post(`/api/withdrawals/${id}/analyze`, {})
      setAnalysis(prev => ({ ...prev, [id]: res.analysis }))
    } catch {
      // silent — fraud card will show "sin datos"
    } finally {
      setAnalysisLoading(prev => ({ ...prev, [id]: false }))
    }
  }

  /* ── resolve ── */
  const handleResolve = async (id, action, message) => {
    setResolving(prev => ({ ...prev, [id]: true }))
    try {
      const res = await api.put(`/api/withdrawals/${id}/resolve`, { action, message })
      // merge so computed fields (amount, clientUsername, etc.) survive
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, ...res.withdrawal } : w))
      showToast(action === 'approved' ? 'Retiro aprobado' : 'Retiro rechazado')
      setExpandedId(null)
    } catch (err) {
      showToast(err.message || 'Error al procesar', 'error')
    } finally {
      setResolving(prev => ({ ...prev, [id]: false }))
    }
  }

  /* ── refresh HG Cash status ── */
  const handleRefreshStatus = async (id) => {
    setRefreshing(prev => ({ ...prev, [id]: true }))
    try {
      const res = await api.post(`/api/withdrawals/${id}/refresh`, {})
      setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, ...res.withdrawal } : w))
      showToast(res.message || 'Estado actualizado')
    } catch (err) {
      showToast(err.message || 'Error al refrescar estado', 'error')
    } finally {
      setRefreshing(prev => ({ ...prev, [id]: false }))
    }
  }

  /* ── reconcile HG Cash log ── */
  const handleReconcile = async () => {
    setReconciling(true)
    try {
      const res = await api.post('/api/withdrawals/reconcile-log', {})
      showToast(res.message || `Reconciliados: ${res.processed ?? 0}`)
      fetchWithdrawals({ page: 1 })
    } catch (err) {
      showToast(err.message || 'Error al reconciliar', 'error')
    } finally {
      setReconciling(false)
    }
  }

  /* ── column count ── */
  const COL_COUNT = 10

  /* ────────────── render ────────────── */
  return (
    <PageWrap data-tour="withdrawals-page">
      {/* ── header ── */}
      <PageHeader>
        <HeaderLeft>
          {onMenuOpen && (
            <MenuBtn onClick={onMenuOpen}>
              <MenuIcon />
            </MenuBtn>
          )}
          <TitleBlock>
            <PageTitle>Retiros</PageTitle>
            <PageSub>Gestión y revisión de solicitudes de retiro</PageSub>
          </TitleBlock>
        </HeaderLeft>
      </PageHeader>

      <Body>
        {/* ── sticky top bar: tabs + mode toggle ── */}
        <StickyTopBar data-tour="withdrawals-tabs">
          <TabGroup>
            <TabBtn
              $active={activeTab === 'withdrawals'}
              onClick={() => setActiveTab('withdrawals')}
            >
              RETIROS
              <TabCount $active={activeTab === 'withdrawals'}>
                {pagination.total}
              </TabCount>
            </TabBtn>

            <TabBtn
              $active={activeTab === 'verify'}
              onClick={() => setActiveTab('verify')}
            >
              VERIFICAR
            </TabBtn>
          </TabGroup>

          <TabSpacer />

          <ModeLabel>Modo:</ModeLabel>
          <ModeBadge
            $mode={config.mode}
            onClick={toggleMode}
            disabled={savingMode}
            title="Cambiar modo de procesamiento"
          >
            {savingMode
              ? <Spinner $sm />
              : config.mode === 'auto'
                ? <BoltIcon />
                : <SettingsOutlinedIcon />
            }
            {config.mode === 'auto' ? 'Automático' : 'Manual'}
          </ModeBadge>
        </StickyTopBar>

        {/* ── VERIFY tab placeholder ── */}
        {activeTab === 'verify' && (
          <PlaceholderWrap>Próximamente</PlaceholderWrap>
        )}

        {activeTab === 'withdrawals' && (
          <>
            {/* ── config strip ── */}
            <ConfigStrip>
              <ConfigLabel>
                <SettingsOutlinedIcon />
                Configuración
              </ConfigLabel>

              <ConfigDivider />

              <ConfigGroup>
                <ConfigFieldLabel>Manual si &gt;= $</ConfigFieldLabel>
                <StepBtn
                  onClick={() => setThresholdDraft(v => Math.max(0, v - 1000))}
                  title="Reducir"
                >−</StepBtn>
                <ConfigInput
                  type="number"
                  value={thresholdDraft}
                  onChange={e => setThresholdDraft(Number(e.target.value))}
                  min={0}
                  step={1000}
                />
                <StepBtn
                  onClick={() => setThresholdDraft(v => v + 1000)}
                  title="Aumentar"
                >+</StepBtn>
                <ConfigSaveBtn onClick={saveThreshold} disabled={savingThreshold}>
                  {savingThreshold ? <Spinner $sm style={{ display: 'inline-block' }} /> : 'Guardar'}
                </ConfigSaveBtn>
                <ConfigHint>
                  (&gt;= ${new Intl.NumberFormat('es-AR').format(config.manualThreshold)} → manual)
                </ConfigHint>
              </ConfigGroup>

              <ConfigDivider />

              <ConfigGroup>
                <ConfigFieldLabel>Retiros por día:</ConfigFieldLabel>
                <StepBtn
                  onClick={() => setMaxPerDayDraft(v => Math.max(1, v - 1))}
                  title="Reducir"
                >−</StepBtn>
                <ConfigInput
                  type="number"
                  value={maxPerDayDraft}
                  onChange={e => setMaxPerDayDraft(Number(e.target.value))}
                  min={1}
                  step={1}
                  style={{ width: 60 }}
                />
                <StepBtn
                  onClick={() => setMaxPerDayDraft(v => v + 1)}
                  title="Aumentar"
                >+</StepBtn>
                <ConfigSaveBtn onClick={saveMaxPerDay} disabled={savingMaxPerDay}>
                  {savingMaxPerDay ? <Spinner $sm style={{ display: 'inline-block' }} /> : 'Guardar'}
                </ConfigSaveBtn>
                <ConfigHint>(máx {config.maxPerDay} por día)</ConfigHint>
              </ConfigGroup>

              <ConfigDivider />

              <ConfigGroup>
                <ReconcileBtn onClick={handleReconcile} disabled={reconciling} title="Sincronizar estados pendientes con HG Cash">
                  {reconciling ? <Spinner $sm /> : <SyncIcon style={{ fontSize: 13 }} />}
                  Reconciliar HG
                </ReconcileBtn>
              </ConfigGroup>
            </ConfigStrip>

            {/* ── filter bar ── */}
            <FilterBar data-tour="withdrawals-filters">
              <FilterLabel>De:</FilterLabel>
              <DateInput
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={e => { setDateFrom(e.target.value); setPreset('custom') }}
              />
              <FilterLabel>A:</FilterLabel>
              <DateInput
                type="date"
                value={dateTo}
                min={dateFrom}
                max={todayStr()}
                onChange={e => { setDateTo(e.target.value); setPreset('custom') }}
              />
              <PresetSelect
                value={preset}
                onChange={e => handlePreset(e.target.value)}
              >
                <option value="today">Hoy</option>
                <option value="ayer">Ayer</option>
                <option value="semana">Esta semana</option>
                <option value="mes">Este mes</option>
                <option value="custom">Personalizado</option>
              </PresetSelect>
              <FilterBtn onClick={handleFilter}>
                <FilterListIcon style={{ fontSize: 15, marginRight: 4, verticalAlign: 'middle' }} />
                Filtrar
              </FilterBtn>
            </FilterBar>

            {/* ── search row ── */}
            <SearchRow>
              <SearchBox>
                <SrchIcon>
                  <SearchIcon />
                </SrchIcon>
                <SearchInput
                  placeholder="Buscar por usuario, nombre o CBU..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </SearchBox>
              <StatusFilterSelect
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setPage(1); fetchWithdrawals({ statusFilter: e.target.value, page: 1 }) }}
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="review_pending">En revisión</option>
                <option value="approved">Aprobado</option>
                <option value="initiated">Iniciado</option>
                <option value="processing">Procesando</option>
                <option value="done">Completado</option>
                <option value="failed">Fallido</option>
                <option value="rejected">Rechazado</option>
                <option value="cancelled">Cancelado</option>
              </StatusFilterSelect>
              <ResultCount>{pagination.total} retiros</ResultCount>
            </SearchRow>

            {/* ── table ── */}
            <TableCard data-tour="withdrawals-content">
              <TableScroll>
                <Table>
                  <Thead>
                    <tr>
                      <Th>#</Th>
                      <Th>FECHA</Th>
                      <Th>CLIENTE</Th>
                      <Th>MONTO</Th>
                      <Th>CBU/ALIAS</Th>
                      <Th>TITULAR</Th>
                      <Th>ESTADO</Th>
                      <Th>PROGRESO</Th>
                      <Th>PROCESADO POR</Th>
                      <Th style={{ width: 40 }}></Th>
                    </tr>
                  </Thead>
                  <Tbody>
                    {loading && Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td colSpan={COL_COUNT} style={{ padding: 0 }}>
                          <SkeletonRow />
                        </td>
                      </tr>
                    ))}

                    {!loading && withdrawals.length === 0 && (
                      <EmptyRow>
                        <EmptyCell colSpan={COL_COUNT}>
                          Sin retiros en el período seleccionado
                        </EmptyCell>
                      </EmptyRow>
                    )}

                    {!loading && withdrawals.map((w, i) => (
                      <>
                        <Tr key={w.id} $i={i}>
                          <Td><IdText>{w.id}</IdText></Td>
                          <Td style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.45)' }}>
                            {fmtDate(w.createdAt, timezone)}
                          </Td>
                          <Td><ClientLink>{w.clientUsername || '—'}</ClientLink></Td>
                          <Td><AmountText>{fmtAmount(w.amount)}</AmountText></Td>
                          <Td>
                            <CbuText title={w.cbu || w.alias || ''}>
                              {truncCbu(w.cbu || w.alias)}
                            </CbuText>
                          </Td>
                          <Td><HolderText>{w.holderName || '—'}</HolderText></Td>
                          <Td><StatusBadge w={w} /></Td>
                          <Td><ProgressPipeline w={w} /></Td>
                          <Td>
                            <ProcessorText>{w.processedBy || '—'}</ProcessorText>
                          </Td>
                          <Td>
                            <ExpandBtn
                              onClick={() => toggleExpand(w.id)}
                              title={expandedId === w.id ? 'Cerrar detalle' : 'Ver detalle'}
                            >
                              {expandedId === w.id
                                ? <KeyboardArrowUpIcon />
                                : <KeyboardArrowDownIcon />
                              }
                            </ExpandBtn>
                          </Td>
                        </Tr>

                        {expandedId === w.id && (
                          <ExpandedDetail
                            key={`detail-${w.id}`}
                            w={w}
                            colCount={COL_COUNT}
                            analysisData={analysis[w.id]}
                            analysisLoading={!!analysisLoading[w.id]}
                            onResolve={handleResolve}
                            resolving={!!resolving[w.id]}
                            onRefresh={handleRefreshStatus}
                            refreshing={!!refreshing[w.id]}
                          />
                        )}
                      </>
                    ))}
                  </Tbody>
                </Table>
              </TableScroll>

              {/* ── pagination ── */}
              {!loading && pagination.totalPages > 1 && (
                <Pagination>
                  <PaginInfo>
                    Página {pagination.page} de {pagination.totalPages} · {pagination.total} retiros
                  </PaginInfo>
                  <PaginBtns>
                    <PaginBtn
                      onClick={() => gotoPage(page - 1)}
                      disabled={page <= 1}
                      title="Página anterior"
                    >
                      <ChevronLeftIcon />
                    </PaginBtn>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', padding: '0 4px' }}>
                      {page} / {pagination.totalPages}
                    </span>
                    <PaginBtn
                      onClick={() => gotoPage(page + 1)}
                      disabled={page >= pagination.totalPages}
                      title="Página siguiente"
                    >
                      <ChevronRightIcon />
                    </PaginBtn>
                  </PaginBtns>
                </Pagination>
              )}
            </TableCard>
          </>
        )}
      </Body>

      {/* ── toast ── */}
      {toast && (
        <Toast $type={toast.type}>
          {toast.type === 'success'
            ? <CheckCircleOutlinedIcon style={{ fontSize: 18 }} />
            : <WarningAmberOutlinedIcon style={{ fontSize: 18 }} />
          }
          {toast.message}
        </Toast>
      )}
    </PageWrap>
  )
}
