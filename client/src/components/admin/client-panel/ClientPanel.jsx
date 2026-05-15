import { useCallback, useEffect, useRef, useState } from 'react'
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
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckIcon from '@mui/icons-material/Check'
import DesktopWindowsOutlinedIcon from '@mui/icons-material/DesktopWindowsOutlined'
import SmartphoneIcon from '@mui/icons-material/Smartphone'
import TabletAndroidIcon from '@mui/icons-material/TabletAndroid'
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined'
import { api, resolveApiAsset } from '../../../utils/api'
import { useToast } from '../../../context/ToastContext'
import {
  Wrap, PanelHeader, CloseBtn, PanelAvatar, PanelOnlineDot, PanelUsername, PanelStatus,
  TabBar, Tab, ScrollArea,
  InfoCard, InfoCardTitle, FieldRow, FieldLabel, FieldValue, FieldInput, FieldTextarea, EditHint,
  TagsSection, ClientTag, TagCreateRow, TagInput, ColorInput, TagCreateBtn,
  FilterBar, FilterBtn, FilesGrid, FileCard, FileThumb, FileInfo, FileName, FileDate,
  PaginationRow, PageBtn, PageInfo,
  ViewerOverlay, ViewerContent, ViewerFileName, ViewerImg, ViewerEmbed, ViewerActions, ViewerBtn,
  BalanceWrap, BalanceCard, BalanceCardHead, BalanceCardLabel, BalanceRefreshBtn,
  BalanceMainRow, BalanceCurrencyLabel, BalanceMainAmount,
  BalanceMetricsRow, BalanceMetric, BalanceMetricLabel, BalanceMetricValue,
  AmountSection, AmountSectionLabel, QuickChips, QuickChip, AmountInputRow, AmountSign, AmountInput,
  BalanceActions, BalanceCreditBtn, BalanceDebitBtn, BalanceMsg, TabSpinner,
  ProfileWrap, ReferralCard, ReferralCardHead, ReferralCardLabel, ReferralBadge,
  ReferralCodeRow, ReferralCode, CopyBtn, ReferralHint,
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
  const [copied, setCopied]             = useState(false)
  const copyTimer                       = useRef(null)

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

  const handleCopy = () => {
    if (!data?.referralCode) return
    navigator.clipboard.writeText(data.referralCode).then(() => {
      setCopied(true)
      clearTimeout(copyTimer.current)
      copyTimer.current = setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  const sessions = data?.sessions || []

  return (
    <ProfileWrap>
      <ReferralCard>
        <ReferralCardHead>
          <ReferralCardLabel>Código de referido</ReferralCardLabel>
          <ReferralBadge>Compartir</ReferralBadge>
        </ReferralCardHead>
        <ReferralCodeRow>
          {loading && !data
            ? <ReferralCode $skeleton />
            : <ReferralCode>{data?.referralCode || '—'}</ReferralCode>
          }
          <CopyBtn
            type="button"
            $copied={copied}
            onClick={handleCopy}
            aria-label="Copiar código"
            disabled={!data?.referralCode}
          >
            {copied ? <CheckIcon /> : <ContentCopyIcon />}
          </CopyBtn>
        </ReferralCodeRow>
        <ReferralHint>
          Compartí este código con nuevos usuarios. Se asigna automáticamente al primer ingreso.
        </ReferralHint>
      </ReferralCard>

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

const ClientPanel = ({ client, onClose, $width, $fullWidth }) => {
  const { timezone } = useDateFormat()
  const toast = useToast()
  const [tab, setTab] = useState('info')
  const [fileFilter, setFileFilter] = useState('all')
  const [filePage, setFilePage] = useState(1)
  const [viewerData, setViewerData] = useState(null)
  const [saving, setSaving] = useState(false)
  const [labelOptions, setLabelOptions] = useState(DEFAULT_TAGS)
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#60a5fa')
  const [creatingLabel, setCreatingLabel] = useState(false)
  const [loadedDetails, setLoadedDetails] = useState(() => buildFallbackDetails(client))
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

      <TabBar>
        <Tab $active={tab === 'info'} onClick={() => setTab('info')}>
          <InfoOutlinedIcon /><span className="tab-label">Info</span>
        </Tab>
        <Tab $active={tab === 'files'} onClick={() => setTab('files')}>
          <FolderOutlinedIcon /><span className="tab-label">Archivos</span>
        </Tab>
        <Tab $active={tab === 'balance'} onClick={() => setTab('balance')}>
          <AccountBalanceWalletOutlinedIcon /><span className="tab-label">Saldo</span>
        </Tab>
        <Tab $active={tab === 'profile'} onClick={() => setTab('profile')}>
          <PersonOutlinedIcon /><span className="tab-label">Perfil</span>
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
    </Wrap>
  )
}

export default ClientPanel
