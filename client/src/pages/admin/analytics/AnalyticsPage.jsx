import { useState, useCallback, useEffect } from 'react'
import MenuOutlinedIcon              from '@mui/icons-material/MenuOutlined'
import ForumOutlinedIcon             from '@mui/icons-material/ForumOutlined'
import SmsOutlinedIcon               from '@mui/icons-material/SmsOutlined'
import HelpOutlineOutlinedIcon       from '@mui/icons-material/HelpOutlineOutlined'
import TimerOutlinedIcon             from '@mui/icons-material/TimerOutlined'
import PeopleAltOutlinedIcon         from '@mui/icons-material/PeopleAltOutlined'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { api } from '../../../utils/api'
import {
  PageWrap, PageHeader, MenuBtn, TitleBlock, PageTitle, PageSub,
  Body, FilterBar, PresetGroup, PresetBtn, DateSep, DateInput,
  LoadingWrap, Spinner, SkeletonCard,
  KpiGrid, KpiCard, KpiIconWrap, KpiLabel, KpiValue, KpiSub,
  ChartGrid, ChartCard, ChartHead, ChartTitle, ChartSub,
  TableCard, TableHead, TableTitle,
  TooltipBox, TooltipLabel, TooltipRow, TooltipDot,
  AgentRow, AgentAvatar, AgentInfo, AgentName, AgentSub, AgentStat,
  ResolutionBar, ResolutionFill, EmptyState,
} from './AnalyticsPage.styles'

const todayStr   = () => new Date().toISOString().slice(0, 10)
const daysAgoStr = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }

const PRESETS = [
  { id: 'today',  label: 'Hoy',        from: () => todayStr(),     to: () => todayStr()     },
  { id: '7d',     label: '7 días',     from: () => daysAgoStr(6),  to: () => todayStr()     },
  { id: '30d',    label: '30 días',    from: () => daysAgoStr(29), to: () => todayStr()     },
  { id: '90d',    label: '90 días',    from: () => daysAgoStr(89), to: () => todayStr()     },
  { id: 'month',  label: 'Este mes',
    from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    to:   () => todayStr(),
  },
  { id: 'custom', label: 'Personaliz.' },
]

function fmtMin(min) {
  if (min == null) return '—'
  if (min < 60) return `${Math.round(min)}m`
  return `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`
}

function DarkTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <TooltipBox>
      <TooltipLabel>{label}</TooltipLabel>
      {payload.map((p, i) => (
        <TooltipRow key={i}>
          <TooltipDot $color={p.color} />
          {p.name}: <strong style={{ color: '#fff', marginLeft: 4 }}>{p.value}</strong>
        </TooltipRow>
      ))}
    </TooltipBox>
  )
}

const AnalyticsPage = ({ onMenuOpen }) => {
  const [preset,  setPreset]  = useState('30d')
  const [fromDate, setFromDate] = useState(daysAgoStr(29))
  const [toDate,   setToDate]   = useState(todayStr())
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const load = useCallback(async (from, to) => {
    setLoading(true)
    setError(null)
    try {
      const d = await api.get(`/api/analytics?from=${from}&to=${to}`)
      setData(d)
    } catch (e) {
      setError(e.message || 'Error cargando analíticas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load(fromDate, toDate) }, []) // eslint-disable-line

  const applyPreset = (p) => {
    setPreset(p.id)
    if (p.id === 'custom') return
    const f = p.from(); const t = p.to()
    setFromDate(f); setToDate(t)
    load(f, t)
  }

  const applyCustom = () => { setPreset('custom'); load(fromDate, toDate) }

  const kpi = data?.kpi || {}

  const KPI_CARDS = [
    { label: 'Chats totales',       value: kpi.totalChats    ?? '—', sub: 'en el período',          icon: <ForumOutlinedIcon />,       color: 'var(--bc-admin-accent, #2563eb)' },
    { label: 'Mensajes de clientes',value: kpi.totalMessages ?? '—', sub: 'enviados por usuarios',  icon: <SmsOutlinedIcon />,         color: '#4ade80' },
    { label: 'Clientes únicos',     value: kpi.uniqueClients ?? '—', sub: 'usuarios distintos',     icon: <PeopleAltOutlinedIcon />,   color: '#f59e0b' },
    { label: 'Solicitudes ayuda',   value: kpi.helpRequests  ?? '—', sub: 'requirieron soporte',    icon: <HelpOutlineOutlinedIcon />, color: '#f87171' },
    { label: 'Tiempo resolución',   value: fmtMin(kpi.avgResolutionMin), sub: 'promedio por chat',  icon: <TimerOutlinedIcon />,       color: '#a78bfa' },
  ]

  // Short day label for timeline chart
  const timeline = (data?.timeline || []).map(d => ({
    ...d,
    label: d.day.slice(5), // MM-DD
  }))

  // Peak hour label already has 'XXh' format
  const hourly = data?.hourly || []
  const peakHour = hourly.reduce((max, h) => h.count > max.count ? h : max, { count: 0, label: '—' })

  return (
    <PageWrap>
      <PageHeader>
        {onMenuOpen && (
          <MenuBtn type="button" onClick={onMenuOpen} aria-label="Menú">
            <MenuOutlinedIcon />
          </MenuBtn>
        )}
        <TitleBlock>
          <PageTitle>Analíticas</PageTitle>
          <PageSub>Actividad de chats, agentes y horarios pico</PageSub>
        </TitleBlock>
      </PageHeader>

      <Body>
        {/* filter bar */}
        <FilterBar>
          <PresetGroup>
            {PRESETS.map(p => (
              <PresetBtn key={p.id} $active={preset === p.id} onClick={() => applyPreset(p)}>{p.label}</PresetBtn>
            ))}
          </PresetGroup>
          {preset === 'custom' && (
            <>
              <DateInput type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
              <DateSep>→</DateSep>
              <DateInput type="date" value={toDate}   onChange={e => setToDate(e.target.value)}   />
              <PresetBtn $active onClick={applyCustom}>Aplicar</PresetBtn>
            </>
          )}
        </FilterBar>

        {loading && (
          <LoadingWrap>
            <Spinner />
            <KpiGrid>
              {KPI_CARDS.map((_, i) => <SkeletonCard key={i} />)}
            </KpiGrid>
          </LoadingWrap>
        )}

        {!loading && error && (
          <EmptyState>{error}</EmptyState>
        )}

        {!loading && data && (
          <>
            {/* KPI cards */}
            <KpiGrid>
              {KPI_CARDS.map((c, i) => (
                <KpiCard key={i} style={{ animationDelay: `${i * 40}ms` }}>
                  <KpiIconWrap style={{ background: `${c.color}22`, color: c.color }}>{c.icon}</KpiIconWrap>
                  <div>
                    <KpiLabel>{c.label}</KpiLabel>
                    <KpiValue>{c.value}</KpiValue>
                    <KpiSub>{c.sub}</KpiSub>
                  </div>
                </KpiCard>
              ))}
            </KpiGrid>

            {/* Charts */}
            <ChartGrid>
              {/* Activity timeline */}
              <ChartCard style={{ gridColumn: '1 / -1' }}>
                <ChartHead>
                  <div>
                    <ChartTitle>Actividad diaria</ChartTitle>
                    <ChartSub>Mensajes de clientes y chats abiertos por día</ChartSub>
                  </div>
                </ChartHead>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={timeline} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradMsg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="var(--bc-admin-accent,#2563eb)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--bc-admin-accent,#2563eb)" stopOpacity={0}    />
                      </linearGradient>
                      <linearGradient id="gradChats" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#4ade80" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4ade80" stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 11 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.32)', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="messages" name="Mensajes" stroke="var(--bc-admin-accent,#2563eb)" fill="url(#gradMsg)"   strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="chats"    name="Chats"    stroke="#4ade80"                        fill="url(#gradChats)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Hourly pattern */}
              <ChartCard>
                <ChartHead>
                  <div>
                    <ChartTitle>Horario pico</ChartTitle>
                    <ChartSub>Pico: {peakHour.label} · {peakHour.count} mensajes</ChartSub>
                  </div>
                </ChartHead>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={hourly} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} interval={3} />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.28)', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Bar dataKey="count" name="Mensajes" fill="var(--bc-admin-accent,#2563eb)" radius={[3,3,0,0]} maxBarSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Agents table */}
              <ChartCard>
                <ChartHead>
                  <div>
                    <ChartTitle>Chats por agente</ChartTitle>
                    <ChartSub>Atenciones asignadas en el período</ChartSub>
                  </div>
                </ChartHead>
                {data.agents.length === 0 ? (
                  <EmptyState>Sin datos de agentes en el período</EmptyState>
                ) : data.agents.map(a => {
                  const pct = a.total > 0 ? Math.round((a.resolved / a.total) * 100) : 0
                  const initials = (a.fullName || a.username || '?').split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase()
                  return (
                    <AgentRow key={a.id}>
                      <AgentAvatar>{initials}</AgentAvatar>
                      <AgentInfo>
                        <AgentName>{a.fullName || a.username}</AgentName>
                        <AgentSub>{pct}% resueltos</AgentSub>
                        <ResolutionBar><ResolutionFill $pct={pct} /></ResolutionBar>
                      </AgentInfo>
                      <AgentStat>
                        {a.total}
                        <span>chats</span>
                      </AgentStat>
                    </AgentRow>
                  )
                })}
              </ChartCard>
            </ChartGrid>
          </>
        )}
      </Body>
    </PageWrap>
  )
}

export default AnalyticsPage
