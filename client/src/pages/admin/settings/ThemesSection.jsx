import { useState, useRef, useEffect, useCallback } from 'react'
import SmartphoneOutlinedIcon from '@mui/icons-material/SmartphoneOutlined'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import ChatBubbleOutlineOutlinedIcon from '@mui/icons-material/ChatBubbleOutlineOutlined'
import CheckIcon from '@mui/icons-material/Check'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import { api } from '../../../utils/api'
import { applyThemeConfig } from '../../../styles/appThemes'
import { useSystemConfig } from '../../../context/SystemConfigContext'
import { BUBBLE_ICONS, ICON_MAP, DEFAULT_BUBBLE_CONFIG } from '../../../utils/bubbleIcons'
import {
  ThemesWrap, SubTabBar, SubTab, SectionBanner,
  ThemeGrid, ThemeCard, ThemeCardPreview, CheckOverlay, ThemeCardInfo, ThemeNameRow,
  ThemeName, ActiveBadge, WhatsAppBadge, ThemeDesc, CustomBadge,
  MiniPhone, MiniHeader, MiniAvatar, MiniHeaderText, MiniBar, MiniHeaderIcons, MiniHeaderIcon,
  MiniBody, MiniBubble, MiniLine, MiniInputBar, MiniInputField, MiniSendBtn,
  AdminThemeGrid,
  MiniAdminLayout, MiniAdminSidebar, MiniSidebarDot, MiniSidebarLine,
  MiniAdminContent, MiniAdminTopbar, MiniAdminBody, MiniAdminCard, MiniAdminGrid, MiniAdminGridCard,
  ColorSwatchRow, ColorSwatch, SwatchLabel,
  SaveBar, SaveHint, ApplyBtn, WA_BG_STYLE,
  AddThemeCard, AddThemeLabel,
  CustomCardControls, CustomCardBtn,
  CModalOverlay, CModalCard, CModalHeader, CModalTitle, CModalClose,
  CModalBody, CModalFooter, CModalCancelBtn, CModalSaveBtn,
  ColorGroupWrap, ColorGroupLabel, ColorFieldGrid, ColorFieldRow,
  ColorDot, ColorFieldLabel, ColorHexValue,
  ThemeNameField, ModalPreviewRow, ModalPreviewBox, ModalPreviewLabel,
  BubbleStyleGrid, BubbleStylePreview,
  BubbleConfigSection, BubbleConfigTitle, BubbleConfigRow, BubbleConfigLabel,
  BubbleTextInput, IconPickerGrid, IconPickerBtn,
  ToggleRow, ToggleLabel, ToggleTrack, ToggleThumb, GradientPreview,
} from './ThemesSection.styles'

/* ─────────────────────────────
   Bubble style definitions
───────────────────────────── */
const BUBBLE_STYLES = [
  { id: 'default', name: 'Circular',  desc: 'Botón redondo clásico. Muestra el texto al pasar el cursor.' },
  { id: 'open',    name: 'Abierta',   desc: 'Píldora siempre visible con ícono y texto.' },
  { id: 'wide',    name: 'Amplia',    desc: 'Tarjeta ancha con ícono destacado y texto.' },
  { id: 'minimal', name: 'Minimal',   desc: 'Solo ícono. Diseño limpio y discreto.' },
]

const BUBBLE_TEXT_PLACEHOLDERS = {
  default: 'Soporte (por defecto: nombre del app)',
  open:    'Chatear',
  wide:    '¿Necesitas ayuda?',
}

/* Mini preview of each bubble style */
const MiniBubblePreview = ({ styleId, styleConfig }) => {
  const icon = (styleConfig && styleConfig.icon) || 'ChatOutlined'
  const label = (styleConfig && styleConfig.text) || BUBBLE_TEXT_PLACEHOLDERS[styleId] || ''
  const IconComp = ICON_MAP[icon] || ICON_MAP.ChatOutlined

  const bg   = 'linear-gradient(135deg,#0b3361,#1250f0)'
  const text = '#fff'

  const wrap = {
    width: '100%', height: '100%', position: 'relative',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
    padding: 14, boxSizing: 'border-box',
  }

  if (styleId === 'open') return (
    <div style={wrap}>
      <div style={{
        height: 38, borderRadius: 19, padding: '0 14px 0 10px',
        background: bg,
        display: 'flex', alignItems: 'center', gap: 7,
        boxShadow: '0 4px 14px rgba(40,140,255,0.35)',
      }}>
        <IconComp style={{ color: text, fontSize: '1rem' }} />
        <span style={{ color: text, fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
          {label || 'Chatear'}
        </span>
      </div>
    </div>
  )

  if (styleId === 'wide') return (
    <div style={wrap}>
      <div style={{
        height: 44, width: 158, borderRadius: 14,
        background: bg,
        display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px',
        boxShadow: '0 4px 14px rgba(40,140,255,0.35)', boxSizing: 'border-box',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <IconComp style={{ color: text, fontSize: '0.85rem' }} />
        </div>
        <span style={{
          color: text, fontSize: 10.5, fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {label || '¿Necesitas ayuda?'}
        </span>
      </div>
    </div>
  )

  if (styleId === 'minimal') return (
    <div style={wrap}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: 'rgba(40,140,255,0.14)',
        border: '1.5px solid rgba(40,140,255,0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <IconComp style={{ color: '#60a5fa', fontSize: '1.15rem' }} />
      </div>
    </div>
  )

  /* default */
  return (
    <div style={wrap}>
      <div style={{
        width: 44, height: 44, borderRadius: '50%',
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 14px rgba(40,140,255,0.35)',
      }}>
        <IconComp style={{ color: text, fontSize: '1.15rem' }} />
      </div>
    </div>
  )
}

/* ─────────────────────────────
   Preset theme definitions
───────────────────────────── */
const CLIENT_THEMES = [
  {
    id: 'betchat-dark',
    name: 'BetChat Dark',
    desc: 'Tema por defecto. Oscuro con acentos azules.',
    headerBg: '#0f1122', headerColor: '#ffffff',
    bodyBg: '#08080f',
    sentBubble: '#1e40af', sentText: '#dbeafe',
    recvBubble: '#1a1a2e', recvText: '#e2e8f0',
    inputBg: '#111124', accent: '#2563eb',
    waTheme: false,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Tema claro estilo WhatsApp con patrón de fondo.',
    headerBg: '#128C7E', headerColor: '#ffffff',
    bodyBg: '#e5ddd5',
    sentBubble: '#dcf8c6', sentText: '#111b21',
    recvBubble: '#ffffff', recvText: '#111b21',
    inputBg: '#f0f2f5', accent: '#25d366',
    waTheme: true,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    desc: 'Oscuro profundo con acentos violeta.',
    headerBg: '#1a0a2e', headerColor: '#e9d5ff',
    bodyBg: '#0d0520',
    sentBubble: '#5b21b6', sentText: '#ede9fe',
    recvBubble: '#1e1040', recvText: '#ddd6fe',
    inputBg: '#150830', accent: '#7c3aed',
    waTheme: false,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    desc: 'Azul profundo con acentos cyan.',
    headerBg: '#0c1a2e', headerColor: '#bae6fd',
    bodyBg: '#071525',
    sentBubble: '#0369a1', sentText: '#e0f2fe',
    recvBubble: '#0f2a44', recvText: '#bae6fd',
    inputBg: '#0a2038', accent: '#0891b2',
    waTheme: false,
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    desc: 'Verde oscuro con acentos esmeralda.',
    headerBg: '#052e16', headerColor: '#bbf7d0',
    bodyBg: '#021a0c',
    sentBubble: '#166534', sentText: '#dcfce7',
    recvBubble: '#0a2e14', recvText: '#bbf7d0',
    inputBg: '#041a0a', accent: '#059669',
    waTheme: false,
  },
  {
    id: 'sunset',
    name: 'Sunset',
    desc: 'Oscuro cálido con acentos naranja-rojo.',
    headerBg: '#1c0a0a', headerColor: '#fecaca',
    bodyBg: '#120505',
    sentBubble: '#991b1b', sentText: '#fee2e2',
    recvBubble: '#2a0c0c', recvText: '#fecaca',
    inputBg: '#1a0808', accent: '#dc2626',
    waTheme: false,
  },
]

const ADMIN_THEMES = [
  {
    id: 'dark-blue',
    name: 'Dark Blue',
    desc: 'Tema por defecto del panel.',
    sidebarBg: '#0b0b18', sidebarAccent: '#1e85ff',
    topbarBg: '#0d0d1f', contentBg: '#08080f', cardBg: '#111124',
    swatches: ['#0b0b18', '#1e85ff', '#08080f'],
  },
  {
    id: 'dark-purple',
    name: 'Dark Purple',
    desc: 'Acentos violeta intenso.',
    sidebarBg: '#120920', sidebarAccent: '#8b5cf6',
    topbarBg: '#15092a', contentBg: '#0d0618', cardBg: '#1a0f30',
    swatches: ['#120920', '#8b5cf6', '#0d0618'],
  },
  {
    id: 'dark-emerald',
    name: 'Dark Emerald',
    desc: 'Acentos esmeralda vibrantes.',
    sidebarBg: '#071a10', sidebarAccent: '#10b981',
    topbarBg: '#091f14', contentBg: '#041209', cardBg: '#0a2010',
    swatches: ['#071a10', '#10b981', '#041209'],
  },
  {
    id: 'dark-rose',
    name: 'Dark Rose',
    desc: 'Acentos rosa-rojo vibrantes.',
    sidebarBg: '#1a0810', sidebarAccent: '#f43f5e',
    topbarBg: '#1e0a14', contentBg: '#120408', cardBg: '#22081c',
    swatches: ['#1a0810', '#f43f5e', '#120408'],
  },
  {
    id: 'dark-cyan',
    name: 'Dark Cyan',
    desc: 'Acentos cian eléctrico.',
    sidebarBg: '#06131e', sidebarAccent: '#22d3ee',
    topbarBg: '#081828', contentBg: '#040c18', cardBg: '#0a1e2c',
    swatches: ['#06131e', '#22d3ee', '#040c18'],
  },
  {
    id: 'slate',
    name: 'Slate',
    desc: 'Minimalista gris pizarra.',
    sidebarBg: '#0f172a', sidebarAccent: '#94a3b8',
    topbarBg: '#1e293b', contentBg: '#0a1020', cardBg: '#1e293b',
    swatches: ['#0f172a', '#94a3b8', '#0a1020'],
  },
]

const DEFAULT_CLIENT_FORM = {
  name: '', headerBg: '#0f1122', headerColor: '#ffffff',
  bodyBg: '#08080f', sentBubble: '#1e40af', sentText: '#dbeafe',
  recvBubble: '#1a1a2e', recvText: '#e2e8f0', inputBg: '#111124', accent: '#2563eb',
  waTheme: false,
  surface: '#111124', textPrimary: '#f8fafc', textSecondary: '#94a3b8',
  onAccent: '#ffffff', buttonFrom: '#0d1d6e', buttonTo: '#2563eb',
  isDark: true,
}

const DEFAULT_ADMIN_FORM = {
  name: '', sidebarBg: '#0b0b18', sidebarAccent: '#1e85ff',
  topbarBg: '#0d0d1f', contentBg: '#08080f', cardBg: '#111124',
}

/* ─────────────────────────────
   Mini previews (shared)
───────────────────────────── */
const MiniChatPreview = ({ theme }) => {
  const bodyStyle = theme.waTheme ? WA_BG_STYLE : { background: theme.bodyBg }
  return (
    <MiniPhone>
      <MiniHeader style={{ background: theme.headerBg }}>
        <MiniAvatar style={{ background: theme.accent }} />
        <MiniHeaderText>
          <MiniBar style={{ width: 36, height: 7, background: theme.headerColor, opacity: 0.85 }} />
          <MiniBar style={{ width: 22, height: 4, background: theme.headerColor, opacity: 0.35, marginTop: 3 }} />
        </MiniHeaderText>
        <MiniHeaderIcons>
          <MiniHeaderIcon style={{ background: theme.headerColor }} />
          <MiniHeaderIcon style={{ background: theme.headerColor }} />
        </MiniHeaderIcons>
      </MiniHeader>
      <MiniBody style={bodyStyle}>
        <MiniBubble style={{ background: theme.recvBubble }}>
          <MiniLine style={{ width: 52, height: 5, background: theme.recvText, opacity: 0.75 }} />
          <MiniLine style={{ width: 32, height: 4, background: theme.recvText, opacity: 0.45 }} />
        </MiniBubble>
        <MiniBubble $sent style={{ background: theme.sentBubble }}>
          <MiniLine style={{ width: 44, height: 5, background: theme.sentText, opacity: 0.80 }} />
          <MiniLine style={{ width: 28, height: 4, background: theme.sentText, opacity: 0.45 }} />
        </MiniBubble>
        <MiniBubble style={{ background: theme.recvBubble }}>
          <MiniLine style={{ width: 60, height: 5, background: theme.recvText, opacity: 0.75 }} />
        </MiniBubble>
      </MiniBody>
      <MiniInputBar style={{ background: theme.inputBg }}>
        <MiniInputField style={{ background: theme.recvText, opacity: 0.12 }} />
        <MiniSendBtn style={{
          background: (theme.buttonFrom && theme.buttonTo)
            ? `linear-gradient(135deg, ${theme.buttonFrom} 0%, ${theme.buttonTo} 100%)`
            : theme.accent,
        }} />
      </MiniInputBar>
    </MiniPhone>
  )
}

const MiniAdminPreview = ({ theme }) => (
  <MiniAdminLayout style={{ height: '100%' }}>
    <MiniAdminSidebar style={{ background: theme.sidebarBg, borderRight: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ width: 18, height: 18, borderRadius: 5, background: theme.sidebarAccent, marginBottom: 4 }} />
      <MiniSidebarDot $active style={{ background: theme.sidebarAccent }} />
      <MiniSidebarDot style={{ background: 'rgba(255,255,255,0.15)' }} />
      <MiniSidebarDot style={{ background: 'rgba(255,255,255,0.15)' }} />
      <MiniSidebarLine style={{ background: 'rgba(255,255,255,0.15)' }} />
      <MiniSidebarDot style={{ background: 'rgba(255,255,255,0.15)' }} />
    </MiniAdminSidebar>
    <MiniAdminContent style={{ background: theme.contentBg }}>
      <MiniAdminTopbar style={{ background: theme.topbarBg, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ flex: 1, height: 7, borderRadius: 3, background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ width: 18, height: 7, borderRadius: 3, background: theme.sidebarAccent, marginLeft: 6 }} />
      </MiniAdminTopbar>
      <MiniAdminBody>
        <MiniAdminCard style={{ background: theme.cardBg }} />
        <MiniAdminGrid>
          <MiniAdminGridCard style={{ background: theme.cardBg }} />
          <MiniAdminGridCard style={{ background: theme.cardBg }} />
        </MiniAdminGrid>
      </MiniAdminBody>
    </MiniAdminContent>
  </MiniAdminLayout>
)

/* ─────────────────────────────
   Color picker field
───────────────────────────── */
const ColorField = ({ label, value, onChange }) => {
  const ref = useRef(null)
  const safeVal = (value && value.startsWith('#')) ? value : '#000000'
  return (
    <ColorFieldRow onClick={() => ref.current?.click()}>
      <ColorDot style={{ background: safeVal }} />
      <ColorFieldLabel>{label}</ColorFieldLabel>
      <ColorHexValue>{safeVal.toUpperCase()}</ColorHexValue>
      <input
        ref={ref}
        type="color"
        value={safeVal}
        onChange={e => onChange(e.target.value)}
        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, left: 0, top: 0, pointerEvents: 'none' }}
      />
    </ColorFieldRow>
  )
}

/* ─────────────────────────────
   Custom theme modal
───────────────────────────── */
const CustomThemeModal = ({ type, form, setField, onClose, onSave, isEditing }) => {
  const isClient = type === 'cliente'
  const isValid  = form.name.trim().length > 0

  return (
    <CModalOverlay onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <CModalCard>

        <CModalHeader>
          <CModalTitle>
            {isEditing ? 'Editar tema' : 'Nuevo tema personalizado'}
          </CModalTitle>
          <CModalClose type="button" onClick={onClose}><CloseIcon /></CModalClose>
        </CModalHeader>

        <CModalBody>

          {/* preview + name */}
          <ModalPreviewRow>
            <ModalPreviewBox>
              {isClient
                ? <MiniChatPreview theme={form} />
                : <MiniAdminPreview theme={form} />
              }
            </ModalPreviewBox>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <ModalPreviewLabel>Nombre del tema</ModalPreviewLabel>
              <ThemeNameField
                type="text"
                placeholder={isClient ? 'Mi tema oscuro…' : 'Mi esquema admin…'}
                value={form.name}
                onChange={e => setField('name', e.target.value)}
                maxLength={32}
                autoFocus
              />
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', lineHeight: 1.5 }}>
                La vista previa se actualiza en tiempo real conforme cambias los colores.
              </span>
            </div>
          </ModalPreviewRow>

          {/* client color groups */}
          {isClient && (
            <>
              <ColorGroupWrap>
                <ColorGroupLabel>Header</ColorGroupLabel>
                <ColorFieldGrid>
                  <ColorField label="Fondo"           value={form.headerBg}    onChange={v => setField('headerBg', v)} />
                  <ColorField label="Texto / íconos"  value={form.headerColor} onChange={v => setField('headerColor', v)} />
                  <ColorField label="Acento principal" value={form.accent}     onChange={v => setField('accent', v)} />
                </ColorFieldGrid>
              </ColorGroupWrap>

              <ColorGroupWrap>
                <ColorGroupLabel>Burbujas</ColorGroupLabel>
                <ColorFieldGrid>
                  <ColorField label="Enviada — fondo"   value={form.sentBubble} onChange={v => setField('sentBubble', v)} />
                  <ColorField label="Enviada — texto"   value={form.sentText}   onChange={v => setField('sentText', v)} />
                  <ColorField label="Recibida — fondo"  value={form.recvBubble} onChange={v => setField('recvBubble', v)} />
                  <ColorField label="Recibida — texto"  value={form.recvText}   onChange={v => setField('recvText', v)} />
                </ColorFieldGrid>
              </ColorGroupWrap>

              <ColorGroupWrap>
                <ColorGroupLabel>Fondo y entrada</ColorGroupLabel>
                <ColorFieldGrid>
                  <ColorField label="Fondo principal"   value={form.bodyBg}   onChange={v => setField('bodyBg', v)} />
                  <ColorField label="Barra de entrada"  value={form.inputBg}  onChange={v => setField('inputBg', v)} />
                  <ColorField label="Paneles / tarjetas" value={form.surface || form.bodyBg} onChange={v => setField('surface', v)} />
                </ColorFieldGrid>
              </ColorGroupWrap>

              <ColorGroupWrap>
                <ColorGroupLabel>Botones y burbuja de chat</ColorGroupLabel>
                <ColorFieldGrid>
                  <ColorField label="Gradiente — inicio" value={form.buttonFrom || form.sentBubble} onChange={v => setField('buttonFrom', v)} />
                  <ColorField label="Gradiente — fin"    value={form.buttonTo   || form.accent}     onChange={v => setField('buttonTo', v)} />
                  <ColorField label="Texto en botones"   value={form.onAccent   || '#ffffff'}        onChange={v => setField('onAccent', v)} />
                </ColorFieldGrid>
                <GradientPreview
                  $from={form.buttonFrom || form.sentBubble}
                  $to={form.buttonTo || form.accent}
                />
              </ColorGroupWrap>

              <ColorGroupWrap>
                <ColorGroupLabel>Textos</ColorGroupLabel>
                <ColorFieldGrid>
                  <ColorField label="Texto principal"   value={form.textPrimary   || '#f8fafc'} onChange={v => setField('textPrimary', v)} />
                  <ColorField label="Texto secundario"  value={form.textSecondary || '#94a3b8'} onChange={v => setField('textSecondary', v)} />
                </ColorFieldGrid>
              </ColorGroupWrap>

              <ColorGroupWrap>
                <ColorGroupLabel>Opciones generales</ColorGroupLabel>
                <ToggleRow onClick={() => setField('isDark', !form.isDark)}>
                  <ToggleLabel>Tema oscuro (afecta los fondos por defecto)</ToggleLabel>
                  <ToggleTrack $on={form.isDark !== false}>
                    <ToggleThumb $on={form.isDark !== false} />
                  </ToggleTrack>
                </ToggleRow>
              </ColorGroupWrap>
            </>
          )}

          {/* admin color groups */}
          {!isClient && (
            <>
              <ColorGroupWrap>
                <ColorGroupLabel>Sidebar</ColorGroupLabel>
                <ColorFieldGrid>
                  <ColorField label="Fondo"   value={form.sidebarBg}     onChange={v => setField('sidebarBg', v)} />
                  <ColorField label="Acento"  value={form.sidebarAccent} onChange={v => setField('sidebarAccent', v)} />
                </ColorFieldGrid>
              </ColorGroupWrap>

              <ColorGroupWrap>
                <ColorGroupLabel>Panel principal</ColorGroupLabel>
                <ColorFieldGrid>
                  <ColorField label="Barra superior"  value={form.topbarBg}  onChange={v => setField('topbarBg', v)} />
                  <ColorField label="Fondo principal"  value={form.contentBg} onChange={v => setField('contentBg', v)} />
                  <ColorField label="Tarjetas"          value={form.cardBg}    onChange={v => setField('cardBg', v)} />
                </ColorFieldGrid>
              </ColorGroupWrap>
            </>
          )}

        </CModalBody>

        <CModalFooter>
          <CModalCancelBtn type="button" onClick={onClose}>Cancelar</CModalCancelBtn>
          <CModalSaveBtn type="button" onClick={onSave} disabled={!isValid}>
            {isEditing ? 'Guardar cambios' : 'Crear tema'}
          </CModalSaveBtn>
        </CModalFooter>

      </CModalCard>
    </CModalOverlay>
  )
}

/* ─────────────────────────────
   localStorage helpers
───────────────────────────── */
const loadCustom = (key) => {
  try { return JSON.parse(localStorage.getItem(key) ?? '[]') }
  catch { return [] }
}

/* ─────────────────────────────
   Main component
───────────────────────────── */
const ThemesSection = ({ themeConfig, onThemeChange }) => {
  const { systemConfig, configLoading, setSystemConfig } = useSystemConfig()
  const [subTab, setSubTab] = useState('cliente')

  /* active / pending selection */
  const [pendingClient, setPendingClient] = useState(themeConfig?.clientTheme || 'betchat-dark')
  const [pendingAdmin,  setPendingAdmin]  = useState(themeConfig?.adminTheme || 'dark-blue')
  const [activeClient,  setActiveClient]  = useState(themeConfig?.clientTheme || 'betchat-dark')
  const [activeAdmin,   setActiveAdmin]   = useState(themeConfig?.adminTheme || 'dark-blue')
  const [saved, setSaved] = useState(false)

  /* bubble style */
  const initBubble = useCallback(() => ({
    ...DEFAULT_BUBBLE_CONFIG,
    ...(systemConfig?.bubbleConfig || {}),
  }), [systemConfig?.bubbleConfig])

  const [pendingBubble, setPendingBubble] = useState(initBubble)
  const [activeBubble,  setActiveBubble]  = useState(initBubble)
  const [bubbleSaved,   setBubbleSaved]   = useState(false)
  const bubbleInitRef = useRef(false)

  /* custom themes */
  const [customClientThemes, setCustomClientThemes] = useState(() => loadCustom('custom_client_themes'))
  const [customAdminThemes,  setCustomAdminThemes]  = useState(() => loadCustom('custom_admin_themes'))

  /* hover tracking for card controls */
  const [hoveredId, setHoveredId] = useState(null)

  /* modal state */
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [clientForm, setClientForm] = useState({ ...DEFAULT_CLIENT_FORM })
  const [adminForm,  setAdminForm]  = useState({ ...DEFAULT_ADMIN_FORM })
  const migratedThemeIdsRef = useRef(new Set())

  /* ── init bubble from context once it loads ── */
  useEffect(() => {
    if (configLoading || !systemConfig?.bubbleConfig) return
    const cfg = { ...DEFAULT_BUBBLE_CONFIG, ...systemConfig.bubbleConfig }
    bubbleInitRef.current = true
    setPendingBubble(cfg)
    setActiveBubble(cfg)
  }, [configLoading, systemConfig?.bubbleConfig])

  /* ── computed ── */
  const allClientThemes = [...CLIENT_THEMES, ...customClientThemes]
  const allAdminThemes  = [...ADMIN_THEMES,  ...customAdminThemes]

  const isClient = subTab === 'cliente'
  const isBubble = subTab === 'burbuja'
  const form     = isClient ? clientForm : adminForm
  const setField = isClient
    ? (k, v) => setClientForm(f => ({ ...f, [k]: v }))
    : (k, v) => setAdminForm(f  => ({ ...f, [k]: v }))

  const hasChanges = isBubble
    ? JSON.stringify(pendingBubble) !== JSON.stringify(activeBubble)
    : isClient
      ? pendingClient !== activeClient
      : pendingAdmin !== activeAdmin

  const isSaved = isBubble ? bubbleSaved : saved

  /* ── update state when themeConfig changes ── */
  useEffect(() => {
    if (!themeConfig) return undefined
    let cancelled = false
    queueMicrotask(() => {
      if (cancelled) return
      setPendingClient(themeConfig.clientTheme)
      setActiveClient(themeConfig.clientTheme)
      setPendingAdmin(themeConfig.adminTheme)
      setActiveAdmin(themeConfig.adminTheme)
      setCustomClientThemes(themeConfig.customThemes?.client || loadCustom('custom_client_themes'))
      setCustomAdminThemes(themeConfig.customThemes?.admin || loadCustom('custom_admin_themes'))
    })
    return () => { cancelled = true }
  }, [themeConfig])

  useEffect(() => {
    const migrateLegacyActiveThemes = async () => {
      const nextConfig = { clientTheme: activeClient, adminTheme: activeAdmin }
      let changed = false

      const legacyClient = customClientThemes.find(theme => theme.id === activeClient && theme.custom && !theme.dbId)
      if (legacyClient && !migratedThemeIdsRef.current.has(legacyClient.id)) {
        migratedThemeIdsRef.current.add(legacyClient.id)
        const created = await api.post('/api/settings/themes/custom', { scope: 'client', theme: legacyClient })
        nextConfig.clientTheme = created.theme.id
        setCustomClientThemes(prev => [...prev.filter(theme => theme.id !== legacyClient.id), created.theme])
        changed = true
      }

      const legacyAdmin = customAdminThemes.find(theme => theme.id === activeAdmin && theme.custom && !theme.dbId)
      if (legacyAdmin && !migratedThemeIdsRef.current.has(legacyAdmin.id)) {
        migratedThemeIdsRef.current.add(legacyAdmin.id)
        const created = await api.post('/api/settings/themes/custom', { scope: 'admin', theme: legacyAdmin })
        nextConfig.adminTheme = created.theme.id
        setCustomAdminThemes(prev => [...prev.filter(theme => theme.id !== legacyAdmin.id), created.theme])
        changed = true
      }

      if (!changed) return
      const data = await api.put('/api/settings/themes', nextConfig)
      setPendingClient(data.themeConfig.clientTheme)
      setActiveClient(data.themeConfig.clientTheme)
      setPendingAdmin(data.themeConfig.adminTheme)
      setActiveAdmin(data.themeConfig.adminTheme)
      applyThemeConfig(data.themeConfig)
      onThemeChange?.(data.themeConfig)
    }

    migrateLegacyActiveThemes().catch(() => {})
  }, [activeAdmin, activeClient, customAdminThemes, customClientThemes, onThemeChange])

  /* ── apply bubble style ── */
  const handleApplyBubble = async () => {
    try {
      const payload = {
        bubbleConfig: pendingBubble,
      }
      const data = await api.put('/api/settings/system', payload)
      setActiveBubble({ ...pendingBubble })
      if (data.systemConfig) setSystemConfig(data.systemConfig)
      setBubbleSaved(true)
      setTimeout(() => setBubbleSaved(false), 2200)
    } catch (err) {
      window.alert(err.message || 'No se pudo guardar el estilo de burbuja.')
    }
  }

  /* ── apply theme ── */
  const handleApply = async () => {
    try {
      let newClientTheme = isClient ? pendingClient : activeClient
      let newAdminTheme = isClient ? activeAdmin : pendingAdmin

      const selectedClientTheme = allClientThemes.find(theme => theme.id === newClientTheme)
      if (selectedClientTheme?.custom && !selectedClientTheme.dbId) {
        const created = await api.post('/api/settings/themes/custom', { scope: 'client', theme: selectedClientTheme })
        newClientTheme = created.theme.id
        setCustomClientThemes(prev => [...prev.filter(theme => theme.id !== selectedClientTheme.id), created.theme])
      }

      const selectedAdminTheme = allAdminThemes.find(theme => theme.id === newAdminTheme)
      if (selectedAdminTheme?.custom && !selectedAdminTheme.dbId) {
        const created = await api.post('/api/settings/themes/custom', { scope: 'admin', theme: selectedAdminTheme })
        newAdminTheme = created.theme.id
        setCustomAdminThemes(prev => [...prev.filter(theme => theme.id !== selectedAdminTheme.id), created.theme])
      }

      const data = await api.put('/api/settings/themes', {
        clientTheme: newClientTheme,
        adminTheme: newAdminTheme,
      })

      setActiveClient(newClientTheme)
      setActiveAdmin(newAdminTheme)
      applyThemeConfig(data.themeConfig || { clientTheme: newClientTheme, adminTheme: newAdminTheme })
      setSaved(true)
      setTimeout(() => setSaved(false), 2200)

      // Notify parent component
      if (onThemeChange) {
        onThemeChange(data.themeConfig)
      }
    } catch (error) {
      window.alert(error.message || 'No se pudo guardar la configuración de temas.')
    }
  }

  /* ── open modal ── */
  const openCreate = () => {
    setEditingId(null)
    if (isClient) setClientForm({ ...DEFAULT_CLIENT_FORM })
    else          setAdminForm({ ...DEFAULT_ADMIN_FORM })
    setModalOpen(true)
  }

  const openEdit = (theme) => {
    setEditingId(theme.id)
    if (isClient) setClientForm({ ...DEFAULT_CLIENT_FORM, ...theme })
    else          setAdminForm({ ...DEFAULT_ADMIN_FORM, ...theme })
    setModalOpen(true)
  }

  /* ── save custom theme ── */
  const handleSaveCustom = async () => {
    if (isClient) {
      if (!clientForm.name.trim()) return
      const localEditing = editingId && !clientForm.dbId
      const endpointId = clientForm.dbId
      const saved = endpointId
        ? await api.put(`/api/settings/themes/custom/${endpointId}`, { scope: 'client', theme: clientForm })
        : await api.post('/api/settings/themes/custom', { scope: 'client', theme: clientForm })
      const theme = saved.theme || { ...clientForm, id: localEditing ? editingId : `cc-${Date.now()}`, custom: true, waTheme: false }
      const updated = editingId
        ? customClientThemes.map(t => t.id === editingId ? theme : t)
        : [...customClientThemes, theme]
      setCustomClientThemes(updated)
      localStorage.setItem('custom_client_themes', JSON.stringify(updated))
      if (!editingId) setPendingClient(theme.id)
    } else {
      if (!adminForm.name.trim()) return
      const endpointId = adminForm.dbId
      const saved = endpointId
        ? await api.put(`/api/settings/themes/custom/${endpointId}`, { scope: 'admin', theme: adminForm })
        : await api.post('/api/settings/themes/custom', { scope: 'admin', theme: adminForm })
      const theme = saved.theme || {
          ...adminForm,
          id: editingId ?? `ca-${Date.now()}`,
          custom: true,
          desc: adminForm.name,
          swatches: [adminForm.sidebarBg, adminForm.sidebarAccent, adminForm.contentBg],
        }
      const updated = editingId
        ? customAdminThemes.map(t => t.id === editingId ? theme : t)
        : [...customAdminThemes, theme]
      setCustomAdminThemes(updated)
      localStorage.setItem('custom_admin_themes', JSON.stringify(updated))
      if (!editingId) setPendingAdmin(theme.id)
    }
    setModalOpen(false)
  }

  /* ── delete custom theme ── */
  const handleDelete = (id) => {
    if (isClient) {
      const theme = customClientThemes.find(item => item.id === id)
      if (theme?.dbId) api.delete(`/api/settings/themes/custom/${theme.dbId}?scope=client`).catch(() => {})
      const updated = customClientThemes.filter(t => t.id !== id)
      setCustomClientThemes(updated)
      localStorage.setItem('custom_client_themes', JSON.stringify(updated))
      if (pendingClient === id) setPendingClient('betchat-dark')
      if (activeClient  === id) setActiveClient('betchat-dark')
    } else {
      const theme = customAdminThemes.find(item => item.id === id)
      if (theme?.dbId) api.delete(`/api/settings/themes/custom/${theme.dbId}?scope=admin`).catch(() => {})
      const updated = customAdminThemes.filter(t => t.id !== id)
      setCustomAdminThemes(updated)
      localStorage.setItem('custom_admin_themes', JSON.stringify(updated))
      if (pendingAdmin === id) setPendingAdmin('dark-blue')
      if (activeAdmin  === id) setActiveAdmin('dark-blue')
    }
  }

  /* ─────────────── render ─────────────── */
  return (
    <ThemesWrap>

      {/* sub-tab toggle */}
      <SubTabBar>
        <SubTab $active={isClient} onClick={() => setSubTab('cliente')}>
          <SmartphoneOutlinedIcon />
          Cliente
        </SubTab>
        <SubTab $active={isBubble} onClick={() => setSubTab('burbuja')}>
          <ChatBubbleOutlineOutlinedIcon />
          Burbuja
        </SubTab>
        <SubTab $active={!isClient && !isBubble} onClick={() => setSubTab('admin')}>
          <DashboardOutlinedIcon />
          Admin
        </SubTab>
      </SubTabBar>

      {/* ── client themes ── */}
      {isClient && (
        <>
          <SectionBanner>
            <InfoOutlinedIcon />
            Personaliza el aspecto del chat que ven tus clientes. Los cambios se reflejan al aplicar.
          </SectionBanner>

          <ThemeGrid>
            {allClientThemes.map((theme, i) => {
              const isPending = pendingClient === theme.id
              return (
                <ThemeCard
                  key={theme.id}
                  $active={isPending}
                  $i={i}
                  onClick={() => setPendingClient(theme.id)}
                  onMouseEnter={() => theme.custom && setHoveredId(theme.id)}
                  onMouseLeave={() => theme.custom && setHoveredId(null)}
                >
                  {/* edit / delete overlay for custom themes */}
                  {theme.custom && (
                    <CustomCardControls style={{ opacity: hoveredId === theme.id ? 1 : 0 }}>
                      <CustomCardBtn
                        type="button"
                        title="Editar"
                        onClick={e => { e.stopPropagation(); openEdit(theme) }}
                      >
                        <EditOutlinedIcon />
                      </CustomCardBtn>
                      <CustomCardBtn
                        type="button"
                        className="delete"
                        title="Eliminar"
                        onClick={e => { e.stopPropagation(); handleDelete(theme.id) }}
                      >
                        <DeleteOutlinedIcon />
                      </CustomCardBtn>
                    </CustomCardControls>
                  )}

                  <ThemeCardPreview>
                    <MiniChatPreview theme={theme} />
                    {isPending && <CheckOverlay><CheckIcon /></CheckOverlay>}
                  </ThemeCardPreview>

                  <ThemeCardInfo>
                    <ThemeNameRow>
                      <ThemeName>{theme.name}</ThemeName>
                      {activeClient === theme.id && <ActiveBadge>Activo</ActiveBadge>}
                      {theme.waTheme && <WhatsAppBadge>WA</WhatsAppBadge>}
                      {theme.custom  && !activeClient === theme.id && <CustomBadge>Custom</CustomBadge>}
                    </ThemeNameRow>
                    <ThemeDesc>{theme.desc || 'Tema personalizado'}</ThemeDesc>
                  </ThemeCardInfo>
                </ThemeCard>
              )
            })}

            {/* add new theme card */}
            <AddThemeCard type="button" onClick={openCreate}>
              <AddIcon />
              <AddThemeLabel>Crear tema</AddThemeLabel>
            </AddThemeCard>
          </ThemeGrid>
        </>
      )}

      {/* ── bubble styles ── */}
      {isBubble && (
        <>
          <SectionBanner>
            <InfoOutlinedIcon />
            Elige el estilo del botón flotante que verán tus clientes. Puedes personalizar el texto y el ícono de cada estilo.
          </SectionBanner>

          <BubbleStyleGrid>
            {BUBBLE_STYLES.map((bs, i) => {
              const isPending = pendingBubble.style === bs.id
              return (
                <ThemeCard
                  key={bs.id}
                  $active={isPending}
                  $i={i}
                  onClick={() => setPendingBubble(prev => ({ ...prev, style: bs.id }))}
                >
                  <BubbleStylePreview>
                    <MiniBubblePreview
                      styleId={bs.id}
                      styleConfig={pendingBubble[bs.id]}
                    />
                    {isPending && <CheckOverlay><CheckIcon /></CheckOverlay>}
                  </BubbleStylePreview>
                  <ThemeCardInfo>
                    <ThemeNameRow>
                      <ThemeName>{bs.name}</ThemeName>
                      {activeBubble.style === bs.id && <ActiveBadge>Activo</ActiveBadge>}
                    </ThemeNameRow>
                    <ThemeDesc>{bs.desc}</ThemeDesc>
                  </ThemeCardInfo>
                </ThemeCard>
              )
            })}
          </BubbleStyleGrid>

          {/* Configuración del estilo seleccionado */}
          <BubbleConfigSection>
            <BubbleConfigTitle>
              Configurar: {BUBBLE_STYLES.find(s => s.id === pendingBubble.style)?.name}
            </BubbleConfigTitle>

            {pendingBubble.style !== 'minimal' && (
              <BubbleConfigRow>
                <BubbleConfigLabel>Texto del botón</BubbleConfigLabel>
                <BubbleTextInput
                  type="text"
                  value={pendingBubble[pendingBubble.style]?.text ?? ''}
                  onChange={e => setPendingBubble(prev => ({
                    ...prev,
                    [prev.style]: { ...prev[prev.style], text: e.target.value },
                  }))}
                  placeholder={BUBBLE_TEXT_PLACEHOLDERS[pendingBubble.style] || 'Texto...'}
                  maxLength={60}
                />
              </BubbleConfigRow>
            )}

            <BubbleConfigRow>
              <BubbleConfigLabel>Ícono</BubbleConfigLabel>
              <IconPickerGrid>
                {BUBBLE_ICONS.map(({ id, label }) => {
                  const IconComp = ICON_MAP[id]
                  const isActive = (pendingBubble[pendingBubble.style]?.icon ?? 'ChatOutlined') === id
                  return (
                    <IconPickerBtn
                      key={id}
                      type="button"
                      $active={isActive}
                      title={label}
                      onClick={() => setPendingBubble(prev => ({
                        ...prev,
                        [prev.style]: { ...prev[prev.style], icon: id },
                      }))}
                    >
                      <IconComp />
                      <span>{label}</span>
                    </IconPickerBtn>
                  )
                })}
              </IconPickerGrid>
            </BubbleConfigRow>

          </BubbleConfigSection>
        </>
      )}

      {/* ── admin themes ── */}
      {!isClient && !isBubble && (
        <>
          <SectionBanner>
            <InfoOutlinedIcon />
            Cambia el esquema de colores del panel de administración. Los cambios se aplican globalmente.
          </SectionBanner>

          <AdminThemeGrid>
            {allAdminThemes.map((theme, i) => {
              const isPending = pendingAdmin === theme.id
              return (
                <ThemeCard
                  key={theme.id}
                  $active={isPending}
                  $i={i}
                  onClick={() => setPendingAdmin(theme.id)}
                  onMouseEnter={() => theme.custom && setHoveredId(theme.id)}
                  onMouseLeave={() => theme.custom && setHoveredId(null)}
                >
                  {theme.custom && (
                    <CustomCardControls style={{ opacity: hoveredId === theme.id ? 1 : 0 }}>
                      <CustomCardBtn
                        type="button"
                        title="Editar"
                        onClick={e => { e.stopPropagation(); openEdit(theme) }}
                      >
                        <EditOutlinedIcon />
                      </CustomCardBtn>
                      <CustomCardBtn
                        type="button"
                        className="delete"
                        title="Eliminar"
                        onClick={e => { e.stopPropagation(); handleDelete(theme.id) }}
                      >
                        <DeleteOutlinedIcon />
                      </CustomCardBtn>
                    </CustomCardControls>
                  )}

                  <ThemeCardPreview>
                    <MiniAdminPreview theme={theme} />
                    {isPending && <CheckOverlay><CheckIcon /></CheckOverlay>}
                  </ThemeCardPreview>

                  <ThemeCardInfo>
                    <ThemeNameRow>
                      <ThemeName>{theme.name}</ThemeName>
                      {activeAdmin === theme.id && <ActiveBadge>Activo</ActiveBadge>}
                      {theme.custom && <CustomBadge>Custom</CustomBadge>}
                    </ThemeNameRow>
                    <ColorSwatchRow>
                      {(theme.swatches ?? []).map((c, si) => (
                        <ColorSwatch key={si} $color={c} />
                      ))}
                      <SwatchLabel>{theme.desc}</SwatchLabel>
                    </ColorSwatchRow>
                  </ThemeCardInfo>
                </ThemeCard>
              )
            })}

            <AddThemeCard type="button" onClick={openCreate}>
              <AddIcon />
              <AddThemeLabel>Crear tema</AddThemeLabel>
            </AddThemeCard>
          </AdminThemeGrid>
        </>
      )}

      {/* save footer */}
      <SaveBar>
        <SaveHint>
          {isSaved
            ? (isBubble ? 'Estilo de burbuja aplicado.' : 'Tema aplicado correctamente.')
            : hasChanges
              ? 'Tienes cambios sin guardar — presiona Aplicar para confirmar.'
              : 'Los cambios se sincronizarán con la base de datos cuando estén disponibles.'}
        </SaveHint>
        <ApplyBtn
          type="button"
          $saved={isSaved}
          onClick={isBubble ? handleApplyBubble : handleApply}
          disabled={!hasChanges}
          style={!hasChanges && !isSaved ? { opacity: 0.38, pointerEvents: 'none' } : {}}
        >
          {isSaved
            ? <><CheckIcon />Aplicado</>
            : isBubble ? 'Aplicar estilo' : 'Aplicar tema'}
        </ApplyBtn>
      </SaveBar>

      {/* custom theme modal */}
      {modalOpen && (
        <CustomThemeModal
          type={subTab}
          form={form}
          setField={setField}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveCustom}
          isEditing={!!editingId}
        />
      )}

    </ThemesWrap>
  )
}

export default ThemesSection
