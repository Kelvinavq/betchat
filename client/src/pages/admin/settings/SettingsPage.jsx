import { useState } from 'react'
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
import MenuIcon from '@mui/icons-material/Menu'
import useAuth from '../../../hooks/useAuth'
import {
  PageWrap, PageHeader, MenuBtn, TitleBlock, PageTitle, PageSub,
  Body, SettingsNav, NavGroupLabel, NavBtn, ActiveBar, NavIcon, NavTextWrap, NavLabel, NavSub, SoonPill,
  Content, Section,
  ProfileCard, ProfileAvatar, ProfileInfo, ProfileName, ProfileRole, ProfileBadge,
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
} from './SettingsPage.styles'

const TABS = [
  {
    id: 'perfil',
    label: 'Mi perfil',
    icon: <AccountCircleOutlinedIcon />,
    sub: 'Datos de tu cuenta',
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

const SettingsPage = ({ onMenuOpen }) => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('perfil')

  /* ── profile form ── */
  const [profileForm, setProfileForm] = useState({
    username: user?.name ?? '',
    email: 'admin@betchat.com',
  })
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false })
  const [profileSaved, setProfileSaved] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)

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

  const saveApi = (provider) => {
    setApiSaved(p => ({ ...p, [provider]: true }))
    setTimeout(() => setApiSaved(p => ({ ...p, [provider]: false })), 2200)
  }

  const isCasinoOk     = !!(apis.casino.token && apis.casino.url)
  const isAwsOk        = !!(apis.aws.accessKey && apis.aws.secretKey)
  const isOpenrouterOk = !!apis.openrouter.apiKey

  /* ── banco de chat ── */
  const [chatBank, setChatBank]   = useState({ provider: null, accountId: '' })
  const [bancoSaved, setBancoSaved] = useState(false)

  const activeBankCfg = CHAT_BANKS.find(b => b.id === chatBank.provider) ?? null

  const triggerSaved = (setter) => {
    setter(true)
    setTimeout(() => setter(false), 2200)
  }

  const togglePw = (field) =>
    setShowPw(p => ({ ...p, [field]: !p[field] }))

  const setMonto = (key, field, val) =>
    setMontos(m => ({ ...m, [key]: { ...m[key], [field]: val } }))

  const initials = (profileForm.username || user?.name || '?')[0].toUpperCase()

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
          <PageSub>Configura tu cuenta y los parámetros del sistema</PageSub>
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
                <ProfileAvatar>{initials}</ProfileAvatar>
                <ProfileInfo>
                  <ProfileName>{profileForm.username || 'Usuario'}</ProfileName>
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
                      onClick={() => triggerSaved(setProfileSaved)}
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
                      onClick={() => triggerSaved(setPwSaved)}
                    >
                      {pwSaved ? <><CheckIcon />Contraseña actualizada</> : 'Cambiar contraseña'}
                    </SaveBtn>
                  </SaveFooter>
                </CardBody>
              </Card>

            </Section>
          )}

          {/* ════════════════ MONTOS ════════════════ */}
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
                  onClick={() => triggerSaved(setMontosSaved)}
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
                    {CHAT_BANKS.map(b => {
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
                    {(CHAT_ACCOUNTS[activeBankCfg.id] ?? []).map(acc => (
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
                  onClick={() => triggerSaved(setBancoSaved)}
                  disabled={!chatBank.provider || !chatBank.accountId}
                  style={(!chatBank.provider || !chatBank.accountId) ? { opacity: 0.35, pointerEvents: 'none' } : {}}
                >
                  {bancoSaved ? <><CheckIcon />Configuración guardada</> : 'Guardar configuración'}
                </SaveBtn>
              </SaveFooter>

            </Section>
          )}

        </Content>
      </Body>
    </PageWrap>
  )
}

export default SettingsPage
