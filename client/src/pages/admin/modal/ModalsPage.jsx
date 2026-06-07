import { useCallback, useEffect, useRef, useState } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import MenuIcon from '@mui/icons-material/Menu'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import SendIcon from '@mui/icons-material/Send'
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined'
import FolderOpenOutlinedIcon from '@mui/icons-material/FolderOpenOutlined'
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined'
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined'
import DoneAllOutlinedIcon from '@mui/icons-material/DoneAllOutlined'
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { api, API_BASE_URL, resolveApiAsset } from '../../../utils/api'
import { DESIGN_OPTIONS, DESIGNS } from '../../../components/client/CasinoPopup'
import {
  PageWrap, PageScroll,
  PageHeader, HeaderLeft, MenuBtn, TitleBlock, PageTitle, PageSub, AddBtn,
  StatsStrip, StatCard, StatIconWrap, StatInfo, StatValue, StatLabel,
  MainGrid,
  SendPanel, PanelTitle, PanelSub,

  PreviewHistoryPanel,
  PreviewPlaceholder,

  HistLabel, HistList, HistItem, HistItemTitle, HistItemMeta, HistItemDate, HistEmpty,
  FieldGroup, FieldLabel, FieldInput, FieldTextarea, FieldSelect, FieldRow, CharCount,
  ImgRow, ImgPathInput, ImgPickBtn, ImgPreview, UploadSpinner, UploadErr,
  AudienceRow, AudienceLabel, AudienceBtn,
  ScheduleToggle, ScheduleToggleLeft, ScheduleToggleTitle, ScheduleToggleSub,
  Toggle, ToggleThumb, ScheduleFields,
  SendBtn, SendBtnSpin,
  TemplatesSection, TemplatesSectionHead, TemplatesSectionTitle, TemplatesSectionSub, NewTplBtn,
  TemplateGrid, TemplateCard, CardName, CardTitle, CardBody, CardImg, CardCta, CardDivider, CardActions,
  UseBtn, IconBtn, getCardAccent,
  EmptyState, EmptyIcon, EmptyTitle, EmptySub, EmptyBtns, EmptySeedBtn, EmptyNewBtn,
  SeedPreviewGrid, SeedPreviewCard, SeedCardName, SeedCardBody,
  Overlay, DialogCard, DialogHead, DialogIconBadge, DialogHeadText, DialogTitle, DialogSub, DialogClose,
  DialogBody, DialogFoot, CancelBtn, SaveTplBtn,
  DlgFieldRow, DlgField, DlgLabel, DlgRequired, DlgInput, DlgTextarea, DlgSelect,
  Spinner, LoadingWrap,
  StatusBadge, SendSuccess, SendError,
  DesignPickerWrap, DesignOption, DesignOptionSwatch, DesignOptionLabel, DesignOptionDesc,
} from './ModalsPage.styles'

/* ── constants ──────────────────────────────────────────────────────── */
const CTA_ACTIONS = [
  { value: '',           label: 'Sin acción' },
  { value: 'open_chat',  label: '💬 Abrir Chat (Menú Principal)' },
  { value: 'deposit',    label: '💳 Cargar Fichas' },
  { value: 'promotions', label: '🎁 Ver Promociones' },
  { value: 'lottery',    label: '🎰 Ver Sorteos' },
  { value: 'roulette',   label: '🎡 Ruleta' },
  { value: 'custom_url', label: '🌐 URL personalizada' },
]

const AUDIENCE_OPTIONS = [
  { value: 'all',    label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'vip',    label: 'VIP' },
]

const BLANK_LIVE = {
  title: '', body: '', img: '',
  ctaLabel: '', ctaAction: 'open_chat',
  audience: 'all', scheduled: false, schedDate: '', schedTime: '',
  design: 'gold',
}

const BLANK_TPL = {
  name: '', title: '', body: '', img: '', ctaLabel: '', ctaAction: 'open_chat', design: 'gold',
}

/* ── DesignPicker shared component ── */
function DesignPicker({ value, onChange }) {
  return (
    <DesignPickerWrap>
      {DESIGN_OPTIONS.map(d => (
        <DesignOption
          key={d.value}
          type="button"
          $active={value === d.value}
          $tone={d.value === 'dark' ? 'dark' : 'light'}
          $accent={d.accent}
          $bg={d.bg}
          onClick={() => onChange(d.value)}
        >
          <DesignOptionSwatch $bg={d.bg} $accent={d.accent}>{d.label.split(' ')[0]}</DesignOptionSwatch>
          <DesignOptionLabel $active={value === d.value} $tone={d.value === 'dark' ? 'dark' : 'light'} $accent={d.accent}>{d.label.split(' ')[1]}</DesignOptionLabel>
          <DesignOptionDesc $active={value === d.value} $tone={d.value === 'dark' ? 'dark' : 'light'}>{d.desc}</DesignOptionDesc>
        </DesignOption>
      ))}
    </DesignPickerWrap>
  )
}

const CASINO_TEMPLATES = [
  {
    name: '🔥 BONO 100% NOCTURNO',
    title: '👀 ¿Estás por ahí? Tengo una sorpresa... 🎁',
    body: '🔥 ¡100% EXTRA en todo lo que deposites ahora, ganás y cobrás al instante! 🔥',
    ctaLabel: 'CARGAR AHORA ',
    ctaAction: 'deposit',
  },
  {
    name: '🎡 RULETA GRATIS',
    title: '🎡 TE REGALAMOS UN GIRO GRATIS EN NUESTRA RULETA 🎡',
    body: '🎰 Probá tu suerte en nuestra RULETA GRATIS 🎰 ✅ Sin Depósito 🎁 Grandes premios te esperan... 🎁',
    ctaLabel: 'PARTICIPAR YA',
    ctaAction: 'roulette',
  },
  {
    name: '🏆 SORTEO SEMANAL',
    title: '🏆 ¡EL SORTEO MÁS GRANDE TE ESPERA!',
    body: '🏆 Participá en el sorteo semanal. Elegí entre 1 y 5 y ¡GANÁ premios increíbles! ✨',
    ctaLabel: 'PARTICIPAR AHORA',
    ctaAction: 'lottery',
  },
  {
    name: '💎 MALETÍN MILLONARIO',
    title: '💎 Evento especial: MALETÍN MILLONARIO AL 200%',
    body: '💎 Beneficio exclusivo. Hoy podés pegarla en grande: cargá y DUPLICÁ al instante. ¡No te lo pierdas!',
    ctaLabel: 'CARGAR AHORA',
    ctaAction: 'deposit',
  },
]

/* ── helpers ─────────────────────────────────────────────────────────── */
const fmtDate = (iso, tz) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
    ...(tz && { timeZone: tz }),
  })
}

const ctaLabel = (action) =>
  CTA_ACTIONS.find(a => a.value === action)?.label || action || '—'

async function uploadImg(file) {
  const formData = new FormData()
  formData.append('image', file)

  const data = await api.post('/api/push/upload-image', formData)
  return data.imageUrl
}

/* ── PopupLivePreview ─────────────────────────────────────────────────── */
function PopupLivePreview({ form }) {
  const design = form.design || 'gold'
  
  if (!form.title && !form.body) {
    return (
      <PreviewPlaceholder>
        <VisibilityOutlinedIcon />
        <span>La vista previa aparecerá aquí</span>
        <span style={{ fontSize: '10px', opacity: 0.5 }}>Completá el título para ver el diseño</span>
      </PreviewPlaceholder>
    )
  }
  
  const Design = DESIGNS[design] || DESIGNS.gold
  
  return (
    <div style={{ pointerEvents: 'none' }}>
      <Design popup={form} onDismiss={() => {}} onCta={() => {}} />
    </div>
  )
}

/* ── ImageUploadField ─────────────────────────────────────────────────── */
function ImageUploadField({ value, onChange, uploading, setUploading, error, setError, inputRef, small }) {
  const handleFile = async (file) => {
    if (!file?.type?.startsWith('image/')) {
      setError('Elegí un archivo de imagen (PNG, JPG, WebP…)')
      return
    }
    setUploading(true)
    setError('')
    try {
      const url = await uploadImg(file)
      onChange(url)
    } catch (e) {
      setError(e.message || 'Error al subir imagen')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const src = value ? resolveApiAsset(value) : ''

  return (
    <>
      <ImgRow>
        <ImgPathInput
          placeholder="https://... o subí una imagen"
          value={value}
          onChange={e => onChange(e.target.value)}
          readOnly={uploading}
          style={{ fontSize: small ? 11.5 : undefined }}
        />
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          disabled={uploading}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        <ImgPickBtn
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          title="Subir imagen"
        >
          {uploading ? <UploadSpinner /> : <FolderOpenOutlinedIcon />}
        </ImgPickBtn>
      </ImgRow>
      {error && <UploadErr>{error}</UploadErr>}
      {src && !uploading && (
        <ImgPreview>
          <img src={src} alt="Preview" />
        </ImgPreview>
      )}
    </>
  )
}

/* ── TemplateDialog ──────────────────────────────────────────────────── */
function TemplateDialog({ open, editing, onClose, onSaved }) {
  const [form, setForm] = useState(BLANK_TPL)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const imgRef = useRef()

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        name:      editing.name || '',
        title:     editing.title || '',
        body:      editing.body || '',
        img:       editing.img || '',
        ctaLabel:  editing.ctaLabel || '',
        ctaAction: editing.ctaAction || 'open_chat',
        design:    editing.design || 'gold',
      })
    } else {
      setForm(BLANK_TPL)
    }
    setUploadErr('')
  }, [open, editing])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const isValid = form.name.trim() && form.title.trim()

  const save = async () => {
    if (!isValid) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        title: form.title,
        body: form.body,
        img: form.img,
        ctaLabel: form.ctaLabel,
        ctaAction: form.ctaAction,
        design: form.design || 'gold',
        status: 'borrador',
        audience: 'all',
        dismissible: true,
        isTemplate: true,
      }
      if (editing) {
        await api.put(`/api/modals/${editing.id}`, payload)
      } else {
        await api.post('/api/modals', payload)
      }
      onSaved()
      onClose()
    } catch { } finally { setSaving(false) }
  }

  if (!open) return null
  return (
    <Overlay onClick={e => e.target === e.currentTarget && onClose()}>
      <DialogCard>
        <DialogHead>
          <DialogIconBadge><EditOutlinedIcon /></DialogIconBadge>
          <DialogHeadText>
            <DialogTitle>{editing ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
            <DialogSub>{editing ? `Plantilla: ${editing.name}` : 'Creá una plantilla reutilizable'}</DialogSub>
          </DialogHeadText>
          <DialogClose type="button" onClick={onClose}><CloseIcon /></DialogClose>
        </DialogHead>

        <DialogBody>
          <DlgFieldRow>
            <DlgField>
              <DlgLabel>
                Nombre de la plantilla <DlgRequired>*</DlgRequired>
              </DlgLabel>
              <DlgInput
                placeholder="Ej: BONO 100% NOCTURNO"
                value={form.name}
                onChange={e => set('name', e.target.value)}
              />
            </DlgField>
            <DlgField>
              <DlgLabel>
                Título del popup <DlgRequired>*</DlgRequired>
              </DlgLabel>
              <DlgInput
                placeholder="Ej: 👀 ¿Estás por ahí?"
                value={form.title}
                onChange={e => set('title', e.target.value)}
              />
            </DlgField>
          </DlgFieldRow>

          <DlgField>
            <DlgLabel>Mensaje</DlgLabel>
            <DlgTextarea
              placeholder="Texto principal del popup..."
              maxLength={300}
              value={form.body}
              onChange={e => set('body', e.target.value)}
            />
          </DlgField>

          <DlgField>
            <DlgLabel>Imagen (opcional)</DlgLabel>
            <ImageUploadField
              value={form.img}
              onChange={v => set('img', v)}
              uploading={uploading}
              setUploading={setUploading}
              error={uploadErr}
              setError={setUploadErr}
              inputRef={imgRef}
              small
            />
          </DlgField>

          <DlgFieldRow>
            <DlgField>
              <DlgLabel>Texto del botón</DlgLabel>
              <DlgInput
                placeholder="CARGAR FICHAS"
                value={form.ctaLabel}
                onChange={e => set('ctaLabel', e.target.value)}
              />
            </DlgField>
            <DlgField>
              <DlgLabel>Acción del botón</DlgLabel>
              <DlgSelect
                value={form.ctaAction}
                onChange={e => set('ctaAction', e.target.value)}
              >
                {CTA_ACTIONS.map(a => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </DlgSelect>
            </DlgField>
          </DlgFieldRow>

          <DlgField>
            <DlgLabel>Diseño del popup</DlgLabel>
            <DesignPicker value={form.design || 'gold'} onChange={v => set('design', v)} />
          </DlgField>
        </DialogBody>

        <DialogFoot>
          <CancelBtn type="button" onClick={onClose}>Cancelar</CancelBtn>
          <SaveTplBtn
            type="button"
            $saving={saving}
            disabled={!isValid || saving || uploading}
            onClick={save}
          >
            {saving ? <Spinner /> : <SaveOutlinedIcon style={{ fontSize: 16 }} />}
            {editing ? 'Actualizar' : 'Crear plantilla'}
          </SaveTplBtn>
        </DialogFoot>
      </DialogCard>
    </Overlay>
  )
}

/* ── MAIN PAGE ───────────────────────────────────────────────────────── */
export default function ModalsPage({ onMenuOpen }) {
  const { timezone }                  = useDateFormat()
  const [templates, setTemplates]     = useState([])
  const [tplLoading, setTplLoading]   = useState(true)
  const [history, setHistory]         = useState([])
  const [histLoading, setHistLoading] = useState(true)
  const [stats, setStats]             = useState({ enviadas: 0, programadas: 0, borradores: 0 })

  /* live send form */
  const [live, setLive]           = useState(BLANK_LIVE)
  const [sending, setSending]     = useState(false)
  const [sendErr, setSendErr]     = useState('')
  const [sendOk, setSendOk]       = useState(false)
  const [liveUploading, setLiveUploading] = useState(false)
  const [liveUploadErr, setLiveUploadErr] = useState('')
  const liveImgRef = useRef()

  /* template dialog */
  const [dlgOpen, setDlgOpen]       = useState(false)
  const [editingTpl, setEditingTpl] = useState(null)

  /* seed loading */
  const [seeding, setSeeding] = useState(false)

  const loadTemplates = useCallback(async () => {
    setTplLoading(true)
    try {
      const data = await api.get('/api/modals?status=borrador&limit=100')
      setTemplates(data.modals || [])
      setStats(data.stats || { enviadas: 0, programadas: 0, borradores: 0 })
    } catch { } finally { setTplLoading(false) }
  }, [])

  const loadHistory = useCallback(async () => {
    setHistLoading(true)
    try {
      const data = await api.get('/api/modals?limit=12')
      const sent = (data.modals || []).filter(m => m.status === 'enviada' || m.status === 'programada')
      setHistory(sent)
    } catch { } finally { setHistLoading(false) }
  }, [])

  useEffect(() => {
    loadTemplates()
    loadHistory()
  }, [loadTemplates, loadHistory])

  /* auto-seed casino templates on first use */
  const seedTemplates = async () => {
    setSeeding(true)
    try {
      for (const t of CASINO_TEMPLATES) {
        await api.post('/api/modals', {
          name: t.name, title: t.title, body: t.body,
          img: '', ctaLabel: t.ctaLabel, ctaAction: t.ctaAction,
          status: 'borrador', audience: 'all', dismissible: true, isTemplate: true,
        })
      }
      await loadTemplates()
    } catch { } finally { setSeeding(false) }
  }

  const setLiveField = (k, v) => setLive(f => ({ ...f, [k]: v }))

  const useTpl = (tpl) => {
    setLive({
      title:     tpl.title || '',
      body:      tpl.body || '',
      img:       tpl.img || '',
      ctaLabel:  tpl.ctaLabel || '',
      ctaAction: tpl.ctaAction || 'open_chat',
      audience:  tpl.audience || 'all',
      scheduled: false, schedDate: '', schedTime: '',
      design:    tpl.design || 'gold',
    })
    setSendErr('')
    setSendOk(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSend = async () => {
    if (!live.title.trim()) { setSendErr('El título es requerido'); return }
    setSendErr('')
    setSendOk(false)
    setSending(true)
    try {
      const scheduledFor = live.scheduled && live.schedDate
        ? new Date(`${live.schedDate}T${live.schedTime || '09:00'}:00`).toISOString()
        : null
      await api.post('/api/modals', {
        name: live.title,
        title: live.title,
        body: live.body,
        img: live.img,
        ctaLabel: live.ctaLabel,
        ctaAction: live.ctaAction,
        design: live.design || 'gold',
        audience: live.audience,
        status: scheduledFor ? 'programada' : 'enviada',
        sentAt: scheduledFor ? null : new Date().toISOString(),
        scheduledFor,
        dismissible: true,
        isTemplate: false,
      })
      setSendOk(true)
      setTimeout(() => setSendOk(false), 4000)
      setLive(BLANK_LIVE)
      await loadHistory()
      await loadTemplates()
    } catch (e) {
      setSendErr(e.message || 'Error al enviar el popup')
    } finally { setSending(false) }
  }

  const deleteTpl = async (id) => {
    await api.delete(`/api/modals/${id}`).catch(() => {})
    setTemplates(prev => prev.filter(t => t.id !== id))
    setStats(prev => ({ ...prev, borradores: Math.max(0, prev.borradores - 1) }))
  }

  const openNewTpl = () => { setEditingTpl(null); setDlgOpen(true) }
  const openEditTpl = (tpl) => { setEditingTpl(tpl); setDlgOpen(true) }
  const closeDlg = () => { setDlgOpen(false); setEditingTpl(null) }

  const isLiveValid = live.title.trim().length > 0

  return (
    <PageWrap data-tour="modals-page">
      <PageScroll>
        {/* ── header ── */}
        <PageHeader>
          <HeaderLeft>
            {onMenuOpen && (
              <MenuBtn type="button" onClick={onMenuOpen} aria-label="Menú">
                <MenuIcon />
              </MenuBtn>
            )}
            <TitleBlock>
              <PageTitle>Popups en Vivo</PageTitle>
              <PageSub>Ventanas emergentes para promover ofertas y eventos en tiempo real</PageSub>
            </TitleBlock>
          </HeaderLeft>
          <AddBtn type="button" onClick={openNewTpl}>
            <AddIcon /> Nueva Plantilla
          </AddBtn>
        </PageHeader>

        {/* ── stats ── */}
        <StatsStrip>
          <StatCard>
            <StatIconWrap $bg="rgba(99,102,241,.12)" $br="rgba(99,102,241,.24)" $cl="#a5b4fc">
              <FolderOutlinedIcon />
            </StatIconWrap>
            <StatInfo>
              <StatValue>{stats.borradores}</StatValue>
              <StatLabel>Plantillas</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(34,197,94,.10)" $br="rgba(34,197,94,.22)" $cl="#4ade80">
              <DoneAllOutlinedIcon />
            </StatIconWrap>
            <StatInfo>
              <StatValue>{stats.enviadas}</StatValue>
              <StatLabel>Popups Enviados</StatLabel>
            </StatInfo>
          </StatCard>
          <StatCard>
            <StatIconWrap $bg="rgba(14,165,233,.10)" $br="rgba(14,165,233,.22)" $cl="#38bdf8">
              <AccessTimeOutlinedIcon />
            </StatIconWrap>
            <StatInfo>
              <StatValue>{stats.programadas}</StatValue>
              <StatLabel>Programados</StatLabel>
            </StatInfo>
          </StatCard>
        </StatsStrip>

        {/* ── main grid: send form + preview/history ── */}
        <MainGrid data-tour="modals-content">
          {/* LEFT: send form */}
          <SendPanel>
            <div>
              <PanelTitle>
                <ForumOutlinedIcon /> Enviar Popup en Vivo
              </PanelTitle>
              <PanelSub>Completá los campos y enviá o programá un popup para tus usuarios</PanelSub>
            </div>

            <FieldGroup>
              <FieldLabel>Título</FieldLabel>
              <FieldInput
                placeholder="Ej: 🎁 Promoción Especial!"
                value={live.title}
                onChange={e => setLiveField('title', e.target.value)}
              />
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Mensaje</FieldLabel>
              <FieldTextarea
                placeholder="Aprovechá el 200% de bono en tu próximo depósito"
                maxLength={300}
                value={live.body}
                onChange={e => setLiveField('body', e.target.value)}
              />
              <CharCount $warn={live.body.length > 240}>{live.body.length}/300</CharCount>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Imagen (opcional)</FieldLabel>
              <ImageUploadField
                value={live.img}
                onChange={v => setLiveField('img', v)}
                uploading={liveUploading}
                setUploading={setLiveUploading}
                error={liveUploadErr}
                setError={setLiveUploadErr}
                inputRef={liveImgRef}
              />
            </FieldGroup>

            <FieldRow>
              <FieldGroup>
                <FieldLabel>Texto del botón</FieldLabel>
                <FieldInput
                  placeholder="CARGAR FICHAS"
                  value={live.ctaLabel}
                  onChange={e => setLiveField('ctaLabel', e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <FieldLabel>Acción del botón</FieldLabel>
                <FieldSelect
                  value={live.ctaAction}
                  onChange={e => setLiveField('ctaAction', e.target.value)}
                >
                  {CTA_ACTIONS.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </FieldSelect>
              </FieldGroup>
            </FieldRow>

            <FieldGroup>
              <AudienceRow>
                <AudienceLabel>Destinatario</AudienceLabel>
                {AUDIENCE_OPTIONS.map(o => (
                  <AudienceBtn
                    key={o.value}
                    type="button"
                    $active={live.audience === o.value}
                    onClick={() => setLiveField('audience', o.value)}
                  >
                    {o.label}
                  </AudienceBtn>
                ))}
              </AudienceRow>
            </FieldGroup>

            <FieldGroup>
              <FieldLabel>Diseño del popup</FieldLabel>
              <DesignPicker value={live.design || 'gold'} onChange={v => setLiveField('design', v)} />
            </FieldGroup>

            <ScheduleToggle>
              <ScheduleToggleLeft>
                <ScheduleToggleTitle>Programar envío</ScheduleToggleTitle>
                <ScheduleToggleSub>Elegí fecha y hora de visualización</ScheduleToggleSub>
              </ScheduleToggleLeft>
              <Toggle
                type="button"
                $on={live.scheduled}
                onClick={() => setLiveField('scheduled', !live.scheduled)}
              >
                <ToggleThumb $on={live.scheduled} />
              </Toggle>
            </ScheduleToggle>

            {live.scheduled && (
              <ScheduleFields>
                <FieldGroup>
                  <FieldLabel>Fecha</FieldLabel>
                  <FieldInput
                    type="date"
                    value={live.schedDate}
                    onChange={e => setLiveField('schedDate', e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup>
                  <FieldLabel>Hora</FieldLabel>
                  <FieldInput
                    type="time"
                    value={live.schedTime}
                    onChange={e => setLiveField('schedTime', e.target.value)}
                  />
                </FieldGroup>
              </ScheduleFields>
            )}

            {sendOk && (
              <SendSuccess>
                <CheckCircleOutlinedIcon />
                {live.scheduled ? '¡Popup programado con éxito!' : '¡Popup enviado con éxito!'}
              </SendSuccess>
            )}
            {sendErr && <SendError>{sendErr}</SendError>}

            <SendBtn
              type="button"
              $disabled={!isLiveValid || sending || liveUploading}
              disabled={!isLiveValid || sending || liveUploading}
              onClick={handleSend}
            >
              {sending
                ? <><SendBtnSpin /> Enviando...</>
                : <><SendIcon /> {live.scheduled ? 'Programar Popup' : 'Enviar Popup'}</>
              }
            </SendBtn>
          </SendPanel>

          {/* RIGHT: preview + history */}
          <PreviewHistoryPanel>
            <div>
              <PanelTitle>
                <VisibilityOutlinedIcon /> Preview &amp; Historial
              </PanelTitle>
            </div>

            <PopupLivePreview form={live} />

            <HistLabel>Historial:</HistLabel>
            {histLoading ? (
              <LoadingWrap style={{ minHeight: 80 }}>
                <Spinner /> Cargando...
              </LoadingWrap>
            ) : history.length === 0 ? (
              <HistEmpty>Sin historial de popups todavía</HistEmpty>
            ) : (
              <HistList>
                {history.map(h => (
                  <HistItem key={h.id} onClick={() => useTpl(h)}>
                    <HistItemDate>{fmtDate(h.sentAt || h.scheduledFor, timezone)}</HistItemDate>
                    <HistItemTitle>{h.title || '(sin título)'}</HistItemTitle>
                    <HistItemMeta>{h.body || '—'}</HistItemMeta>
                  </HistItem>
                ))}
              </HistList>
            )}
          </PreviewHistoryPanel>
        </MainGrid>

        {/* ── templates ── */}
        <TemplatesSection>
          <TemplatesSectionHead>
            <div>
              <TemplatesSectionTitle>
                🗂️ Plantillas Guardadas
              </TemplatesSectionTitle>
              <TemplatesSectionSub>
                Usá una plantilla para rellenar el formulario de envío rápidamente
              </TemplatesSectionSub>
            </div>
            <NewTplBtn type="button" onClick={openNewTpl}>
              <AddIcon /> Nueva Plantilla
            </NewTplBtn>
          </TemplatesSectionHead>

          {tplLoading ? (
            <LoadingWrap>
              <Spinner /> Cargando plantillas...
            </LoadingWrap>
          ) : templates.length === 0 ? (
            <EmptyState>
              <EmptyIcon><AutoAwesomeIcon /></EmptyIcon>
              <EmptyTitle>No tenés plantillas guardadas</EmptyTitle>
              <EmptySub>
                Comenzá con 4 plantillas de casino prediseñadas<br />
                o creá la tuya desde cero.
              </EmptySub>
              <SeedPreviewGrid>
                {CASINO_TEMPLATES.map((t, i) => {
                  const colors = ['#a5b4fc', '#fcd34d', '#6ee7b7', '#f9a8d4']
                  return (
                    <SeedPreviewCard key={i}>
                      <SeedCardName $cl={colors[i]}>{t.name}</SeedCardName>
                      <SeedCardBody>{t.body}</SeedCardBody>
                    </SeedPreviewCard>
                  )
                })}
              </SeedPreviewGrid>
              <EmptyBtns>
                <EmptySeedBtn type="button" disabled={seeding} onClick={seedTemplates}>
                  {seeding ? <><Spinner />Creando...</> : <><AutoAwesomeIcon />Crear las 4 plantillas de casino</>}
                </EmptySeedBtn>
                <EmptyNewBtn type="button" onClick={openNewTpl}>
                  <AddIcon /> Crear plantilla propia
                </EmptyNewBtn>
              </EmptyBtns>
            </EmptyState>
          ) : (
            <TemplateGrid>
              {templates.map((tpl, i) => {
                const accent = getCardAccent(i)
                return (
                  <TemplateCard
                    key={tpl.id}
                    $accent={accent}
                    $delay={`${i * 0.03}s`}
                  >
                    <CardName $color={accent.name}>
                      {tpl.name}
                      {tpl.design && (
                        <span style={{ marginLeft: 6, fontSize: 10, opacity: .55, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
                          {DESIGN_OPTIONS.find(d => d.value === tpl.design)?.label || ''}
                        </span>
                      )}
                    </CardName>
                    {tpl.title && <CardTitle>{tpl.title}</CardTitle>}
                    {tpl.body && <CardBody>{tpl.body}</CardBody>}
                    {tpl.img && (
                      <CardImg>
                        <img src={resolveApiAsset(tpl.img)} alt="" />
                      </CardImg>
                    )}
                    {(tpl.ctaLabel || tpl.ctaAction) && (
                      <CardCta>
                        {tpl.ctaLabel ? `Botón: "${tpl.ctaLabel}"` : ''}
                        {tpl.ctaAction ? ` → ${ctaLabel(tpl.ctaAction)}` : ''}
                      </CardCta>
                    )}
                    <CardDivider />
                    <CardActions>
                      <UseBtn type="button" onClick={() => useTpl(tpl)}>Usar</UseBtn>
                      <IconBtn type="button" onClick={() => openEditTpl(tpl)}>
                        <EditOutlinedIcon />
                      </IconBtn>
                      <IconBtn type="button" $v="danger" onClick={() => deleteTpl(tpl.id)}>
                        <DeleteOutlinedIcon />
                      </IconBtn>
                    </CardActions>
                  </TemplateCard>
                )
              })}
            </TemplateGrid>
          )}
        </TemplatesSection>
      </PageScroll>

      <TemplateDialog
        open={dlgOpen}
        editing={editingTpl}
        onClose={closeDlg}
        onSaved={loadTemplates}
      />
    </PageWrap>
  )
}
