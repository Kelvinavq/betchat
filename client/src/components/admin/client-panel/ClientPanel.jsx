import { useCallback, useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { useDateFormat } from '../../../hooks/useDateFormat'
import { createPortal } from 'react-dom'
import CloseIcon from '@mui/icons-material/Close'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import DescriptionIcon from '@mui/icons-material/Description'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import RefreshIcon from '@mui/icons-material/Refresh'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlinedIcon from '@mui/icons-material/ErrorOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import TabletAndroidIcon from '@mui/icons-material/TabletAndroid'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import { api, resolveApiAsset } from '../../../utils/api'
import useAuth from '../../../hooks/useAuth'
import ReferralDetailsSection from '../referrals/ReferralDetailsSection'
import SessionGeoCard from '../sessions/SessionGeoCard'
import { useToast } from '../../../context/ToastContext'
import {
  Wrap, PanelHeader, CloseBtn, PanelAvatar, PanelOnlineDot, PanelUsername, PanelStatus,
  TabBar, Tab, ScrollArea,
  InfoCard, InfoCardTitle, FieldRow, FieldLabel, FieldValue, FieldInput, FieldTextarea, EditHint,
  TagsSection, ClientTag, TagCreateRow, TagInput, ColorInput, TagCreateBtn,
  FilterBar, FilterBtn, FilesGrid, FileCard, FileThumb, FileInfo, FileName, FileDate,
  PaginationRow, PageBtn, PageInfo,
  ViewerOverlay, ViewerContent, ViewerFileName, ViewerImg, ViewerEmbed, ViewerActions, ViewerBtn,
  TransferOverlay, TransferCard, TransferHead, TransferHeadCopy, TransferTitle, TransferSub, TransferClose,
  TransferBody, TransferGrid, TransferPanel, TransferPanelTitle, TransferPanelSub, TransferInfoBox, TransferInfoText,
  TransferSummaryList, TransferSummaryRow, TransferSummaryLabel, TransferSummaryValue,
  TransferSearchWrap, TransferSearchInput, TransferSearchResults, TransferSearchItem, TransferSearchMeta,
  TransferSearchName, TransferSearchHint, TransferSearchEmpty, TransferSelectedCard, TransferSelectedMeta,
  TransferSelectedTitle, TransferSelectedSub, TransferSelectedClear, TransferSearchBadge, TransferReason, TransferFooter, TransferStatus,
  TransferActions, TransferActionBtn,
  BalanceWrap, BalanceCard, BalanceCardHead, BalanceCardLabel, BalanceRefreshBtn,
  BalanceMainRow, BalanceCurrencyLabel, BalanceMainAmount,
  BalanceMetricsRow, BalanceMetric, BalanceMetricLabel, BalanceMetricValue,
  AmountSection, AmountSectionLabel, QuickChips, QuickChip, AmountInputRow, AmountSign, AmountInput,
  BalanceActions, BalanceCreditBtn, BalanceDebitBtn, BalanceMsg, TabSpinner,
  ProfileWrap,
  SessionsCard, SessionsHead, SessionsLabel, SessionCountBadge,
  SessionList, SessionItem, SessionDeviceIcon, SessionBody,
  SessionPrimary, SessionSecondary, SessionMeta, SessionChip, SessionTime, SessionEmptyState,
} from './ClientPanel.styles'

const DEFAULT_TAGS = [
  { id: 'default-vip', name: 'VIP', color: '#f59e0b' },
  { id: 'default-frecuente', name: 'Frecuente', color: '#60a5fa' },
  { id: 'default-activo', name: 'Activo', color: '#4ade80' },
  { id: 'default-nuevo', name: 'Nuevo', color: '#a78bfa' },
  { id: 'default-riesgo', name: 'Riesgo', color: '#f87171' },
]

const THUMB_COLORS = [
  'linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%)',
  'linear-gradient(135deg, #1a0050 0%, #7c3aed 100%)',
  'linear-gradient(135deg, #50000a 0%, #e8000d 100%)',
  'linear-gradient(135deg, #004d20 0%, #16a34a 100%)',
]

const FILES_PER_PAGE = 6
const QUICK_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000]

const fmt = (n) => {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const BalanceTab = ({ chatId }) => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState('')
  const [opLoading, setOpLoading] = useState(null)
  const [msg, setMsg] = useState(null)
  const msgTimer = useRef(null)

  const showMsg = (type, text) => {
    setMsg({ type, text })
    clearTimeout(msgTimer.current)
    msgTimer.current = setTimeout(() => setMsg(null), 4000)
  }

  const fetchBalance = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await api.get(`/api/chats/${chatId}/balance`)
      setData(res)
    } catch (err) {
      if (!silent) showMsg('error', err.message || 'No se pudo obtener el saldo.')
    } finally {
      setLoading(false)
    }
  }, [chatId])

  useEffect(() => {
    setData(null)
    setMsg(null)
    setAmount('')
    fetchBalance()
  }, [fetchBalance])

  const handleAction = async (operation) => {
    const num = Number(amount)
    if (!num || num <= 0) { showMsg('error', 'Ingresá un monto válido mayor a 0.'); return }
    setOpLoading(operation)
    try {
      const res = await api.post(`/api/chats/${chatId}/balance`, { amount: num, operation })
      setData(prev => prev ? { ...prev, balance: res.balance ?? prev.balance } : prev)
      setAmount('')
      showMsg('success', res.message || (operation === 'in' ? 'Saldo acreditado.' : 'Saldo debitado.'))
    } catch (err) {
      showMsg('error', err.message || 'No se pudo procesar la operación.')
    } finally {
      setOpLoading(null)
    }
  }

  const busy = opLoading !== null
  const numAmount = Number(amount)

  return (
    <BalanceWrap>
      <BalanceCard>
        <BalanceCardHead>
          <BalanceCardLabel>Saldo disponible</BalanceCardLabel>
          <BalanceRefreshBtn
            type="button"
            $loading={loading}
            onClick={() => fetchBalance()}
            aria-label="Actualizar saldo"
          >
            <RefreshIcon />
          </BalanceRefreshBtn>
        </BalanceCardHead>
        <BalanceMainRow>
          <BalanceCurrencyLabel>ARS</BalanceCurrencyLabel>
          {loading && !data
            ? <BalanceMainAmount $skeleton />
            : <BalanceMainAmount>{fmt(data?.balance)}</BalanceMainAmount>
          }
        </BalanceMainRow>
        <BalanceMetricsRow>
          <BalanceMetric>
            <BalanceMetricLabel>Wager</BalanceMetricLabel>
            {loading && !data
              ? <BalanceMetricValue $skeleton />
              : <BalanceMetricValue>{fmt(data?.wager)}</BalanceMetricValue>
            }
          </BalanceMetric>
          <BalanceMetric>
            <BalanceMetricLabel>Cobrable</BalanceMetricLabel>
            {loading && !data
              ? <BalanceMetricValue $skeleton />
              : <BalanceMetricValue $color="#4ade80">{fmt(data?.withdrawable)}</BalanceMetricValue>
            }
          </BalanceMetric>
        </BalanceMetricsRow>
      </BalanceCard>

      <AmountSection>
        <AmountSectionLabel>Monto</AmountSectionLabel>
        <QuickChips>
          {QUICK_AMOUNTS.map(v => (
            <QuickChip
              key={v}
              type="button"
              $active={numAmount === v}
              onClick={() => setAmount(String(v))}
            >
              {v >= 1000 ? `${v / 1000}k` : v}
            </QuickChip>
          ))}
        </QuickChips>
        <AmountInputRow>
          <AmountSign>$</AmountSign>
          <AmountInput
            type="number"
            min="0"
            step="1"
            placeholder="Monto personalizado"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </AmountInputRow>
        <BalanceActions>
          <BalanceCreditBtn
            type="button"
            disabled={busy || !numAmount || numAmount <= 0}
            onClick={() => handleAction('in')}
          >
            {opLoading === 'in' ? <TabSpinner /> : <AddIcon />}
            Cargar
          </BalanceCreditBtn>
          <BalanceDebitBtn
            type="button"
            disabled={busy || !numAmount || numAmount <= 0}
            onClick={() => handleAction('out')}
          >
            {opLoading === 'out' ? <TabSpinner /> : <RemoveIcon />}
            Retirar
          </BalanceDebitBtn>
        </BalanceActions>
      </AmountSection>

      {msg && (
        <BalanceMsg $type={msg.type}>
          {msg.type === 'success' ? <CheckCircleOutlinedIcon /> : <ErrorOutlinedIcon />}
          {msg.text}
        </BalanceMsg>
      )}
    </BalanceWrap>
  )
}

const DEVICE_ICONS = {
  mobile: <SmartphoneIcon />,
  tablet: <TabletAndroidIcon />,
  desktop: <DesktopWindowsOutlinedIcon />,
}

const relativeTime = (value, tz) => {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return 'ahora mismo'
  if (m < 60) return `hace ${m} min`
  if (h < 24) return `hace ${h}h`
  if (d === 1) return 'ayer'
  if (d < 30) return `hace ${d} días`
  return new Date(value).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit', ...(tz && { timeZone: tz }) })
}

const ProfileTab = ({ chatId }) => {
  const { timezone }                    = useDateFormat()
  const [data, setData]                 = useState(null)
  const [loading, setLoading]           = useState(false)

  useEffect(() => {
    let active = true
    setData(null)
    setLoading(true)
    api.get(`/api/chats/${chatId}/profile`)
      .then(res => { if (active) setData(res) })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [chatId])

  const referralData = data?.referralDetails || null
  const sessions = data?.sessions || []
  const latestSession = sessions[0] || null

  return (
    <ProfileWrap>
      <ReferralDetailsSection data={referralData} loading={loading} compact />

      <SessionGeoCard
        session={latestSession}
        compact
        title="Última ubicación detectada"
      />

      <SessionsCard>
        <SessionsHead>
          <SessionsLabel>Historial de sesiones</SessionsLabel>
          {!loading && <SessionCountBadge>{sessions.length}</SessionCountBadge>}
        </SessionsHead>
        {loading && !data ? (
          <SessionEmptyState>Cargando sesiones...</SessionEmptyState>
        ) : sessions.length === 0 ? (
          <SessionEmptyState>Sin sesiones registradas</SessionEmptyState>
        ) : (
          <SessionList>
            {sessions.map(s => {
              const type = s.deviceType || 'desktop'
              const location = [s.city, s.country].filter(Boolean).join(', ')
              return (
                <SessionItem key={s.id}>
                  <SessionDeviceIcon $type={type}>
                    {DEVICE_ICONS[type] || DEVICE_ICONS.desktop}
                  </SessionDeviceIcon>
                  <SessionBody>
                    <SessionPrimary>
                      {[s.browser, s.os].filter(Boolean).join(' · ') || 'Dispositivo desconocido'}
                    </SessionPrimary>
                    <SessionSecondary>
                      {s.ip || 'IP desconocida'}
                      {location ? ` · ${location}` : ''}
                    </SessionSecondary>
                    <SessionMeta>
                      <SessionChip $type={type}>
                        {type === 'mobile' ? 'Móvil' : type === 'tablet' ? 'Tablet' : 'Desktop'}
                      </SessionChip>
                      {location && (
                        <SessionChip style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.30)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <LocationOnOutlinedIcon style={{ fontSize: 9, verticalAlign: 'middle', marginRight: 2 }} />
                          {location}
                        </SessionChip>
                      )}
                    </SessionMeta>
                  </SessionBody>
                  <SessionTime>{relativeTime(s.createdAt, timezone)}</SessionTime>
                </SessionItem>
              )
            })}
          </SessionList>
        )}
      </SessionsCard>
    </ProfileWrap>
  )
}

// ── PaymentsTab styled components ────────────────────────────────────────────

const SubTabBar = styled.div`
  display: flex;
  gap: 2px;
  padding: 10px 12px 0;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  margin-bottom: 0;
`

const SubTab = styled.button`
  flex: 1;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px 4px 8px;
  font-size: 11px;
  font-weight: 500;
  color: ${({ $active }) => $active ? 'rgba(30,133,255,1)' : 'rgba(255,255,255,0.45)'};
  border-bottom: 2px solid ${({ $active }) => $active ? 'rgba(30,133,255,1)' : 'transparent'};
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  &:hover { color: rgba(255,255,255,0.75); }
`

const PayList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`

const PayItem = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`

const PayItemLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
`

const PayItemMain = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.90);
  white-space: nowrap;
`

const PayItemSub = styled.span`
  font-size: 11px;
  color: rgba(255,255,255,0.45);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
`

const PayItemRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
  flex-shrink: 0;
`

const PayDate = styled.span`
  font-size: 10px;
  color: rgba(255,255,255,0.30);
  white-space: nowrap;
`

const StatusBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 99px;
  letter-spacing: 0.02em;
  ${({ $status }) => {
    const s = String($status || '').toLowerCase()
    if (s === 'paid' || s === 'pagado' || s === 'completed') return css`
      background: rgba(34,197,94,0.15);
      color: #22c55e;
    `
    if (s === 'pending' || s === 'pendiente') return css`
      background: rgba(245,158,11,0.15);
      color: #f59e0b;
    `
    return css`
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.35);
    `
  }}
`

const PayEmpty = styled.div`
  padding: 28px 14px;
  text-align: center;
  font-size: 12px;
  color: rgba(255,255,255,0.30);
`

const PayCountNote = styled.div`
  padding: 6px 14px 10px;
  font-size: 11px;
  color: rgba(255,255,255,0.30);
  text-align: right;
`

const PaySpinnerWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 28px 0;
`

const fmtPesos = (n) => {
  if (n === null || n === undefined) return '—'
  return `$${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const fmtShortDate = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

const PaymentsTab = ({ clientId }) => {
  const [subTab, setSubTab] = useState('caudal-dep')
  const [depData, setDepData]   = useState(null)
  const [retData, setRetData]   = useState(null)
  const [hgData,  setHgData]    = useState(null)
  const [depLoading, setDepLoading] = useState(false)
  const [retLoading, setRetLoading] = useState(false)
  const [hgLoading,  setHgLoading]  = useState(false)

  useEffect(() => {
    if (!clientId) return
    if (subTab === 'caudal-dep' && !depData && !depLoading) {
      setDepLoading(true)
      api.get(`/api/admin/caudal/client/${clientId}/deposits?page=1&pageSize=20`)
        .then(res => setDepData(res))
        .catch(() => setDepData({ items: [], total: 0 }))
        .finally(() => setDepLoading(false))
    }
    if (subTab === 'caudal-ret' && !retData && !retLoading) {
      setRetLoading(true)
      api.get(`/api/admin/caudal/client/${clientId}/withdrawals?page=1&pageSize=20`)
        .then(res => setRetData(res))
        .catch(() => setRetData({ items: [], total: 0 }))
        .finally(() => setRetLoading(false))
    }
    if (subTab === 'hgcash' && !hgData && !hgLoading) {
      setHgLoading(true)
      api.get(`/api/admin/hgcash/client/${clientId}/movements?page=1&pageSize=20`)
        .then(res => setHgData(res))
        .catch(() => setHgData({ items: [], total: 0 }))
        .finally(() => setHgLoading(false))
    }
  }, [subTab, clientId, depData, retData, hgData, depLoading, retLoading, hgLoading])

  if (!clientId) {
    return <PayEmpty>Sin ID de cliente disponible</PayEmpty>
  }

  const renderDeposits = () => {
    if (depLoading) return <PaySpinnerWrap><TabSpinner /></PaySpinnerWrap>
    const items = depData?.items || []
    if (!items.length) return <PayEmpty>Sin registros</PayEmpty>
    return (
      <>
        <PayList>
          {items.map(item => (
            <PayItem key={item.id}>
              <PayItemLeft>
                <PayItemMain>{fmtPesos(item.amount)}</PayItemMain>
                <PayItemSub>{item.from_name || item.from_cuit || '—'}</PayItemSub>
              </PayItemLeft>
              <PayItemRight>
                <StatusBadge $status={item.our_status || 'pending'}>{item.our_status || 'pendiente'}</StatusBadge>
                <PayDate>{fmtShortDate(item.occurred_at)}</PayDate>
              </PayItemRight>
            </PayItem>
          ))}
        </PayList>
        {depData?.total > 20 && <PayCountNote>Mostrando 20 de {depData.total}</PayCountNote>}
      </>
    )
  }

  const renderWithdrawals = () => {
    if (retLoading) return <PaySpinnerWrap><TabSpinner /></PaySpinnerWrap>
    const items = retData?.items || []
    if (!items.length) return <PayEmpty>Sin registros</PayEmpty>
    return (
      <>
        <PayList>
          {items.map(item => (
            <PayItem key={item.id}>
              <PayItemLeft>
                <PayItemMain>{fmtPesos(item.amount)}</PayItemMain>
                <PayItemSub>{item.destination_alias || item.destination_cbu || item.destination_name || '—'}</PayItemSub>
              </PayItemLeft>
              <PayItemRight>
                <StatusBadge $status={item.status}>{item.status || '—'}</StatusBadge>
                <PayDate>{fmtShortDate(item.created_at)}</PayDate>
              </PayItemRight>
            </PayItem>
          ))}
        </PayList>
        {retData?.total > 20 && <PayCountNote>Mostrando 20 de {retData.total}</PayCountNote>}
      </>
    )
  }

  const renderHgCash = () => {
    if (hgLoading) return <PaySpinnerWrap><TabSpinner /></PaySpinnerWrap>
    const items = hgData?.items || []
    if (!items.length) return <PayEmpty>Sin registros</PayEmpty>
    return (
      <>
        <PayList>
          {items.map(item => (
            <PayItem key={item.id}>
              <PayItemLeft>
                <PayItemMain>{fmtPesos(item.amount)}</PayItemMain>
                <PayItemSub>{item.coelsa_id || item.cuit || '—'}</PayItemSub>
              </PayItemLeft>
              <PayItemRight>
                <StatusBadge $status={item.status}>{item.status || '—'}</StatusBadge>
                <PayDate>{fmtShortDate(item.created_at)}</PayDate>
              </PayItemRight>
            </PayItem>
          ))}
        </PayList>
        {hgData?.total > 20 && <PayCountNote>Mostrando 20 de {hgData.total}</PayCountNote>}
      </>
    )
  }

  return (
    <div>
      <SubTabBar>
        <SubTab $active={subTab === 'caudal-dep'} onClick={() => setSubTab('caudal-dep')}>Dep. Caudal</SubTab>
        <SubTab $active={subTab === 'caudal-ret'} onClick={() => setSubTab('caudal-ret')}>Ret. Caudal</SubTab>
        <SubTab $active={subTab === 'hgcash'}     onClick={() => setSubTab('hgcash')}>HG Cash</SubTab>
      </SubTabBar>
      <InfoCard style={{ margin: '10px 10px 0', borderRadius: 8 }}>
        {subTab === 'caudal-dep' && renderDeposits()}
        {subTab === 'caudal-ret' && renderWithdrawals()}
        {subTab === 'hgcash'     && renderHgCash()}
      </InfoCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

const normalizeLabel = (value = '') => String(value).trim().toLowerCase()

const colorAlpha = (hex = '#2563eb', alpha = '22') => {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `#2563eb${alpha}`
  return `${hex}${alpha}`
}

const normalizeFile = (file) => ({
  ...file,
  url: resolveApiAsset(file.url || ''),
})

const buildFallbackDetails = (client) => ({
  chatId: client.id,
  fullName: client.fullName && client.fullName !== client.username ? client.fullName : '',
  cuil: client.cuil || '',
  note: client.note || '',
  registeredAt: client.joinDate || client.createdAt || '',
  labels: client.clientTags || [],
  files: (client.files || []).map(normalizeFile),
})

const formatDateTime = (value, tz) => {
  if (!value) return 'Sin valor'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Sin valor'
  return date.toLocaleString('es', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
    ...(tz && { timeZone: tz }),
  })
}

const EditableField = ({
  label,
  value,
  onChange,
  multiline = false,
  maxLength,
  normalize,
  validate,
}) => {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value || '')
  const [error, setError] = useState('')

  const save = async () => {
    const nextValue = normalize ? normalize(val) : val
    const nextError = validate ? validate(nextValue) : ''
    if (nextError) {
      setVal(nextValue)
      setError(nextError)
      return
    }

    setError('')
    setVal(nextValue)
    const saved = await onChange(nextValue)
    if (saved !== false) setEditing(false)
  }

  const handleChange = (event) => {
    const nextValue = normalize ? normalize(event.target.value) : event.target.value
    setVal(nextValue)
    if (error) setError('')
  }

  if (editing) {
    return (
      <FieldRow $editable>
        <FieldLabel>{label}</FieldLabel>
        {multiline ? (
          <FieldTextarea
            value={val}
            rows={5}
            maxLength={maxLength}
            onChange={handleChange}
            onBlur={save}
            autoFocus
          />
        ) : (
          <FieldInput
            value={val}
            maxLength={maxLength}
            onChange={handleChange}
            onBlur={save}
            onKeyDown={e => e.key === 'Enter' && save()}
            autoFocus
          />
        )}
        {error && <EditHint $error>{error}</EditHint>}
      </FieldRow>
    )
  }

  return (
    <FieldRow $editable onClick={() => { setVal(value || ''); setError(''); setEditing(true) }}>
      <FieldLabel>{label}</FieldLabel>
      <FieldValue $empty={!value}>{value || 'Sin valor - clic para editar'}</FieldValue>
      <EditHint>editar</EditHint>
    </FieldRow>
  )
}

const FileViewer = ({ data, onClose }) => {
  const handleDownload = () => {
    if (!data.url) return
    const a = document.createElement('a')
    a.href = data.url
    a.download = data.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <ViewerOverlay onClick={onClose}>
      <ViewerContent onClick={e => e.stopPropagation()}>
        <ViewerFileName>{data.name}</ViewerFileName>
        {data.type === 'image'
          ? data.url
            ? <ViewerImg src={data.url} alt={data.name} />
            : <div style={{ color: 'rgba(255,255,255,0.30)', fontSize: 14 }}>Vista previa no disponible</div>
          : <ViewerEmbed src={data.url} title={data.name} />
        }
        <ViewerActions>
          <ViewerBtn type="button" $download onClick={handleDownload}><FileDownloadIcon />Descargar</ViewerBtn>
          <ViewerBtn type="button" onClick={onClose}><CloseIcon />Cerrar</ViewerBtn>
        </ViewerActions>
      </ViewerContent>
    </ViewerOverlay>
  )
}

const TransferModal = ({ client, details, onClose }) => {
  const { user } = useAuth()
  const toast = useToast()
  const { timezone } = useDateFormat()
  const [sourceDetail, setSourceDetail] = useState(null)
  const [loadingSource, setLoadingSource] = useState(true)
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const canTransfer = Boolean(user?.role === 'superadmin' || user?.canTransferClientData)
  const searchQuery = search.trim()

  useEffect(() => {
    let active = true
    if (!canTransfer) {
      setLoadingSource(false)
      setSourceDetail(null)
      return () => { active = false }
    }

    setLoadingSource(true)
    setSourceDetail(null)

    api.get(`/api/clients/${client.id}/detail`)
      .then((payload) => {
        if (!active) return
        setSourceDetail(payload?.client ? payload : null)
      })
      .catch(() => {
        if (!active) return
        setSourceDetail(null)
      })
      .finally(() => {
        if (active) setLoadingSource(false)
      })

    return () => { active = false }
  }, [client.id, canTransfer])

  useEffect(() => {
    let active = true
    if (!canTransfer) {
      setResults([])
      setSearching(false)
      return () => { active = false }
    }

    const timer = setTimeout(async () => {
      const query = searchQuery
      setStatusMsg('')
      if (query.length < 2) {
        setResults([])
        setSearching(false)
        return
      }

      setSearching(true)
      try {
        const payload = await api.get(`/api/clients?search=${encodeURIComponent(query)}&status=active&page=1&limit=6`)
        if (!active) return
        const filtered = (payload.clients || []).filter(item => Number(item.id) !== Number(client.id))
        setResults(filtered)
        if (selectedTarget && !filtered.some(item => Number(item.id) === Number(selectedTarget.id))) {
          setSelectedTarget(null)
        }
      } catch (error) {
        if (active) {
          setResults([])
          setStatusMsg(error.message || 'No se pudo buscar clientes destino.')
        }
      } finally {
        if (active) setSearching(false)
      }
    }, 220)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [client.id, searchQuery, selectedTarget, canTransfer])

  const detail = sourceDetail?.client || details || {}
  const withdrawals = sourceDetail?.withdrawals || []
  const sessions = sourceDetail?.sessions || []
  const cbus = sourceDetail?.cbus || []
  const adjustments = sourceDetail?.adjustments || []

  const formatDate = (value) => formatDateTime(value, timezone)

  const handleTransfer = async () => {
    if (!selectedTarget?.id) {
      setStatusMsg('Elegí el cliente destino.')
      return
    }
    if (!reason.trim()) {
      setStatusMsg('El motivo administrativo es obligatorio.')
      return
    }

    setSubmitting(true)
    setStatusMsg('')
    try {
      const payload = await api.post(`/api/clients/${client.id}/transfer`, {
        targetClientId: selectedTarget.id,
        reason: reason.trim(),
      })
      toast.success(payload.message || 'Datos transferidos correctamente.')
      onClose()
    } catch (error) {
      toast.error(error.message || 'No se pudo completar la transferencia.')
      setStatusMsg(error.message || 'No se pudo completar la transferencia.')
    } finally {
      setSubmitting(false)
    }
  }

  const sourceLabel = detail.fullName || detail.username || client.username
  const sourceCuil = detail.cuil || client.cuil || 'Sin CUIL'
  const sourceCbu = detail.cbuCvu || 'Sin CBU/CVU'
  const transferStatusText = statusMsg
    || (selectedTarget
      ? (reason.trim() ? `Destino seleccionado: ${selectedTarget.username}` : 'Falta completar el motivo administrativo.')
      : 'Elegí un destino para continuar.')

  return createPortal(
    <TransferOverlay onClick={onClose}>
      <TransferCard onClick={event => event.stopPropagation()}>
        <TransferHead>
          <TransferHeadCopy>
            <TransferTitle>Transferir datos de cliente</TransferTitle>
            <TransferSub>
              Movemos retiros, sesiones, CBUs, chats y otras trazas al cliente destino.
              El cliente origen quedará inactivo con auditoría de la operación.
            </TransferSub>
          </TransferHeadCopy>
          <TransferClose type="button" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </TransferClose>
        </TransferHead>

        <TransferBody>
          <TransferInfoBox>
            <TransferInfoText>
              Esta acción está pensada para unir duplicados o corregir cuentas vinculadas al mismo jugador.
              Revisá bien el destino antes de confirmar, porque el cambio queda registrado en auditoría.
            </TransferInfoText>
          </TransferInfoBox>

          <TransferGrid>
            <TransferPanel>
              <TransferPanelTitle>Cliente origen</TransferPanelTitle>
              <TransferPanelSub>
                {loadingSource ? 'Cargando detalle del origen...' : 'Resumen del cliente que se va a transferir'}
              </TransferPanelSub>

              <TransferSummaryList>
                <TransferSummaryRow>
                  <TransferSummaryLabel>Usuario</TransferSummaryLabel>
                  <TransferSummaryValue>{detail.username || client.username}</TransferSummaryValue>
                </TransferSummaryRow>
                <TransferSummaryRow>
                  <TransferSummaryLabel>Nombre</TransferSummaryLabel>
                  <TransferSummaryValue>{sourceLabel}</TransferSummaryValue>
                </TransferSummaryRow>
                <TransferSummaryRow>
                  <TransferSummaryLabel>CUIL</TransferSummaryLabel>
                  <TransferSummaryValue>{sourceCuil}</TransferSummaryValue>
                </TransferSummaryRow>
                <TransferSummaryRow>
                  <TransferSummaryLabel>CBU/CVU</TransferSummaryLabel>
                  <TransferSummaryValue>{sourceCbu}</TransferSummaryValue>
                </TransferSummaryRow>
                <TransferSummaryRow>
                  <TransferSummaryLabel>Retiros</TransferSummaryLabel>
                  <TransferSummaryValue>{sourceDetail?.withdrawalCount ?? withdrawals.length}</TransferSummaryValue>
                </TransferSummaryRow>
                <TransferSummaryRow>
                  <TransferSummaryLabel>Pendientes</TransferSummaryLabel>
                  <TransferSummaryValue>{sourceDetail?.pendingWithdrawalCount ?? withdrawals.filter(w => w.status === 'pending').length}</TransferSummaryValue>
                </TransferSummaryRow>
                <TransferSummaryRow>
                  <TransferSummaryLabel>Sesiones</TransferSummaryLabel>
                  <TransferSummaryValue>{sourceDetail?.sessionCount ?? sessions.length}</TransferSummaryValue>
                </TransferSummaryRow>
                <TransferSummaryRow>
                  <TransferSummaryLabel>CBUs</TransferSummaryLabel>
                  <TransferSummaryValue>{sourceDetail?.cbuCount ?? cbus.length}</TransferSummaryValue>
                </TransferSummaryRow>
                <TransferSummaryRow>
                  <TransferSummaryLabel>Ajustes</TransferSummaryLabel>
                  <TransferSummaryValue>{sourceDetail?.balanceAdjustmentCount ?? adjustments.length}</TransferSummaryValue>
                </TransferSummaryRow>
              </TransferSummaryList>
            </TransferPanel>

            <TransferPanel>
              <TransferPanelTitle>Destino</TransferPanelTitle>
              <TransferPanelSub>
                Buscá el cliente que recibirá los datos transferidos. La búsqueda arranca desde 2 caracteres.
              </TransferPanelSub>

              <TransferSearchWrap>
                <TransferSearchInput
                  value={search}
                  onChange={event => {
                    const next = event.target.value
                    setSearch(next)
                    if (selectedTarget && next.trim().toLowerCase() !== String(selectedTarget.username || '').toLowerCase()) {
                      setSelectedTarget(null)
                    }
                  }}
                  placeholder="Buscar por usuario, CUIL o ID externo..."
                />

                {selectedTarget && (
                  <TransferSelectedCard>
                    <TransferSelectedMeta>
                      <TransferSelectedTitle>{selectedTarget.username}</TransferSelectedTitle>
                      <TransferSelectedSub>
                        {[selectedTarget.fullName || '', selectedTarget.cuil || '', selectedTarget.externalId || '']
                          .filter(Boolean)
                          .join(' · ') || 'Destino seleccionado'}
                      </TransferSelectedSub>
                    </TransferSelectedMeta>
                    <TransferSelectedClear
                      type="button"
                      onClick={() => {
                        setSelectedTarget(null)
                        setStatusMsg('')
                      }}
                    >
                      Cambiar
                    </TransferSelectedClear>
                  </TransferSelectedCard>
                )}

                <TransferSearchResults>
                  {searching && (
                    <TransferPanelSub>Cargando resultados...</TransferPanelSub>
                  )}
                  {!searching && searchQuery.length < 2 && (
                    <TransferSearchEmpty>
                      Escribí al menos 2 caracteres para buscar por usuario, CUIL o ID externo.
                    </TransferSearchEmpty>
                  )}
                  {!searching && searchQuery.length >= 2 && results.length === 0 && (
                    <TransferSearchEmpty>
                      No encontramos clientes activos con ese criterio.
                    </TransferSearchEmpty>
                  )}
                  {!searching && results.map(item => {
                    const isActive = selectedTarget?.id === item.id
                    return (
                      <TransferSearchItem
                        key={item.id}
                        type="button"
                        $active={isActive}
                        onClick={() => {
                          setSelectedTarget(item)
                          setSearch(item.username || '')
                          setResults([])
                          setStatusMsg('')
                        }}
                      >
                        <TransferSearchMeta>
                          <TransferSearchName>{item.username}</TransferSearchName>
                          <TransferSearchHint>
                            {[item.fullName || '', item.cuil || item.externalId || ''].filter(Boolean).join(' · ') || 'Sin datos extra'}
                          </TransferSearchHint>
                        </TransferSearchMeta>
                        <TransferSearchBadge>{item.active ? 'Activo' : 'Inactivo'}</TransferSearchBadge>
                      </TransferSearchItem>
                    )
                  })}
                </TransferSearchResults>

                <div>
                  <TransferPanelTitle>Motivo administrativo</TransferPanelTitle>
                  <TransferReason
                    value={reason}
                    onChange={event => setReason(event.target.value)}
                    placeholder="Ej: cuenta duplicada, se unificaron CBUs y retiros..."
                  />
                </div>
              </TransferSearchWrap>
            </TransferPanel>
          </TransferGrid>

          {(withdrawals.length > 0 || sessions.length > 0 || cbus.length > 0) && (
            <TransferPanel>
              <TransferPanelTitle>Vista previa del historial</TransferPanelTitle>
              <TransferPanelSub>
                Revisá los registros principales que van a acompañar la transferencia.
              </TransferPanelSub>
              <TransferSummaryList>
                {withdrawals.slice(0, 3).map(item => (
                  <TransferSummaryRow key={`wd-${item.id}`}>
                    <TransferSummaryLabel>Retiro #{item.id}</TransferSummaryLabel>
                    <TransferSummaryValue>
                      {item.status} · {item.amount ?? '0'}
                    </TransferSummaryValue>
                  </TransferSummaryRow>
                ))}
                {cbus.slice(0, 3).map(item => (
                  <TransferSummaryRow key={`cbu-${item.id}`}>
                    <TransferSummaryLabel>{item.label || 'CBU/CVU'}</TransferSummaryLabel>
                    <TransferSummaryValue>{item.cbu}</TransferSummaryValue>
                  </TransferSummaryRow>
                ))}
                {sessions.slice(0, 2).map(item => (
                  <TransferSummaryRow key={`ses-${item.id}`}>
                    <TransferSummaryLabel>{item.deviceType || 'SesiÃ³n'}</TransferSummaryLabel>
                    <TransferSummaryValue>{formatDate(item.createdAt)}</TransferSummaryValue>
                  </TransferSummaryRow>
                ))}
              </TransferSummaryList>
            </TransferPanel>
          )}
        </TransferBody>

        <TransferFooter>
          <TransferStatus $error={Boolean(statusMsg)}>
            {transferStatusText}
          </TransferStatus>
          <TransferActions>
            <TransferActionBtn type="button" onClick={onClose} disabled={submitting}>
              Cancelar
            </TransferActionBtn>
            <TransferActionBtn
              type="button"
              $v="primary"
              disabled={submitting || !canTransfer || !selectedTarget?.id || !reason.trim()}
              onClick={handleTransfer}
            >
              {submitting ? <TabSpinner /> : <SwapHorizIcon />}
              Transferir
            </TransferActionBtn>
          </TransferActions>
        </TransferFooter>
      </TransferCard>
    </TransferOverlay>,
    document.body
  )
}

const SecurityListsTab = ({ clientId }) => {
  const toast = useToast()
  const toastRef = useRef(toast)
  const [whitelist, setWhitelist] = useState([])
  const [blacklist, setBlacklist] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [cbu, setCbu] = useState('')
  const [cbuLabel, setCbuLabel] = useState('')
  const [blackType, setBlackType] = useState('cbu')
  const [blackValue, setBlackValue] = useState('')
  const [blackReason, setBlackReason] = useState('')

  useEffect(() => { toastRef.current = toast }, [toast])

  const loadLists = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const [whiteData, blackData] = await Promise.all([
        api.get(`/api/chats/client-cbu/${clientId}`),
        api.get('/api/withdrawals/blacklist'),
      ])
      setWhitelist(whiteData.entries || [])
      setBlacklist(blackData.blacklist || [])
    } catch (error) {
      toastRef.current.error(error.message || 'No se pudieron cargar las listas de seguridad.')
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => { loadLists() }, [loadLists])

  const resetWhitelistForm = () => {
    setEditingId(null)
    setCbu('')
    setCbuLabel('')
  }

  const saveWhitelist = async () => {
    const normalized = cbu.replace(/\D/g, '')
    if (normalized.length !== 22) return toast.error('El CBU/CVU debe tener 22 dígitos.')
    setSaving(true)
    try {
      if (editingId) {
        await api.put(`/api/chats/client-cbu/${clientId}/${editingId}`, { cbu: normalized, label: cbuLabel.trim() || null })
        toast.success('CBU/CVU actualizado.')
      } else {
        await api.post(`/api/chats/client-cbu/${clientId}`, { cbu: normalized, label: cbuLabel.trim() || null })
        toast.success('CBU/CVU agregado a la whitelist.')
      }
      resetWhitelistForm()
      await loadLists()
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el CBU/CVU.')
    } finally { setSaving(false) }
  }

  const removeWhitelist = async (entry) => {
    if (!window.confirm(`¿Quitar ${entry.cbu} de la whitelist?`)) return
    try {
      await api.delete(`/api/chats/client-cbu/${clientId}/${entry.id}`)
      if (editingId === entry.id) resetWhitelistForm()
      setWhitelist(prev => prev.filter(item => item.id !== entry.id))
      toast.success('CBU/CVU quitado de la whitelist.')
    } catch (error) { toast.error(error.message || 'No se pudo quitar el CBU/CVU.') }
  }

  const addBlacklist = async () => {
    const normalized = blackValue.replace(/\D/g, '')
    const expected = blackType === 'cbu' ? 22 : blackType === 'cuit' ? 11 : 8
    if (normalized.length !== expected) return toast.error(`El valor debe tener ${expected} dígitos.`)
    setSaving(true)
    try {
      await api.post('/api/withdrawals/blacklist', { type: blackType, value: normalized, reason: blackReason.trim() || null })
      setBlackValue('')
      setBlackReason('')
      toast.success('Valor agregado a la blacklist global.')
      await loadLists()
    } catch (error) { toast.error(error.message || 'No se pudo agregar a la blacklist.') }
    finally { setSaving(false) }
  }

  const removeBlacklist = async (entry) => {
    if (!window.confirm(`¿Quitar ${entry.value} de la blacklist global?`)) return
    try {
      await api.delete(`/api/withdrawals/blacklist/${entry.id}`)
      setBlacklist(prev => prev.filter(item => item.id !== entry.id))
      toast.success('Valor quitado de la blacklist.')
    } catch (error) { toast.error(error.message || 'No se pudo quitar de la blacklist.') }
  }

  if (!clientId) return <ListEmpty>No se pudo identificar al cliente.</ListEmpty>
  if (loading) return <ListEmpty><TabSpinner /> Cargando listas...</ListEmpty>

  return (
    <ListsWrap>
      <InfoCard>
        <InfoCardTitle>Whitelist de CBU/CVU</InfoCardTitle>
        <ListHint>Destinos habilitados para los retiros de este cliente. Las altas y bajas quedan auditadas.</ListHint>
        <ListForm>
          <ListInput
            value={cbu}
            inputMode="numeric"
            maxLength={22}
            placeholder="CBU/CVU · 22 dígitos"
            onChange={event => setCbu(event.target.value.replace(/\D/g, '').slice(0, 22))}
          />
          <ListInput value={cbuLabel} maxLength={120} placeholder="Etiqueta opcional" onChange={event => setCbuLabel(event.target.value)} />
          <ListFormActions>
            {editingId && <ListSecondaryBtn type="button" onClick={resetWhitelistForm}>Cancelar</ListSecondaryBtn>}
            <ListPrimaryBtn type="button" disabled={saving || cbu.length !== 22} onClick={saveWhitelist}>
              {saving ? <TabSpinner /> : editingId ? 'Guardar' : <><AddIcon /> Agregar</>}
            </ListPrimaryBtn>
          </ListFormActions>
        </ListForm>
        <ListRows>
          {whitelist.length === 0 && <ListEmpty>Sin CBU/CVU permitidos.</ListEmpty>}
          {whitelist.map(entry => (
            <ListRow key={entry.id}>
              <ListStatus $bad={false}><CheckCircleOutlinedIcon /></ListStatus>
              <ListBody>
                <ListValue>{entry.cbu}</ListValue>
                <ListMeta>{entry.label || 'Sin etiqueta'} · {entry.source || 'manual'}</ListMeta>
              </ListBody>
              <ListIconBtn type="button" title="Editar" onClick={() => { setEditingId(entry.id); setCbu(entry.cbu); setCbuLabel(entry.label || '') }}>
                <DescriptionIcon />
              </ListIconBtn>
              <ListIconBtn type="button" $danger title="Quitar" onClick={() => removeWhitelist(entry)}><RemoveIcon /></ListIconBtn>
            </ListRow>
          ))}
        </ListRows>
      </InfoCard>

      <InfoCard>
        <InfoCardTitle>Blacklist global</InfoCardTitle>
        <ListHint>Bloquea CBU/CVU, CUIT/CUIL o DNI en cualquier solicitud de retiro.</ListHint>
        <ListForm>
          <ListSelect value={blackType} onChange={event => { setBlackType(event.target.value); setBlackValue('') }}>
            <option value="cbu">CBU / CVU</option>
            <option value="cuit">CUIT / CUIL</option>
            <option value="dni">DNI</option>
          </ListSelect>
          <ListInput
            value={blackValue}
            inputMode="numeric"
            maxLength={blackType === 'cbu' ? 22 : blackType === 'cuit' ? 11 : 8}
            placeholder={blackType === 'cbu' ? '22 dígitos' : blackType === 'cuit' ? '11 dígitos' : '8 dígitos'}
            onChange={event => setBlackValue(event.target.value.replace(/\D/g, '').slice(0, blackType === 'cbu' ? 22 : blackType === 'cuit' ? 11 : 8))}
          />
          <ListInput value={blackReason} maxLength={240} placeholder="Motivo" onChange={event => setBlackReason(event.target.value)} />
          <ListPrimaryBtn type="button" disabled={saving || !blackValue} onClick={addBlacklist}>
            {saving ? <TabSpinner /> : <><ErrorOutlinedIcon /> Bloquear</>}
          </ListPrimaryBtn>
        </ListForm>
        <ListRows>
          {blacklist.length === 0 && <ListEmpty>La blacklist global está vacía.</ListEmpty>}
          {blacklist.map(entry => (
            <ListRow key={entry.id}>
              <ListStatus $bad><ErrorOutlinedIcon /></ListStatus>
              <ListBody>
                <ListValue>{entry.value}</ListValue>
                <ListMeta>{String(entry.type || '').toUpperCase()} · {entry.reason || 'Sin motivo'} · {entry.created_by || 'Admin'}</ListMeta>
              </ListBody>
              <ListIconBtn type="button" $danger title="Quitar" onClick={() => removeBlacklist(entry)}><RemoveIcon /></ListIconBtn>
            </ListRow>
          ))}
        </ListRows>
      </InfoCard>
    </ListsWrap>
  )
}

const ClientPanel = ({ client, onClose, $width, $fullWidth }) => {
  const { timezone } = useDateFormat()
  const toast = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState('info')
  const [fileFilter, setFileFilter] = useState('all')
  const [filePage, setFilePage] = useState(1)
  const [viewerData, setViewerData] = useState(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [labelOptions, setLabelOptions] = useState(DEFAULT_TAGS)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#60a5fa')
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [loadedDetails, setLoadedDetails] = useState(() => buildFallbackDetails(client))
  const tabBarRef = useRef(null)
  const fallbackDetails = buildFallbackDetails(client)
  const details = loadedDetails.chatId === client.id ? loadedDetails : fallbackDetails

  useEffect(() => {
    let active = true

    const loadClientDetails = async () => {
      try {
        const fallback = buildFallbackDetails(client)
        const payload = await api.get(`/api/chats/${client.id}/client`)
        if (!active) return
        const loaded = payload.client || {}
        setLoadedDetails({
          chatId: client.id,
          clientId: loaded.id || null,
          fullName: loaded.fullName ?? fallback.fullName,
          cuil: loaded.cuil || '',
          note: loaded.note || '',
          registeredAt: loaded.registeredAt || fallback.registeredAt,
          labels: loaded.labels || [],
          files: (loaded.files || []).map(normalizeFile),
        })
      } catch (error) {
        console.error('No se pudo cargar la informacion del cliente', error)
      }
    }

    loadClientDetails()
    return () => { active = false }
  }, [client])

  useEffect(() => {
    let active = true
    const loadLabels = async () => {
      try {
        const data = await api.get('/api/chats/labels')
        if (!active) return
        const loaded = data.labels || []
        setLabelOptions(loaded.length ? loaded : DEFAULT_TAGS)
      } catch {
        if (active) setLabelOptions(DEFAULT_TAGS)
      }
    }
    loadLabels()
    return () => { active = false }
  }, [])

  const saveDetails = async (patch) => {
    const previous = details
    const next = { ...details, ...patch }
    setLoadedDetails(next)
    setSaving(true)

    try {
      await api.put(`/api/chats/${client.id}/client`, {
        fullName: next.fullName,
        cuil: next.cuil,
        note: next.note,
      })
      return true
    } catch (error) {
      setLoadedDetails(previous)
      toast.error(error.message || 'No se pudo guardar la informacion del cliente')
      return false
    } finally {
      setSaving(false)
    }
  }

  const toggleTag = (tag) => {
    const selectedTag = tag?.name ? tag : null
    if (!selectedTag) return

    const previousLabels = details.labels || []
    const isActive = previousLabels.some(label => normalizeLabel(label.name || label) === normalizeLabel(selectedTag.name))
    const nextLabels = isActive
      ? previousLabels.filter(label => normalizeLabel(label.name || label) !== normalizeLabel(selectedTag.name))
      : [...previousLabels, { name: selectedTag.name, color: selectedTag.color }]

    setLoadedDetails(prev => ({ ...(prev.chatId === client.id ? prev : details), labels: nextLabels }))
    api.put(`/api/chats/${client.id}/client/labels`, { labels: nextLabels })
      .then((payload) => {
        if (payload.labels) setLoadedDetails(prev => ({ ...(prev.chatId === client.id ? prev : details), labels: payload.labels }))
      })
      .catch((error) => {
        setLoadedDetails(prev => ({ ...(prev.chatId === client.id ? prev : details), labels: previousLabels }))
        toast.error(error.message || 'No se pudieron guardar las etiquetas')
      })
  }

  const createAndAssignLabel = async () => {
    const name = newLabelName.trim()
    if (!name || creatingLabel) return
    setCreatingLabel(true)
    try {
    const payload = await api.post('/api/chats/labels', { name, color: newLabelColor })
      const label = payload.label || { name, color: newLabelColor }
      setLabelOptions(prev => {
        const without = prev.filter(item => normalizeLabel(item.name) !== normalizeLabel(label.name))
        return [...without, label].sort((a, b) => String(a.name).localeCompare(String(b.name)))
      })
      setNewLabelName('')
      if (!activeTags.has(normalizeLabel(label.name))) toggleTag(label)
    } catch (error) {
      toast.error(error.message || 'No se pudo crear la etiqueta')
    } finally {
      setCreatingLabel(false)
    }
  }

  const files = details.files || []
  const filteredFiles = fileFilter === 'all'
    ? files
    : files.filter(f => f.type === fileFilter)

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / FILES_PER_PAGE))
  const effectiveFilePage = Math.min(filePage, totalPages)
  const pageFiles = filteredFiles.slice((effectiveFilePage - 1) * FILES_PER_PAGE, effectiveFilePage * FILES_PER_PAGE)
  const activeTags = new Set((details.labels || []).map(label => normalizeLabel(label.name || label)))

  const openFile = (file) => setViewerData({ type: file.type, url: file.url || null, name: file.name })

  useEffect(() => {
    const activeTab = tabBarRef.current?.querySelector('[aria-selected="true"]')
    activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [tab])

  const handleTabWheel = (event) => {
    const tabBar = event.currentTarget
    if (tabBar.scrollWidth <= tabBar.clientWidth || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return
    tabBar.scrollLeft += event.deltaY
    event.preventDefault()
  }

  return (
    <Wrap $width={$width} $fullWidth={$fullWidth}>
      {viewerData && createPortal(
        <FileViewer data={viewerData} onClose={() => setViewerData(null)} />,
        document.body
      )}

      <PanelHeader>
        <CloseBtn onClick={onClose} aria-label="Cerrar panel"><CloseIcon /></CloseBtn>
        <PanelAvatar>
          {client.username[0].toUpperCase()}
          <PanelOnlineDot $online={client.online} />
        </PanelAvatar>
        <PanelUsername>{client.username}</PanelUsername>
        <PanelStatus $online={client.online}>
          {client.online ? 'En linea' : 'Desconectado'}
        </PanelStatus>
      </PanelHeader>

      <TabBar ref={tabBarRef} role="tablist" aria-label="Información del cliente" onWheel={handleTabWheel}>
        <Tab type="button" role="tab" aria-selected={tab === 'info'} $active={tab === 'info'} onClick={() => setTab('info')}>
          <InfoOutlinedIcon /><span className="tab-label">Info</span>
        </Tab>
        <Tab type="button" role="tab" aria-selected={tab === 'files'} $active={tab === 'files'} onClick={() => setTab('files')}>
          <FolderOutlinedIcon /><span className="tab-label">Archivos</span>
        </Tab>
        <Tab type="button" role="tab" aria-selected={tab === 'balance'} $active={tab === 'balance'} onClick={() => setTab('balance')}>
          <AccountBalanceWalletOutlinedIcon /><span className="tab-label">Saldo</span>
        </Tab>
        <Tab type="button" role="tab" aria-selected={tab === 'profile'} $active={tab === 'profile'} onClick={() => setTab('profile')}>
          <PersonOutlinedIcon /><span className="tab-label">Perfil</span>
        </Tab>
        <Tab type="button" role="tab" aria-selected={tab === 'pagos'} $active={tab === 'pagos'} onClick={() => setTab('pagos')}>
          <PaymentsOutlinedIcon /><span className="tab-label">Pagos</span>
        </Tab>
        <Tab type="button" role="tab" aria-selected={tab === 'listas'} $active={tab === 'listas'} onClick={() => setTab('listas')}>
          <CheckCircleOutlinedIcon /><span className="tab-label">Listas</span>
        </Tab>
      </TabBar>

      <ScrollArea>
        {tab === 'info' && (
          <>
            <InfoCard>
              <InfoCardTitle>Datos de cuenta</InfoCardTitle>
              <FieldRow>
                <FieldLabel>Fecha de registro</FieldLabel>
                <FieldValue>{formatDateTime(details.registeredAt, timezone)}</FieldValue>
              </FieldRow>
              <EditableField
                label="CUIT / CUIL"
                value={details.cuil}
                normalize={value => String(value || '').replace(/\D/g, '').slice(0, 11)}
                validate={value => value && value.length !== 11 ? 'Debe tener exactamente 11 digitos o quedar vacio.' : ''}
                onChange={value => saveDetails({ cuil: value })}
              />
              <EditableField
                label="Nombre del titular"
                value={details.fullName}
                maxLength={50}
                validate={value => value.length > 50 ? 'Maximo 50 caracteres.' : ''}
                onChange={value => saveDetails({ fullName: value })}
              />
            </InfoCard>

            <InfoCard>
              <InfoCardTitle>Nota</InfoCardTitle>
              <EditableField
                label="Nota interna"
                value={details.note}
                maxLength={5000}
                onChange={value => saveDetails({ note: value })}
                multiline
              />
              {saving && <EditHint style={{ display: 'block', padding: '0 14px 10px' }}>Guardando...</EditHint>}
            </InfoCard>

            {(user?.role === 'superadmin' || user?.canTransferClientData) && (
              <InfoCard>
                <InfoCardTitle>Transferencia</InfoCardTitle>
                <div style={{ padding: '12px 14px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                  <FieldValue style={{ flex: 1, minWidth: 0 }}>
                    Mover retiros, sesiones, CBUs y chats a otro cliente. La operación deja auditoría.
                  </FieldValue>
                  <TransferActionBtn type="button" $v="primary" onClick={() => setTransferOpen(true)}>
                    <SwapHorizIcon />
                    Transferir
                  </TransferActionBtn>
                </div>
              </InfoCard>
            )}

            <InfoCard>
              <InfoCardTitle>Etiquetas</InfoCardTitle>
              <TagsSection>
                {labelOptions.map(tag => (
                  <ClientTag
                    key={tag.id}
                    type="button"
                    $active={activeTags.has(normalizeLabel(tag.name))}
                    $bg={colorAlpha(tag.color)}
                    $color={tag.color || '#2563eb'}
                    $border={colorAlpha(tag.color, '55')}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag.name}
                  </ClientTag>
                ))}
              </TagsSection>
              <TagCreateRow>
                <TagInput
                  value={newLabelName}
                  maxLength={80}
                  placeholder="Nueva etiqueta"
                  onChange={event => setNewLabelName(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter') createAndAssignLabel()
                  }}
                />
                <ColorInput
                  type="color"
                  value={newLabelColor}
                  aria-label="Color de etiqueta"
                  onChange={event => setNewLabelColor(event.target.value)}
                />
                <TagCreateBtn
                  type="button"
                  disabled={!newLabelName.trim() || creatingLabel}
                  onClick={createAndAssignLabel}
                >
                  {creatingLabel ? '...' : 'Crear'}
                </TagCreateBtn>
              </TagCreateRow>
            </InfoCard>
          </>
        )}

        {tab === 'balance' && (
          <BalanceTab chatId={client.id} />
        )}

        {tab === 'profile' && (
          <ProfileTab chatId={client.id} />
        )}

        {tab === 'pagos' && (
          <PaymentsTab clientId={details.clientId} />
        )}

        {tab === 'listas' && (
          <SecurityListsTab clientId={details.clientId} />
        )}

        {tab === 'files' && (
          <>
            <FilterBar>
              <FilterBtn $active={fileFilter === 'all'} type="button" onClick={() => { setFileFilter('all'); setFilePage(1) }}>Todos</FilterBtn>
              <FilterBtn $active={fileFilter === 'image'} type="button" onClick={() => { setFileFilter('image'); setFilePage(1) }}>Imagenes</FilterBtn>
              <FilterBtn $active={fileFilter === 'pdf'} type="button" onClick={() => { setFileFilter('pdf'); setFilePage(1) }}>Docs</FilterBtn>
            </FilterBar>

            {pageFiles.length === 0 ? (
              <FieldValue $empty style={{ textAlign: 'center', padding: '20px 0' }}>
                Sin archivos
              </FieldValue>
            ) : (
              <FilesGrid>
                {pageFiles.map(file => (
                  <FileCard key={file.id} type="button" onClick={() => openFile(file)}>
                    <FileThumb $bg={THUMB_COLORS[Number(file.id || 0) % THUMB_COLORS.length]}>
                      {file.type === 'image'
                        ? file.url ? <img src={file.url} alt={file.name} /> : 'IMG'
                        : <DescriptionIcon style={{ fontSize: 32, color: 'rgba(255,255,255,0.55)' }} />
                      }
                    </FileThumb>
                    <FileInfo>
                      <FileName>{file.name}</FileName>
                      <FileDate>{formatDateTime(file.date, timezone)}</FileDate>
                    </FileInfo>
                  </FileCard>
                ))}
              </FilesGrid>
            )}

            {filteredFiles.length > FILES_PER_PAGE && (
              <PaginationRow>
                <PageBtn
                  type="button"
                  onClick={() => setFilePage(p => p - 1)}
                  disabled={effectiveFilePage === 1}
                >
                  <ChevronLeftIcon style={{ fontSize: 18 }} />
                </PageBtn>
                <PageInfo>{effectiveFilePage} / {totalPages}</PageInfo>
                <PageBtn
                  type="button"
                  onClick={() => setFilePage(p => p + 1)}
                  disabled={effectiveFilePage === totalPages}
                >
                  <ChevronRightIcon style={{ fontSize: 18 }} />
                </PageBtn>
              </PaginationRow>
            )}
          </>
        )}
      </ScrollArea>

      {transferOpen && (
        <TransferModal
          client={client}
          details={details}
          onClose={() => setTransferOpen(false)}
        />
      )}
    </Wrap>
  )
}

const ListsWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`
const ListHint = styled.p`
  margin: 0;
  padding: 11px 14px 0;
  color: rgba(255,255,255,.48);
  font-size: 12px;
  line-height: 1.45;
`
const ListForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
`
const listControlCss = css`
  width: 100%;
  min-height: 38px;
  border: 1px solid rgba(255,255,255,.1);
  border-radius: 9px;
  background: rgba(255,255,255,.045);
  color: #fff;
  padding: 0 11px;
  font: inherit;
  font-size: 13px;
  outline: none;
  &:focus { border-color: rgba(96,165,250,.7); box-shadow: 0 0 0 2px rgba(96,165,250,.12); }
  &::placeholder { color: rgba(255,255,255,.28); }
`
const ListInput = styled.input`${listControlCss}`
const ListSelect = styled.select`
  ${listControlCss}
  option { background: #111827; color: #fff; }
`
const ListFormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`
const ListPrimaryBtn = styled.button`
  min-height: 36px;
  border: 0;
  border-radius: 9px;
  padding: 0 13px;
  background: linear-gradient(135deg,#2563eb,#3b82f6);
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  svg { font-size: 17px; }
  &:disabled { opacity: .45; cursor: default; }
`
const ListSecondaryBtn = styled(ListPrimaryBtn)`
  background: rgba(255,255,255,.07);
  color: rgba(255,255,255,.72);
`
const ListRows = styled.div`
  border-top: 1px solid rgba(255,255,255,.07);
`
const ListRow = styled.div`
  min-height: 58px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 12px;
  border-bottom: 1px solid rgba(255,255,255,.055);
  &:last-child { border-bottom: 0; }
`
const ListStatus = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  color: ${({ $bad }) => $bad ? '#f87171' : '#4ade80'};
  background: ${({ $bad }) => $bad ? 'rgba(248,113,113,.1)' : 'rgba(74,222,128,.1)'};
  flex: 0 0 auto;
  svg { font-size: 17px; }
`
const ListBody = styled.div`
  min-width: 0;
  flex: 1;
`
const ListValue = styled.div`
  color: rgba(255,255,255,.9);
  font: 600 12.5px ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-wrap: anywhere;
`
const ListMeta = styled.div`
  color: rgba(255,255,255,.4);
  font-size: 10.5px;
  margin-top: 3px;
  overflow-wrap: anywhere;
`
const ListIconBtn = styled.button`
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 8px;
  display: grid;
  place-items: center;
  background: ${({ $danger }) => $danger ? 'rgba(248,113,113,.08)' : 'rgba(255,255,255,.055)'};
  color: ${({ $danger }) => $danger ? '#f87171' : 'rgba(255,255,255,.55)'};
  cursor: pointer;
  svg { font-size: 16px; }
  &:hover { background: ${({ $danger }) => $danger ? 'rgba(248,113,113,.16)' : 'rgba(255,255,255,.1)'}; }
`
const ListEmpty = styled.div`
  padding: 18px 14px;
  color: rgba(255,255,255,.38);
  font-size: 12px;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`

export default ClientPanel
