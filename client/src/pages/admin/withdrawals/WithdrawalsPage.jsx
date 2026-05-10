import { useState, useEffect, useRef, useCallback } from 'react'
import SettingsOutlinedIcon       from '@mui/icons-material/SettingsOutlined'
import BoltIcon                   from '@mui/icons-material/Bolt'
import SearchIcon                 from '@mui/icons-material/Search'
import KeyboardArrowDownIcon      from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowUpIcon        from '@mui/icons-material/KeyboardArrowUp'
import CheckCircleOutlinedIcon    from '@mui/icons-material/CheckCircleOutlined'
import ShieldOutlinedIcon         from '@mui/icons-material/ShieldOutlined'
import InsertDriveFileOutlinedIcon from '@mui/icons-material/InsertDriveFileOutlined'
import ManageAccountsOutlinedIcon  from '@mui/icons-material/ManageAccountsOutlined'
import WarningAmberOutlinedIcon    from '@mui/icons-material/WarningAmberOutlined'
import FilterListIcon              from '@mui/icons-material/FilterList'
import MenuIcon                    from '@mui/icons-material/Menu'
import CloseIcon                   from '@mui/icons-material/Close'
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
  RejectTextarea, ConfirmRow, ConfirmBtn,
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

const fmtDate = (str) => {
  if (!str) return '—'
  const d = new Date(str)
  if (isNaN(d)) return '—'
  const day  = d.getDate()
  const mon  = d.getMonth() + 1
  const hh   = String(d.getHours()).padStart(2, '0')
  const mm   = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${mon}, ${hh}:${mm}`
}

const truncCbu = (s, max = 22) => {
  if (!s) return '—'
  return s.length > max ? s.slice(0, max) + '…' : s
}

/* ────────────────────────────────────────────────
   Status badge
──────────────────────────────────────────────── */
function StatusBadge({ w }) {
  const { status, reviewMode, riskScore } = w

  if (status === 'pending') {
    return (
      <StatusCell>
        <StatusLine1 $variant="pending">Pendiente</StatusLine1>
      </StatusCell>
    )
  }

  if (status === 'rejected') {
    return (
      <StatusCell>
        <StatusLine1 $variant="rejected">Rechazado</StatusLine1>
      </StatusCell>
    )
  }

  if (status === 'approved') {
    if (reviewMode === 'auto') {
      return (
        <StatusCell>
          <StatusLine1 $variant="approved">Aprobado</StatusLine1>
          <StatusLine2 $variant="sent">Enviado</StatusLine2>
        </StatusCell>
      )
    }
    // manual
    const isBlocked = riskScore != null && riskScore >= 40
    return (
      <StatusCell>
        <StatusLine1 $variant="approved">Aprobado</StatusLine1>
        <StatusLine2 $variant={isBlocked ? 'blocked' : 'manual'}>
          {isBlocked ? 'Bloqueado' : 'Manual'}
        </StatusLine2>
      </StatusCell>
    )
  }

  return (
    <StatusCell>
      <StatusLine1>{status}</StatusLine1>
    </StatusCell>
  )
}

/* ────────────────────────────────────────────────
   Progress pipeline
──────────────────────────────────────────────── */
function ProgressPipeline({ w }) {
  const { status, riskScore, reviewMode } = w

  const s1 = true // always active
  const s2 = riskScore != null
  const s3 = reviewMode === 'manual' || status !== 'pending'
  const s4 = status !== 'pending'

  return (
    <Pipeline>
      <PipeStage $active={s1} $color="#60a5fa" title="Creado">
        <InsertDriveFileOutlinedIcon />
      </PipeStage>
      <PipeConnector $active={s2} />
      <PipeStage $active={s2} $color="#a78bfa" title="Anti-Fraude">
        <ShieldOutlinedIcon />
      </PipeStage>
      <PipeConnector $active={s3} />
      <PipeStage $active={s3} $color="#fb923c" title="Revisión">
        <ManageAccountsOutlinedIcon />
      </PipeStage>
      <PipeConnector $active={s4} />
      <PipeStage $active={s4} $color="#4ade80" title="Listo">
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
  const alerts     = analysisData?.alerts     ?? w.fraudAlerts
  const reviewMode = analysisData?.reviewMode ?? w.reviewMode

  const isLoading = analysisLoading && riskScore == null

  let bannerVariant = 'loading'
  let bannerText    = 'Analizando...'

  if (!isLoading && riskScore != null) {
    if (reviewMode === 'auto' && riskScore < 40) {
      bannerVariant = 'ok'
      bannerText    = 'Aprobado automáticamente'
    } else {
      bannerVariant = 'warn'
      bannerText    = 'Enviado a revisión manual'
    }
  }

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
            <RiskLabel>Riesgo</RiskLabel>
            <RiskValue $score={riskScore}>{riskScore}/100</RiskValue>
          </RiskRow>
          <RiskBar>
            <RiskFill $pct={riskScore} $score={riskScore} />
          </RiskBar>
        </>
      )}

      {alerts && alerts.length > 0 && (
        <>
          <AlertsHeader>Alertas detectadas:</AlertsHeader>
          <AlertsList>
            {alerts.map((a, i) => (
              <AlertBadge key={i}>
                <WarningAmberOutlinedIcon />
                {a}
              </AlertBadge>
            ))}
          </AlertsList>
        </>
      )}

      {riskScore != null && (!alerts || alerts.length === 0) && (
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
}) {
  const [action,      setAction]      = useState(null)   // 'approve' | 'reject' | null
  const [rejectMsg,   setRejectMsg]   = useState('')
  const [submitting,  setSubmitting]  = useState(false)

  const handleApprove = () => setAction('approve')
  const handleReject  = () => setAction('reject')
  const handleCancel  = () => { setAction(null); setRejectMsg('') }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await onResolve(w.id, action === 'approve' ? 'approved' : 'rejected', rejectMsg || undefined)
      setAction(null)
      setRejectMsg('')
    } finally {
      setSubmitting(false)
    }
  }

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
              <DetailValBlue>{w.cbuAlias || '—'}</DetailValBlue>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Titular</DetailKey>
              <DetailVal>{w.accountHolder || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>WhatsApp</DetailKey>
              <DetailVal>{w.whatsapp || '—'}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>CUIL Check</DetailKey>
              <CuilBadge $ok={w.cuilCheck === 'ok'}>
                {w.cuilCheck || 'unknown'}
              </CuilBadge>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Procesado</DetailKey>
              <DetailVal>{fmtDate(w.processedAt)}</DetailVal>
            </DetailRow2>

            <DetailRow2>
              <DetailKey>Por</DetailKey>
              <DetailVal>
                {w.processedBy
                  ? <strong style={{ color: 'rgba(255,255,255,0.80)' }}>{w.processedBy}</strong>
                  : '—'}
              </DetailVal>
            </DetailRow2>

            {w.rejectionMessage && (
              <DetailRow2>
                <DetailKey>Motivo rechazo</DetailKey>
                <DetailValRed>{w.rejectionMessage}</DetailValRed>
              </DetailRow2>
            )}

            {/* resolve section for pending */}
            {w.status === 'pending' && (
              <ResolveSection>
                <ResolveLabel>Acción</ResolveLabel>

                {action === null && (
                  <ResolveBtns>
                    <ApproveBtn onClick={handleApprove} disabled={resolving}>
                      Aprobar
                    </ApproveBtn>
                    <RejectBtn onClick={handleReject} disabled={resolving}>
                      Rechazar
                    </RejectBtn>
                  </ResolveBtns>
                )}

                {action === 'approve' && (
                  <>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
                      ¿Confirmar aprobación?
                    </p>
                    <ConfirmRow>
                      <ConfirmBtn
                        $variant="confirm"
                        onClick={handleConfirm}
                        disabled={submitting}
                      >
                        {submitting ? <Spinner $sm /> : 'Confirmar'}
                      </ConfirmBtn>
                      <ConfirmBtn onClick={handleCancel} disabled={submitting}>
                        Cancelar
                      </ConfirmBtn>
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
                      <ConfirmBtn onClick={handleCancel} disabled={submitting}>
                        Cancelar
                      </ConfirmBtn>
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
  const [statusFilter] = useState('all')
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

  /* ── column count ── */
  const COL_COUNT = 10

  /* ────────────── render ────────────── */
  return (
    <PageWrap>
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
        <StickyTopBar>
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
            </ConfigStrip>

            {/* ── filter bar ── */}
            <FilterBar>
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
                  placeholder="Buscar por usuario o nombre..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </SearchBox>
              <ResultCount>{pagination.total} retiros</ResultCount>
            </SearchRow>

            {/* ── table ── */}
            <TableCard>
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
                            {fmtDate(w.createdAt)}
                          </Td>
                          <Td><ClientLink>{w.clientUsername || '—'}</ClientLink></Td>
                          <Td><AmountText>{fmtAmount(w.amount)}</AmountText></Td>
                          <Td>
                            <CbuText title={w.cbuAlias || ''}>
                              {truncCbu(w.cbuAlias)}
                            </CbuText>
                          </Td>
                          <Td><HolderText>{w.accountHolder || '—'}</HolderText></Td>
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
