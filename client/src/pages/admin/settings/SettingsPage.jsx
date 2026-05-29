import { useCallback, useEffect, useRef, useState } from 'react'
import styled from 'styled-components'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined'
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import HubOutlinedIcon                  from '@mui/icons-material/HubOutlined'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import ArrowCircleUpOutlinedIcon from '@mui/icons-material/ArrowCircleUpOutlined'
import ArrowCircleDownOutlinedIcon from '@mui/icons-material/ArrowCircleDownOutlined'
import CheckIcon from '@mui/icons-material/Check'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined'
import GroupAddOutlinedIcon from '@mui/icons-material/GroupAddOutlined'
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined'
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import HighlightOffOutlinedIcon from '@mui/icons-material/HighlightOffOutlined'
import BrandingWatermarkOutlinedIcon from '@mui/icons-material/BrandingWatermarkOutlined'
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import { useParams, useNavigate } from 'react-router-dom'
import useAuth from '../../../hooks/useAuth'
import { useSystemConfig } from '../../../context/SystemConfigContext'
import { useToast } from '../../../context/ToastContext'
import { api } from '../../../utils/api'
import TicketsSection from './TicketsSection'
import ThemesSection from './ThemesSection'
import AutoMessagesSection from './AutoMessagesSection'
import AdvancedSection from './AdvancedSection'
import SoundsSection from './SoundsSection'
import ReferralSection from './ReferralSection'
import {
  PageWrap, PageHeader, MenuBtn, TitleBlock, PageTitle, PageSub,
  Body, SettingsNav, NavGroupLabel, NavBtn, ActiveBar, NavIcon, NavTextWrap, NavLabel, NavSub, SoonPill,
  Content, Section,
  ProfileCard, AvatarStack, AvatarRemoveBtn, ProfileAvatar, ProfileAvatarImg, ProfileAvatarBtn, ProfileInfo, ProfileName, ProfileRole, ProfileBadge,
  Card, CardHead, CardIcon, CardHeadText, CardTitle, CardSub, CardBody,
  FormGrid, Field, FieldLabel, InputWrap, FieldInput, InputSuffix,
  SaveFooter, SaveBtn,
  InfoBanner, InfoBannerIcon, InfoBannerText,
  MontosGrid, MontoCard, MontoHead, MontoIconWrap, MontoInfo, MontoTitle, MontoDesc,
  MontoDivider, MontoBody, MontoInputRow, CurrencyPrefix, MontoInput, CurrencySelect, MontoNote,
  ApiStatusBadge, ApiNote,
  ModelSectionLabel, ModelGrid, ModelCard, ModelCardRow, ModelMeta,
  ModelProvider, ModelName, ModelTag, ModelDesc,
  ModelCostRow, ModelCostValue, ModelCostLabel, ModelPriceDetail,
  ModelCheck, ModelCostNote,
  ProviderGrid, ProviderCard, RadioCircle, ProviderAvatar, ProviderInfo, ProviderName, ProviderSub,
  AccountSelectCard, AccountSelectLabel, FieldSelect,
  ActiveProviderRow, ActiveProviderDot,
  ToggleRow, ToggleText, ToggleTitle, ToggleSub, ToggleSwitch,
} from './SettingsPage.styles'

const TABS = [
  {
    id: 'perfil',
    label: 'Mi perfil',
    icon: <AccountCircleOutlinedIcon />,
    sub: 'Datos de tu cuenta',
  },
  {
    id: 'sistema',
    label: 'Sistema',
    icon: <BrandingWatermarkOutlinedIcon />,
    sub: 'Marca y registro',
  },
  {
    id: 'montos',
    label: 'Montos mínimos',
    icon: <PaymentsOutlinedIcon />,
    sub: 'Cargas y retiros',
  },
  {
    id: 'apis',
    label: 'APIs',
    icon: <HubOutlinedIcon />,
    sub: 'Integraciones externas',
  },
  {
    id: 'botia',
    label: 'Bot IA',
    icon: <AutoAwesomeOutlinedIcon />,
    sub: 'Modo híbrido',
  },
  {
    id: 'banco',
    label: 'Banco de chat',
    icon: <AccountBalanceWalletOutlinedIcon />,
    sub: 'Modo de procesamiento',
  },
  {
    id: 'mensajes',
    label: 'Mensajes auto',
    icon: <SmsOutlinedIcon />,
    sub: 'Respuestas automáticas',
  },
  {
    id: 'referidos',
    label: 'Referidos',
    icon: <GroupAddOutlinedIcon />,
    sub: 'Programa de referidos',
  },
  {
    id: 'sonidos',
    label: 'Sonidos',
    icon: <NotificationsActiveOutlinedIcon />,
    sub: 'Tonos de notificación',
  },
  {
    id: 'avanzado',
    label: 'Avanzado',
    icon: <TuneOutlinedIcon />,
    sub: 'Mantenimiento',
  },
  {
    id: 'soporte',
    label: 'Soporte',
    icon: <HeadsetMicOutlinedIcon />,
    sub: 'Tickets y ayuda',
  },
  {
    id: 'temas',
    label: 'Temas',
    icon: <PaletteOutlinedIcon />,
    sub: 'Apariencia del sistema',
  },
]

/* ── bank providers config (espeja los datos de BanksPage) ── */
const CHAT_BANKS = [
  { id: 'hgcash',      label: 'HGCash',          initials: 'HG', count: 3,
    color: '#818cf8', bg: 'rgba(99,102,241,0.10)',  br: 'rgba(99,102,241,0.26)',
    avatarBg: 'linear-gradient(135deg,#4f46e5,#6366f1)', avatarBr: 'rgba(99,102,241,0.35)' },
  { id: 'mercadopago', label: 'Mercado Pago',     initials: 'MP', count: 2,
    color: '#38bdf8', bg: 'rgba(14,165,233,0.10)', br: 'rgba(14,165,233,0.26)',
    avatarBg: 'linear-gradient(135deg,#0284c7,#38bdf8)', avatarBr: 'rgba(14,165,233,0.35)' },
  { id: 'telepagos',   label: 'Telepagos',        initials: 'TP', count: 2,
    color: '#fb923c', bg: 'rgba(249,115,22,0.10)', br: 'rgba(249,115,22,0.26)',
    avatarBg: 'linear-gradient(135deg,#ea580c,#f97316)', avatarBr: 'rgba(249,115,22,0.35)' },
  { id: 'manual',      label: 'Cuentas manuales', initials: 'MN', count: 3,
    color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', br: 'rgba(148,163,184,0.20)',
    avatarBg: 'linear-gradient(135deg,#475569,#64748b)', avatarBr: 'rgba(148,163,184,0.28)' },
]

const CHAT_ACCOUNTS = {
  hgcash:      [{ id: 1, label: 'Juan García — juangarcia.hg' }, { id: 3, label: 'Pedro Torres — pedrotorres.hg' }],
  mercadopago: [{ id: 1, label: 'Carlos Ruiz — carlosruiz.mp' }],
  telepagos:   [{ id: 1, label: 'Diego Herrera — diegoherrera.tp' }],
  manual:      [{ id: 1, label: 'Luis Méndez — luismendez' }, { id: 2, label: 'Ana Ramos — anaramos' }, { id: 3, label: 'Marcos Vera — marcosvera' }],
}

const API_ORIGIN = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')

const resolveAssetUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`
}

const optimizeFavicon = (file) => new Promise((resolve, reject) => {
  if (!file?.type?.startsWith('image/')) {
    reject(new Error('Selecciona una imagen válida.'))
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const size = 128
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      const minDim = Math.min(img.width, img.height)
      const sx = (img.width - minDim) / 2
      const sy = (img.height - minDim) / 2
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
      resolve(canvas.toDataURL('image/png', 1.0))
    }
    img.onerror = () => reject(new Error('No se pudo procesar la imagen.'))
    img.src = reader.result
  }
  reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
  reader.readAsDataURL(file)
})

const optimizeAvatar = (file) => new Promise((resolve, reject) => {
  if (!file?.type?.startsWith('image/')) {
    reject(new Error('Selecciona una imagen valida.'))
    return
  }

  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const maxSize = 512
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(img.width * scale))
      canvas.height = Math.max(1, Math.round(img.height * scale))
      const ctx = canvas.getContext('2d')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/webp', 0.82))
    }
    img.onerror = () => reject(new Error('No se pudo procesar la imagen.'))
    img.src = reader.result
  }
  reader.onerror = () => reject(new Error('No se pudo leer la imagen.'))
  reader.readAsDataURL(file)
})

/* ─── browser tab preview ─────────────────────────────────────── */
const BrowserWrap = styled.div`
  background: #16162a;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.07);
  box-shadow: 0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.03);
  user-select: none;
  margin: 4px 0 14px;
`
const BrowserChrome = styled.div`
  background: #1e1e38;
  padding: 10px 12px 0;
`
const TrafficLights = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
`
const TrafficDot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $c }) => $c};
  opacity: 0.85;
  display: block;
  flex-shrink: 0;
`
const TabStrip = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
`
const ActiveTab = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  background: #0d0d1c;
  border-radius: 8px 8px 0 0;
  padding: 7px 10px 7px 10px;
  width: 190px;
  border: 1px solid rgba(255,255,255,0.07);
  border-bottom: 1px solid #0d0d1c;
  position: relative;
  bottom: -1px;
`
const TabFavWrap = styled.span`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  overflow: hidden;
  img { width: 100%; height: 100%; object-fit: contain; display: block; }
`
const TabFavPlaceholder = styled.span`
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: linear-gradient(135deg, rgba(30,133,255,0.7), rgba(99,102,241,0.7));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 8px;
  font-weight: 800;
  color: #fff;
  flex-shrink: 0;
`
const TabTitleText = styled.span`
  font-size: 11.5px;
  color: rgba(255,255,255,0.78);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
`
const TabCloseX = styled.span`
  font-size: 14px;
  color: rgba(255,255,255,0.22);
  flex-shrink: 0;
  line-height: 1;
  cursor: default;
`
const TabNewBtn = styled.div`
  padding: 6px 10px 7px;
  font-size: 15px;
  color: rgba(255,255,255,0.18);
  line-height: 1;
  cursor: default;
`
const BrowserToolbar = styled.div`
  background: #0d0d1c;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-top: 1px solid rgba(255,255,255,0.06);
`
const ToolbarNav = styled.div`
  display: flex;
  gap: 2px;
  align-items: center;
  flex-shrink: 0;
`
const ToolbarNavBtn = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: rgba(255,255,255,0.22);
  cursor: default;
`
const ToolbarUrl = styled.div`
  flex: 1;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 5px 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: rgba(255,255,255,0.38);
  overflow: hidden;
  white-space: nowrap;
`
const ToolbarLock = styled.span`
  font-size: 10px;
  color: rgba(100,220,100,0.65);
  flex-shrink: 0;
`
const BrowserPage = styled.div`
  background: #0a0a17;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`
const PageLine = styled.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(255,255,255,0.04);
  width: ${({ $w }) => $w || '100%'};
`

const FaviconSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 8px 0 4px;
`
const FaviconHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  letter-spacing: 0.01em;
  margin-bottom: 2px;
`
const FaviconDesc = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.30);
  margin: 0 0 4px;
  line-height: 1.5;
`
const FaviconActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
`
const FaviconUploadBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 9px;
  border: 1px dashed rgba(255,255,255,0.18);
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.55);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.18s, color 0.18s, background 0.18s;
  font-family: inherit;
  svg { font-size: 15px; }
  &:hover {
    border-color: rgba(30,133,255,0.55);
    color: rgba(30,133,255,0.85);
    background: rgba(30,133,255,0.06);
  }
`
const FaviconClearBtn = styled.button`
  font-size: 12px;
  color: rgba(255,255,255,0.30);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
  &:hover { color: #f87171; }
`
const FaviconHint = styled.p`
  font-size: 11px;
  color: rgba(255,255,255,0.20);
  margin: 2px 0 0;
`

function BrowserTabPreview({ favicon, appName }) {
  const displayFavicon = favicon || null
  const urlSlug = (appName || 'app').toLowerCase().replace(/[^a-z0-9]/g, '')
  const title = appName || 'Mi App'
  return (
    <BrowserWrap>
      <BrowserChrome>
        <TrafficLights>
          <TrafficDot $c="#ff5f57" />
          <TrafficDot $c="#febc2e" />
          <TrafficDot $c="#28c840" />
        </TrafficLights>
        <TabStrip>
          <ActiveTab>
            <TabFavWrap>
              {displayFavicon
                ? <img src={displayFavicon} alt="" />
                : <TabFavPlaceholder>{title[0].toUpperCase()}</TabFavPlaceholder>
              }
            </TabFavWrap>
            <TabTitleText>{title}</TabTitleText>
            <TabCloseX>×</TabCloseX>
          </ActiveTab>
          <TabNewBtn>+</TabNewBtn>
        </TabStrip>
      </BrowserChrome>
      <BrowserToolbar>
        <ToolbarNav>
          <ToolbarNavBtn>‹</ToolbarNavBtn>
          <ToolbarNavBtn>›</ToolbarNavBtn>
          <ToolbarNavBtn>↻</ToolbarNavBtn>
        </ToolbarNav>
        <ToolbarUrl>
          <ToolbarLock>🔒</ToolbarLock>
          {urlSlug}.com
        </ToolbarUrl>
      </BrowserToolbar>
      <BrowserPage>
        <PageLine $w="60%" />
        <PageLine $w="90%" />
        <PageLine $w="75%" />
      </BrowserPage>
    </BrowserWrap>
  )
}

/* ─── timezone list ──────────────────────────────────────────── */
const TIMEZONES = [
  { group: 'América Latina', zones: [
    { value: 'America/Bogota',                   label: 'Colombia — Bogotá (UTC-5)' },
    { value: 'America/Lima',                     label: 'Perú — Lima (UTC-5)' },
    { value: 'America/Guayaquil',                label: 'Ecuador — Guayaquil (UTC-5)' },
    { value: 'America/Caracas',                  label: 'Venezuela — Caracas (UTC-4)' },
    { value: 'America/La_Paz',                   label: 'Bolivia — La Paz (UTC-4)' },
    { value: 'America/Santiago',                 label: 'Chile — Santiago (UTC-3/-4)' },
    { value: 'America/Buenos_Aires',              label: 'Argentina — Buenos Aires (UTC-3)' },
    { value: 'America/Sao_Paulo',                label: 'Brasil — São Paulo (UTC-3)' },
    { value: 'America/Montevideo',               label: 'Uruguay — Montevideo (UTC-3)' },
    { value: 'America/Asuncion',                 label: 'Paraguay — Asunción (UTC-4/-3)' },
    { value: 'America/Panama',                   label: 'Panamá (UTC-5)' },
    { value: 'America/Costa_Rica',               label: 'Costa Rica (UTC-6)' },
    { value: 'America/Guatemala',                label: 'Guatemala (UTC-6)' },
    { value: 'America/El_Salvador',              label: 'El Salvador (UTC-6)' },
    { value: 'America/Tegucigalpa',              label: 'Honduras — Tegucigalpa (UTC-6)' },
    { value: 'America/Managua',                  label: 'Nicaragua — Managua (UTC-6)' },
    { value: 'America/Mexico_City',              label: 'México — Ciudad de México (UTC-6)' },
    { value: 'America/Santo_Domingo',            label: 'Rep. Dominicana — Santo Domingo (UTC-4)' },
    { value: 'America/Puerto_Rico',              label: 'Puerto Rico (UTC-4)' },
    { value: 'America/Havana',                   label: 'Cuba — La Habana (UTC-5/-4)' },
  ]},
  { group: 'América del Norte', zones: [
    { value: 'America/New_York',                 label: 'EE.UU. — Nueva York / Este (UTC-5)' },
    { value: 'America/Chicago',                  label: 'EE.UU. — Chicago / Central (UTC-6)' },
    { value: 'America/Denver',                   label: 'EE.UU. — Denver / Montaña (UTC-7)' },
    { value: 'America/Los_Angeles',              label: 'EE.UU. — Los Ángeles / Pacífico (UTC-8)' },
    { value: 'America/Toronto',                  label: 'Canadá — Toronto (UTC-5)' },
    { value: 'America/Vancouver',                label: 'Canadá — Vancouver (UTC-8)' },
  ]},
  { group: 'Europa', zones: [
    { value: 'Europe/Madrid',                    label: 'España — Madrid (UTC+1)' },
    { value: 'Europe/London',                    label: 'Reino Unido — Londres (UTC+0)' },
    { value: 'Europe/Paris',                     label: 'Francia / Alemania / Italia (UTC+1)' },
    { value: 'Europe/Lisbon',                    label: 'Portugal — Lisboa (UTC+0)' },
  ]},
  { group: 'UTC', zones: [
    { value: 'Etc/GMT',                           label: 'UTC / GMT — sin ajuste horario' },
  ]},
]

/* ─── support section styled components ─────────────────────── */
const SupportSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 8px 0 4px;
`
const SupportHeading = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  letter-spacing: 0.01em;
`
const SupportDesc = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.30);
  margin: 0;
  line-height: 1.5;
`
const TypeSegment = styled.div`
  display: flex;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  padding: 3px;
  gap: 3px;
  width: fit-content;
`
const TypeBtn = styled.button`
  padding: 6px 16px;
  border-radius: 7px;
  background: ${({ $active }) => $active ? 'rgba(30,133,255,0.18)' : 'transparent'};
  border: 1px solid ${({ $active }) => $active ? 'rgba(30,133,255,0.32)' : 'transparent'};
  color: ${({ $active }) => $active ? 'rgba(90,170,255,0.95)' : 'rgba(255,255,255,0.34)'};
  font-size: 12.5px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  cursor: pointer;
  transition: all 0.18s;
  font-family: inherit;
  &:hover { color: rgba(255,255,255,0.65); }
`

/* ─── iframe URL section ─────────────────────────────────────── */
const IframeSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 4px 0;
`
const IframeLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 600;
  color: rgba(255,255,255,0.65);
  letter-spacing: 0.01em;
`
const IframeDesc = styled.p`
  font-size: 12px;
  color: rgba(255,255,255,0.30);
  margin: 0 0 6px;
  line-height: 1.5;
`
const IframeBrowserWrap = styled.div`
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  background: #0d0d1a;
  flex-shrink: 0;
`
const IframeBrowserBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.06);
`
const IframeTrafficDots = styled.div`
  display: flex;
  gap: 5px;
  flex-shrink: 0;
`
const IframeTrafficDot = styled.span`
  width: 9px; height: 9px;
  border-radius: 50%;
  background: ${({ $c }) => $c};
  opacity: 0.7;
`
const IframeAddressBar = styled.div`
  flex: 1;
  height: 24px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  gap: 6px;
  font-size: 11px;
  color: rgba(255,255,255,0.35);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`
const IframeViewport = styled.div`
  width: 100%;
  height: 200px;
  overflow: hidden;
  position: relative;
  background: #0a0a14;
`
const IframeScaled = styled.iframe`
  width: 320%;
  height: 320%;
  border: none;
  transform: scale(0.3125);
  transform-origin: top left;
  pointer-events: none;
`
const IframePlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(255,255,255,0.14);
  font-size: 12.5px;
`
const IframePlaceholderIcon = styled.div`
  width: 44px; height: 44px;
  border-radius: 12px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.07);
  display: flex; align-items: center; justify-content: center;
  svg { font-size: 22px; opacity: 0.4; }
`

function IframeLivePreview({ url }) {
  const isValid = (() => {
    if (!url) return false
    try { const u = new URL(url); return u.protocol === 'https:' || u.protocol === 'http:' }
    catch { return false }
  })()

  const displayUrl = isValid ? (() => {
    try { const u = new URL(url); return u.hostname + (u.pathname !== '/' ? u.pathname : '') }
    catch { return url }
  })() : (url || 'Sin URL configurada')

  return (
    <IframeBrowserWrap>
      <IframeBrowserBar>
        <IframeTrafficDots>
          <IframeTrafficDot $c="#ff5f57" />
          <IframeTrafficDot $c="#febc2e" />
          <IframeTrafficDot $c="#28c840" />
        </IframeTrafficDots>
        <IframeAddressBar>
          {isValid ? '🔒 ' : ''}{displayUrl}
        </IframeAddressBar>
      </IframeBrowserBar>
      <IframeViewport>
        {isValid ? (
          <IframeScaled src={url} title="Preview" sandbox="allow-scripts allow-same-origin" />
        ) : (
          <IframePlaceholder>
            <IframePlaceholderIcon><LanguageOutlinedIcon /></IframePlaceholderIcon>
            {url ? 'URL inválida — usa https://...' : 'Ingresa una URL para ver la previsualización'}
          </IframePlaceholder>
        )}
      </IframeViewport>
    </IframeBrowserWrap>
  )
}

/* ─── AI receipt models ──────────────────────────────────────── */
// costPer1k: estimated USD per 1000 receipt reads
// Assumes ~1000 input tokens (image + prompt) + ~80 output tokens per read
const RECEIPT_MODELS = [
  {
    id: 'google/gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    provider: 'Google',
    tag: 'Rápido y económico',
    tagCl: '#10b981', tagBg: 'rgba(16,185,129,0.15)',
    desc: 'Ideal para alto volumen. Excelente relación velocidad/costo para comprobantes simples.',
    costPer1k: 0.10, tier: 'cheap',
    inputPriceM: 0.075, outputPriceM: 0.30,
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    tag: 'Equilibrado',
    tagCl: '#3b82f6', tagBg: 'rgba(59,130,246,0.15)',
    desc: 'Buen balance velocidad/calidad. Adecuado para la mayoría de los comprobantes.',
    costPer1k: 0.13, tier: 'cheap',
    inputPriceM: 0.10, outputPriceM: 0.40,
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'OpenAI',
    tag: 'Preciso y económico',
    tagCl: '#8b5cf6', tagBg: 'rgba(139,92,246,0.15)',
    desc: 'Alta precisión de OpenAI a precio accesible. Recomendado para comprobantes variados.',
    costPer1k: 0.20, tier: 'mid',
    inputPriceM: 0.15, outputPriceM: 0.60,
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'Google',
    tag: 'Alta precisión',
    tagCl: '#f59e0b', tagBg: 'rgba(245,158,11,0.15)',
    desc: 'Mayor razonamiento. Indicado para imágenes de baja calidad o comprobantes complejos.',
    costPer1k: 0.22, tier: 'mid',
    inputPriceM: 0.15, outputPriceM: 0.60,
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    tag: 'Máxima precisión',
    tagCl: '#ef4444', tagBg: 'rgba(239,68,68,0.15)',
    desc: 'El mejor modelo de OpenAI. Para los casos más exigentes donde el costo es secundario.',
    costPer1k: 3.30, tier: 'expensive',
    inputPriceM: 2.50, outputPriceM: 10.00,
  },
]

const BOT_AI_MODEL_OPTIONS = [
  { id: '', name: 'Usar el modelo guardado en OpenRouter' },
  ...RECEIPT_MODELS,
]

const BANK_STYLES = {
  hgcash: { initials: 'HG', color: '#818cf8', bg: 'rgba(99,102,241,0.10)', br: 'rgba(99,102,241,0.26)', avatarBg: 'linear-gradient(135deg,#4f46e5,#6366f1)', avatarBr: 'rgba(99,102,241,0.35)' },
  mercadopago: { initials: 'MP', color: '#38bdf8', bg: 'rgba(14,165,233,0.10)', br: 'rgba(14,165,233,0.26)', avatarBg: 'linear-gradient(135deg,#0284c7,#38bdf8)', avatarBr: 'rgba(14,165,233,0.35)' },
  telepagos: { initials: 'TP', color: '#fb923c', bg: 'rgba(249,115,22,0.10)', br: 'rgba(249,115,22,0.26)', avatarBg: 'linear-gradient(135deg,#ea580c,#f97316)', avatarBr: 'rgba(249,115,22,0.35)' },
  manual: { initials: 'MN', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', br: 'rgba(148,163,184,0.20)', avatarBg: 'linear-gradient(135deg,#475569,#64748b)', avatarBr: 'rgba(148,163,184,0.28)' },
}

const SettingsPage = ({ onMenuOpen }) => {
  const { user, setUser } = useAuth()
  const { setSystemConfig: setGlobalSystemConfig } = useSystemConfig()
  const toast = useToast()
  const { tab: tabParam } = useParams()
  const navigate = useNavigate()
  const avatarInputRef  = useRef(null)
  const logoInputRef    = useRef(null)
  const faviconInputRef = useRef(null)
  const activeTab = TABS.find(t => t.id === tabParam && !t.soon) ? tabParam : 'perfil'
  const setActiveTab = (id) => navigate(`/admin/ajustes/${id}`)

  /* ── profile form ── */
  const [profileForm, setProfileForm] = useState({
    username: user?.username ?? user?.name ?? '',
    full_name: user?.full_name ?? user?.username ?? user?.name ?? '',
    email: user?.email ?? '',
    avatar_url: user?.avatar_url ?? '',
    avatar_data_url: '',
    clearAvatar: false,
  })
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url ? resolveAssetUrl(user.avatar_url) : '')
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [profileSaved, setProfileSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

  const [systemForm, setSystemForm] = useState({
    appName: 'BetChat',
    logoUrl: '',
    logoDataUrl: '',
    faviconUrl: '',
    faviconDataUrl: '',
    iframeUrl: '',
    timezone: 'America/Bogota',
    supportType: 'phone',
    supportValue: '',
    supportText: '',
    clientRegistrationEnabled: true,
    clientLogoutEnabled: true,
    botMode: 'manual',
    botAiModel: '',
    botAiTemperature: 0.1,
    botAiMaxTokens: 250,
    clearLogo: false,
    clearFavicon: false,
  })
  const [logoPreview, setLogoPreview]       = useState('')
  const [faviconPreview, setFaviconPreview] = useState('')
  const [systemSaved, setSystemSaved]       = useState(false)

  /* ── montos form ── */
  const [montos, setMontos] = useState({
    carga:  { amount: '10', currency: 'USD' },
    retiro: { amount: '50', currency: 'USD' },
  })
  const [montosSaved, setMontosSaved] = useState(false)

  /* ── apis form ── */
  const [apis, setApis] = useState({
    casino:     { token: '', url: '' },
    openrouter: { apiKey: '', model: 'openai/gpt-4o-mini' },
  })
  const [apiSaved, setApiSaved]       = useState({ casino: false, openrouter: false })
  const [showSecret, setShowSecret]   = useState({
    casinoToken: false, openrouterKey: false,
  })

  /* ── firebase push credentials ── */
  const [firebase, setFirebase] = useState({
    projectId: '', clientEmail: '', privateKey: '',
    apiKey: '', authDomain: '', storageBucket: '', messagingSenderId: '', appId: '', vapidKey: '',
  })
  const [firebaseSaved, setFirebaseSaved] = useState(false)
  const [showFirebaseSecret, setShowFirebaseSecret] = useState({ privateKey: false, vapidKey: false, apiKey: false })

  const setFb = (field, val) => setFirebase(f => ({ ...f, [field]: val }))
  const toggleFirebaseSecret = (key) => setShowFirebaseSecret(p => ({ ...p, [key]: !p[key] }))
  const isFirebaseOk = !!(firebase.projectId && firebase.clientEmail && firebase.privateKey && firebase.vapidKey)

  const saveFirebase = async () => {
    try {
      await api.put('/api/push/credentials', firebase)
      triggerSaved(setFirebaseSaved)
    } catch (error) {
      toast.error(error.message || 'No se pudieron guardar las credenciales de Firebase.')
    }
  }

  const setApi = (provider, field, val) =>
    setApis(a => ({ ...a, [provider]: { ...a[provider], [field]: val } }))

  const toggleSecret = (key) =>
    setShowSecret(p => ({ ...p, [key]: !p[key] }))

  const saveApi = async (provider) => {
    try {
      const data = await api.put(`/api/settings/apis/${provider}`, apis[provider])
      setApis(prev => ({ ...prev, ...(data.apis || {}) }))
      setApiSaved(p => ({ ...p, [provider]: true }))
      setTimeout(() => setApiSaved(p => ({ ...p, [provider]: false })), 2200)
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la integracion.')
    }
  }

  const isCasinoOk     = !!(apis.casino.token && apis.casino.url)
  const isOpenrouterOk = !!apis.openrouter.apiKey

  /* ── banco de chat ── */
  const [chatBank, setChatBank]   = useState({ provider: null, accountId: '' })
  const [bancoSaved, setBancoSaved] = useState(false)
  const [chatBanks, setChatBanks] = useState(CHAT_BANKS)
  const [chatAccounts, setChatAccounts] = useState(CHAT_ACCOUNTS)

  /* ── temas ── */
  const [themeConfig, setThemeConfig] = useState({ clientTheme: 'betchat-dark', adminTheme: 'dark-blue' })

  const activeBankCfg = chatBanks.find(b => b.id === chatBank.provider) ?? null

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.get('/api/settings')
      const profile = data.profile || {}
      setProfileForm({
        username: profile.username || '',
        full_name: profile.full_name || profile.username || '',
        email: profile.email || '',
        avatar_url: profile.avatar_url || '',
        avatar_data_url: '',
        clearAvatar: false,
      })
      setAvatarPreview(profile.avatar_url ? resolveAssetUrl(profile.avatar_url) : '')
      setMontos(data.amounts || { carga: { amount: '10', currency: 'USD' }, retiro: { amount: '50', currency: 'USD' } })
      setApis(prev => ({ ...prev, ...(data.apis || {}) }))
        setChatBank(data.chatBank || { provider: null, accountId: '' })
        setChatAccounts(data.bankAccounts || {})
        try {
        const creds = await api.get('/api/push/credentials')
        if (creds?.credentials && typeof creds.credentials === 'object') {
          setFirebase(prev => ({ ...prev, ...creds.credentials }))
        }
      } catch { /* firebase not configured yet */ }
        setChatBanks((data.bankProviders || []).map(provider => ({
          ...provider,
          ...(BANK_STYLES[provider.id] || BANK_STYLES.manual),
        })))
        if (!data.chatBank?.provider && Array.isArray(data.bankProviders)) {
          const defaultProvider = data.bankProviders.find(provider => provider.id !== 'manual' && Number(provider.count || 0) > 0)
            || data.bankProviders.find(provider => provider.id !== 'manual')
            || data.bankProviders[0]
          if (defaultProvider?.id) {
            const defaultAccount = (data.bankAccounts?.[defaultProvider.id] || [])[0]
            setChatBank({
              provider: defaultProvider.id,
              accountId: defaultAccount?.id ? String(defaultAccount.id) : '',
            })
          }
        }
        setThemeConfig(data.themeConfig || { clientTheme: 'betchat-dark', adminTheme: 'dark-blue' })
      const system = data.systemConfig || {}
      const nextSystem = {
        appName: system.appName || 'BetChat',
        logoUrl: system.logoUrl || '',
        logoDataUrl: '',
        faviconUrl: system.faviconUrl || '',
        faviconDataUrl: '',
        iframeUrl: system.iframeUrl || '',
        timezone: system.timezone || 'America/Bogota',
        supportType: system.supportType || 'phone',
        supportValue: system.supportValue || '',
        supportText: system.supportText || '',
        clientRegistrationEnabled: system.clientRegistrationEnabled !== false,
        clientLogoutEnabled: system.clientLogoutEnabled !== false,
        botMode: system.botMode === 'hybrid_ai' ? 'hybrid_ai' : 'manual',
        botAiModel: system.botAiModel || '',
        botAiTemperature: Number(system.botAiTemperature ?? 0.1),
        botAiMaxTokens: Number(system.botAiMaxTokens ?? 250),
        clearLogo: false,
        clearFavicon: false,
      }
      setSystemForm(nextSystem)
      setLogoPreview(system.logoUrl ? resolveAssetUrl(system.logoUrl) : '')
      setFaviconPreview(system.faviconUrl ? resolveAssetUrl(system.faviconUrl) : '')
      setGlobalSystemConfig(nextSystem)
    } catch (error) {
      toast.error(error.message || 'No se pudieron cargar los ajustes.')
    } finally {
      setLoadingSettings(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadSettings()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadSettings])

  const handleAvatarFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const dataUrl = await optimizeAvatar(file)
      setAvatarPreview(dataUrl)
      setProfileForm(prev => ({ ...prev, avatar_data_url: dataUrl, clearAvatar: false }))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const clearAvatar = () => {
    setAvatarPreview('')
    setProfileForm(prev => ({ ...prev, avatar_url: '', avatar_data_url: '', clearAvatar: true }))
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const handleLogoFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    try {
      const dataUrl = await optimizeAvatar(file)
      setLogoPreview(dataUrl)
      setSystemForm(prev => ({ ...prev, logoDataUrl: dataUrl, clearLogo: false }))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const clearLogo = () => {
    setLogoPreview('')
    setSystemForm(prev => ({ ...prev, logoUrl: '', logoDataUrl: '', clearLogo: true }))
  }

  const handleFaviconFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const dataUrl = await optimizeFavicon(file)
      setFaviconPreview(dataUrl)
      setSystemForm(prev => ({ ...prev, faviconDataUrl: dataUrl, clearFavicon: false }))
    } catch (error) {
      toast.error(error.message)
    }
  }

  const clearFaviconFn = () => {
    setFaviconPreview('')
    setSystemForm(prev => ({ ...prev, faviconUrl: '', faviconDataUrl: '', clearFavicon: true }))
  }

  const saveProfile = async () => {
    try {
      const data = await api.put('/api/settings/profile', profileForm)
      const profile = data.profile
      setProfileForm({
        username: profile.username || '',
        full_name: profile.full_name || profile.username || '',
        email: profile.email || '',
        avatar_url: profile.avatar_url || '',
        avatar_data_url: '',
        clearAvatar: false,
      })
      setAvatarPreview(profile.avatar_url ? resolveAssetUrl(profile.avatar_url) : '')
      setUser(prev => prev ? { ...prev, ...profile } : prev)
      triggerSaved(setProfileSaved)
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el perfil.')
    }
  }

  const savePassword = async () => {
    try {
      await api.put('/api/settings/password', pwForm)
      setPwForm({ current: '', next: '', confirm: '' })
      triggerSaved(setPwSaved)
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar la contrasena.')
    }
  }

  const saveAmounts = async () => {
    try {
      const data = await api.put('/api/settings/amounts', montos)
      setMontos(data.amounts || montos)
      triggerSaved(setMontosSaved)
    } catch (error) {
      toast.error(error.message || 'No se pudieron guardar los montos.')
    }
  }

  const saveChatBank = async () => {
    try {
      const data = await api.put('/api/settings/chat-bank', chatBank)
      setChatBank(data.chatBank || chatBank)
      triggerSaved(setBancoSaved)
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar el banco de chat.')
    }
  }

  const saveSystem = async () => {
    try {
      const data = await api.put('/api/settings/system', systemForm)
      const system = data.systemConfig || {}
      const nextSystem = {
        appName: system.appName || 'BetChat',
        logoUrl: system.logoUrl || '',
        logoDataUrl: '',
        faviconUrl: system.faviconUrl || '',
        faviconDataUrl: '',
        iframeUrl: system.iframeUrl || '',
        timezone: system.timezone || 'America/Bogota',
        supportType: system.supportType || 'phone',
        supportValue: system.supportValue || '',
        supportText: system.supportText || '',
        clientRegistrationEnabled: system.clientRegistrationEnabled !== false,
        clientLogoutEnabled: system.clientLogoutEnabled !== false,
        botMode: system.botMode === 'hybrid_ai' ? 'hybrid_ai' : 'manual',
        botAiModel: system.botAiModel || '',
        botAiTemperature: Number(system.botAiTemperature ?? 0.1),
        botAiMaxTokens: Number(system.botAiMaxTokens ?? 250),
        clearLogo: false,
        clearFavicon: false,
      }
      setSystemForm(nextSystem)
      setLogoPreview(system.logoUrl ? resolveAssetUrl(system.logoUrl) : '')
      setFaviconPreview(system.faviconUrl ? resolveAssetUrl(system.faviconUrl) : '')
      setGlobalSystemConfig(nextSystem)
      triggerSaved(setSystemSaved)
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la configuracion del sistema.')
    }
  }

  const triggerSaved = (setter) => {
    setter(true)
    setTimeout(() => setter(false), 2200)
  }

  const togglePw = (field) =>
    setShowPw(p => ({ ...p, [field]: !p[field] }))

  const setMonto = (key, field, val) =>
    setMontos(m => ({ ...m, [key]: { ...m[key], [field]: val } }))

  const initials = (profileForm.full_name || profileForm.username || user?.username || '?')[0].toUpperCase()

  return (
    <PageWrap data-tour="settings-page">

      <PageHeader>
        {onMenuOpen && (
          <MenuBtn type="button" onClick={onMenuOpen} aria-label="Menú">
            <MenuIcon />
          </MenuBtn>
        )}
        <TitleBlock>
          <PageTitle>Ajustes</PageTitle>
          <PageSub>{loadingSettings ? 'Cargando ajustes...' : 'Configura tu cuenta y los parámetros del sistema'}</PageSub>
        </TitleBlock>
      </PageHeader>

      <Body>

        {/* ── left navigation ── */}
        <SettingsNav data-tour="settings-nav">
          <NavGroupLabel>General</NavGroupLabel>
          {TABS.map(tab => {
            const isActive = activeTab === tab.id && !tab.soon
            return (
              <NavBtn
                key={tab.id}
                type="button"
                $active={isActive}
                $soon={tab.soon}
                onClick={() => !tab.soon && setActiveTab(tab.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && <ActiveBar />}
                <NavIcon $active={isActive}>{tab.icon}</NavIcon>
                <NavTextWrap>
                  <NavLabel $active={isActive}>{tab.label}</NavLabel>
                  <NavSub>{tab.sub}</NavSub>
                </NavTextWrap>
                {tab.soon && <SoonPill>Próx.</SoonPill>}
              </NavBtn>
            )
          })}
        </SettingsNav>

        {/* ── content panel (key triggers fade-in on tab change) ── */}
        <Content key={activeTab} data-tour="settings-content">

          {/* ════════════════ PERFIL ════════════════ */}
          {activeTab === 'perfil' && (
            <Section>

              {/* profile summary */}
              <ProfileCard>
                  <AvatarStack>
                    <ProfileAvatar>
                      {avatarPreview ? <ProfileAvatarImg src={avatarPreview} alt="" /> : initials}
                      <ProfileAvatarBtn type="button" onClick={() => avatarInputRef.current?.click()} title="Subir avatar">
                        <PhotoCameraOutlinedIcon />
                      </ProfileAvatarBtn>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFile}
                        style={{ display: 'none' }}
                      />
                    </ProfileAvatar>
                    {avatarPreview && (
                      <AvatarRemoveBtn type="button" onClick={clearAvatar}>
                        <HighlightOffOutlinedIcon />
                        Quitar foto
                      </AvatarRemoveBtn>
                    )}
                  </AvatarStack>
                  <ProfileInfo>
                    <ProfileName>{profileForm.full_name || profileForm.username || 'Usuario'}</ProfileName>
                  <ProfileRole>{profileForm.email}</ProfileRole>
                  <ProfileBadge $role={user?.role}>
                    {user?.role === 'admin' ? 'Administrador' : 'Cajero'}
                  </ProfileBadge>
                </ProfileInfo>
              </ProfileCard>

              {/* account info */}
              <Card $delay="40ms">
                <CardHead>
                  <CardIcon>
                    <AccountCircleOutlinedIcon />
                  </CardIcon>
                  <CardHeadText>
                    <CardTitle>Información de cuenta</CardTitle>
                    <CardSub>Actualiza tu nombre de usuario y correo electrónico</CardSub>
                  </CardHeadText>
                </CardHead>
                <CardBody>
                  <FormGrid>
                    <Field>
                      <FieldLabel>Nombre completo</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="Tu nombre"
                          value={profileForm.full_name}
                          onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))}
                          autoComplete="name"
                        />
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>Nombre de usuario</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="Tu nombre"
                          value={profileForm.username}
                          onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                          autoComplete="username"
                        />
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>Correo electrónico</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="email"
                          placeholder="tu@betchat.com"
                          value={profileForm.email}
                          onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                          autoComplete="email"
                        />
                      </InputWrap>
                    </Field>
                  </FormGrid>


                  <SaveFooter>
                    <SaveBtn
                      type="button"
                      $saved={profileSaved}
                      onClick={saveProfile}
                    >
                      {profileSaved ? <><CheckIcon />Guardado</> : 'Guardar cambios'}
                    </SaveBtn>
                  </SaveFooter>
                </CardBody>
              </Card>

              {/* password */}
              <Card $delay="80ms">
                <CardHead>
                  <CardIcon
                    $bg="rgba(139,92,246,0.12)"
                    $br="rgba(139,92,246,0.22)"
                    $cl="#a78bfa"
                  >
                    <LockOutlinedIcon />
                  </CardIcon>
                  <CardHeadText>
                    <CardTitle>Cambiar contraseña</CardTitle>
                    <CardSub>Usa al menos 8 caracteres combinando letras y números</CardSub>
                  </CardHeadText>
                </CardHead>
                <CardBody>
                  <Field>
                    <FieldLabel>Contraseña actual</FieldLabel>
                    <InputWrap>
                      <FieldInput
                        type={showPw.current ? 'text' : 'password'}
                        placeholder="••••••••"
                        $hasRight
                        value={pwForm.current}
                        onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                        autoComplete="current-password"
                      />
                      <InputSuffix type="button" onClick={() => togglePw('current')} tabIndex={-1}>
                        {showPw.current ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </InputSuffix>
                    </InputWrap>
                  </Field>
                  <FormGrid>
                    <Field>
                      <FieldLabel>Nueva contraseña</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.next ? 'text' : 'password'}
                          placeholder="••••••••"
                          $hasRight
                          value={pwForm.next}
                          onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                          autoComplete="new-password"
                        />
                        <InputSuffix type="button" onClick={() => togglePw('next')} tabIndex={-1}>
                          {showPw.next ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>Confirmar contraseña</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showPw.confirm ? 'text' : 'password'}
                          placeholder="••••••••"
                          $hasRight
                          value={pwForm.confirm}
                          onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                          autoComplete="new-password"
                        />
                        <InputSuffix type="button" onClick={() => togglePw('confirm')} tabIndex={-1}>
                          {showPw.confirm ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                  </FormGrid>
                  <SaveFooter>
                    <SaveBtn
                      type="button"
                      $saved={pwSaved}
                      onClick={savePassword}
                    >
                      {pwSaved ? <><CheckIcon />Contraseña actualizada</> : 'Cambiar contraseña'}
                    </SaveBtn>
                  </SaveFooter>
                </CardBody>
              </Card>

            </Section>
          )}

          {/* ════════════════ MONTOS ════════════════ */}
          {activeTab === 'sistema' && (
            <Section>
              <Card $delay="40ms">
                <CardHead>
                  <CardIcon>
                    <BrandingWatermarkOutlinedIcon />
                  </CardIcon>
                  <CardHeadText>
                    <CardTitle>Marca del sistema</CardTitle>
                    <CardSub>Define el nombre, logo y acceso de registro para clientes</CardSub>
                  </CardHeadText>
                </CardHead>
                <CardBody>
                  <ProfileCard>
                    <ProfileAvatar>
                      {logoPreview ? <ProfileAvatarImg src={logoPreview} alt="" /> : (systemForm.appName || 'BetChat').slice(0, 2).toUpperCase()}
                      <ProfileAvatarBtn type="button" onClick={() => logoInputRef.current?.click()} title="Subir logo">
                        <PhotoCameraOutlinedIcon />
                      </ProfileAvatarBtn>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFile}
                        style={{ display: 'none' }}
                      />
                    </ProfileAvatar>
                    <ProfileInfo>
                      <ProfileName>{systemForm.appName || 'BetChat'}</ProfileName>
                      <ProfileRole>{logoPreview ? 'Logo personalizado activo' : 'Usando iniciales del sistema'}</ProfileRole>
                      {logoPreview && (
                        <ProfileBadge as="button" type="button" onClick={clearLogo}>
                          Quitar logo
                        </ProfileBadge>
                      )}
                    </ProfileInfo>
                  </ProfileCard>

                  <FormGrid>
                    <Field>
                      <FieldLabel>Nombre de la app</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="BetChat"
                          value={systemForm.appName}
                          onChange={e => setSystemForm(f => ({ ...f, appName: e.target.value }))}
                        />
                      </InputWrap>
                    </Field>
                  </FormGrid>

                  {/* ── timezone ── */}
                  <FormGrid $cols={1}>
                    <Field>
                      <FieldLabel>Zona horaria del sistema</FieldLabel>
                      <FieldSelect
                        value={systemForm.timezone}
                        onChange={e => setSystemForm(f => ({ ...f, timezone: e.target.value }))}
                      >
                        {TIMEZONES.map(group => (
                          <optgroup key={group.group} label={group.group}>
                            {group.zones.map(tz => (
                              <option key={tz.value} value={tz.value}>{tz.label}</option>
                            ))}
                          </optgroup>
                        ))}
                      </FieldSelect>
                    </Field>
                  </FormGrid>

                  {/* ── support contact ── */}
                  <SupportSection>
                    <SupportHeading>
                      <HeadsetMicOutlinedIcon style={{ fontSize: 15, opacity: 0.6 }} />
                      Contacto de soporte
                    </SupportHeading>
                    <SupportDesc>
                      Aparece en el chat como botón de ayuda para que los clientes puedan contactarte.
                    </SupportDesc>
                    <TypeSegment>
                      <TypeBtn
                        type="button"
                        $active={systemForm.supportType === 'phone'}
                        onClick={() => setSystemForm(f => ({ ...f, supportType: 'phone' }))}
                      >
                        📞 Teléfono
                      </TypeBtn>
                      <TypeBtn
                        type="button"
                        $active={systemForm.supportType === 'link'}
                        onClick={() => setSystemForm(f => ({ ...f, supportType: 'link' }))}
                      >
                        🔗 Enlace
                      </TypeBtn>
                    </TypeSegment>
                    <FormGrid $cols={1}>
                      <Field>
                        <FieldLabel>
                          {systemForm.supportType === 'phone' ? 'Número de teléfono / WhatsApp' : 'URL de soporte'}
                        </FieldLabel>
                        <InputWrap>
                          <FieldInput
                            type={systemForm.supportType === 'link' ? 'url' : 'tel'}
                            placeholder={systemForm.supportType === 'phone' ? '+54 9 11 1234 5678' : 'https://wa.me/549...'}
                            value={systemForm.supportValue}
                            onChange={e => setSystemForm(f => ({ ...f, supportValue: e.target.value }))}
                          />
                        </InputWrap>
                      </Field>
                      <Field>
                        <FieldLabel>Texto del enlace de ayuda</FieldLabel>
                        <InputWrap>
                          <FieldInput
                            type="text"
                            placeholder="Necesito ayuda para ingresar"
                            value={systemForm.supportText}
                            onChange={e => setSystemForm(f => ({ ...f, supportText: e.target.value }))}
                            maxLength={200}
                          />
                        </InputWrap>
                      </Field>
                    </FormGrid>
                  </SupportSection>

                  {/* ── favicon upload ── */}
                  <FaviconSection>
                    <FaviconHeading>
                      <PhotoCameraOutlinedIcon style={{ fontSize: 15, opacity: 0.6 }} />
                      Favicon de la pestaña
                    </FaviconHeading>
                    <FaviconDesc>
                      Aparece en la pestaña del navegador junto al nombre de la app.
                      Si no subes uno, se usará el logo automáticamente.
                    </FaviconDesc>
                    <BrowserTabPreview
                      favicon={faviconPreview || logoPreview}
                      appName={systemForm.appName}
                    />
                    <FaviconActions>
                      <FaviconUploadBtn type="button" onClick={() => faviconInputRef.current?.click()}>
                        <PhotoCameraOutlinedIcon />
                        {faviconPreview ? 'Cambiar favicon' : 'Subir favicon'}
                      </FaviconUploadBtn>
                      {faviconPreview && (
                        <FaviconClearBtn type="button" onClick={clearFaviconFn}>
                          Quitar favicon
                        </FaviconClearBtn>
                      )}
                      <input
                        ref={faviconInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFaviconFile}
                        style={{ display: 'none' }}
                      />
                    </FaviconActions>
                    <FaviconHint>Recomendado: imagen cuadrada, mínimo 64×64 px (PNG, WebP o JPG)</FaviconHint>
                  </FaviconSection>

                  <ToggleRow>
                    <ToggleText>
                      <ToggleTitle>Registro de clientes</ToggleTitle>
                      <ToggleSub>Si esta desactivado, se oculta el enlace de registro y el endpoint queda bloqueado.</ToggleSub>
                    </ToggleText>
                    <ToggleSwitch
                      type="button"
                      $active={systemForm.clientRegistrationEnabled}
                      onClick={() => setSystemForm(f => ({ ...f, clientRegistrationEnabled: !f.clientRegistrationEnabled }))}
                      aria-pressed={systemForm.clientRegistrationEnabled}
                    />
                  </ToggleRow>

                  <ToggleRow>
                    <ToggleText>
                      <ToggleTitle>Boton de cerrar sesion</ToggleTitle>
                      <ToggleSub>Controla si el cliente puede ver el boton para salir de su cuenta en el chat.</ToggleSub>
                    </ToggleText>
                    <ToggleSwitch
                      type="button"
                      $active={systemForm.clientLogoutEnabled}
                      onClick={() => setSystemForm(f => ({ ...f, clientLogoutEnabled: !f.clientLogoutEnabled }))}
                      aria-pressed={systemForm.clientLogoutEnabled}
                    />
                  </ToggleRow>

                  <SaveFooter>
                    <SaveBtn type="button" $saved={systemSaved} onClick={saveSystem}>
                      {systemSaved ? <><CheckIcon />Guardado</> : 'Guardar ajustes'}
                    </SaveBtn>
                  </SaveFooter>
                </CardBody>
              </Card>

              {/* ── iframe URL ── */}
              <Card $delay="80ms">
                <CardHead>
                  <CardIcon><LanguageOutlinedIcon /></CardIcon>
                  <CardHeadText>
                    <CardTitle>Página del cliente</CardTitle>
                    <CardSub>Sitio web que se muestra como fondo en la página de clientes</CardSub>
                  </CardHeadText>
                </CardHead>
                <CardBody>
                  <IframeSection>
                    <IframeLabel>
                      <LanguageOutlinedIcon style={{ fontSize: 15, opacity: 0.6 }} />
                      URL del iframe
                    </IframeLabel>
                    <IframeDesc>
                      Ingresa la dirección del sitio que se mostrará embebido detrás del chat.
                      Algunos sitios bloquean el embedding por seguridad.
                    </IframeDesc>
                    <FormGrid $cols={1}>
                      <Field>
                        <InputWrap>
                          <FieldInput
                            type="url"
                            placeholder="https://tusite.com"
                            value={systemForm.iframeUrl}
                            onChange={e => setSystemForm(f => ({ ...f, iframeUrl: e.target.value }))}
                          />
                        </InputWrap>
                      </Field>
                    </FormGrid>
                    <IframeLivePreview url={systemForm.iframeUrl} />
                  </IframeSection>
                  <SaveFooter>
                    <SaveBtn type="button" $saved={systemSaved} onClick={saveSystem}>
                      {systemSaved ? <><CheckIcon />Guardado</> : 'Guardar ajustes'}
                    </SaveBtn>
                  </SaveFooter>
                </CardBody>
              </Card>
            </Section>
          )}

          {activeTab === 'montos' && (
            <Section>

              <InfoBanner>
                <InfoBannerIcon><InfoOutlinedIcon /></InfoBannerIcon>
                <InfoBannerText>
                  Estos montos aplican globalmente a todas las operaciones del sistema.
                  Los cambios tienen efecto inmediato sobre nuevas transacciones.
                </InfoBannerText>
              </InfoBanner>

              <MontosGrid>

                {/* carga */}
                <MontoCard
                  $br="rgba(34,197,94,0.14)"
                  $focusBr="rgba(34,197,94,0.32)"
                  $delay="40ms"
                >
                  <MontoHead>
                    <MontoIconWrap
                      $bg="rgba(34,197,94,0.12)"
                      $br="rgba(34,197,94,0.22)"
                      $cl="#4ade80"
                    >
                      <ArrowCircleUpOutlinedIcon />
                    </MontoIconWrap>
                    <MontoInfo>
                      <MontoTitle>Mínimo de carga</MontoTitle>
                      <MontoDesc>Depósito mínimo aceptado</MontoDesc>
                    </MontoInfo>
                  </MontoHead>
                  <MontoDivider />
                  <MontoBody>
                    <MontoInputRow>
                      <CurrencyPrefix>$</CurrencyPrefix>
                      <MontoInput
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={montos.carga.amount}
                        onChange={e => setMonto('carga', 'amount', e.target.value)}
                        $focusBr="rgba(34,197,94,0.42)"
                        $focusBg="rgba(34,197,94,0.04)"
                        aria-label="Monto mínimo de carga"
                      />
                      <CurrencySelect
                        value={montos.carga.currency}
                        onChange={e => setMonto('carga', 'currency', e.target.value)}
                        aria-label="Moneda de carga"
                      >
                        <option>USD</option>
                        <option>ARS</option>
                        <option>MXN</option>
                        <option>COP</option>
                        <option>CLP</option>
                        <option>UYU</option>
                      </CurrencySelect>
                    </MontoInputRow>
                    <MontoNote>
                      Importe mínimo que un cliente puede depositar en una sola operación.
                    </MontoNote>
                  </MontoBody>
                </MontoCard>

                {/* retiro */}
                <MontoCard
                  $br="rgba(245,158,11,0.14)"
                  $focusBr="rgba(245,158,11,0.32)"
                  $delay="80ms"
                >
                  <MontoHead>
                    <MontoIconWrap
                      $bg="rgba(245,158,11,0.12)"
                      $br="rgba(245,158,11,0.22)"
                      $cl="#fbbf24"
                    >
                      <ArrowCircleDownOutlinedIcon />
                    </MontoIconWrap>
                    <MontoInfo>
                      <MontoTitle>Mínimo de retiro</MontoTitle>
                      <MontoDesc>Retiro mínimo permitido</MontoDesc>
                    </MontoInfo>
                  </MontoHead>
                  <MontoDivider />
                  <MontoBody>
                    <MontoInputRow>
                      <CurrencyPrefix>$</CurrencyPrefix>
                      <MontoInput
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={montos.retiro.amount}
                        onChange={e => setMonto('retiro', 'amount', e.target.value)}
                        $focusBr="rgba(245,158,11,0.42)"
                        $focusBg="rgba(245,158,11,0.04)"
                        aria-label="Monto mínimo de retiro"
                      />
                      <CurrencySelect
                        value={montos.retiro.currency}
                        onChange={e => setMonto('retiro', 'currency', e.target.value)}
                        aria-label="Moneda de retiro"
                      >
                        <option>USD</option>
                        <option>ARS</option>
                        <option>MXN</option>
                        <option>COP</option>
                        <option>CLP</option>
                        <option>UYU</option>
                      </CurrencySelect>
                    </MontoInputRow>
                    <MontoNote>
                      Importe mínimo que un cliente puede retirar en una sola operación.
                    </MontoNote>
                  </MontoBody>
                </MontoCard>

              </MontosGrid>

              <SaveFooter>
                <SaveBtn
                  type="button"
                  $saved={montosSaved}
                  onClick={saveAmounts}
                >
                  {montosSaved ? <><CheckIcon />Montos actualizados</> : 'Guardar montos'}
                </SaveBtn>
              </SaveFooter>

            </Section>
          )}

          {/* ════════════════ APIS ════════════════ */}
          {activeTab === 'apis' && (
            <Section>

              <InfoBanner>
                <InfoBannerIcon><InfoOutlinedIcon /></InfoBannerIcon>
                <InfoBannerText>
                  Las claves y tokens se almacenan de forma segura. Nunca compartas estas credenciales con terceros.
                </InfoBannerText>
              </InfoBanner>

              {/* ── Casino ── */}
              <Card $delay="40ms">
                <CardHead>
                  <CardIcon
                    $bg="rgba(124,58,237,0.12)"
                    $br="rgba(124,58,237,0.24)"
                    $cl="#a78bfa"
                  >
                    <CasinoOutlinedIcon />
                  </CardIcon>
                  <CardHeadText>
                    <CardTitle>Casino Platform</CardTitle>
                    <CardSub>API de integración con la plataforma de juegos</CardSub>
                  </CardHeadText>
                  <ApiStatusBadge $ok={isCasinoOk}>
                    {isCasinoOk ? 'Configurado' : 'Sin configurar'}
                  </ApiStatusBadge>
                </CardHead>
                <CardBody>
                  <Field>
                    <FieldLabel>Token de plataforma</FieldLabel>
                    <InputWrap>
                      <FieldInput
                        type={showSecret.casinoToken ? 'text' : 'password'}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                        $hasRight
                        value={apis.casino.token}
                        onChange={e => setApi('casino', 'token', e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                      <InputSuffix type="button" onClick={() => toggleSecret('casinoToken')} tabIndex={-1}>
                        {showSecret.casinoToken ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </InputSuffix>
                    </InputWrap>
                  </Field>
                  <Field>
                    <FieldLabel>URL del API</FieldLabel>
                    <InputWrap>
                      <FieldInput
                        type="url"
                        placeholder="https://admin.dominio.com/api/v1/"
                        value={apis.casino.url}
                        onChange={e => setApi('casino', 'url', e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                      />
                    </InputWrap>
                  </Field>
                  <SaveFooter>
                    <SaveBtn type="button" $saved={apiSaved.casino} onClick={() => saveApi('casino')}>
                      {apiSaved.casino ? <><CheckIcon />Guardado</> : 'Guardar'}
                    </SaveBtn>
                  </SaveFooter>
                  <ApiNote>
                    Permite la sincronización de clientes, saldos y transacciones con la plataforma de juegos.
                  </ApiNote>
                </CardBody>
              </Card>

              {/* ── OpenRouter AI ── */}
              <Card $delay="120ms">
                <CardHead>
                  <CardIcon
                    $bg="rgba(16,185,129,0.12)"
                    $br="rgba(16,185,129,0.24)"
                    $cl="#34d399"
                  >
                    <AutoAwesomeOutlinedIcon />
                  </CardIcon>
                  <CardHeadText>
                    <CardTitle>OpenRouter AI</CardTitle>
                    <CardSub>Modelos de inteligencia artificial generativa</CardSub>
                  </CardHeadText>
                  <ApiStatusBadge $ok={isOpenrouterOk}>
                    {isOpenrouterOk ? 'Configurado' : 'Sin configurar'}
                  </ApiStatusBadge>
                </CardHead>
                <CardBody>
                  {/* API key */}
                  <Field>
                    <FieldLabel>Clave de API de OpenRouter</FieldLabel>
                    <InputWrap>
                      <FieldInput
                        type={showSecret.openrouterKey ? 'text' : 'password'}
                        placeholder="sk-or-v1-••••••••••••••••••••••••••••••••"
                        $hasRight
                        value={apis.openrouter.apiKey}
                        onChange={e => setApi('openrouter', 'apiKey', e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                      />
                      <InputSuffix type="button" onClick={() => toggleSecret('openrouterKey')} tabIndex={-1}>
                        {showSecret.openrouterKey ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </InputSuffix>
                    </InputWrap>
                  </Field>

                  {/* Model selector */}
                  <div>
                    <ModelSectionLabel style={{ marginBottom: 10 }}>
                      Modelo de IA — análisis de comprobantes
                    </ModelSectionLabel>
                    <ModelGrid>
                      {RECEIPT_MODELS.map(m => {
                        const active = apis.openrouter.model === m.id
                        return (
                          <ModelCard
                            key={m.id}
                            type="button"
                            $active={active}
                            onClick={() => setApi('openrouter', 'model', m.id)}
                          >
                            <ModelCheck $show={active}><CheckIcon /></ModelCheck>
                            <ModelCardRow>
                              <ModelMeta>
                                <ModelProvider>{m.provider}</ModelProvider>
                                <ModelName>{m.name}</ModelName>
                              </ModelMeta>
                              <ModelTag $bg={m.tagBg} $cl={m.tagCl}>{m.tag}</ModelTag>
                            </ModelCardRow>
                            <ModelDesc>{m.desc}</ModelDesc>
                            <ModelCostRow>
                              <ModelCostValue $tier={m.tier}>
                                ${m.costPer1k.toFixed(2)}
                              </ModelCostValue>
                              <ModelCostLabel>/ 1.000 lecturas</ModelCostLabel>
                              <ModelPriceDetail>
                                ${m.inputPriceM}/M in · ${m.outputPriceM}/M out
                              </ModelPriceDetail>
                            </ModelCostRow>
                          </ModelCard>
                        )
                      })}
                    </ModelGrid>
                  </div>

                  <ModelCostNote>
                    ⓘ Costos estimados asumiendo ~1.000 tokens de entrada (imagen + prompt) y ~80 tokens de salida por comprobante. Los precios son aproximados y pueden variar según OpenRouter. Consultá <strong style={{ color: 'rgba(255,255,255,0.35)' }}>openrouter.ai/models</strong> para tarifas actualizadas.
                  </ModelCostNote>

                  <SaveFooter>
                    <SaveBtn type="button" $saved={apiSaved.openrouter} onClick={() => saveApi('openrouter')}>
                      {apiSaved.openrouter ? <><CheckIcon />Guardado</> : 'Guardar'}
                    </SaveBtn>
                  </SaveFooter>
                  <ApiNote>
                    Modelo utilizado para extraer y analizar automáticamente los comprobantes de depósito enviados por los clientes.
                  </ApiNote>
                </CardBody>
              </Card>

              {/* ── Firebase Push ── */}
            </Section>
          )}

          {activeTab === 'botia' && (
                <Card $delay="40ms">
                  <CardHead>
                    <CardIcon
                      $bg="rgba(30,133,255,0.12)"
                      $br="rgba(30,133,255,0.24)"
                      $cl="#60a5fa"
                    >
                      <AutoAwesomeOutlinedIcon />
                    </CardIcon>
                    <CardHeadText>
                      <CardTitle>Bot IA</CardTitle>
                      <CardSub>Modo híbrido y parámetros del router inteligente</CardSub>
                    </CardHeadText>
                    <ApiStatusBadge $ok={systemForm.botMode === 'hybrid_ai'}>
                      {systemForm.botMode === 'hybrid_ai' ? 'Híbrido activo' : 'Manual'}
                    </ApiStatusBadge>
                  </CardHead>
                  <CardBody>
                    <InfoBanner>
                      <InfoBannerIcon><InfoOutlinedIcon /></InfoBannerIcon>
                      <InfoBannerText>
                        El bot manual sigue siendo la fuente de verdad. En modo híbrido la IA solo interpreta intención y reutiliza botones, pantallas y formularios existentes.
                      </InfoBannerText>
                    </InfoBanner>
                    <FormGrid $cols={2}>
                      <Field>
                        <FieldLabel>Modo de procesamiento</FieldLabel>
                        <InputWrap>
                          <FieldSelect
                            value={systemForm.botMode}
                            onChange={e => setSystemForm(f => ({ ...f, botMode: e.target.value }))}
                          >
                            <option value="manual">Manual</option>
                            <option value="hybrid_ai">Híbrido IA</option>
                          </FieldSelect>
                        </InputWrap>
                      </Field>
                      <Field>
                        <FieldLabel>Modelo IA del bot</FieldLabel>
                        <InputWrap>
                          <FieldSelect
                            value={systemForm.botAiModel}
                            onChange={e => setSystemForm(f => ({ ...f, botAiModel: e.target.value }))}
                          >
                            {BOT_AI_MODEL_OPTIONS.map(option => (
                              <option key={option.id || 'default'} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </FieldSelect>
                        </InputWrap>
                      </Field>
                      <Field>
                        <FieldLabel>Temperatura</FieldLabel>
                        <InputWrap>
                          <FieldInput
                            type="number"
                            min="0"
                            max="2"
                            step="0.05"
                            value={systemForm.botAiTemperature}
                            onChange={e => setSystemForm(f => ({ ...f, botAiTemperature: e.target.value }))}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </InputWrap>
                      </Field>
                      <Field>
                        <FieldLabel>Máx. tokens</FieldLabel>
                        <InputWrap>
                          <FieldInput
                            type="number"
                            min="1"
                            step="1"
                            value={systemForm.botAiMaxTokens}
                            onChange={e => setSystemForm(f => ({ ...f, botAiMaxTokens: e.target.value }))}
                            autoComplete="off"
                            spellCheck={false}
                          />
                        </InputWrap>
                      </Field>
                    </FormGrid>
                    <ModelCostNote style={{ marginTop: 14 }}>
                      Si el modelo queda vacío, el bot usará el modelo guardado en OpenRouter. Guardá estos cambios desde este bloque para actualizar el runtime.
                    </ModelCostNote>
                    <SaveFooter>
                      <SaveBtn type="button" $saved={systemSaved} onClick={saveSystem}>
                        {systemSaved ? <><CheckIcon />Guardado</> : 'Guardar modo IA'}
                      </SaveBtn>
                    </SaveFooter>
                  </CardBody>
                </Card>
              )}

          {activeTab === 'apis' && (
            <Section>
              <Card $delay="160ms">
                <CardHead>
                  <CardIcon
                    $bg="rgba(251,146,60,0.12)"
                    $br="rgba(251,146,60,0.24)"
                    $cl="#fb923c"
                  >
                    <NotificationsActiveOutlinedIcon />
                  </CardIcon>
                  <CardHeadText>
                    <CardTitle>Firebase Cloud Messaging</CardTitle>
                    <CardSub>Credenciales para notificaciones push en tiempo real</CardSub>
                  </CardHeadText>
                  <ApiStatusBadge $ok={isFirebaseOk}>
                    {isFirebaseOk ? 'Configurado' : 'Sin configurar'}
                  </ApiStatusBadge>
                </CardHead>
                <CardBody>
                  <FormGrid>
                    <Field>
                      <FieldLabel>Project ID</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="mi-proyecto-12345"
                          value={firebase.projectId}
                          onChange={e => setFb('projectId', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>Client Email</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="firebase-adminsdk-xxx@mi-proyecto.iam.gserviceaccount.com"
                          value={firebase.clientEmail}
                          onChange={e => setFb('clientEmail', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                      </InputWrap>
                    </Field>
                  </FormGrid>
                  <Field>
                    <FieldLabel>Private Key (Admin SDK)</FieldLabel>
                    <InputWrap>
                      <FieldInput
                        type={showFirebaseSecret.privateKey ? 'text' : 'password'}
                        placeholder="-----BEGIN PRIVATE KEY-----\n..."
                        $hasRight
                        value={firebase.privateKey}
                        onChange={e => setFb('privateKey', e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                      />
                      <InputSuffix type="button" onClick={() => toggleFirebaseSecret('privateKey')} tabIndex={-1}>
                        {showFirebaseSecret.privateKey ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </InputSuffix>
                    </InputWrap>
                  </Field>
                  <FormGrid>
                    <Field>
                      <FieldLabel>API Key (Client)</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showFirebaseSecret.apiKey ? 'text' : 'password'}
                          placeholder="AIzaSy..."
                          $hasRight
                          value={firebase.apiKey}
                          onChange={e => setFb('apiKey', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                        <InputSuffix type="button" onClick={() => toggleFirebaseSecret('apiKey')} tabIndex={-1}>
                          {showFirebaseSecret.apiKey ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>Auth Domain</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="mi-proyecto.firebaseapp.com"
                          value={firebase.authDomain}
                          onChange={e => setFb('authDomain', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>Storage Bucket</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="mi-proyecto.appspot.com"
                          value={firebase.storageBucket}
                          onChange={e => setFb('storageBucket', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>Messaging Sender ID</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="123456789012"
                          value={firebase.messagingSenderId}
                          onChange={e => setFb('messagingSenderId', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>App ID</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="1:123456789012:web:abc123..."
                          value={firebase.appId}
                          onChange={e => setFb('appId', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                      </InputWrap>
                    </Field>
                  </FormGrid>
                  <Field>
                    <FieldLabel>VAPID Key (Web Push)</FieldLabel>
                    <InputWrap>
                      <FieldInput
                        type={showFirebaseSecret.vapidKey ? 'text' : 'password'}
                        placeholder="BLBx-..."
                        $hasRight
                        value={firebase.vapidKey}
                        onChange={e => setFb('vapidKey', e.target.value)}
                        autoComplete="off"
                        spellCheck={false}
                        style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                      />
                      <InputSuffix type="button" onClick={() => toggleFirebaseSecret('vapidKey')} tabIndex={-1}>
                        {showFirebaseSecret.vapidKey ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                      </InputSuffix>
                    </InputWrap>
                  </Field>
                  <SaveFooter>
                    <SaveBtn type="button" $saved={firebaseSaved} onClick={saveFirebase}>
                      {firebaseSaved ? <><CheckIcon />Guardado</> : 'Guardar credenciales'}
                    </SaveBtn>
                  </SaveFooter>
                  <ApiNote>
                    Obtén estas credenciales en Firebase Console → Configuración del proyecto → Cuentas de servicio (Admin SDK) y Configuración web (Client). La VAPID key está en Cloud Messaging → Web Push certificates.
                  </ApiNote>
                </CardBody>
              </Card>

            </Section>
          )}

          {/* ════════════════ BANCO DE CHAT ════════════════ */}
          {activeTab === 'banco' && (
            <Section>

              <InfoBanner>
                <InfoBannerIcon><InfoOutlinedIcon /></InfoBannerIcon>
                <InfoBannerText>
                  El banco seleccionado procesará las transacciones entrantes de los chats de soporte.
                  Puedes agregar más cuentas desde la sección <strong style={{ color: 'rgba(255,255,255,0.55)' }}>Cuentas bancarias</strong>.
                </InfoBannerText>
              </InfoBanner>

              {/* proveedor */}
              <Card $delay="40ms">
                <CardHead>
                  <CardIcon
                    $bg="rgba(30,133,255,0.12)"
                    $br="rgba(30,133,255,0.22)"
                  >
                    <AccountBalanceWalletOutlinedIcon />
                  </CardIcon>
                  <CardHeadText>
                    <CardTitle>Proveedor bancario</CardTitle>
                    <CardSub>Selecciona el motor de procesamiento de pagos activo</CardSub>
                  </CardHeadText>
                </CardHead>
                <CardBody>
                  <ProviderGrid>
                    {chatBanks.map(b => {
                      const isActive = chatBank.provider === b.id
                      return (
                        <ProviderCard
                          key={b.id} type="button"
                          $active={isActive} $activeBg={b.bg} $activeBr={b.br}
                          onClick={() => setChatBank({ provider: b.id, accountId: '' })}
                        >
                          <RadioCircle $active={isActive} $color={b.color} />
                          <ProviderAvatar $bg={b.avatarBg} $br={b.avatarBr}>
                            {b.initials}
                          </ProviderAvatar>
                          <ProviderInfo>
                            <ProviderName $active={isActive} $color={b.color}>
                              {b.label}
                            </ProviderName>
                            <ProviderSub>
                              {b.count} cuenta{b.count !== 1 ? 's' : ''} disponible{b.count !== 1 ? 's' : ''}
                            </ProviderSub>
                          </ProviderInfo>
                        </ProviderCard>
                      )
                    })}
                  </ProviderGrid>
                </CardBody>
              </Card>

              {/* cuenta específica — aparece al seleccionar proveedor */}
              {activeBankCfg && (
                <AccountSelectCard
                  $bg={activeBankCfg.bg}
                  $br={activeBankCfg.br}
                >
                  <ActiveProviderRow>
                    <ActiveProviderDot $color={activeBankCfg.color} />
                    <AccountSelectLabel $color={activeBankCfg.color}>
                      Cuenta activa — {activeBankCfg.label}
                    </AccountSelectLabel>
                  </ActiveProviderRow>
                  <FieldSelect
                    value={chatBank.accountId}
                    onChange={e => setChatBank(p => ({ ...p, accountId: e.target.value }))}
                  >
                    <option value="">Selecciona una cuenta…</option>
                    {(chatAccounts[activeBankCfg.id] ?? []).map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.label}</option>
                    ))}
                  </FieldSelect>
                </AccountSelectCard>
              )}

              {!chatBank.provider && (
                <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.22)', textAlign: 'center', padding: '8px 0' }}>
                  Selecciona un proveedor para continuar
                </p>
              )}

              <SaveFooter>
                <SaveBtn
                  type="button"
                  $saved={bancoSaved}
                  onClick={saveChatBank}
                  disabled={!chatBank.provider || !chatBank.accountId}
                  style={(!chatBank.provider || !chatBank.accountId) ? { opacity: 0.35, pointerEvents: 'none' } : {}}
                >
                  {bancoSaved ? <><CheckIcon />Configuración guardada</> : 'Guardar configuración'}
                </SaveBtn>
              </SaveFooter>

            </Section>
          )}

          {/* ════════════════ MENSAJES AUTOMÁTICOS ════════════════ */}
          {activeTab === 'mensajes' && (
            <Section>
              <AutoMessagesSection />
            </Section>
          )}

          {/* ════════════════ AVANZADO ════════════════ */}
          {activeTab === 'avanzado' && (
            <Section>
              <AdvancedSection />
            </Section>
          )}

          {/* ════════════════ REFERIDOS ════════════════ */}
          {activeTab === 'referidos' && (
            <Section>
              <ReferralSection />
            </Section>
          )}

          {/* ════════════════ SONIDOS ════════════════ */}
          {activeTab === 'sonidos' && (
            <Section>
              <SoundsSection userRole={user?.role} />
            </Section>
          )}

          {/* ════════════════ SOPORTE ════════════════ */}
          {activeTab === 'soporte' && (
            <Section>
              <TicketsSection />
            </Section>
          )}

          {/* ════════════════ TEMAS ════════════════ */}
          {activeTab === 'temas' && (
            <Section>
              <ThemesSection
                themeConfig={themeConfig}
                onThemeChange={setThemeConfig}
              />
            </Section>
          )}

        </Content>
      </Body>
    </PageWrap>
  )
}

export default SettingsPage

