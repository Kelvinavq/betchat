import { useCallback, useEffect, useRef, useState } from 'react'
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
import CloudOutlinedIcon from '@mui/icons-material/CloudOutlined'
import AutoAwesomeOutlinedIcon from '@mui/icons-material/AutoAwesomeOutlined'
import HeadsetMicOutlinedIcon from '@mui/icons-material/HeadsetMicOutlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined'
import BrandingWatermarkOutlinedIcon from '@mui/icons-material/BrandingWatermarkOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import useAuth from '../../../hooks/useAuth'
import { useSystemConfig } from '../../../context/SystemConfigContext'
import { api } from '../../../utils/api'
import TicketsSection from './TicketsSection'
import ThemesSection from './ThemesSection'
import {
  PageWrap, PageHeader, MenuBtn, TitleBlock, PageTitle, PageSub,
  Body, SettingsNav, NavGroupLabel, NavBtn, ActiveBar, NavIcon, NavTextWrap, NavLabel, NavSub, SoonPill,
  Content, Section,
  ProfileCard, ProfileAvatar, ProfileAvatarImg, ProfileAvatarBtn, ProfileInfo, ProfileName, ProfileRole, ProfileBadge,
  Card, CardHead, CardIcon, CardHeadText, CardTitle, CardSub, CardBody,
  FormGrid, Field, FieldLabel, InputWrap, FieldInput, InputSuffix,
  SaveFooter, SaveBtn,
  InfoBanner, InfoBannerIcon, InfoBannerText,
  MontosGrid, MontoCard, MontoHead, MontoIconWrap, MontoInfo, MontoTitle, MontoDesc,
  MontoDivider, MontoBody, MontoInputRow, CurrencyPrefix, MontoInput, CurrencySelect, MontoNote,
  ApiStatusBadge, ApiNote,
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
    id: 'banco',
    label: 'Banco de chat',
    icon: <AccountBalanceWalletOutlinedIcon />,
    sub: 'Modo de procesamiento',
  },
  {
    id: 'notif',
    label: 'Notificaciones',
    icon: <NotificationsNoneOutlinedIcon />,
    sub: 'Próximamente',
    soon: true,
  },
  {
    id: 'avanzado',
    label: 'Avanzado',
    icon: <TuneOutlinedIcon />,
    sub: 'Próximamente',
    soon: true,
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

const BANK_STYLES = {
  hgcash: { initials: 'HG', color: '#818cf8', bg: 'rgba(99,102,241,0.10)', br: 'rgba(99,102,241,0.26)', avatarBg: 'linear-gradient(135deg,#4f46e5,#6366f1)', avatarBr: 'rgba(99,102,241,0.35)' },
  mercadopago: { initials: 'MP', color: '#38bdf8', bg: 'rgba(14,165,233,0.10)', br: 'rgba(14,165,233,0.26)', avatarBg: 'linear-gradient(135deg,#0284c7,#38bdf8)', avatarBr: 'rgba(14,165,233,0.35)' },
  telepagos: { initials: 'TP', color: '#fb923c', bg: 'rgba(249,115,22,0.10)', br: 'rgba(249,115,22,0.26)', avatarBg: 'linear-gradient(135deg,#ea580c,#f97316)', avatarBr: 'rgba(249,115,22,0.35)' },
  manual: { initials: 'MN', color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', br: 'rgba(148,163,184,0.20)', avatarBg: 'linear-gradient(135deg,#475569,#64748b)', avatarBr: 'rgba(148,163,184,0.28)' },
}

const SettingsPage = ({ onMenuOpen }) => {
  const { user, setUser } = useAuth()
  const { setSystemConfig: setGlobalSystemConfig } = useSystemConfig()
  const avatarInputRef = useRef(null)
  const logoInputRef = useRef(null)
  const [activeTab, setActiveTab] = useState('perfil')

  /* ── profile form ── */
  const [profileForm, setProfileForm] = useState({
    username: user?.username ?? user?.name ?? '',
    full_name: user?.full_name ?? user?.username ?? user?.name ?? '',
    email: user?.email ?? '',
    avatar_url: user?.avatar_url ?? '',
    avatar_data_url: '',
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
    clientRegistrationEnabled: true,
    clientLogoutEnabled: true,
    clearLogo: false,
  })
  const [logoPreview, setLogoPreview] = useState('')
  const [systemSaved, setSystemSaved] = useState(false)

  /* ── montos form ── */
  const [montos, setMontos] = useState({
    carga:  { amount: '10', currency: 'USD' },
    retiro: { amount: '50', currency: 'USD' },
  })
  const [montosSaved, setMontosSaved] = useState(false)

  /* ── apis form ── */
  const [apis, setApis] = useState({
    casino:     { token: '', url: '' },
    aws:        { accessKey: '', secretKey: '' },
    openrouter: { apiKey: '' },
  })
  const [apiSaved, setApiSaved]       = useState({ casino: false, aws: false, openrouter: false })
  const [showSecret, setShowSecret]   = useState({
    casinoToken: false, awsSecret: false, openrouterKey: false,
  })

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
      window.alert(error.message || 'No se pudo guardar la integracion.')
    }
  }

  const isCasinoOk     = !!(apis.casino.token && apis.casino.url)
  const isAwsOk        = !!(apis.aws.accessKey && apis.aws.secretKey)
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
      })
      setAvatarPreview(profile.avatar_url ? resolveAssetUrl(profile.avatar_url) : '')
      setMontos(data.amounts || { carga: { amount: '10', currency: 'USD' }, retiro: { amount: '50', currency: 'USD' } })
      setApis(prev => ({ ...prev, ...(data.apis || {}) }))
      setChatBank(data.chatBank || { provider: null, accountId: '' })
      setChatAccounts(data.bankAccounts || {})
      setChatBanks((data.bankProviders || []).map(provider => ({
        ...provider,
        ...(BANK_STYLES[provider.id] || BANK_STYLES.manual),
      })))
      setThemeConfig(data.themeConfig || { clientTheme: 'betchat-dark', adminTheme: 'dark-blue' })
      const system = data.systemConfig || {}
      const nextSystem = {
        appName: system.appName || 'BetChat',
        logoUrl: system.logoUrl || '',
        logoDataUrl: '',
        clientRegistrationEnabled: system.clientRegistrationEnabled !== false,
        clientLogoutEnabled: system.clientLogoutEnabled !== false,
        clearLogo: false,
      }
      setSystemForm(nextSystem)
      setLogoPreview(system.logoUrl ? resolveAssetUrl(system.logoUrl) : '')
      setGlobalSystemConfig(nextSystem)
    } catch (error) {
      window.alert(error.message || 'No se pudieron cargar los ajustes.')
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
      setProfileForm(prev => ({ ...prev, avatar_data_url: dataUrl }))
    } catch (error) {
      window.alert(error.message)
    }
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
      window.alert(error.message)
    }
  }

  const clearLogo = () => {
    setLogoPreview('')
    setSystemForm(prev => ({ ...prev, logoUrl: '', logoDataUrl: '', clearLogo: true }))
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
      })
      setAvatarPreview(profile.avatar_url ? resolveAssetUrl(profile.avatar_url) : '')
      setUser(prev => prev ? { ...prev, ...profile } : prev)
      triggerSaved(setProfileSaved)
    } catch (error) {
      window.alert(error.message || 'No se pudo guardar el perfil.')
    }
  }

  const savePassword = async () => {
    try {
      await api.put('/api/settings/password', pwForm)
      setPwForm({ current: '', next: '', confirm: '' })
      triggerSaved(setPwSaved)
    } catch (error) {
      window.alert(error.message || 'No se pudo actualizar la contrasena.')
    }
  }

  const saveAmounts = async () => {
    try {
      const data = await api.put('/api/settings/amounts', montos)
      setMontos(data.amounts || montos)
      triggerSaved(setMontosSaved)
    } catch (error) {
      window.alert(error.message || 'No se pudieron guardar los montos.')
    }
  }

  const saveChatBank = async () => {
    try {
      const data = await api.put('/api/settings/chat-bank', chatBank)
      setChatBank(data.chatBank || chatBank)
      triggerSaved(setBancoSaved)
    } catch (error) {
      window.alert(error.message || 'No se pudo guardar el banco de chat.')
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
        clientRegistrationEnabled: system.clientRegistrationEnabled !== false,
        clientLogoutEnabled: system.clientLogoutEnabled !== false,
        clearLogo: false,
      }
      setSystemForm(nextSystem)
      setLogoPreview(system.logoUrl ? resolveAssetUrl(system.logoUrl) : '')
      setGlobalSystemConfig(nextSystem)
      triggerSaved(setSystemSaved)
    } catch (error) {
      window.alert(error.message || 'No se pudo guardar la configuracion del sistema.')
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
    <PageWrap>

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
        <SettingsNav>
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
        <Content key={activeTab}>

          {/* ════════════════ PERFIL ════════════════ */}
          {activeTab === 'perfil' && (
            <Section>

              {/* profile summary */}
              <ProfileCard>
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

              {/* ── AWS ── */}
              <Card $delay="80ms">
                <CardHead>
                  <CardIcon
                    $bg="rgba(249,115,22,0.12)"
                    $br="rgba(249,115,22,0.24)"
                    $cl="#fb923c"
                  >
                    <CloudOutlinedIcon />
                  </CardIcon>
                  <CardHeadText>
                    <CardTitle>Amazon Web Services</CardTitle>
                    <CardSub>Almacenamiento y servicios cloud de AWS</CardSub>
                  </CardHeadText>
                  <ApiStatusBadge $ok={isAwsOk}>
                    {isAwsOk ? 'Configurado' : 'Sin configurar'}
                  </ApiStatusBadge>
                </CardHead>
                <CardBody>
                  <FormGrid>
                    <Field>
                      <FieldLabel>Access Key ID</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type="text"
                          placeholder="AKIAIOSFODNN7EXAMPLE"
                          value={apis.aws.accessKey}
                          onChange={e => setApi('aws', 'accessKey', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                      </InputWrap>
                    </Field>
                    <Field>
                      <FieldLabel>Secret Access Key</FieldLabel>
                      <InputWrap>
                        <FieldInput
                          type={showSecret.awsSecret ? 'text' : 'password'}
                          placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCY..."
                          $hasRight
                          value={apis.aws.secretKey}
                          onChange={e => setApi('aws', 'secretKey', e.target.value)}
                          autoComplete="off"
                          spellCheck={false}
                          style={{ fontFamily: "'Courier New', monospace", fontSize: 12.5 }}
                        />
                        <InputSuffix type="button" onClick={() => toggleSecret('awsSecret')} tabIndex={-1}>
                          {showSecret.awsSecret ? <VisibilityOffOutlinedIcon /> : <VisibilityOutlinedIcon />}
                        </InputSuffix>
                      </InputWrap>
                    </Field>
                  </FormGrid>
                  <SaveFooter>
                    <SaveBtn type="button" $saved={apiSaved.aws} onClick={() => saveApi('aws')}>
                      {apiSaved.aws ? <><CheckIcon />Guardado</> : 'Guardar'}
                    </SaveBtn>
                  </SaveFooter>
                  <ApiNote>
                    Utilizado para almacenamiento de archivos (S3) y envío de notificaciones (SNS/SES).
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
                  <Field>
                    <FieldLabel>Clave de API de Open Router</FieldLabel>
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
                  <SaveFooter>
                    <SaveBtn type="button" $saved={apiSaved.openrouter} onClick={() => saveApi('openrouter')}>
                      {apiSaved.openrouter ? <><CheckIcon />Guardado</> : 'Guardar'}
                    </SaveBtn>
                  </SaveFooter>
                  <ApiNote>
                    Proporciona acceso a modelos de IA para el asistente de soporte y el análisis automático de chats.
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
