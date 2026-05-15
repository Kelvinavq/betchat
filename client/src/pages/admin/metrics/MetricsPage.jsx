import { useState, useCallback, useEffect, useRef } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import MenuOutlinedIcon          from '@mui/icons-material/MenuOutlined'
import PaymentsOutlinedIcon      from '@mui/icons-material/PaymentsOutlined'
import CheckCircleOutlinedIcon   from '@mui/icons-material/CheckCircleOutlined'
import CancelOutlinedIcon        from '@mui/icons-material/CancelOutlined'
import PendingOutlinedIcon       from '@mui/icons-material/PendingOutlined'
import TrendingUpOutlinedIcon    from '@mui/icons-material/TrendingUpOutlined'
import GroupOutlinedIcon         from '@mui/icons-material/GroupOutlined'
import AttachMoneyOutlinedIcon   from '@mui/icons-material/AttachMoneyOutlined'
import BarChartOutlinedIcon      from '@mui/icons-material/BarChartOutlined'
import FileDownloadOutlinedIcon  from '@mui/icons-material/FileDownloadOutlined'
import PictureAsPdfOutlinedIcon  from '@mui/icons-material/PictureAsPdfOutlined'
import CurrencyExchangeOutlinedIcon from '@mui/icons-material/CurrencyExchangeOutlined'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../../../utils/api'
import {
  PageWrap, PageHeader, MenuBtn, TitleBlock, PageTitle, PageSub,
  Body, FilterBar, PresetGroup, PresetBtn, DateSep, DateInput,
  ExportGroup, ExportBtn,
  LoadingWrap, Spinner, SkeletonCard,
  KpiGrid, KpiCard, KpiIconWrap, KpiLabel, KpiValue, KpiSub,
  ChartGrid, ChartCard, ChartHead, ChartTitle, ChartSub,
  ChartToggleGroup, ChartToggle,
  TableCard, TableHead, TableTitle, SortGroup, SortBtn,
  Table, Th, Tr, Td, Rank,
  UserCell, UserAvatar, UserName, AmountText, Badge,
  TooltipBox, TooltipLabel, TooltipRow, TooltipDot,
} from './MetricsPage.styles'

/* ── helpers ── */
const fmt   = (n) => new Intl.NumberFormat('es-AR').format(Math.round(n))
const fmtARS = (n) => `$${fmt(n)}`
const fmtPct = (n) => `${n}%`

const todayStr   = () => new Date().toISOString().slice(0, 10)
const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

const PRESETS = [
  { id: 'today',  label: 'Hoy',       from: () => todayStr(),     to: () => todayStr()     },
  { id: '7d',     label: '7 días',    from: () => daysAgoStr(6),  to: () => todayStr()     },
  { id: '30d',    label: '30 días',   from: () => daysAgoStr(29), to: () => todayStr()     },
  { id: '90d',    label: '90 días',   from: () => daysAgoStr(89), to: () => todayStr()     },
  { id: 'month',  label: 'Este mes',
    from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    to:   () => todayStr(),
  },
  { id: 'custom', label: 'Personalizado' },
]

const PROV_COLORS = { manual: '#3b82f6', hgcash: '#8b5cf6', telepagos: '#f59e0b', mercadopago: '#10b981' }
const STATUS_COLORS = { approved: '#4ade80', rejected: '#f87171', pending: '#fbbf24' }

/* ── custom dark tooltip ── */
function DarkTooltip({ active, payload, label, valueKey = 'count', valueLabel = 'Pagos', formatFn = fmt }) {
  if (!active || !payload?.length) return null
  return (
    <TooltipBox>
      <TooltipLabel>{label}</TooltipLabel>
      {payload.map((p, i) => (
        <TooltipRow key={i}>
          <TooltipDot $color={p.color} />
          {p.name}: <strong style={{ color: '#fff', marginLeft: 4 }}>{formatFn(p.value)}</strong>
        </TooltipRow>
      ))}
    </TooltipBox>
  )
}

function PieTip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <TooltipBox>
      <TooltipRow>
        <TooltipDot $color={p.payload.fill} />
        {p.name}: <strong style={{ color: '#fff', marginLeft: 4 }}>{fmt(p.value)} ({p.payload.pct}%)</strong>
      </TooltipRow>
    </TooltipBox>
  )
}

/* ── component ── */
export default function MetricsPage({ onMenuOpen }) {
  const { timezone } = useDateFormat()
  const [from, setFrom] = useState(daysAgoStr(29))
  const [to,   setTo]   = useState(todayStr())
  const [preset, setPreset] = useState('30d')
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [tsMode,  setTsMode]  = useState('count')   // 'count' | 'amount'
  const [provMode,setProvMode]= useState('approved') // 'approved' | 'total' | 'amount'
  const [topSort, setTopSort] = useState('amount')   // 'amount' | 'count'
  const [exporting, setExporting] = useState(null)   // null | 'excel' | 'pdf'
  const fetchRef = useRef(0)

  const fetchData = useCallback(async (f, t) => {
    const id = ++fetchRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await api.get(`/api/metrics?from=${f}&to=${t}`)
      if (fetchRef.current === id) setData(result)
    } catch (err) {
      if (fetchRef.current === id) setError(err.message || 'Error al cargar métricas')
    } finally {
      if (fetchRef.current === id) setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(from, to) }, []) // eslint-disable-line

  const applyPreset = (p) => {
    setPreset(p.id)
    if (p.id === 'custom') return
    const f = p.from()
    const t = p.to()
    setFrom(f); setTo(t)
    fetchData(f, t)
  }

  const applyCustom = () => { fetchData(from, to); setPreset('custom') }

  /* ── exports ── */
  const exportExcel = async () => {
    if (!data) return
    setExporting('excel')
    try {
      const XLSX = await import('xlsx')
      const wb   = XLSX.utils.book_new()

      /* KPI sheet */
      const kpiSheet = XLSX.utils.aoa_to_sheet([
        ['Métrica', 'Valor'],
        ['Total operaciones',       data.kpis.total],
        ['Aprobadas',               data.kpis.approved],
        ['Rechazadas',              data.kpis.rejected],
        ['Pendientes',              data.kpis.pending],
        ['Tasa de aprobación (%)',  data.kpis.approvalRate],
        ['Monto aprobado',          data.kpis.approvedAmount],
        ['Monto promedio',          data.kpis.avgAmount],
        ['Monto mínimo',            data.kpis.minAmount],
        ['Monto máximo',            data.kpis.maxAmount],
        ['Usuarios únicos',         data.kpis.uniqueUsers],
      ])
      XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs')

      /* Time series sheet */
      const tsSheet = XLSX.utils.json_to_sheet(
        data.timeSeries.map(r => ({ Fecha: r.date, Aprobadas: r.count, Monto: r.amount, Total: r.total }))
      )
      XLSX.utils.book_append_sheet(wb, tsSheet, 'Serie de tiempo')

      /* By provider sheet */
      const provSheet = XLSX.utils.json_to_sheet(
        data.byProvider.map(r => ({
          Proveedor: r.label, Total: r.total, Aprobadas: r.approved,
          Rechazadas: r.rejected, Pendientes: r.pending, Monto: r.amount,
        }))
      )
      XLSX.utils.book_append_sheet(wb, provSheet, 'Por proveedor')

      /* Top users sheet */
      const topSheet = XLSX.utils.json_to_sheet(
        (topSort === 'amount' ? data.topUsersByAmount : data.topUsersByCount).map((r, i) => ({
          '#': i + 1, Usuario: r.username, 'Nombre completo': r.fullName,
          Operaciones: r.count, 'Monto total': r.totalAmount,
          'Monto promedio': r.avgAmount, 'Monto máximo': r.maxAmount,
        }))
      )
      XLSX.utils.book_append_sheet(wb, topSheet, 'Top usuarios')

      /* Amount distribution sheet */
      const distSheet = XLSX.utils.json_to_sheet(
        data.amountDistribution.map(r => ({ Rango: r.label, Cantidad: r.count, 'Monto total': r.total }))
      )
      XLSX.utils.book_append_sheet(wb, distSheet, 'Distribución de montos')

      /* Withdrawals KPI sheet */
      const wrKpi = data.withdrawals?.kpis || {}
      const wrKpiSheet = XLSX.utils.aoa_to_sheet([
        ['Métrica', 'Valor'],
        ['Total retiros',               wrKpi.total],
        ['Aprobados',                   wrKpi.approved],
        ['Rechazados',                  wrKpi.rejected],
        ['Pendientes',                  wrKpi.pending],
        ['Tasa de aprobación (%)',       wrKpi.approvalRate],
        ['Usuarios únicos',             wrKpi.uniqueUsers],
      ])
      XLSX.utils.book_append_sheet(wb, wrKpiSheet, 'Retiros KPIs')

      /* Withdrawals time series sheet */
      const wrTsSheet = XLSX.utils.json_to_sheet(
        (data.withdrawals?.timeSeries || []).map(r => ({
          Fecha: r.date, Total: r.total, Aprobados: r.approved, Rechazados: r.rejected, Pendientes: r.pending,
        }))
      )
      XLSX.utils.book_append_sheet(wb, wrTsSheet, 'Retiros serie de tiempo')

      XLSX.writeFile(wb, `metricas_${from}_${to}.xlsx`)
    } catch (e) {
      console.error('Export Excel error:', e)
    } finally {
      setExporting(null)
    }
  }

  const exportPdf = async () => {
    if (!data) return
    setExporting('pdf')
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

      const theme = { headStyles: { fillColor: [14, 14, 34] }, alternateRowStyles: { fillColor: [20, 20, 44] }, styles: { fontSize: 8 } }

      doc.setFontSize(16)
      doc.setTextColor(255, 255, 255)
      doc.setFillColor(8, 8, 20)
      doc.rect(0, 0, 210, 297, 'F')

      doc.setFontSize(18)
      doc.setTextColor(255, 255, 255)
      doc.text('Reporte de Métricas', 14, 20)
      doc.setFontSize(10)
      doc.setTextColor(150, 150, 180)
      doc.text(`Período: ${from} al ${to}`, 14, 28)

      autoTable(doc, {
        startY: 36,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total operaciones',       fmt(data.kpis.total)],
          ['Aprobadas',               fmt(data.kpis.approved)],
          ['Rechazadas',              fmt(data.kpis.rejected)],
          ['Pendientes',              fmt(data.kpis.pending)],
          ['Tasa de aprobación',      fmtPct(data.kpis.approvalRate)],
          ['Monto aprobado',          fmtARS(data.kpis.approvedAmount)],
          ['Monto promedio',          fmtARS(data.kpis.avgAmount)],
          ['Usuarios únicos',         fmt(data.kpis.uniqueUsers)],
        ],
        ...theme,
      })

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['Proveedor', 'Total', 'Aprobadas', 'Rechazadas', 'Monto']],
        body: data.byProvider.map(r => [r.label, fmt(r.total), fmt(r.approved), fmt(r.rejected), fmtARS(r.amount)]),
        ...theme,
      })

      const topUsers = topSort === 'amount' ? data.topUsersByAmount : data.topUsersByCount
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 10,
        head: [['#', 'Usuario', 'Operaciones', 'Monto total', 'Promedio']],
        body: topUsers.map((r, i) => [i + 1, r.username, fmt(r.count), fmtARS(r.totalAmount), fmtARS(r.avgAmount)]),
        ...theme,
      })

      const wrKpi = data.withdrawals?.kpis || {}
      doc.setFontSize(13)
      doc.setTextColor(255, 255, 255)
      doc.text('Retiros', 14, doc.lastAutoTable.finalY + 18)
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 22,
        head: [['Métrica', 'Valor']],
        body: [
          ['Total retiros',         fmt(wrKpi.total || 0)],
          ['Aprobados',             fmt(wrKpi.approved || 0)],
          ['Rechazados',            fmt(wrKpi.rejected || 0)],
          ['Pendientes',            fmt(wrKpi.pending || 0)],
          ['Tasa de aprobación',    fmtPct(wrKpi.approvalRate || 0)],
          ['Usuarios únicos',       fmt(wrKpi.uniqueUsers || 0)],
        ],
        ...theme,
      })

      doc.save(`metricas_${from}_${to}.pdf`)
    } catch (e) {
      console.error('Export PDF error:', e)
    } finally {
      setExporting(null)
    }
  }

  /* ── derived data ── */
  const kpis = data?.kpis || {}
  const topUsers = data ? (topSort === 'amount' ? data.topUsersByAmount : data.topUsersByCount) : []

  const statusPieData = data ? [
    { name: 'Aprobadas', value: kpis.approved, fill: STATUS_COLORS.approved, pct: kpis.total > 0 ? Math.round(kpis.approved / kpis.total * 100) : 0 },
    { name: 'Rechazadas', value: kpis.rejected, fill: STATUS_COLORS.rejected, pct: kpis.total > 0 ? Math.round(kpis.rejected / kpis.total * 100) : 0 },
    { name: 'Pendientes', value: kpis.pending,  fill: STATUS_COLORS.pending,  pct: kpis.total > 0 ? Math.round(kpis.pending  / kpis.total * 100) : 0 },
  ] : []

  const hourlyData = data?.hourlyPattern?.map(h => ({
    hour: `${String(h.hour).padStart(2, '0')}:00`,
    Pagos: h.count,
    Monto: h.amount,
  })) || []

  const formatXAxisDate = (tick) => {
    if (!tick) return ''
    const d = new Date(tick + 'T12:00:00')
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', ...(timezone && { timeZone: timezone }) })
  }

  const KPI_CARDS = data ? [
    { label: 'Total operaciones', value: fmt(kpis.total),           sub: `${from} – ${to}`,           icon: <PaymentsOutlinedIcon />,     color: '#3b82f6' },
    { label: 'Aprobadas',         value: fmt(kpis.approved),        sub: `${fmtPct(kpis.approvalRate)} tasa`,   icon: <CheckCircleOutlinedIcon />,  color: '#4ade80' },
    { label: 'Rechazadas',        value: fmt(kpis.rejected),        sub: 'operaciones rechazadas',      icon: <CancelOutlinedIcon />,        color: '#f87171' },
    { label: 'Pendientes',        value: fmt(kpis.pending),         sub: 'en espera',                   icon: <PendingOutlinedIcon />,       color: '#fbbf24' },
    { label: 'Monto aprobado',    value: fmtARS(kpis.approvedAmount), sub: 'en el período',             icon: <AttachMoneyOutlinedIcon />,   color: '#10b981' },
    { label: 'Monto promedio',    value: fmtARS(kpis.avgAmount),    sub: `Máx: ${fmtARS(kpis.maxAmount)}`,      icon: <TrendingUpOutlinedIcon />,   color: '#8b5cf6' },
    { label: 'Monto mínimo',      value: fmtARS(kpis.minAmount),    sub: 'operación más pequeña',       icon: <BarChartOutlinedIcon />,      color: '#f59e0b' },
    { label: 'Usuarios únicos',   value: fmt(kpis.uniqueUsers),     sub: 'con pagos aprobados',         icon: <GroupOutlinedIcon />,         color: '#60a5fa' },
  ] : []

  const userInitials = (u) => (u.fullName || u.username || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  return (
    <PageWrap>
      <PageHeader>
        {onMenuOpen && (
          <MenuBtn onClick={onMenuOpen}>
            <MenuOutlinedIcon />
          </MenuBtn>
        )}
        <TitleBlock>
          <PageTitle>Métricas</PageTitle>
          <PageSub>Análisis de pagos y actividad · {from} → {to}</PageSub>
        </TitleBlock>
      </PageHeader>

      <Body>
        {/* ── Filter bar ── */}
        <FilterBar>
          <PresetGroup>
            {PRESETS.map(p => (
              <PresetBtn key={p.id} $active={preset === p.id} onClick={() => applyPreset(p)}>
                {p.label}
              </PresetBtn>
            ))}
          </PresetGroup>

          <DateSep />

          <DateInput
            type="date"
            value={from}
            max={to}
            onChange={e => { setFrom(e.target.value); setPreset('custom') }}
            onBlur={applyCustom}
          />
          <DateInput
            type="date"
            value={to}
            min={from}
            max={todayStr()}
            onChange={e => { setTo(e.target.value); setPreset('custom') }}
            onBlur={applyCustom}
          />

          <ExportGroup>
            <ExportBtn $variant="excel" disabled={!data || exporting === 'excel'} onClick={exportExcel}>
              {exporting === 'excel' ? <Spinner /> : <FileDownloadOutlinedIcon />}
              Excel
            </ExportBtn>
            <ExportBtn $variant="pdf" disabled={!data || exporting === 'pdf'} onClick={exportPdf}>
              {exporting === 'pdf' ? <Spinner /> : <PictureAsPdfOutlinedIcon />}
              PDF
            </ExportBtn>
          </ExportGroup>
        </FilterBar>

        {/* ── Loading / Error ── */}
        {loading && (
          <>
            <KpiGrid>
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} style={{ height: 108 }} />)}
            </KpiGrid>
            <LoadingWrap style={{ flex: 'none', paddingTop: 0 }}>
              <Spinner /><span>Cargando métricas...</span>
            </LoadingWrap>
          </>
        )}

        {error && !loading && (
          <LoadingWrap>
            <span style={{ color: '#f87171', fontSize: 14 }}>{error}</span>
          </LoadingWrap>
        )}

        {/* ── Content ── */}
        {!loading && !error && data && (
          <>
            {/* KPI Cards */}
            <KpiGrid>
              {KPI_CARDS.map((card) => (
                <KpiCard key={card.label} $color={card.color}>
                  <KpiIconWrap $color={card.color}>{card.icon}</KpiIconWrap>
                  <div>
                    <KpiLabel>{card.label}</KpiLabel>
                    <KpiValue>{card.value}</KpiValue>
                    <KpiSub>{card.sub}</KpiSub>
                  </div>
                </KpiCard>
              ))}
            </KpiGrid>

            {/* Row 1: Time series + Status pie */}
            <ChartGrid $cols={2}>
              <ChartCard $h={280}>
                <ChartHead>
                  <div>
                    <ChartTitle>Actividad en el tiempo</ChartTitle>
                    <ChartSub>{data.timeSeries.length} días con datos</ChartSub>
                  </div>
                  <ChartToggleGroup>
                    <ChartToggle $active={tsMode === 'count'}  onClick={() => setTsMode('count')}>Pagos</ChartToggle>
                    <ChartToggle $active={tsMode === 'amount'} onClick={() => setTsMode('amount')}>Monto</ChartToggle>
                  </ChartToggleGroup>
                </ChartHead>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatXAxisDate} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={tsMode === 'amount' ? (v) => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}` : undefined} width={48} />
                    <Tooltip content={<DarkTooltip formatFn={tsMode === 'amount' ? fmtARS : fmt} />} />
                    <Area
                      type="monotone"
                      dataKey={tsMode}
                      name={tsMode === 'count' ? 'Aprobadas' : 'Monto'}
                      stroke="#3b82f6"
                      strokeWidth={2}
                      fill="url(#tsGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard $h={280}>
                <ChartHead>
                  <div>
                    <ChartTitle>Distribución de estados</ChartTitle>
                    <ChartSub>Sobre {fmt(kpis.total)} operaciones totales</ChartSub>
                  </div>
                </ChartHead>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%" cy="50%"
                      innerRadius="52%" outerRadius="75%"
                      paddingAngle={3}
                      dataKey="value"
                      nameKey="name"
                    >
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTip />} />
                    <Legend
                      formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{value}</span>}
                      wrapperStyle={{ paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>
            </ChartGrid>

            {/* Row 2: By provider */}
            <ChartGrid $cols={1}>
              <ChartCard $h={260}>
                <ChartHead>
                  <div>
                    <ChartTitle>Por proveedor de pago</ChartTitle>
                    <ChartSub>{data.byProvider.length} proveedores activos en el período</ChartSub>
                  </div>
                  <ChartToggleGroup>
                    <ChartToggle $active={provMode === 'approved'} onClick={() => setProvMode('approved')}>Aprobadas</ChartToggle>
                    <ChartToggle $active={provMode === 'total'}    onClick={() => setProvMode('total')}>Total</ChartToggle>
                    <ChartToggle $active={provMode === 'amount'}   onClick={() => setProvMode('amount')}>Monto</ChartToggle>
                  </ChartToggleGroup>
                </ChartHead>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.byProvider} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={provMode === 'amount' ? (v) => `$${v >= 1000 ? (v/1000).toFixed(0)+'k' : v}` : undefined}
                      width={48}
                    />
                    <Tooltip content={<DarkTooltip formatFn={provMode === 'amount' ? fmtARS : fmt} />} />
                    {provMode === 'approved' && (
                      <>
                        <Bar dataKey="approved" name="Aprobadas" fill="#4ade80" radius={[5,5,0,0]} />
                        <Bar dataKey="rejected" name="Rechazadas" fill="#f87171" radius={[5,5,0,0]} />
                        <Bar dataKey="pending"  name="Pendientes" fill="#fbbf24" radius={[5,5,0,0]} />
                      </>
                    )}
                    {provMode === 'total' && (
                      <Bar dataKey="total" name="Total" radius={[5,5,0,0]}>
                        {data.byProvider.map((entry, i) => (
                          <Cell key={i} fill={PROV_COLORS[entry.provider] || '#3b82f6'} />
                        ))}
                      </Bar>
                    )}
                    {provMode === 'amount' && (
                      <Bar dataKey="amount" name="Monto aprobado" radius={[5,5,0,0]}>
                        {data.byProvider.map((entry, i) => (
                          <Cell key={i} fill={PROV_COLORS[entry.provider] || '#3b82f6'} />
                        ))}
                      </Bar>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </ChartGrid>

            {/* Row 3: Amount distribution + Hourly pattern */}
            <ChartGrid $cols={2}>
              <ChartCard $h={260}>
                <ChartHead>
                  <div>
                    <ChartTitle>Distribución de montos</ChartTitle>
                    <ChartSub>Cantidad de pagos por rango de monto</ChartSub>
                  </div>
                </ChartHead>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.amountDistribution} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<DarkTooltip formatFn={fmt} />} />
                    <Bar dataKey="count" name="Pagos" fill="#8b5cf6" radius={[5,5,0,0]}>
                      {data.amountDistribution.map((_, i) => (
                        <Cell key={i} fill={`hsl(${260 + i * 18}, 70%, ${55 + i * 3}%)`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard $h={260}>
                <ChartHead>
                  <div>
                    <ChartTitle>Patrón horario</ChartTitle>
                    <ChartSub>Distribución de pagos aprobados por hora del día</ChartSub>
                  </div>
                </ChartHead>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="hour" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }} axisLine={false} tickLine={false} interval={2} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<DarkTooltip formatFn={fmt} />} />
                    <Bar dataKey="Pagos" fill="#f59e0b" radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </ChartGrid>

            {/* Top users table */}
            <TableCard>
              <TableHead>
                <TableTitle>Top usuarios</TableTitle>
                <SortGroup>
                  <SortBtn $active={topSort === 'amount'} onClick={() => setTopSort('amount')}>Por monto</SortBtn>
                  <SortBtn $active={topSort === 'count'}  onClick={() => setTopSort('count')}>Por cantidad</SortBtn>
                </SortGroup>
              </TableHead>
              <Table>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Usuario</Th>
                    <Th>Operaciones</Th>
                    <Th>Monto total</Th>
                    <Th>Promedio</Th>
                    <Th>Máximo</Th>
                  </tr>
                </thead>
                <tbody>
                  {topUsers.length === 0 && (
                    <tr>
                      <Td colSpan={6} style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', padding: '32px 20px' }}>
                        Sin datos en el período seleccionado
                      </Td>
                    </tr>
                  )}
                  {topUsers.map((u, i) => (
                    <Tr key={u.clientId}>
                      <Td><Rank $n={i + 1}>{i + 1}</Rank></Td>
                      <Td>
                        <UserCell>
                          <UserAvatar>{userInitials(u)}</UserAvatar>
                          <div>
                            <UserName>{u.username}</UserName>
                            {u.fullName && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{u.fullName}</div>}
                          </div>
                        </UserCell>
                      </Td>
                      <Td><Badge>{fmt(u.count)}</Badge></Td>
                      <Td><AmountText $green>{fmtARS(u.totalAmount)}</AmountText></Td>
                      <Td><AmountText>{fmtARS(u.avgAmount)}</AmountText></Td>
                      <Td><AmountText>{fmtARS(u.maxAmount)}</AmountText></Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </TableCard>

            {/* ── Withdrawals section ── */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0 4px', padding: '0 2px' }}>
              <CurrencyExchangeOutlinedIcon style={{ color: '#a78bfa', fontSize: 20 }} />
              <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, letterSpacing: '0.03em', textTransform: 'uppercase' }}>Retiros</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)', marginLeft: 4 }} />
            </div>

            {/* Withdrawal KPI cards */}
            {(() => {
              const wk = data.withdrawals?.kpis || {}
              const WR_KPI_CARDS = [
                { label: 'Total retiros',    value: fmt(wk.total || 0),        sub: `${from} – ${to}`,                    icon: <CurrencyExchangeOutlinedIcon />, color: '#a78bfa' },
                { label: 'Aprobados',        value: fmt(wk.approved || 0),     sub: `${fmtPct(wk.approvalRate || 0)} tasa`, icon: <CheckCircleOutlinedIcon />,     color: '#4ade80' },
                { label: 'Rechazados',       value: fmt(wk.rejected || 0),     sub: 'solicitudes rechazadas',              icon: <CancelOutlinedIcon />,           color: '#f87171' },
                { label: 'Pendientes',       value: fmt(wk.pending || 0),      sub: 'en espera de revisión',               icon: <PendingOutlinedIcon />,          color: '#fbbf24' },
                { label: 'Usuarios únicos',  value: fmt(wk.uniqueUsers || 0),  sub: 'con solicitudes',                     icon: <GroupOutlinedIcon />,            color: '#60a5fa' },
              ]
              return (
                <KpiGrid>
                  {WR_KPI_CARDS.map(card => (
                    <KpiCard key={card.label} $color={card.color}>
                      <KpiIconWrap $color={card.color}>{card.icon}</KpiIconWrap>
                      <div>
                        <KpiLabel>{card.label}</KpiLabel>
                        <KpiValue>{card.value}</KpiValue>
                        <KpiSub>{card.sub}</KpiSub>
                      </div>
                    </KpiCard>
                  ))}
                </KpiGrid>
              )
            })()}

            {/* Withdrawal time series */}
            <ChartGrid $cols={1}>
              <ChartCard $h={260}>
                <ChartHead>
                  <div>
                    <ChartTitle>Retiros en el tiempo</ChartTitle>
                    <ChartSub>{(data.withdrawals?.timeSeries || []).length} días con datos</ChartSub>
                  </div>
                </ChartHead>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.withdrawals?.timeSeries || []} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={formatXAxisDate} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                    <Tooltip content={<DarkTooltip formatFn={fmt} />} />
                    <Legend formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>{value}</span>} wrapperStyle={{ paddingTop: 8 }} />
                    <Bar dataKey="approved" name="Aprobados" stackId="a" fill="#4ade80" radius={[0,0,0,0]} />
                    <Bar dataKey="rejected" name="Rechazados" stackId="a" fill="#f87171" radius={[0,0,0,0]} />
                    <Bar dataKey="pending"  name="Pendientes" stackId="a" fill="#fbbf24" radius={[5,5,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </ChartGrid>
          </>
        )}
      </Body>
    </PageWrap>
  )
}
