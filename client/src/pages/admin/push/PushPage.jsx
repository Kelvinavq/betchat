import { useCallback, useEffect, useRef, useState } from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import CheckIcon from '@mui/icons-material/Check'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import PeopleOutlineIcon from '@mui/icons-material/GroupOutlined'
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined'
import { api, API_BASE_URL } from '../../../utils/api'
import NotificationsPage from '../notifications/NotificationsPage'
import {
  Wrap, TopBar, MenuBtn, TitleBlock, PageTitle, PageSub,
  StatsRow, StatCard, StatIcon, StatInfo, StatVal, StatLabel,
  TabsWrap, TabBtn,
  Content,
  SectionHead, SectionTitle, SectionSub, GlobalToggleRow,
  CampCard, CampRow, CampLabel, CampNameInput,
  InputsGrid, FieldWrap, FieldLabel, FieldInput,
  Toggle,
  WeekRow, WeekLabel, DayBtn,
  TimeWrap, TimeInput,
  StepperWrap, StepperInput,
  DayBadge, ConditionBadge, EventTypeBadge,
  AddBtn, SaveBtn, SendNowBtn, DeleteBtn, FooterRow,
  HistSection, HistTitle, HistTable, HistRow, HistName, HistSub, HistCount, HistRate, HistDate,
  HistPager, HistPagerBtn, HistPagerInfo, HistPagerTotal,
  SettingsCard, SettingsGrid, SelectInput,
  Spinner, Empty, ErrorLine,
} from './PushPage.styles'

/* ── constants ─────────────────────────────────────────────────── */
const TABS = [
  { id: 'directas',   label: 'Push directas' },
  { id: 'retencion',  label: 'Retención' },
  { id: 'reconsumo',  label: 'Reconsumo' },
  { id: 'engagement', label: 'Engagement' },
  { id: 'eventos',    label: 'Eventos' },
  { id: 'vip',        label: 'VIP' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'ajustes',    label: 'Ajustes' },
]

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const EVENT_META = {
  event_start:    { icon: '🚀', label: 'Evento inicia',       sub: 'Cuando se activa un evento' },
  event_warning:  { icon: '⏰', label: 'Evento por terminar', sub: 'Minutos antes de que termine' },
  event_end:      { icon: '🏁', label: 'Evento terminó',      sub: 'Cuando el evento finaliza' },
  lottery_result: { icon: '🎰', label: 'Resultado sorteo',    sub: 'Cuando salen los ganadores' },
}

const HISTORY_PAGE_SIZE = 10

const TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/Bogota',
  'America/Lima',
  'America/Mexico_City',
  'America/Santiago',
  'America/Caracas',
  'America/New_York',
  'Europe/Madrid',
]

/* ── helpers ───────────────────────────────────────────────────── */
const fmtDate = (v) => {
  if (!v) return '—'
  return new Date(v).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const fmtNum = (n) => Number(n || 0).toLocaleString('es-AR')

/* ── shared CampaignCard for Retention + Reconsumo ─────────────── */
function BaseCampaignCard({ camp, onChange, onSave, onDelete, onSendNow, saving, sending, extra }) {
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  const handleSave = async () => {
    await onSave(camp.id)
    setSaved(true)
    setTimeout(() => setSaved(false), 2200)
  }

  return (
    <CampCard>
      <CampRow>
        <Toggle
          $on={camp.isActive}
          type="button"
          onClick={() => onChange(camp.id, 'isActive', !camp.isActive)}
          title={camp.isActive ? 'Desactivar' : 'Activar'}
        />
        <CampLabel>{camp.name}</CampLabel>
        {extra}
        {onDelete && (
          <DeleteBtn type="button" onClick={() => onDelete(camp.id)}>
            <DeleteOutlineIcon style={{ fontSize: 14 }} />Eliminar
          </DeleteBtn>
        )}
      </CampRow>

      <InputsGrid>
        <FieldWrap>
          <FieldLabel>Título de la notificación</FieldLabel>
          <FieldInput
            placeholder="Ej: ¡Te extrañamos! 🎁"
            value={camp.title}
            onChange={e => onChange(camp.id, 'title', e.target.value)}
          />
        </FieldWrap>
        <FieldWrap>
          <FieldLabel>Mensaje</FieldLabel>
          <FieldInput
            placeholder="Ej: Tu suerte te espera. ¡Volvé a jugar!"
            value={camp.body}
            onChange={e => onChange(camp.id, 'body', e.target.value)}
          />
        </FieldWrap>
        <FieldWrap>
          <FieldLabel>Imagen (opcional)</FieldLabel>
          <FieldInput
  type="file"
  name="image"
  ref={inputRef}
  style={{ visibility: 'hidden', position: 'absolute' }}
  accept="image/*"
  disabled={uploading}
  onChange={async (e) => {
    const file = e.target.files?.[0]

    if (!file) {
      onChange(camp.id, 'image', '')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('image', file, file.name)

      const token =
        localStorage.getItem('token') ||
        localStorage.getItem('talgibravi-istazo') ||
        ''

      const uploadUrl = `${String(API_BASE_URL).replace(/\/+$/, '')}/api/push/upload-image`
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: formData,
      })

      const res = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(res.error || `Error HTTP ${response.status}`)
      }

      onChange(camp.id, 'image', res.imageUrl)
      setError('')
    } catch (err) {
      setError('Error subiendo imagen: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }}
/>
          <button type="button" onClick={() => inputRef.current.click()} disabled={uploading} style={{ padding: '8px 16px', background: '#007bff', color: 'white', border: 'none', borderRadius: 4, cursor: uploading ? 'not-allowed' : 'pointer' }}>
            {uploading ? 'Subiendo...' : 'Seleccionar imagen'}
          </button>
          {camp.image && (
            <div style={{ marginTop: 8 }}>
              <img src={camp.image} alt="Preview" style={{ maxWidth: 200, maxHeight: 200 }} />
            </div>
          )}
        </FieldWrap>
      </InputsGrid>

      {error && <ErrorLine>{error}</ErrorLine>}

      <FooterRow>
        {onSendNow && (
          <SendNowBtn type="button" disabled={sending === camp.id} onClick={() => onSendNow(camp.id)}>
            {sending === camp.id ? <Spinner /> : <SendIcon style={{ fontSize: 14 }} />}
            {sending === camp.id ? 'Enviando...' : 'Enviar ahora'}
          </SendNowBtn>
        )}
        <SaveBtn type="button" $saved={saved} disabled={saving === camp.id} onClick={handleSave}>
          {saving === camp.id ? <Spinner /> : saved ? <><CheckIcon />Guardado</> : 'Guardar'}
        </SaveBtn>
      </FooterRow>
    </CampCard>
  )
}

/* ── RETENTION ──────────────────────────────────────────────────── */
function RetentionSection({ onMenuClick }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [sending, setSending] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/api/push/campaigns?type=retention')
      .then(d => setCamps(d.campaigns || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const onChange = (id, field, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, [field]: value } : c)
  )

  const save = async (id) => {
    setSaving(id)
    const c = camps.find(x => x.id === id)
    try {
      await api.put(`/api/push/campaigns/${id}`, { title: c.title, body: c.body, image: c.image, isActive: c.isActive })
    } catch (e) { setError(e.message) } finally { setSaving(null) }
  }

  const sendNow = async (id) => {
    setSending(id)
    try {
      const r = await api.post(`/api/push/campaigns/${id}/send`)
      setError(`✅ Enviado: ${r.result?.sent || 0} exitosas, ${r.result?.failed || 0} fallidas`)
      setTimeout(() => setError(''), 4000)
    } catch (e) { setError(e.message) } finally { setSending(null) }
  }

  if (loading) return <Empty><Spinner /> &nbsp;Cargando...</Empty>
  return (
    <>
      <SectionHead>
        <div>
          <SectionTitle>Retención por inactividad</SectionTitle>
          <SectionSub>Pushes automáticas para clientes sin actividad en X días</SectionSub>
        </div>
      </SectionHead>
      {error && <ErrorLine>{error}</ErrorLine>}
      {camps.map((c, i) => (
        <BaseCampaignCard
          key={c.id} camp={c} saving={saving} sending={sending}
          onChange={onChange} onSave={save} onSendNow={sendNow}
          extra={
            <StepperWrap>
              <span>Días sin actividad:</span>
              <StepperInput type="number" min="1" value={c.config?.days || 1} readOnly />
            </StepperWrap>
          }
        />
      ))}
    </>
  )
}

/* ── RECONSUMO ──────────────────────────────────────────────────── */
function ReconsumptionSection() {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [sending, setSending] = useState(null)
  const [adding, setAdding]   = useState(false)
  const [error, setError]     = useState('')

  const load = useCallback(() => {
    api.get('/api/push/campaigns?type=reconsumo')
      .then(d => setCamps(d.campaigns || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const onChange = (id, field, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, [field]: value } : c)
  )

  const onConfigChange = (id, key, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, config: { ...c.config, [key]: value } } : c)
  )

  const save = async (id) => {
    setSaving(id)
    const c = camps.find(x => x.id === id)
    try {
      await api.put(`/api/push/campaigns/${id}`, { title: c.title, body: c.body, isActive: c.isActive, config: c.config })
    } catch (e) { setError(e.message) } finally { setSaving(null) }
  }

  const add = async () => {
    setAdding(true)
    try {
      const d = await api.post('/api/push/campaigns', {
        type: 'reconsumo', name: 'Sin depósito', title: '', body: '',
        config: { no_deposit_days: 3 }, isActive: true,
      })
      setCamps(prev => [...prev, d.campaign])
    } catch (e) { setError(e.message) } finally { setAdding(false) }
  }

  const remove = async (id) => {
    await api.delete(`/api/push/campaigns/${id}`)
    setCamps(prev => prev.filter(c => c.id !== id))
  }

  const sendNow = async (id) => {
    setSending(id)
    try {
      const r = await api.post(`/api/push/campaigns/${id}/send`)
      setError(`✅ Enviado: ${r.result?.sent || 0} exitosas, ${r.result?.failed || 0} fallidas`)
      setTimeout(() => setError(''), 4000)
    } catch (e) { setError(e.message) } finally { setSending(null) }
  }

  if (loading) return <Empty><Spinner /> &nbsp;Cargando...</Empty>
  return (
    <>
      <SectionHead>
        <div>
          <SectionTitle>Reconsumo</SectionTitle>
          <SectionSub>Push para clientes con depósitos previos que no han cargado en X días</SectionSub>
        </div>
      </SectionHead>
      {error && <ErrorLine>{error}</ErrorLine>}
      {camps.map(c => (
        <BaseCampaignCard
          key={c.id} camp={c} saving={saving} sending={sending}
          onChange={onChange} onSave={save} onDelete={remove} onSendNow={sendNow}
          extra={
            <StepperWrap>
              <span>Días sin depósito:</span>
              <StepperInput
                type="number" min="1"
                value={c.config?.no_deposit_days || 3}
                onChange={e => onConfigChange(c.id, 'no_deposit_days', Number(e.target.value))}
              />
            </StepperWrap>
          }
        />
      ))}
      <FooterRow>
        <AddBtn type="button" disabled={adding} onClick={add}>
          <AddIcon style={{ fontSize: 15 }} />Agregar
        </AddBtn>
      </FooterRow>
    </>
  )
}

/* ── ENGAGEMENT ─────────────────────────────────────────────────── */
function EngagementSection({ settings, onGlobalToggle }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [sending, setSending] = useState(null)
  const [adding, setAdding]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/api/push/campaigns?type=engagement')
      .then(d => setCamps(d.campaigns || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const onChange = (id, field, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, [field]: value } : c)
  )

  const onConfigChange = (id, key, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, config: { ...c.config, [key]: value } } : c)
  )

  const toggleDay = (id, dow) => {
    const camp = camps.find(c => c.id === id)
    const days = camp?.config?.weekdays || [0,1,2,3,4,5,6]
    const next = days.includes(dow) ? days.filter(d => d !== dow) : [...days, dow].sort()
    onConfigChange(id, 'weekdays', next)
  }

  const save = async (id) => {
    setSaving(id)
    const c = camps.find(x => x.id === id)
    try {
      await api.put(`/api/push/campaigns/${id}`, { name: c.name, title: c.title, body: c.body, isActive: c.isActive, config: c.config })
    } catch (e) { setError(e.message) } finally { setSaving(null) }
  }

  const add = async () => {
    setAdding(true)
    try {
      const d = await api.post('/api/push/campaigns', {
        type: 'engagement', name: 'Nueva campaña', title: '', body: '',
        config: { weekdays: [1,2,3,4,5], time: '10:00' }, isActive: true,
      })
      setCamps(prev => [...prev, d.campaign])
    } catch (e) { setError(e.message) } finally { setAdding(false) }
  }

  const remove = async (id) => {
    await api.delete(`/api/push/campaigns/${id}`)
    setCamps(prev => prev.filter(c => c.id !== id))
  }

  const sendNow = async (id) => {
    setSending(id)
    try {
      const r = await api.post(`/api/push/campaigns/${id}/send`)
      setError(`✅ Enviado: ${r.result?.sent || 0} exitosas, ${r.result?.failed || 0} fallidas`)
      setTimeout(() => setError(''), 4000)
    } catch (e) { setError(e.message) } finally { setSending(null) }
  }

  if (loading) return <Empty><Spinner /> &nbsp;Cargando...</Empty>
  return (
    <>
      <SectionHead>
        <div>
          <SectionTitle>Engagement Programado</SectionTitle>
          <SectionSub>Push masivas enviadas en días y horarios específicos</SectionSub>
        </div>
        <GlobalToggleRow $active={settings?.engagementActive}>
          <Toggle
            $on={settings?.engagementActive}
            type="button"
            onClick={() => onGlobalToggle('engagementActive', !settings?.engagementActive)}
          />
          {settings?.engagementActive ? 'Activo' : 'Inactivo'}
        </GlobalToggleRow>
      </SectionHead>
      {error && <ErrorLine>{error}</ErrorLine>}
      {camps.map(c => (
        <CampCard key={c.id}>
          <CampRow>
            <Toggle
              $on={c.isActive} type="button"
              onClick={() => onChange(c.id, 'isActive', !c.isActive)}
            />
            <CampNameInput
              value={c.name}
              placeholder="Nombre de la campaña"
              onChange={e => onChange(c.id, 'name', e.target.value)}
            />
            <DeleteBtn type="button" onClick={() => remove(c.id)}>
              <DeleteOutlineIcon style={{ fontSize: 14 }} />Eliminar
            </DeleteBtn>
          </CampRow>

          <InputsGrid>
            <FieldWrap>
              <FieldLabel>Título</FieldLabel>
              <FieldInput
                placeholder="Título de la notificación"
                value={c.title}
                onChange={e => onChange(c.id, 'title', e.target.value)}
              />
            </FieldWrap>
            <FieldWrap>
              <FieldLabel>Mensaje</FieldLabel>
              <FieldInput
                placeholder="Cuerpo de la notificación"
                value={c.body}
                onChange={e => onChange(c.id, 'body', e.target.value)}
              />
            </FieldWrap>
          </InputsGrid>

          <WeekRow>
            <WeekLabel>Días</WeekLabel>
            {DAYS_ES.map((d, i) => (
              <DayBtn
                key={i} type="button"
                $active={(c.config?.weekdays || []).includes(i)}
                onClick={() => toggleDay(c.id, i)}
              >{d}</DayBtn>
            ))}
            <TimeWrap>
              <TimeInput
                type="time"
                value={c.config?.time || '10:00'}
                onChange={e => onConfigChange(c.id, 'time', e.target.value)}
              />
            </TimeWrap>
          </WeekRow>

          <FooterRow>
            <SendNowBtn type="button" disabled={sending === c.id} onClick={() => sendNow(c.id)}>
              {sending === c.id ? <Spinner /> : <SendIcon style={{ fontSize: 14 }} />}
              {sending === c.id ? 'Enviando...' : 'Enviar ahora'}
            </SendNowBtn>
            <SaveBtn type="button" disabled={saving === c.id} onClick={() => save(c.id)}>
              {saving === c.id ? <Spinner /> : 'Guardar'}
            </SaveBtn>
          </FooterRow>
        </CampCard>
      ))}
      <FooterRow>
        <AddBtn type="button" disabled={adding} onClick={add}>
          <AddIcon style={{ fontSize: 15 }} />Agregar bloque
        </AddBtn>
      </FooterRow>
    </>
  )
}

/* ── EVENTS ─────────────────────────────────────────────────────── */
function EventsSection({ settings, onGlobalToggle }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [sending, setSending] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/api/push/campaigns?type=events')
      .then(d => setCamps(d.campaigns || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const onChange = (id, field, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, [field]: value } : c)
  )

  const onConfigChange = (id, key, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, config: { ...c.config, [key]: value } } : c)
  )

  const save = async (id) => {
    setSaving(id)
    const c = camps.find(x => x.id === id)
    try {
      await api.put(`/api/push/campaigns/${id}`, { title: c.title, body: c.body, isActive: c.isActive, config: c.config })
    } catch (e) { setError(e.message) } finally { setSaving(null) }
  }

  const sendNow = async (id) => {
    setSending(id)
    try {
      const r = await api.post(`/api/push/campaigns/${id}/send`)
      setError(`✅ Enviado: ${r.result?.sent || 0} exitosas, ${r.result?.failed || 0} fallidas`)
      setTimeout(() => setError(''), 4000)
    } catch (e) { setError(e.message) } finally { setSending(null) }
  }

  if (loading) return <Empty><Spinner /> &nbsp;Cargando...</Empty>
  return (
    <>
      <SectionHead>
        <div>
          <SectionTitle>Push por Eventos</SectionTitle>
          <SectionSub>Push automáticas cuando arrancan, terminan eventos o salen resultados del sorteo</SectionSub>
        </div>
        <GlobalToggleRow $active={settings?.eventsActive}>
          <Toggle
            $on={settings?.eventsActive} type="button"
            onClick={() => onGlobalToggle('eventsActive', !settings?.eventsActive)}
          />
          {settings?.eventsActive ? 'Activo' : 'Inactivo'}
        </GlobalToggleRow>
      </SectionHead>
      {error && <ErrorLine>{error}</ErrorLine>}
      {camps.map(c => {
        const meta = EVENT_META[c.config?.event_type] || {}
        const isWarning = c.config?.event_type === 'event_warning'
        return (
          <CampCard key={c.id}>
            <CampRow>
              <Toggle
                $on={c.isActive} type="button"
                onClick={() => onChange(c.id, 'isActive', !c.isActive)}
              />
              <EventTypeBadge>{meta.icon} {meta.label}</EventTypeBadge>
              <CampLabel style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', flex: 'none' }}>
                {meta.sub}
              </CampLabel>
            </CampRow>
            <InputsGrid>
              <FieldWrap>
                <FieldLabel>Título</FieldLabel>
                <FieldInput
                  placeholder="Título de la notificación"
                  value={c.title}
                  onChange={e => onChange(c.id, 'title', e.target.value)}
                />
              </FieldWrap>
              <FieldWrap>
                <FieldLabel>Mensaje</FieldLabel>
                <FieldInput
                  placeholder="Cuerpo de la notificación"
                  value={c.body}
                  onChange={e => onChange(c.id, 'body', e.target.value)}
                />
              </FieldWrap>
            </InputsGrid>
            {isWarning && (
              <StepperWrap>
                <span>Minutos antes:</span>
                <StepperInput
                  type="number" min="1" max="60"
                  value={c.config?.minutes_before || 15}
                  onChange={e => onConfigChange(c.id, 'minutes_before', Number(e.target.value))}
                />
              </StepperWrap>
            )}
            <FooterRow>
              <SendNowBtn type="button" disabled={sending === c.id} onClick={() => sendNow(c.id)}>
                {sending === c.id ? <Spinner /> : <SendIcon style={{ fontSize: 14 }} />}
                {sending === c.id ? 'Enviando...' : 'Enviar ahora'}
              </SendNowBtn>
              <SaveBtn type="button" disabled={saving === c.id} onClick={() => save(c.id)}>
                {saving === c.id ? <Spinner /> : 'Guardar'}
              </SaveBtn>
            </FooterRow>
          </CampCard>
        )
      })}
    </>
  )
}

/* ── ONBOARDING ─────────────────────────────────────────────────── */
function OnboardingSection({ settings, onGlobalToggle }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [sending, setSending] = useState(null)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/api/push/campaigns?type=onboarding')
      .then(d => setCamps(d.campaigns || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const onChange = (id, field, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, [field]: value } : c)
  )

  const save = async (id) => {
    setSaving(id)
    const c = camps.find(x => x.id === id)
    try {
      await api.put(`/api/push/campaigns/${id}`, { title: c.title, body: c.body, isActive: c.isActive })
    } catch (e) { setError(e.message) } finally { setSaving(null) }
  }

  const sendNow = async (id) => {
    setSending(id)
    try {
      const r = await api.post(`/api/push/campaigns/${id}/send`)
      setError(`✅ Enviado: ${r.result?.sent || 0} exitosas, ${r.result?.failed || 0} fallidas`)
      setTimeout(() => setError(''), 4000)
    } catch (e) { setError(e.message) } finally { setSending(null) }
  }

  const conditionLabel = (c) => {
    if (c === 'deposited')     return 'Si cargó'
    if (c === 'not_deposited') return 'Si NO cargó'
    return 'Siempre'
  }

  if (loading) return <Empty><Spinner /> &nbsp;Cargando...</Empty>
  return (
    <>
      <SectionHead>
        <div>
          <SectionTitle>Onboarding (Primeros 7 días)</SectionTitle>
          <SectionSub>Secuencia de bienvenida para nuevos clientes en su primera semana</SectionSub>
        </div>
        <GlobalToggleRow $active={settings?.onboardingActive}>
          <Toggle
            $on={settings?.onboardingActive} type="button"
            onClick={() => onGlobalToggle('onboardingActive', !settings?.onboardingActive)}
          />
          {settings?.onboardingActive ? 'Activo' : 'Inactivo'}
        </GlobalToggleRow>
      </SectionHead>
      {error && <ErrorLine>{error}</ErrorLine>}
      {camps.map(c => {
        const cond = c.config?.condition || 'always'
        return (
          <CampCard key={c.id}>
            <CampRow>
              <Toggle
                $on={c.isActive} type="button"
                onClick={() => onChange(c.id, 'isActive', !c.isActive)}
              />
              <DayBadge>Día {c.config?.day ?? '?'}</DayBadge>
              <ConditionBadge $type={cond}>{conditionLabel(cond)}</ConditionBadge>
            </CampRow>
            <InputsGrid>
              <FieldWrap>
                <FieldLabel>Título</FieldLabel>
                <FieldInput
                  placeholder="Título de la notificación"
                  value={c.title}
                  onChange={e => onChange(c.id, 'title', e.target.value)}
                />
              </FieldWrap>
              <FieldWrap>
                <FieldLabel>Mensaje</FieldLabel>
                <FieldInput
                  placeholder="Cuerpo de la notificación"
                  value={c.body}
                  onChange={e => onChange(c.id, 'body', e.target.value)}
                />
              </FieldWrap>
            </InputsGrid>
            <FooterRow>
              <SendNowBtn type="button" disabled={sending === c.id} onClick={() => sendNow(c.id)}>
                {sending === c.id ? <Spinner /> : <SendIcon style={{ fontSize: 14 }} />}
                {sending === c.id ? 'Enviando...' : 'Enviar ahora'}
              </SendNowBtn>
              <SaveBtn type="button" disabled={saving === c.id} onClick={() => save(c.id)}>
                {saving === c.id ? <Spinner /> : 'Guardar'}
              </SaveBtn>
            </FooterRow>
          </CampCard>
        )
      })}
    </>
  )
}

/* ── VIP ────────────────────────────────────────────────────────── */
function VipSection({ settings, onGlobalToggle }) {
  const [camps, setCamps] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(null)
  const [sending, setSending] = useState(null)
  const [adding, setAdding]   = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    api.get('/api/push/campaigns?type=vip')
      .then(d => setCamps(d.campaigns || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const onChange = (id, field, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, [field]: value } : c)
  )

  const onConfigChange = (id, key, value) => setCamps(prev =>
    prev.map(c => c.id === id ? { ...c, config: { ...c.config, [key]: value } } : c)
  )

  const save = async (id) => {
    setSaving(id)
    const c = camps.find(x => x.id === id)
    try {
      await api.put(`/api/push/campaigns/${id}`, { name: c.name, title: c.title, body: c.body, isActive: c.isActive, config: c.config })
    } catch (e) { setError(e.message) } finally { setSaving(null) }
  }

  const add = async () => {
    setAdding(true)
    try {
      const d = await api.post('/api/push/campaigns', {
        type: 'vip', name: 'Campaña VIP', title: '', body: '',
        config: { min_deposits: 50000 }, isActive: true,
      })
      setCamps(prev => [...prev, d.campaign])
    } catch (e) { setError(e.message) } finally { setAdding(false) }
  }

  const remove = async (id) => {
    await api.delete(`/api/push/campaigns/${id}`)
    setCamps(prev => prev.filter(c => c.id !== id))
  }

  const sendNow = async (id) => {
    setSending(id)
    try {
      const r = await api.post(`/api/push/campaigns/${id}/send`)
      setError(`✅ Enviado: ${r.result?.sent || 0} exitosas, ${r.result?.failed || 0} fallidas`)
      setTimeout(() => setError(''), 4000)
    } catch (e) { setError(e.message) } finally { setSending(null) }
  }

  if (loading) return <Empty><Spinner /> &nbsp;Cargando...</Empty>
  return (
    <>
      <SectionHead>
        <div>
          <SectionTitle>VIP</SectionTitle>
          <SectionSub>Push exclusivas para clientes con depósitos totales sobre un mínimo</SectionSub>
        </div>
        <GlobalToggleRow $active={settings?.vipActive}>
          <Toggle
            $on={settings?.vipActive} type="button"
            onClick={() => onGlobalToggle('vipActive', !settings?.vipActive)}
          />
          {settings?.vipActive ? 'Activo' : 'Inactivo'}
        </GlobalToggleRow>
      </SectionHead>
      {error && <ErrorLine>{error}</ErrorLine>}
      {camps.length === 0 && <Empty>Sin campañas VIP. Agregá una.</Empty>}
      {camps.map(c => (
        <CampCard key={c.id}>
          <CampRow>
            <Toggle
              $on={c.isActive} type="button"
              onClick={() => onChange(c.id, 'isActive', !c.isActive)}
            />
            <CampNameInput
              value={c.name}
              placeholder="Nombre de la campaña"
              onChange={e => onChange(c.id, 'name', e.target.value)}
            />
            <StepperWrap>
              <span>Depósito mín. $</span>
              <StepperInput
                type="number" min="0"
                value={c.config?.min_deposits || 0}
                onChange={e => onConfigChange(c.id, 'min_deposits', Number(e.target.value))}
                style={{ width: 80 }}
              />
            </StepperWrap>
            <DeleteBtn type="button" onClick={() => remove(c.id)}>
              <DeleteOutlineIcon style={{ fontSize: 14 }} />Eliminar
            </DeleteBtn>
          </CampRow>
          <InputsGrid>
            <FieldWrap>
              <FieldLabel>Título</FieldLabel>
              <FieldInput
                placeholder="Título de la notificación"
                value={c.title}
                onChange={e => onChange(c.id, 'title', e.target.value)}
              />
            </FieldWrap>
            <FieldWrap>
              <FieldLabel>Mensaje</FieldLabel>
              <FieldInput
                placeholder="Mensaje de la notificación"
                value={c.body}
                onChange={e => onChange(c.id, 'body', e.target.value)}
              />
            </FieldWrap>
          </InputsGrid>
          <FooterRow>
            <SendNowBtn type="button" disabled={sending === c.id} onClick={() => sendNow(c.id)}>
              {sending === c.id ? <Spinner /> : <SendIcon style={{ fontSize: 14 }} />}
              {sending === c.id ? 'Enviando...' : 'Enviar ahora'}
            </SendNowBtn>
            <SaveBtn type="button" disabled={saving === c.id} onClick={() => save(c.id)}>
              {saving === c.id ? <Spinner /> : 'Guardar'}
            </SaveBtn>
          </FooterRow>
        </CampCard>
      ))}
      <FooterRow>
        <AddBtn type="button" disabled={adding} onClick={add}>
          <AddIcon style={{ fontSize: 15 }} />Agregar campaña VIP
        </AddBtn>
      </FooterRow>
    </>
  )
}

/* ── SETTINGS + HISTORY ─────────────────────────────────────────── */
function SettingsSection({ settings, onSettings }) {
  const [form, setForm]       = useState(settings || {})
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [history, setHistory] = useState([])
  const [histLoading, setHL]  = useState(true)
  const [historyPage, setHistoryPage] = useState(1)
  const [histPagination, setHistPagination] = useState({
    page: 1, limit: HISTORY_PAGE_SIZE, total: 0, totalPages: 1,
  })
  const [error, setError]     = useState('')

  useEffect(() => { setForm(settings || {}) }, [settings])

  useEffect(() => {
    let cancelled = false
    setHL(true)
    api.get(`/api/push/history?page=${historyPage}&limit=${HISTORY_PAGE_SIZE}`)
      .then((d) => {
        if (cancelled) return
        setHistory(d.history || [])
        if (d.pagination) setHistPagination(d.pagination)
      })
      .catch(() => { if (!cancelled) setHistory([]) })
      .finally(() => { if (!cancelled) setHL(false) })
    return () => { cancelled = true }
  }, [historyPage])

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/api/push/settings', form)
      onSettings(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }

  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const TYPE_LABELS = {
    retention: 'Retención', reconsumo: 'Reconsumo', engagement: 'Engagement',
    events: 'Eventos', onboarding: 'Onboarding', vip: 'VIP',
  }

  return (
    <>
      <SectionHead>
        <div>
          <SectionTitle>Ajustes Globales</SectionTitle>
          <SectionSub>Configuración del sistema de push notifications</SectionSub>
        </div>
        <GlobalToggleRow $active={form.isActive}>
          <Toggle $on={form.isActive} type="button" onClick={() => setF('isActive', !form.isActive)} />
          {form.isActive ? 'Activo' : 'Inactivo'}
        </GlobalToggleRow>
      </SectionHead>

      {error && <ErrorLine>{error}</ErrorLine>}

      <SettingsCard>
        <SettingsGrid>
          <FieldWrap>
            <FieldLabel>Horario silencioso (inicio)</FieldLabel>
            <StepperInput
              type="number" min="0" max="23"
              value={form.quietStart ?? 2}
              onChange={e => setF('quietStart', Number(e.target.value))}
              style={{ width: '100%', textAlign: 'left' }}
            />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>Horario silencioso (fin)</FieldLabel>
            <StepperInput
              type="number" min="0" max="23"
              value={form.quietEnd ?? 9}
              onChange={e => setF('quietEnd', Number(e.target.value))}
              style={{ width: '100%', textAlign: 'left' }}
            />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>Max push por usuario/día</FieldLabel>
            <StepperInput
              type="number" min="1" max="20"
              value={form.maxPerDay ?? 3}
              onChange={e => setF('maxPerDay', Number(e.target.value))}
              style={{ width: '100%', textAlign: 'left' }}
            />
          </FieldWrap>
          <FieldWrap>
            <FieldLabel>Intervalo de chequeo (min)</FieldLabel>
            <StepperInput
              type="number" min="5" max="60"
              value={form.checkInterval ?? 15}
              onChange={e => setF('checkInterval', Number(e.target.value))}
              style={{ width: '100%', textAlign: 'left' }}
            />
          </FieldWrap>
          <FieldWrap style={{ gridColumn: '1 / -1' }}>
            <FieldLabel>Zona Horaria</FieldLabel>
            <SelectInput
              value={form.timezone || 'America/Argentina/Buenos_Aires'}
              onChange={e => setF('timezone', e.target.value)}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
              ))}
            </SelectInput>
          </FieldWrap>
        </SettingsGrid>
        <FooterRow>
          <SaveBtn type="button" $saved={saved} disabled={saving} onClick={save}>
            {saving ? <Spinner /> : saved ? <><CheckIcon />Guardado</> : 'Guardar ajustes'}
          </SaveBtn>
        </FooterRow>
      </SettingsCard>

      {/* History */}
      <HistSection>
        <HistTitle>Historial de envíos</HistTitle>
        {histLoading ? (
          <Empty><Spinner /> &nbsp;Cargando...</Empty>
        ) : history.length === 0 ? (
          <Empty>Sin historial de envíos todavía</Empty>
        ) : (
          <>
            <HistTable>
              {history.map(h => (
                <HistRow key={h.id}>
                  <div>
                    <HistName>{h.title || '(sin título)'}</HistName>
                    <HistSub>
                      {TYPE_LABELS[h.campaignType] || h.campaignType}
                      {h.campaignName ? ` · ${h.campaignName}` : ''}
                      {h.triggerType === 'manual' ? ' · Manual' : ''}
                    </HistSub>
                  </div>
                  <HistCount>
                    📤 {fmtNum(h.targetCount)} objetivo
                  </HistCount>
                  <HistCount>
                    ✅ {fmtNum(h.sentCount)} / ❌ {fmtNum(h.failedCount)}
                  </HistCount>
                  <HistRate $rate={h.deliveryRate}>{h.deliveryRate}%</HistRate>
                  <HistDate>{fmtDate(h.sentAt)}</HistDate>
                </HistRow>
              ))}
            </HistTable>
            {histPagination.totalPages > 1 && (
              <HistPager>
                <HistPagerBtn
                  type="button"
                  disabled={historyPage <= 1 || histLoading}
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                >
                  Anterior
                </HistPagerBtn>
                <HistPagerInfo>
                  Página {histPagination.page} de {histPagination.totalPages}
                  <HistPagerTotal>({fmtNum(histPagination.total)} envíos)</HistPagerTotal>
                </HistPagerInfo>
                <HistPagerBtn
                  type="button"
                  disabled={historyPage >= histPagination.totalPages || histLoading}
                  onClick={() => setHistoryPage(p => p + 1)}
                >
                  Siguiente
                </HistPagerBtn>
              </HistPager>
            )}
          </>
        )}
      </HistSection>
    </>
  )
}

/* ── MAIN PAGE ──────────────────────────────────────────────────── */
export default function PushPage({ onMenuClick }) {
  const [tab, setTab]         = useState('directas')
  const [stats, setStats]     = useState({ subscribers: 0, sent30d: 0, failed30d: 0 })
  const [settings, setSettings] = useState(null)
  const [statsLoading, setSL] = useState(true)

  useEffect(() => {
    setSL(true)
    Promise.all([
      api.get('/api/push/stats').catch(() => ({})),
      api.get('/api/push/settings').catch(() => ({})),
    ]).then(([s, g]) => {
      setStats(s)
      setSettings(g.settings || {})
    }).finally(() => setSL(false))
  }, [])

  const handleGlobalToggle = useCallback(async (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    await api.put('/api/push/settings', { [key]: value }).catch(() => {})
  }, [settings])

  return (
    <Wrap>
      <TopBar>
        {onMenuClick && (
          <MenuBtn type="button" onClick={onMenuClick}>
            <MenuIcon />
          </MenuBtn>
        )}
        <TitleBlock>
          <PageTitle>Push Notifications</PageTitle>
          <PageSub>Campañas automáticas y programadas via Firebase FCM</PageSub>
        </TitleBlock>
      </TopBar>

      <StatsRow>
        <StatCard>
          <StatIcon $bg="rgba(99,102,241,.14)" $br="rgba(99,102,241,.26)">
            <PeopleOutlineIcon style={{ fontSize: 16, color: '#a5b4fc' }} />
          </StatIcon>
          <StatInfo>
            <StatVal>{fmtNum(stats?.subscribers)}</StatVal>
            <StatLabel>Suscriptores</StatLabel>
          </StatInfo>
        </StatCard>
        <StatCard>
          <StatIcon $bg="rgba(56,189,248,.12)" $br="rgba(56,189,248,.25)">
            <NotificationsActiveIcon style={{ fontSize: 16, color: '#7dd3fc' }} />
          </StatIcon>
          <StatInfo>
            <StatVal>{fmtNum(stats?.sent30d)}</StatVal>
            <StatLabel>Enviadas (30d)</StatLabel>
          </StatInfo>
        </StatCard>
        <StatCard>
          <StatIcon $bg="rgba(34,197,94,.12)" $br="rgba(34,197,94,.25)">
            <BarChartOutlinedIcon style={{ fontSize: 16, color: '#86efac' }} />
          </StatIcon>
          <StatInfo>
            <StatVal>
              {stats?.sent30d > 0
                ? `${Math.round(((stats.sent30d - (stats.failed30d||0)) / stats.sent30d) * 100)}%`
                : '—'}
            </StatVal>
            <StatLabel>Tasa entrega (30d)</StatLabel>
          </StatInfo>
        </StatCard>
      </StatsRow>

      <TabsWrap>
        {TABS.map(t => (
          <TabBtn key={t.id} $active={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
          </TabBtn>
        ))}
      </TabsWrap>

      <Content>
        {tab === 'directas'   && <NotificationsPage embedded />}
        {tab === 'retencion'  && <RetentionSection />}
        {tab === 'reconsumo'  && <ReconsumptionSection />}
        {tab === 'engagement' && settings && (
          <EngagementSection settings={settings} onGlobalToggle={handleGlobalToggle} />
        )}
        {tab === 'eventos'    && settings && (
          <EventsSection settings={settings} onGlobalToggle={handleGlobalToggle} />
        )}
        {tab === 'vip'        && settings && (
          <VipSection settings={settings} onGlobalToggle={handleGlobalToggle} />
        )}
        {tab === 'onboarding' && settings && (
          <OnboardingSection settings={settings} onGlobalToggle={handleGlobalToggle} />
        )}
        {tab === 'ajustes'    && settings && (
          <SettingsSection settings={settings} onSettings={setSettings} />
        )}
        {!settings && (tab !== 'retencion' && tab !== 'reconsumo') && (
          <Empty><Spinner /> &nbsp;Cargando...</Empty>
        )}
      </Content>
    </Wrap>
  )
}
