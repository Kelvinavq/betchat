import { useCallback, useContext, useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import CloseIcon from '@mui/icons-material/Close'
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'
import SendIcon from '@mui/icons-material/Send'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import AddIcon from '@mui/icons-material/Add'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import DescriptionIcon from '@mui/icons-material/Description'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ReplyIcon from '@mui/icons-material/Reply'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import { ChatContext } from '../../context/ChatContext'
import { useSystemConfig } from '../../context/SystemConfigContext'
import { api, resolveApiAsset } from '../../utils/api'
import { getSocket, makeClientMessageId } from '../../utils/socket'
import { hasRichText, htmlToPlainText, sanitizeRichHtml } from '../../utils/richText'
import {
  Window, VisualSection, CloseBtn, VisualLogo, AppLabel,
  FormSection, FormTitle, FormHint, FormGroup, InputLabel,
  ErrorBanner,
  StyledInput, PasswordWrapper, PasswordInput, PasswordToggle,
  ForgotLink, ActionBtn, OrDivider, SwitchText,
  HelpOverlay, HelpCard, HelpHead, HelpTitle, HelpSub, HelpClose,
  HelpOptionGrid, HelpOption, HelpTextarea, HelpActions, HelpBtn,
  ChatViewContainer,
  ChatHeader, ChatHeaderSide, ChatHeaderCenter,
  ChatHeaderBtn,
  HeaderPill, HeaderPillText, HeaderPillBadge,
  ConnectionBanner,
  MessagesArea, ChatMessages,
  MessageRow, MessageAvatar, MessageContent, MessageBubble, MessageTime,
  MessageActionMenu, MessageActionItem, ReplyQuote, ReplyAuthor, ReplyText,
  LoadEarlierBtn, TypingBubble, TypingDot, TypingText,
  BotButtonsWrap, BotOptionBtn,
  ScrollDownBtn,
  BottomArea, AttachPanel, AttachGrid, AttachOption,
  ChatFooter, PlusBtn, ChatInput, SendBtn,
  ReplyComposer, ReplyComposerText, ReplyComposerTitle, ReplyComposerBody, ReplyComposerClose,
  PreviewOverlay, PreviewTitle, PreviewImg, PreviewPdfCard,
  PreviewActions, PreviewBtn,
  SendingBubbleWrap,
  PendingMediaWrap, PendingMediaTitle, PendingMediaHint,
  PendingMediaActions, PendingMediaBtn,
  MediaMsgImg, MediaMsgPdf,
  VoiceBubble, VoicePlayBtn, VoiceWave, VoiceProgress, VoiceBar, VoiceSeek, VoiceTime, VoiceSpeedBtn,
  ViewerOverlay, ViewerContent, ViewerFileName, ViewerImg,
  ViewerEmbed, ViewerActions, ViewerBtn,
  AuthLoadingScreen,
} from './ChatWindow.styles'

/* ── login view ── */

const HELP_OPTIONS = [
  { id: 'forgot_user', label: 'Olvide mi usuario' },
  { id: 'forgot_password', label: 'Olvide mi contrasena' },
  { id: 'register', label: 'Quiero registrarme' },
  { id: 'other', label: 'Otra consulta' },
]

const LoginView = ({ onLogin, onRegister, onHelp, loading, registrationEnabled }) => {
  const [showPwd, setShowPwd] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const submitLogin = (event) => {
    event.preventDefault()
    onLogin({ username, password })
  }

  return (
    <form onSubmit={submitLogin}>
      <FormTitle align="center">Iniciar sesión</FormTitle>
      <FormHint align="center">Bienvenido de vuelta</FormHint>

      <FormGroup>
        <InputLabel>Nombre de usuario</InputLabel>
        <StyledInput
          type="text"
          placeholder="Nombre de usuario"
          value={username}
          onChange={event => setUsername(event.target.value)}
          autoComplete="username"
        />
      </FormGroup>

      <FormGroup>
        <InputLabel>Contraseña</InputLabel>
        <PasswordWrapper>
          <PasswordInput
            type={showPwd ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          <PasswordToggle type="button" onClick={() => setShowPwd(p => !p)}>
            {showPwd ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </PasswordToggle>
        </PasswordWrapper>
      </FormGroup>

      <ForgotLink href="#">¿Olvidaste tu contraseña?</ForgotLink>
      <ForgotLink as="button" type="button" onClick={onHelp}>Necesito ayuda para ingresar</ForgotLink>
      <ActionBtn type="submit" disabled={loading}>
        {loading ? 'Ingresando...' : 'Ingresar'}
      </ActionBtn>
      {registrationEnabled && <OrDivider>O</OrDivider>}

      {registrationEnabled && <SwitchText>
        ¿No tienes cuenta? <a onClick={onRegister}>Regístrate</a>
      </SwitchText>}
    </form>
  )
}

/* ── register view ── */

const RegisterView = ({ onRegister, onLogin, loading }) => {
  const [showPwd, setShowPwd] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const submitRegister = (event) => {
    event.preventDefault()
    onRegister({ username, password })
  }

  return (
    <form onSubmit={submitRegister}>
      <FormTitle align="center">Crear cuenta</FormTitle>
      <FormHint align="center">Únete para chatear con soporte</FormHint>

      <FormGroup>
        <InputLabel>Nombre de usuario</InputLabel>
        <StyledInput
          type="text"
          placeholder="usuario"
          autoComplete="username"
          value={username}
          onChange={event => setUsername(event.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <InputLabel>Contraseña</InputLabel>
        <PasswordWrapper>
          <PasswordInput
            type={showPwd ? 'text' : 'password'}
            placeholder="****"
            autoComplete="new-password"
            value={password}
            onChange={event => setPassword(event.target.value)}
          />
          <PasswordToggle type="button" onClick={() => setShowPwd(p => !p)}>
            {showPwd ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </PasswordToggle>
        </PasswordWrapper>
      </FormGroup>

      <ActionBtn type="submit" disabled={loading}>
        {loading ? 'Creando cuenta...' : 'Crear cuenta'}
      </ActionBtn>
      <OrDivider>O</OrDivider>

      <SwitchText>
        ¿Ya tienes cuenta? <a onClick={onLogin}>Inicia sesión</a>
      </SwitchText>
    </form>
  )
}

const HelpDialog = ({ open, onClose, onStart, loading, registrationEnabled }) => {
  const [reason, setReason] = useState('forgot_password')
  const [note, setNote] = useState('')
  if (!open) return null
  const needsNote = reason === 'other'
  const canSubmit = !loading && (!needsNote || note.trim().length > 0)

  return createPortal(
    <HelpOverlay>
      <HelpCard role="dialog" aria-modal="true">
        <HelpHead>
          <div>
            <HelpTitle>Necesitas ayuda?</HelpTitle>
            <HelpSub>Elegi una opcion y abrimos un chat temporal con soporte.</HelpSub>
          </div>
          <HelpClose type="button" onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </HelpClose>
        </HelpHead>
        <HelpOptionGrid>
          {HELP_OPTIONS.map(option => (
            <HelpOption key={option.id} type="button" $active={reason === option.id} onClick={() => setReason(option.id)}>
              {option.label}
            </HelpOption>
          ))}
        </HelpOptionGrid>
        {needsNote && (
          <HelpTextarea
            placeholder="Contanos brevemente que necesitas..."
            value={note}
            onChange={event => setNote(event.target.value)}
          />
        )}
        <HelpActions>
          <HelpBtn type="button" onClick={onClose}>Cancelar</HelpBtn>
          <HelpBtn type="button" $primary disabled={!canSubmit} onClick={() => onStart({ reason, note })}>
            {loading ? 'Abriendo...' : 'Abrir chat'}
          </HelpBtn>
        </HelpActions>
      </HelpCard>
    </HelpOverlay>,
    document.body
  )
}

/* ── sending loader ── */

const LOADER_TEXTS = {
  image: ['Enviando imagen', 'Ya casi terminamos', 'Un momento más'],
  pdf:   ['Enviando archivo', 'Ya casi terminamos', 'Un momento más'],
  login: ['Ingresando al chat', 'Preparando sesión', 'Ya casi terminamos'],
}

const SendingLoader = ({ mediaType }) => {
  const texts = LOADER_TEXTS[mediaType] ?? LOADER_TEXTS.image
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setIdx(1), 3000)
    const t2 = setTimeout(() => setIdx(2), 6000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const text = texts[idx]

  return (
    <div className="loader-wrapper">
      <div className="loader" />
      {text.split('').map((char, i) => (
        <span
          key={i}
          className="loader-letter"
          style={{ animationDelay: `${i * 0.1}s` }}
        >
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </div>
  )
}

const ChatAuthLoader = () => (
  <AuthLoadingScreen>
    <SendingLoader mediaType="login" />
  </AuthLoadingScreen>
)

/* ── media preview modal (before sending) ── */

const MediaPreviewModal = ({ data, onClose, onSend }) => (
  <PreviewOverlay>
    <PreviewTitle>
      {data.type === 'image' ? 'Vista previa' : 'Documento adjunto'}
    </PreviewTitle>

    {data.type === 'image' ? (
      <PreviewImg src={data.url} alt={data.name} />
    ) : (
      <PreviewPdfCard>
        <DescriptionIcon />
        <span>{data.name}</span>
      </PreviewPdfCard>
    )}

    <PreviewActions>
      <PreviewBtn type="button" onClick={onClose}>Cancelar</PreviewBtn>
      <PreviewBtn type="button" $primary onClick={onSend}>Enviar</PreviewBtn>
    </PreviewActions>
  </PreviewOverlay>
)

/* ── media viewer lightbox ── */

const MediaViewer = ({ data, onClose }) => {
  const handleDownload = () => {
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

        {data.type === 'image' ? (
          <ViewerImg src={data.url} alt={data.name} />
        ) : (
          <ViewerEmbed src={data.url} title={data.name} />
        )}

        <ViewerActions>
          <ViewerBtn type="button" $download onClick={handleDownload}>
            <FileDownloadIcon />
            Descargar
          </ViewerBtn>
          <ViewerBtn type="button" onClick={onClose}>
            <CloseIcon />
            Cerrar
          </ViewerBtn>
        </ViewerActions>
      </ViewerContent>
    </ViewerOverlay>
  )
}

/* ── chat view ── */

const BOT_AVATAR = 'BC'
const appInitials = (name = 'BetChat') => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return 'BC'
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase()
}
const OUTBOX_PREFIX = 'betchat_outbox_'
const MIN_MEDIA_LOADER_MS = 1200
const MEDIA_PENDING_MS = 12000
const TYPING_IDLE_MS = 1400
const RECONNECT_WATCHDOG_MS = 5000
const MANUAL_CONNECT_COOLDOWN_MS = 10000
const WAVEFORM = [
  0.40,0.65,0.85,0.50,0.95,0.75,0.42,0.88,0.60,1.00,
  0.52,0.78,0.92,0.45,0.68,0.82,0.55,0.72,0.38,0.86,
  0.62,0.90,0.48,0.74,0.56,0.80,0.58,0.42,0.70,0.50,
]

const messageTime = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
const fmt = (s) => {
  const n = Math.floor(s || 0)
  return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`
}
const replyPreviewText = (message) => {
  if (!message) return ''
  if (message.type === 'image' || message.messageType === 'image') return message.fileName ? `Imagen: ${message.fileName}` : 'Imagen'
  if (message.type === 'pdf' || message.messageType === 'pdf') return message.fileName ? `PDF: ${message.fileName}` : 'Documento PDF'
  if (message.type === 'voice' || message.type === 'audio' || message.messageType === 'audio') return 'Audio'
  const text = message.text || message.content || ''
  return hasRichText(text) ? htmlToPlainText(text) : text
}
const replyAuthorLabel = (reply, currentReceived = false) => {
  if (!reply) return ''
  if (reply.senderType) return reply.senderType === 'client' ? 'Tu' : 'Soporte'
  return currentReceived ? 'Soporte' : 'Tu'
}
const formatPreviousDayLabel = (dateString) => {
  if (!dateString) return 'Cargar dia anterior'
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return `Cargar ${date.toLocaleDateString('es', { day: '2-digit', month: 'short' })}`
}
const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
  reader.readAsDataURL(file)
})

const isInteractiveMessageTarget = (target) =>
  Boolean(target?.closest?.('button,a,input,textarea,select,audio,video,[role="button"]'))

const mapDbMessage = (msg) => ({
  id: `db-${msg.id}`,
  dbId: msg.id,
  clientMessageId: msg.clientMessageId || '',
  type: msg.messageType === 'image' ? 'image' : msg.messageType === 'pdf' ? 'pdf' : msg.messageType === 'audio' ? 'voice' : 'text',
  text: msg.content,
  mediaUrl: resolveApiAsset(msg.fileUrl),
  audioUrl: resolveApiAsset(msg.fileUrl),
  duration: msg.messageType === 'audio' ? Number(msg.content) || 0 : undefined,
  fileName: msg.fileName,
  received: msg.senderType !== 'client',
  time: msg.time,
  avatarUrl: resolveApiAsset(msg.senderAvatarUrl),
  avatar: BOT_AVATAR,
  replyTo: msg.replyTo,
})

const VoiceMessage = ({ audioUrl, duration, received }) => {
  const audioRef = useRef(null)
  const frameRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [total, setTotal] = useState(duration ?? 0)
  const [rate, setRate] = useState(1)
  const [playbackError, setPlaybackError] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    setPlaybackError(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setElapsed(0) }
    const onTime = () => setElapsed(audio.currentTime)
    const onMeta = () => { if (isFinite(audio.duration)) setTotal(audio.duration) }
    const onError = () => setPlaybackError(true)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('error', onError)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('error', onError)
    }
  }, [audioUrl])

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(frameRef.current)
      return undefined
    }
    const tick = () => {
      const audio = audioRef.current
      if (audio) setElapsed(audio.currentTime)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [playing])

  useEffect(() => {
    const audio = audioRef.current
    if (audio) audio.playbackRate = rate
  }, [rate, audioUrl])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      return
    }
    audio.play().catch(() => setPlaybackError(true))
  }

  const progress = total > 0 ? elapsed / total : 0
  const seekTo = (event) => {
    const audio = audioRef.current
    if (!audio || total <= 0) return
    const next = (Number(event.target.value) / 100) * total
    audio.currentTime = next
    setElapsed(next)
  }
  const cycleRate = () => setRate(current => current === 1 ? 1.5 : current === 1.5 ? 2 : 1)

  return (
    <VoiceBubble $received={received}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <VoicePlayBtn
        type="button"
        $received={received}
        onPointerDown={event => event.stopPropagation()}
        onClick={togglePlay}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
      >
        {playing ? <PauseIcon /> : <PlayArrowIcon />}
      </VoicePlayBtn>
      <VoiceWave $progress={progress} $received={received}>
        <VoiceProgress $progress={progress} $received={received} />
        {WAVEFORM.map((h, i) => (
          <VoiceBar
            key={i}
            $h={h}
            $active={(i + 1) / WAVEFORM.length <= progress}
            $received={received}
          />
        ))}
        <VoiceSeek
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={Math.max(0, Math.min(100, progress * 100))}
          disabled={total <= 0}
          $progress={progress}
          $received={received}
          onPointerDown={event => event.stopPropagation()}
          onChange={seekTo}
          aria-label="Adelantar audio"
        />
      </VoiceWave>
      <VoiceTime $received={received}>{fmt(playing ? elapsed : total)}</VoiceTime>
      <VoiceSpeedBtn
        type="button"
        $received={received}
        onPointerDown={event => event.stopPropagation()}
        onClick={cycleRate}
        aria-label="Cambiar velocidad"
      >
        {rate}x
      </VoiceSpeedBtn>
      {playbackError && (
        <audio
          src={audioUrl}
          controls
          preload="metadata"
          onPointerDown={event => event.stopPropagation()}
          style={{ width: 220, maxWidth: '100%' }}
        />
      )}
    </VoiceBubble>
  )
}

const splitBotButtons = (items) => {
  const normalMessages = []
  const botButtonMessages = []
  for (const item of items) {
    if (item.type === 'bot-buttons') botButtonMessages.push(item)
    else normalMessages.push(item)
  }
  return { normalMessages, botButtonMessages }
}

const outboxKey = (chatId) => `${OUTBOX_PREFIX}${chatId}`

const readOutbox = (chatId) => {
  if (!chatId) return []
  try {
    return JSON.parse(localStorage.getItem(outboxKey(chatId)) || '[]')
  } catch {
    return []
  }
}

const writeOutbox = (chatId, items) => {
  if (!chatId) return
  try {
    if (items.length) localStorage.setItem(outboxKey(chatId), JSON.stringify(items))
    else localStorage.removeItem(outboxKey(chatId))
  } catch {
    // If storage quota is exceeded, keep the in-memory queue only.
  }
}

const mapQueuedMessage = (payload) => ({
  id: payload.clientMessageId,
  clientMessageId: payload.clientMessageId,
  type: payload.messageType === 'image' || payload.messageType === 'pdf' ? 'pending-media' : 'text',
  mediaType: payload.messageType,
  text: payload.content || '',
  fileName: payload.fileName || '',
  replyTo: payload.replyTo || null,
  received: false,
  time: payload.time || messageTime(),
})

const isMediaPayload = (payload) => payload?.messageType === 'image' || payload?.messageType === 'pdf'

const createBotMessages = (screen, reason = 'screen') => {
  const time = messageTime()

  if (!screen) {
    return [{
      id: `bot-missing-${Date.now()}`,
      type: 'text',
      text: 'No encontramos esta opcion. Probemos de nuevo desde el inicio.',
      received: true,
      time,
      avatar: BOT_AVATAR,
    }]
  }

  const messages = screen.items
    .filter(item => item.type === 'message' && item.text)
    .map(item => ({
      id: `bot-${reason}-${screen.id}-${item.id}-${Date.now()}`,
      type: 'text',
      text: item.text,
      received: true,
      time,
      avatar: BOT_AVATAR,
    }))

  const buttons = screen.items.filter(item => item.type === 'button' && item.label)
  if (buttons.length > 0) {
    messages.push({
      id: `bot-buttons-${reason}-${screen.id}-${Date.now()}`,
      type: 'bot-buttons',
      buttons,
      received: true,
      time,
      avatar: BOT_AVATAR,
    })
  }

  return messages.length > 0 ? messages : [{
    id: `bot-empty-${screen.id}-${Date.now()}`,
    type: 'text',
    text: 'Esta seccion todavia no tiene contenido.',
    received: true,
    time,
    avatar: BOT_AVATAR,
  }]
}

const createBotButtonMessages = (screen, reason = 'screen') => {
  if (!screen) return []
  const buttons = screen.items.filter(item => item.type === 'button' && item.label)
  if (buttons.length === 0) return []
  return [{
    id: `bot-buttons-${reason}-${screen.id}-${Date.now()}`,
    type: 'bot-buttons',
    buttons,
    received: true,
    time: messageTime(),
    avatar: BOT_AVATAR,
  }]
}

const createButtonResponseMessages = (button, time = messageTime()) =>
  (button?.responseMessages || [])
    .map((text, index) => ({
      id: `bot-button-response-${button.id}-${index}-${Date.now()}`,
      type: 'text',
      text,
      received: true,
      time,
      avatar: BOT_AVATAR,
    }))
    .filter(message => message.text)

const mergeDbMessage = (incoming) => (prev) => {
  const mapped = mapDbMessage(incoming)
  if (mapped.clientMessageId) {
    const index = prev.findIndex(item =>
      item.id === mapped.clientMessageId || item.clientMessageId === mapped.clientMessageId
    )
    if (index !== -1) {
      const next = [...prev]
      next[index] = mapped
      return next
    }
  }
  if (prev.some(item => item.dbId && Number(item.dbId) === Number(incoming.id))) return prev
  return [...prev, mapped]
}

const ChatView = ({ onClose, client }) => {
  const { systemConfig } = useSystemConfig()
  const [input, setInput]             = useState('')
  const [messages, setMessages]       = useState([])
  const [messagePage, setMessagePage] = useState({ previousDate: null, hasPrevious: false })
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [botFlow, setBotFlow]         = useState(null)
  const [currentBotScreenId, setCurrentBotScreenId] = useState(null)
  const [botActionPending, setBotActionPending] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('online')
  const [attachOpen, setAttachOpen]   = useState(false)
  const [showScroll, setShowScroll]   = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [viewerData, setViewerData]   = useState(null)
  const [adminTyping, setAdminTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [messageMenu, setMessageMenu] = useState(null)
  const [swipeReply, setSwipeReply] = useState(null)
  const [receiptRequest, setReceiptRequest] = useState(null)

  const messagesRef  = useRef(null)
  const bottomRef    = useRef(null)
  const imageInputRef = useRef(null)
  const pdfInputRef   = useRef(null)
  const receiptInputRef = useRef(null)
  const receiptFileDialogRef = useRef(null)
  const botActionPendingRef = useRef(false)
  const outboxRef = useRef([])
  const pendingTimersRef = useRef(new Map())
  const cancelledMediaRef = useRef(new Set())
  const connectionTimerRef = useRef(null)
  const connectionStatusRef = useRef(connectionStatus)
  const lastManualConnectRef = useRef(0)
  const readTimerRef = useRef(null)
  const typingTimerRef = useRef(null)
  const adminTypingTimerRef = useRef(null)
  const typingActiveRef = useRef(false)
  const shouldScrollBottomRef = useRef(false)
  const messageMenuRef = useRef(null)
  const pointerStartRef = useRef(null)
  const username = client?.fullName || client?.username || 'Cliente'
  const onlineLabel = connectionStatus === 'offline'
    ? 'Sin conexion'
    : connectionStatus === 'reconnecting' ? 'Reconectando' : connectionStatus === 'connected' ? 'Conectado' : 'En linea'
  const connectionBanner = connectionStatus === 'offline'
    ? 'Sin conexion. Guardamos tus mensajes para reenviarlos.'
    : connectionStatus === 'reconnecting' ? 'Reconectando...' : 'Conexion restablecida'
  const showConnectionBanner = connectionStatus !== 'online'
  const chatId = client?.chatId

  useEffect(() => {
    connectionStatusRef.current = connectionStatus
  }, [connectionStatus])

  const scrollToBottom = (smooth = true) => {
    const el = messagesRef.current
    if (!el) return
    if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    else        el.scrollTop = el.scrollHeight
  }

  const handleScroll = () => {
    const el = messagesRef.current
    if (!el) return
    setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 80)
  }

  const markConnectionRestored = useCallback(() => {
    window.clearTimeout(connectionTimerRef.current)
    setConnectionStatus(previous => previous === 'online' ? 'online' : 'connected')
    connectionTimerRef.current = window.setTimeout(() => setConnectionStatus('online'), 1800)
  }, [])

  const clearPendingTimer = useCallback((clientMessageId) => {
    const timer = pendingTimersRef.current.get(clientMessageId)
    if (timer) window.clearTimeout(timer)
    pendingTimersRef.current.delete(clientMessageId)
  }, [])

  const setQueuedManualRetry = useCallback((clientMessageId) => {
    const next = outboxRef.current.map(item =>
      item.clientMessageId === clientMessageId && isMediaPayload(item)
        ? { ...item, needsManualRetry: true }
        : item
    )
    outboxRef.current = next
    writeOutbox(chatId, next)
  }, [chatId])

  const markMessagePending = useCallback((clientMessageId) => {
    clearPendingTimer(clientMessageId)
    setQueuedManualRetry(clientMessageId)
    setMessages(prev => prev.map(message =>
      message.id === clientMessageId || message.clientMessageId === clientMessageId
        ? { ...message, type: 'pending-media' }
        : message
    ))
  }, [clearPendingTimer, setQueuedManualRetry])

  const schedulePendingState = useCallback((clientMessageId) => {
    clearPendingTimer(clientMessageId)
    const timer = window.setTimeout(() => {
      markMessagePending(clientMessageId)
    }, MEDIA_PENDING_MS)
    pendingTimersRef.current.set(clientMessageId, timer)
  }, [clearPendingTimer, markMessagePending])

  const replaceOptimisticMessage = useCallback((clientMessageId, dbMessage) => {
    setMessages(prev => prev.map(message =>
      message.id === clientMessageId || message.clientMessageId === clientMessageId
        ? mapDbMessage(dbMessage)
        : message
    ))
  }, [])

  const markOutboundDelivered = useCallback(() => {
    if (!chatId) return
    api.put(`/api/client/chats/${chatId}/delivered`, {}).catch(() => {})
  }, [chatId])

  const markOutboundReadSoon = useCallback(() => {
    if (!chatId) return
    window.clearTimeout(readTimerRef.current)
    readTimerRef.current = window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        api.put(`/api/client/chats/${chatId}/read`, {}).catch(() => {})
      }
    }, 1200)
  }, [chatId])

  const queueMessage = useCallback((payload) => {
    const next = [...outboxRef.current.filter(item => item.clientMessageId !== payload.clientMessageId), payload]
    outboxRef.current = next
    writeOutbox(chatId, next)
  }, [chatId])

  const removeQueuedMessage = useCallback((clientMessageId) => {
    const next = outboxRef.current.filter(item => item.clientMessageId !== clientMessageId)
    outboxRef.current = next
    writeOutbox(chatId, next)
  }, [chatId])

  const sendHttpPayload = useCallback(async (payload) => {
    if (!navigator.onLine || !payload?.chatId) return false
    try {
      const result = await api.post(`/api/client/chats/${payload.chatId}/messages`, payload)
      clearPendingTimer(payload.clientMessageId)
      removeQueuedMessage(payload.clientMessageId)
      if (cancelledMediaRef.current.has(payload.clientMessageId)) {
        cancelledMediaRef.current.delete(payload.clientMessageId)
        return true
      }
      replaceOptimisticMessage(payload.clientMessageId, result.message)
      markConnectionRestored()
      return true
    } catch {
      if (cancelledMediaRef.current.has(payload.clientMessageId)) return false
      if (isMediaPayload(payload)) markMessagePending(payload.clientMessageId)
      return false
    }
  }, [clearPendingTimer, markConnectionRestored, markMessagePending, removeQueuedMessage, replaceOptimisticMessage])

  const sendSocketPayload = useCallback((payload, { queueWhenOffline = true } = {}) => {
    const socket = getSocket('client')
    if (!navigator.onLine) {
      if (queueWhenOffline) queueMessage(payload)
      setConnectionStatus('offline')
      return
    }

    if (!socket.connected) {
      if (queueWhenOffline) queueMessage(payload)
      setConnectionStatus('reconnecting')
      sendHttpPayload(payload)
      return
    }

    socket.timeout(9000).emit('message:send', payload, (error, ack) => {
      if (cancelledMediaRef.current.has(payload.clientMessageId)) return
      if (error || !ack?.ok) {
        if (queueWhenOffline) queueMessage(isMediaPayload(payload) ? { ...payload, needsManualRetry: true } : payload)
        if (isMediaPayload(payload)) markMessagePending(payload.clientMessageId)
        setConnectionStatus(navigator.onLine ? 'reconnecting' : 'offline')
        return
      }
      const finish = () => {
        clearPendingTimer(payload.clientMessageId)
        removeQueuedMessage(payload.clientMessageId)
        replaceOptimisticMessage(payload.clientMessageId, ack.message)
        markConnectionRestored()
      }
      const elapsed = Date.now() - (payload.loaderStartedAt || 0)
      const remaining = payload.messageType === 'image' || payload.messageType === 'pdf'
        ? Math.max(MIN_MEDIA_LOADER_MS - elapsed, 0)
        : 0
      window.setTimeout(finish, remaining)
    })
  }, [clearPendingTimer, markConnectionRestored, markMessagePending, queueMessage, removeQueuedMessage, replaceOptimisticMessage, sendHttpPayload])

  const flushOutbox = useCallback(() => {
    if (!chatId || outboxRef.current.length === 0) return
    const pending = [...outboxRef.current]
    pending.forEach(payload => {
      if (isMediaPayload(payload) && payload.needsManualRetry) return
      if (navigator.onLine && !getSocket('client').connected) sendHttpPayload(payload)
      else sendSocketPayload(payload, { queueWhenOffline: true })
    })
  }, [chatId, sendHttpPayload, sendSocketPayload])

  const retryQueuedMedia = useCallback((clientMessageId) => {
    const payload = outboxRef.current.find(item => item.clientMessageId === clientMessageId)
    if (!payload) return
    cancelledMediaRef.current.delete(clientMessageId)
    const retryPayload = { ...payload, needsManualRetry: false, loaderStartedAt: Date.now() }
    queueMessage(retryPayload)
    setMessages(prev => prev.map(message =>
      message.id === clientMessageId || message.clientMessageId === clientMessageId
        ? { ...message, type: 'sending' }
        : message
    ))
    schedulePendingState(clientMessageId)
    if (navigator.onLine && !getSocket('client').connected) sendHttpPayload(retryPayload)
    else sendSocketPayload(retryPayload, { queueWhenOffline: true })
  }, [queueMessage, schedulePendingState, sendHttpPayload, sendSocketPayload])

  const cancelQueuedMedia = useCallback((clientMessageId) => {
    cancelledMediaRef.current.add(clientMessageId)
    clearPendingTimer(clientMessageId)
    removeQueuedMessage(clientMessageId)
    setMessages(prev => prev.filter(message =>
      message.id !== clientMessageId && message.clientMessageId !== clientMessageId
    ))
  }, [clearPendingTimer, removeQueuedMessage])

  const sendMessage = () => {
    const text = input.trim()
    if (!text || !chatId) return
    const time = messageTime()
    const clientMessageId = makeClientMessageId('client-text')
    const replyToMessageId = replyingTo?.dbId || null
    const payload = {
      chatId,
      clientMessageId,
      messageType: 'text',
      content: text,
      time,
      replyToMessageId,
      replyTo: replyingTo ? {
        id: replyingTo.dbId,
        senderType: replyingTo.received ? 'admin' : 'client',
        messageType: replyingTo.type,
        content: replyingTo.text || '',
        fileName: replyingTo.fileName || '',
      } : null,
    }
    shouldScrollBottomRef.current = true
    setMessages(prev => [...prev, {
      id: clientMessageId,
      clientMessageId,
      type: 'text',
      text,
      received: false,
      time,
      replyTo: replyingTo ? {
        id: replyingTo.dbId,
        senderType: replyingTo.received ? 'admin' : 'client',
        messageType: replyingTo.type,
        content: replyingTo.text || '',
        fileName: replyingTo.fileName || '',
      } : null,
    }])
    setInput('')
    setReplyingTo(null)
    setAttachOpen(false)
    sendSocketPayload(payload)
    emitTyping(false)
  }

  const emitTyping = useCallback((isTyping) => {
    if (!chatId) return
    typingActiveRef.current = isTyping
    getSocket('client').emit('typing', { chatId, isTyping })
  }, [chatId])

  const handleInputChange = (event) => {
    const nextValue = event.target.value
    setInput(nextValue)
    if (nextValue.trim()) {
      if (!typingActiveRef.current) emitTyping(true)
    } else {
      emitTyping(false)
    }
    window.clearTimeout(typingTimerRef.current)
    typingTimerRef.current = window.setTimeout(() => emitTyping(false), TYPING_IDLE_MS)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const restoreReceiptButtons = useCallback((request) => {
    if (!request) return
    setMessages(prev => {
      if (prev.some(message => message.type === 'bot-buttons')) return prev
      return [...prev, {
        id: `bot-receipt-restore-${request.buttonId || 'file'}-${Date.now()}`,
        type: 'bot-buttons',
        buttons: [
          {
            id: `receipt-upload-restore-${request.buttonId || 'file'}`,
            label: '📎 Subir comprobante',
            buttonType: 'receipt_upload',
            receiptRequest: request,
          },
          ...(request.backButtons || []),
        ],
        received: true,
        time: messageTime(),
        avatar: BOT_AVATAR,
      }]
    })
  }, [])

  const watchReceiptFileDialog = useCallback((request) => {
    receiptFileDialogRef.current = { request, active: true }
    const handleFocus = () => {
      window.setTimeout(() => {
        const pending = receiptFileDialogRef.current
        if (!pending?.active) return
        receiptFileDialogRef.current = null
        setReceiptRequest(null)
        restoreReceiptButtons(pending.request)
      }, 450)
      window.removeEventListener('focus', handleFocus)
    }
    window.addEventListener('focus', handleFocus, { once: true })
  }, [restoreReceiptButtons])

  const handleReceiptUploadClick = useCallback((request) => {
    const req = request || receiptRequest
    if (!req) return
    setReceiptRequest(req)
    setMessages(prev => prev.filter(message => message.type !== 'bot-buttons'))
    watchReceiptFileDialog(req)
    receiptInputRef.current?.click()
  }, [receiptRequest, watchReceiptFileDialog])

  const handleBotButton = (button) => {
    if (button.buttonType === 'receipt_upload') {
      handleReceiptUploadClick(button.receiptRequest)
      return
    }
    if (botActionPendingRef.current) return
    botActionPendingRef.current = true
    setBotActionPending(true)
    if (receiptRequest) {
      receiptFileDialogRef.current = null
      setReceiptRequest(null)
    }

    const currentScreen = botFlow?.screens?.find(screen => screen.id === currentBotScreenId)
    const isMessagesOnly = button.buttonType === 'messages_only' || button.buttonType === 'receipt_request'
    const willShowReceipt = Boolean(button.showReceiptAfter) || button.buttonType === 'receipt_request'
    const target = isMessagesOnly ? currentScreen : (botFlow?.screens?.find(screen => screen.id === button.actionScreenId) || currentScreen)
    const targetBackButtons = (target?.items || []).filter(item => item.type === 'button' && item.isBack && item.label)
    const time = messageTime()
    const optionMessageId = makeClientMessageId('client-bot-option')
    const responseMessages = createButtonResponseMessages(button, time)
    const receiptPromptMsg = willShowReceipt ? {
      id: `bot-receipt-${button.id}-${Date.now()}`,
      type: 'text',
      text: button.receiptPrompt || 'Subi una imagen o PDF del comprobante para continuar.',
      received: true,
      time,
      avatar: BOT_AVATAR,
    } : null
    const botMessages = (() => {
      if (responseMessages.length > 0) {
        return willShowReceipt
          ? [...responseMessages, receiptPromptMsg]
          : [...responseMessages, ...createBotButtonMessages(target, button.id)]
      }
      if (willShowReceipt) {
        return [receiptPromptMsg]
      }
      return createBotMessages(target, button.id)
    })()
    const botTextMessages = botMessages.filter(message => message.type === 'text')
    const botMessageIds = botTextMessages.map(() => makeClientMessageId('bot-auto'))

    setCurrentBotScreenId(target?.id || currentBotScreenId)
    shouldScrollBottomRef.current = true
    setMessages(prev => [
      ...prev.filter(message => message.type !== 'bot-buttons'),
      {
        id: optionMessageId,
        clientMessageId: optionMessageId,
        type: 'text',
        text: button.label,
        received: false,
        time,
      },
      ...botMessages.map(message => {
        if (message.type !== 'text') return message
        const index = botTextMessages.findIndex(item => item.id === message.id)
        return { ...message, id: botMessageIds[index], clientMessageId: botMessageIds[index] }
      }),
    ])

    if (!chatId || !target?.id) {
      botActionPendingRef.current = false
      setBotActionPending(false)
      return
    }

    api.post(`/api/client/bot/chats/${chatId}/select`, {
      buttonId: button.id,
      clientMessageId: optionMessageId,
      botMessageIds,
    })
      .then((data) => {
        markConnectionRestored()
        setCurrentBotScreenId(data.state?.currentScreenId || target.id)
        if (data.button?.showReceiptAfter || (data.button?.buttonType === 'receipt_request')) {
          const nextReceiptRequest = {
            buttonId: button.id,
            label: button.label,
            processing: data.button?.receiptProcessing || button.receiptProcessing || 'manual',
            screenId: target.id,
            backButtons: targetBackButtons,
          }
          setReceiptRequest(nextReceiptRequest)
          shouldScrollBottomRef.current = true
          setMessages(prev => [
            ...prev.filter(m => m.type !== 'bot-buttons'),
            {
              id: `bot-receipt-upload-${button.id}-${Date.now()}`,
              type: 'bot-buttons',
              buttons: [
                {
                  id: `receipt-upload-btn-${button.id}`,
                  label: '📎 Subir comprobante',
                  buttonType: 'receipt_upload',
                  receiptRequest: nextReceiptRequest,
                },
                ...targetBackButtons,
              ],
              received: true,
              time: messageTime(),
              avatar: BOT_AVATAR,
            },
          ])
        }
        shouldScrollBottomRef.current = true
        for (const message of data.messages || []) {
          setMessages(mergeDbMessage(message))
        }
      })
      .catch(() => {
        api.put(`/api/client/bot/chats/${chatId}/state`, {
          screenId: target.id,
          buttonId: button.id,
        }).catch(() => {})
      })
      .finally(() => {
        botActionPendingRef.current = false
        setBotActionPending(false)
      })
  }

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewData({ type, url, name: file.name, file })
    setAttachOpen(false)
    e.target.value = ''
  }

  const handleReceiptFileSelect = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    const pending = receiptFileDialogRef.current
    if (pending) receiptFileDialogRef.current = { ...pending, active: false }
    if (!file) {
      restoreReceiptButtons(pending?.request || receiptRequest)
      setReceiptRequest(null)
      return
    }
    setMessages(prev => prev.filter(m =>
      !(m.type === 'bot-buttons' && m.buttons?.some(b => b.buttonType === 'receipt_upload'))
    ))
    const type = file.type?.startsWith('image/') ? 'image' : 'pdf'
    const url = URL.createObjectURL(file)
    setPreviewData({ type, url, name: file.name, file, receiptRequest })
    setAttachOpen(false)
  }

  const sendMedia = async () => {
    if (!previewData || !chatId) return
    const { type, url, name, file, receiptRequest: mediaReceiptRequest } = previewData
    setPreviewData(null)
    if (mediaReceiptRequest) setReceiptRequest(null)

    const sendingId = makeClientMessageId(`client-${type}`)
    const time = messageTime()
    const loaderStartedAt = Date.now()
    const replyToMessageId = replyingTo?.dbId || null

    shouldScrollBottomRef.current = true
    setMessages(prev => [...prev, {
      id: sendingId,
      clientMessageId: sendingId,
      type: 'sending',
      mediaType: type,
      fileName: name,
      received: false,
      time,
      replyTo: replyingTo ? {
        id: replyingTo.dbId,
        senderType: replyingTo.received ? 'admin' : 'client',
        messageType: replyingTo.type,
        content: replyingTo.text || '',
        fileName: replyingTo.fileName || '',
      } : null,
    }])
    setReplyingTo(null)
    schedulePendingState(sendingId)
    try {
      const dataUrl = await fileToDataUrl(file)
      if (cancelledMediaRef.current.has(sendingId)) {
        cancelledMediaRef.current.delete(sendingId)
        return
      }
      sendSocketPayload({
        chatId,
        clientMessageId: sendingId,
        messageType: type,
        content: mediaReceiptRequest
          ? `Comprobante (${mediaReceiptRequest.processing === 'auto' ? 'procesamiento automatico por banco activo' : 'procesamiento manual'})`
          : '',
        dataUrl,
        fileName: name,
        time,
        loaderStartedAt,
        replyToMessageId,
        replyTo: replyingTo ? {
          id: replyingTo.dbId,
          senderType: replyingTo.received ? 'admin' : 'client',
          messageType: replyingTo.type,
          content: replyingTo.text || '',
          fileName: replyingTo.fileName || '',
        } : null,
      })
    } catch {
      clearPendingTimer(sendingId)
      setMessages(prev => prev.map(msg =>
        msg.id === sendingId
          ? { ...msg, type: 'pending-media', mediaUrl: url, fileName: name }
          : msg
      ))
    }
  }

  useEffect(() => {
    let alive = true

    const loadInitial = async () => {
      try {
        const [botData, messageData] = await Promise.all([
          api.get('/api/client/bot/flow'),
          chatId ? api.get(`/api/client/chats/${chatId}/messages?mode=day`) : Promise.resolve({ messages: [] }),
        ])
        const flow = botData.flow
        const root = flow?.screens?.find(screen => screen.isRoot) || flow?.screens?.[0]
        const currentScreen = flow?.screens?.find(screen => screen.id === botData.state?.currentScreenId) || root
        const dbMessages = (messageData.messages || []).map(mapDbMessage)
        const botMessages = dbMessages.length > 0
          ? createBotButtonMessages(currentScreen, botData.state?.lastButtonId || 'state')
          : createBotMessages(currentScreen, botData.state?.lastButtonId || 'state')
        const queuedMessages = readOutbox(chatId)
        if (!alive) return
        outboxRef.current = queuedMessages
        setBotFlow(flow || null)
        setCurrentBotScreenId(currentScreen?.id || null)
        shouldScrollBottomRef.current = true
        setMessagePage(messageData.pagination || { previousDate: null, hasPrevious: false })
        setMessages([...dbMessages, ...queuedMessages.map(mapQueuedMessage), ...botMessages])
        markOutboundDelivered()
        markOutboundReadSoon()
      } catch {
        if (!alive) return
        setMessagePage({ previousDate: null, hasPrevious: false })
        shouldScrollBottomRef.current = true
        setMessages([{
          id: 'bot-fallback',
          type: 'text',
          text: 'Hola, ya estamos en linea. Escribinos y te ayudamos.',
          received: true,
          time: messageTime(),
          avatar: BOT_AVATAR,
        }])
      }
    }

    loadInitial()
    return () => { alive = false }
  }, [chatId, markOutboundDelivered, markOutboundReadSoon])

  const loadEarlierMessages = async () => {
    if (!chatId || loadingEarlier || !messagePage?.hasPrevious || !messagePage?.previousDate) return
    const el = messagesRef.current
    const previousScrollHeight = el?.scrollHeight || 0
    const previousScrollTop = el?.scrollTop || 0
    setLoadingEarlier(true)
    try {
      const data = await api.get(`/api/client/chats/${chatId}/messages?mode=day&date=${messagePage.previousDate}`)
      const earlierMessages = (data.messages || []).map(mapDbMessage)
      shouldScrollBottomRef.current = false
      setMessages(prev => {
        const seen = new Set(prev.map(message => message.dbId || message.id))
        return [...earlierMessages.filter(message => !seen.has(message.dbId || message.id)), ...prev]
      })
      setMessagePage(data.pagination || { previousDate: null, hasPrevious: false })
      window.requestAnimationFrame(() => {
        const nextEl = messagesRef.current
        if (!nextEl) return
        nextEl.scrollTop = nextEl.scrollHeight - previousScrollHeight + previousScrollTop
      })
    } catch {
      // Keep the current day loaded; the button can be retried.
    } finally {
      setLoadingEarlier(false)
    }
  }

  useEffect(() => {
    if (!chatId) return
    const socket = getSocket('client')
    socket.emit('chat:join', { chatId })
    const onNewMessage = (message) => {
      if (Number(message.chatId) !== Number(chatId)) return
      shouldScrollBottomRef.current = true
      setMessages(mergeDbMessage(message))
      if (message.senderType !== 'client') {
        window.clearTimeout(adminTypingTimerRef.current)
        setAdminTyping(false)
        markOutboundDelivered()
        markOutboundReadSoon()
      }
    }
    const onTyping = (event) => {
      if (Number(event.chatId) !== Number(chatId) || event.senderType === 'client') return
      window.clearTimeout(adminTypingTimerRef.current)
      const isTyping = Boolean(event.isTyping)
      setAdminTyping(isTyping)
      if (isTyping) {
        adminTypingTimerRef.current = window.setTimeout(() => setAdminTyping(false), TYPING_IDLE_MS + 1600)
      }
    }
    socket.on('message:new', onNewMessage)
    socket.on('typing', onTyping)
    return () => {
      socket.off('message:new', onNewMessage)
      socket.off('typing', onTyping)
      socket.emit('chat:leave', { chatId })
    }
  }, [chatId, markOutboundDelivered, markOutboundReadSoon])

  useEffect(() => {
    const socket = getSocket('client')
    let watchdogTimer = null

    const requestConnect = () => {
      const now = Date.now()
      const engineState = socket.io?.engine?.readyState
      const managerConnecting = Boolean(socket.io?._reconnecting)
      if (socket.connected || managerConnecting || engineState === 'opening') return
      if (now - lastManualConnectRef.current < MANUAL_CONNECT_COOLDOWN_MS) return
      lastManualConnectRef.current = now
      socket.connect()
    }

    const markOffline = () => {
      window.clearTimeout(connectionTimerRef.current)
      setConnectionStatus('offline')
    }
    const markReconnecting = () => {
      window.clearTimeout(connectionTimerRef.current)
      setConnectionStatus('reconnecting')
    }
    const markConnected = () => {
      markConnectionRestored()
      flushOutbox()
    }
    const syncConnection = () => {
      if (!navigator.onLine) {
        markOffline()
        return
      }

      if (socket.connected) {
        if (connectionStatusRef.current === 'offline' || connectionStatusRef.current === 'reconnecting') {
          markConnected()
        } else if (outboxRef.current.length > 0) {
          flushOutbox()
        }
        return
      }

      markReconnecting()
      requestConnect()
    }

    syncConnection()
    watchdogTimer = window.setInterval(syncConnection, RECONNECT_WATCHDOG_MS)

    socket.on('connect', markConnected)
    socket.on('disconnect', markOffline)
    socket.on('connect_error', markReconnecting)
    socket.io.on('reconnect', markConnected)
    socket.io.on('reconnect_attempt', markReconnecting)
    window.addEventListener('offline', markOffline)
    window.addEventListener('online', syncConnection)

    return () => {
      window.clearInterval(watchdogTimer)
      window.clearTimeout(connectionTimerRef.current)
      socket.off('connect', markConnected)
      socket.off('disconnect', markOffline)
      socket.off('connect_error', markReconnecting)
      socket.io.off('reconnect', markConnected)
      socket.io.off('reconnect_attempt', markReconnecting)
      window.removeEventListener('offline', markOffline)
      window.removeEventListener('online', syncConnection)
    }
  }, [chatId, flushOutbox, markConnectionRestored])

  useEffect(() => {
    if (!shouldScrollBottomRef.current) return
    shouldScrollBottomRef.current = false
    scrollToBottom()
  }, [messages])
  useEffect(() => () => {
    window.clearTimeout(readTimerRef.current)
    window.clearTimeout(typingTimerRef.current)
    window.clearTimeout(adminTypingTimerRef.current)
    pendingTimersRef.current.forEach(timer => window.clearTimeout(timer))
    pendingTimersRef.current.clear()
    if (typingActiveRef.current) getSocket('client').emit('typing', { chatId, isTyping: false })
  }, [chatId])

  useEffect(() => {
    const handler = (event) => {
      if (messageMenuRef.current && !messageMenuRef.current.contains(event.target)) setMessageMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const beginReply = (message) => {
    if (!message?.dbId || message.type === 'bot-buttons') return
    setReplyingTo(message)
    setMessageMenu(null)
  }

  const openMessageMenu = (event, message) => {
    event.preventDefault()
    if (!message?.dbId || message.type === 'bot-buttons') return
    const menuWidth = 150
    const menuHeight = 48
    setMessageMenu({
      message,
      x: Math.min(event.clientX, window.innerWidth - menuWidth - 10),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - 10),
    })
  }

  const handleMessagePointerDown = (event, message) => {
    if (!message?.dbId || message.type === 'bot-buttons') return
    if (isInteractiveMessageTarget(event.target)) return
    pointerStartRef.current = { x: event.clientX, y: event.clientY, messageId: message.id }
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  }

  const handleMessagePointerMove = (event, message) => {
    const start = pointerStartRef.current
    if (!start || start.messageId !== message.id || !message?.dbId || message.type === 'bot-buttons') return
    const dx = event.clientX - start.x
    const dy = Math.abs(event.clientY - start.y)
    if (dx <= 0 || dy > 42) {
      setSwipeReply(null)
      return
    }
    setSwipeReply({ messageId: message.id, offset: Math.min(dx, 72) })
  }

  const handleMessagePointerUp = (event, message) => {
    const start = pointerStartRef.current
    pointerStartRef.current = null
    setSwipeReply(null)
    if (!start || start.messageId !== message.id || !message?.dbId) return
    const dx = event.clientX - start.x
    const dy = Math.abs(event.clientY - start.y)
    if (dx > 58 && dy < 36) beginReply(message)
  }

  const handleMessagePointerCancel = () => {
    pointerStartRef.current = null
    setSwipeReply(null)
  }

  const renderReplyQuote = (reply, received) => {
    if (!reply) return null
    return (
      <ReplyQuote $received={received}>
        <ReplyAuthor $received={received}>{replyAuthorLabel(reply, received)}</ReplyAuthor>
        <ReplyText>{replyPreviewText(reply)}</ReplyText>
      </ReplyQuote>
    )
  }

  const { normalMessages, botButtonMessages } = splitBotButtons(messages)
  const orderedMessages = [...normalMessages, ...botButtonMessages.slice(-1)]

  return (
    <ChatViewContainer>

      {/* preview modal — overlays the full chat container */}
      {previewData && (
        <MediaPreviewModal
          data={previewData}
          onClose={() => { setPreviewData(null); if (previewData?.receiptRequest) setReceiptRequest(null) }}
          onSend={sendMedia}
        />
      )}

      {/* viewer lightbox — rendered via portal to escape Window overflow */}
      {viewerData && createPortal(
        <MediaViewer data={viewerData} onClose={() => setViewerData(null)} />,
        document.body
      )}
      {messageMenu && createPortal(
        <MessageActionMenu ref={messageMenuRef} $x={messageMenu.x} $y={messageMenu.y}>
          <MessageActionItem type="button" onClick={() => beginReply(messageMenu.message)}>
            <ReplyIcon />Responder
          </MessageActionItem>
        </MessageActionMenu>,
        document.body
      )}

      {/* header */}
      <ChatHeader>
        <ChatHeaderSide>
          <ChatHeaderBtn onClick={onClose} aria-label="Cerrar">
            <ArrowBackIosNewIcon />
          </ChatHeaderBtn>
        </ChatHeaderSide>

        <ChatHeaderCenter>
          <HeaderPill>
            <HeaderPillText>{username}</HeaderPillText>
            <HeaderPillBadge>{onlineLabel}</HeaderPillBadge>
          </HeaderPill>
          <ConnectionBanner
            $visible={showConnectionBanner}
            $tone={connectionStatus === 'connected' ? 'ok' : connectionStatus === 'reconnecting' ? 'warn' : 'danger'}
          >
            {connectionBanner}
          </ConnectionBanner>
        </ChatHeaderCenter>

        <ChatHeaderSide $right />
      </ChatHeader>

      {/* messages */}
      <MessagesArea>
        <ChatMessages ref={messagesRef} onScroll={handleScroll}>
          {messagePage?.hasPrevious && (
            <LoadEarlierBtn type="button" onClick={loadEarlierMessages} disabled={loadingEarlier}>
              {loadingEarlier ? 'Cargando...' : formatPreviousDayLabel(messagePage.previousDate)}
            </LoadEarlierBtn>
          )}
          {orderedMessages.map(msg => (
            <MessageRow
              key={msg.id}
              $received={msg.received}
              onContextMenu={event => openMessageMenu(event, msg)}
              onPointerDown={event => handleMessagePointerDown(event, msg)}
              onPointerMove={event => handleMessagePointerMove(event, msg)}
              onPointerUp={event => handleMessagePointerUp(event, msg)}
              onPointerCancel={handleMessagePointerCancel}
              $swipeOffset={swipeReply?.messageId === msg.id ? swipeReply.offset : 0}
            >
              {msg.received && (
                <MessageAvatar>
                  {msg.avatarUrl
                    ? <img src={msg.avatarUrl} alt="" />
                    : systemConfig.logoUrl
                      ? <img src={systemConfig.logoUrl} alt="" />
                      : (msg.avatar === BOT_AVATAR ? appInitials(systemConfig.appName) : msg.avatar)}
                </MessageAvatar>
              )}
              <MessageContent $received={msg.received} $wide={msg.type === 'bot-buttons'}>
                {msg.type === 'sending' ? (
                  <SendingBubbleWrap>
                    <SendingLoader mediaType={msg.mediaType} />
                  </SendingBubbleWrap>
                ) : msg.type === 'pending-media' ? (
                  <PendingMediaWrap>
                    <PendingMediaTitle>
                      {msg.mediaType === 'pdf' ? 'Documento pendiente' : 'Imagen pendiente'}
                    </PendingMediaTitle>
                    <PendingMediaHint>
                      No se pudo completar el envio.
                    </PendingMediaHint>
                    <PendingMediaActions>
                      <PendingMediaBtn type="button" onClick={() => retryQueuedMedia(msg.clientMessageId)}>
                        Reintentar
                      </PendingMediaBtn>
                      <PendingMediaBtn type="button" $danger onClick={() => cancelQueuedMedia(msg.clientMessageId)}>
                        Cancelar
                      </PendingMediaBtn>
                    </PendingMediaActions>
                  </PendingMediaWrap>
                ) : msg.type === 'bot-buttons' ? (
                  <BotButtonsWrap>
                    {msg.buttons.map(button => (
                      <BotOptionBtn
                        key={button.id}
                        type="button"
                        $isBack={button.isBack}
                        $isUpload={button.buttonType === 'receipt_upload'}
                        disabled={button.buttonType !== 'receipt_upload' && botActionPending}
                        onClick={() => handleBotButton(button)}
                      >
                        {button.label}
                      </BotOptionBtn>
                    ))}
                  </BotButtonsWrap>
                ) : msg.type === 'image' ? (
                  <>
                    {renderReplyQuote(msg.replyTo, msg.received)}
                    {msg.text && <MessageBubble $received={msg.received}>{msg.text}</MessageBubble>}
                    <MediaMsgImg
                      src={msg.mediaUrl}
                      alt={msg.fileName}
                      onClick={() => setViewerData({ type: 'image', url: msg.mediaUrl, name: msg.fileName })}
                    />
                  </>
                ) : msg.type === 'pdf' ? (
                  <>
                    {renderReplyQuote(msg.replyTo, msg.received)}
                    {msg.text && <MessageBubble $received={msg.received}>{msg.text}</MessageBubble>}
                    <MediaMsgPdf
                      onClick={() => setViewerData({ type: 'pdf', url: msg.mediaUrl, name: msg.fileName })}
                    >
                      <DescriptionIcon />
                      <span>{msg.fileName}</span>
                    </MediaMsgPdf>
                  </>
                ) : msg.type === 'voice' ? (
                  <>
                    {renderReplyQuote(msg.replyTo, msg.received)}
                    <VoiceMessage audioUrl={msg.audioUrl || msg.mediaUrl} duration={msg.duration} received={msg.received} />
                  </>
                ) : (
                  <MessageBubble $received={msg.received}>
                    {renderReplyQuote(msg.replyTo, msg.received)}
                    {msg.received && hasRichText(msg.text)
                      ? <span dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(msg.text) }} />
                      : msg.text
                    }
                  </MessageBubble>
                )}
                <MessageTime>{msg.time}</MessageTime>
              </MessageContent>
            </MessageRow>
          ))}
          {adminTyping && (
            <TypingBubble>
              <TypingDot $delay={0} />
              <TypingDot $delay={140} />
              <TypingDot $delay={280} />
              <TypingText>Soporte escribiendo</TypingText>
            </TypingBubble>
          )}
          <div ref={bottomRef} />
        </ChatMessages>

        {showScroll && (
          <ScrollDownBtn onClick={() => scrollToBottom()}>
            <KeyboardArrowDownIcon />
            Ir abajo
          </ScrollDownBtn>
        )}
      </MessagesArea>

      {/* attach panel + footer */}
      <BottomArea>
        {attachOpen && (
          <AttachPanel>
            <AttachGrid>
              <AttachOption type="button" onClick={() => imageInputRef.current?.click()}>
                <ImageOutlinedIcon />
                Imagen
              </AttachOption>
              <AttachOption type="button" onClick={() => pdfInputRef.current?.click()}>
                <AttachFileIcon />
                Archivo
              </AttachOption>
              <AttachOption type="button" onClick={() => setAttachOpen(false)}>
                <CloseIcon />
                Cerrar
              </AttachOption>
            </AttachGrid>
          </AttachPanel>
        )}

        {replyingTo && (
          <ReplyComposer>
            <ReplyComposerText>
              <ReplyComposerTitle>Respondiendo a {replyingTo.received ? 'soporte' : 'ti'}</ReplyComposerTitle>
              <ReplyComposerBody>{replyPreviewText(replyingTo)}</ReplyComposerBody>
            </ReplyComposerText>
            <ReplyComposerClose type="button" onClick={() => setReplyingTo(null)} aria-label="Cancelar respuesta">
              <CloseIcon />
            </ReplyComposerClose>
          </ReplyComposer>
        )}

        <ChatFooter>
          <PlusBtn
            type="button"
            $isActive={attachOpen}
            onClick={() => setAttachOpen(p => !p)}
            aria-label="Adjuntos"
          >
            <AddIcon />
          </PlusBtn>

          <ChatInput
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
          />

          <SendBtn
            type="button"
            onClick={sendMessage}
            disabled={!input.trim()}
            aria-label="Enviar"
          >
            <SendIcon />
          </SendBtn>
        </ChatFooter>
      </BottomArea>

      {/* hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={e => handleFileSelect(e, 'image')}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={e => handleFileSelect(e, 'pdf')}
      />
      <input
        ref={receiptInputRef}
        type="file"
        accept="image/*,application/pdf,.pdf"
        style={{ display: 'none' }}
        onChange={handleReceiptFileSelect}
      />

    </ChatViewContainer>
  )
}

/* ── main window ── */

const ChatWindow = ({ onClose }) => {
  const { systemConfig } = useSystemConfig()
  const { clientSession, setClientSession, clientAuthLoading, setClientAuthLoading } = useContext(ChatContext)
  const [view, setView] = useState(clientSession ? 'chat' : 'login')
  const [loading, setLoading] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [error, setError] = useState('')
  const isAuthLoading = loading || clientAuthLoading
  const activeView = clientSession ? 'chat' : view
  const isChat = activeView === 'chat' || isAuthLoading

  useEffect(() => {
    if (!systemConfig.clientRegistrationEnabled && view === 'register') {
      setView('login')
    }
  }, [systemConfig.clientRegistrationEnabled, view])

  useEffect(() => {
    const socket = getSocket('client')
    const closeTemporarySession = () => {
      localStorage.removeItem('clientUsername')
      localStorage.removeItem('clientId')
      localStorage.removeItem('chatId')
      setClientSession(null)
      setView('login')
      setError('El chat temporal fue cerrado por soporte.')
    }
    socket.on('temp-session:closed', closeTemporarySession)
    return () => socket.off('temp-session:closed', closeTemporarySession)
  }, [setClientSession])

  const handleLogin = async ({ username, password }) => {
    if (!username?.trim() || !password) {
      setError('Completa usuario y contrasena.')
      return
    }

    setLoading(true)
    setClientAuthLoading(true)
    setView('loading')
    setError('')

    try {
      const session = await api.post('/api/client/auth/login', {
        username: username.trim(),
        password,
      })
      setClientSession(session.client)
      localStorage.setItem('clientUsername', session.client.username)
      localStorage.setItem('clientId', String(session.client.id))
      localStorage.setItem('chatId', String(session.client.chatId || ''))
      setView('chat')
    } catch (loginError) {
      setError(loginError.payload?.error || loginError.message || 'No se pudo iniciar sesion.')
      setView('login')
    } finally {
      setLoading(false)
      setClientAuthLoading(false)
    }
  }

  const validateRegistration = ({ username, password }) => {
    const cleanUsername = String(username || '').trim()
    const cleanPassword = String(password || '')

    if (!cleanUsername || !cleanPassword) return 'Completa usuario y contrasena.'
    if (/\s/.test(cleanUsername) || /[A-Z]/.test(cleanUsername)) {
      return 'El usuario no puede tener espacios ni mayusculas.'
    }
    if (cleanPassword.length < 4 || /\s/.test(cleanPassword) || /[A-Z]/.test(cleanPassword)) {
      return 'La contrasena debe tener minimo 4 caracteres, sin espacios ni mayusculas.'
    }
    return ''
  }

  const handleRegister = async ({ username, password }) => {
    if (!systemConfig.clientRegistrationEnabled) {
      setView('login')
      setError('El registro de clientes esta deshabilitado.')
      return
    }

    const validationError = validateRegistration({ username, password })
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setClientAuthLoading(true)
    setView('loading')
    setError('')

    try {
      const session = await api.post('/api/client/auth/register', {
        username: username.trim(),
        password,
      })
      setClientSession(session.client)
      localStorage.setItem('clientUsername', session.client.username)
      localStorage.setItem('clientId', String(session.client.id))
      localStorage.setItem('chatId', String(session.client.chatId || ''))
      setView('chat')
    } catch (registerError) {
      setError(registerError.payload?.error || registerError.message || 'No se pudo crear la cuenta.')
      setView('register')
    } finally {
      setLoading(false)
      setClientAuthLoading(false)
    }
  }

  const handleStartHelp = async ({ reason, note }) => {
    setLoading(true)
    setClientAuthLoading(true)
    setView('loading')
    setError('')
    try {
      const session = await api.post('/api/client/auth/help-session', { reason, note })
      setClientSession(session.client)
      localStorage.setItem('clientUsername', session.client.username)
      localStorage.setItem('clientId', String(session.client.id))
      localStorage.setItem('chatId', String(session.client.chatId || ''))
      setHelpOpen(false)
      setView('chat')
    } catch (helpError) {
      setError(helpError.payload?.error || helpError.message || 'No se pudo abrir el chat de ayuda.')
      setView('login')
    } finally {
      setLoading(false)
      setClientAuthLoading(false)
    }
  }

  return (
    <Window>
      {!isChat && (
      <VisualSection>
          <CloseBtn onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </CloseBtn>
          <VisualLogo>
            {systemConfig.logoUrl ? <img src={systemConfig.logoUrl} alt={systemConfig.appName} /> : <ChatOutlinedIcon />}
          </VisualLogo>
          <AppLabel>{systemConfig.appName}</AppLabel>
        </VisualSection>
      )}

      <FormSection $isChat={isChat}>
        {isAuthLoading && <ChatAuthLoader />}
        {error && !isChat && <ErrorBanner role="alert">{error}</ErrorBanner>}
        {!isAuthLoading && activeView === 'login' && (
          <LoginView
            onLogin={handleLogin}
            onRegister={() => systemConfig.clientRegistrationEnabled && setView('register')}
            onHelp={() => setHelpOpen(true)}
            loading={loading}
            registrationEnabled={systemConfig.clientRegistrationEnabled}
          />
        )}
        {!isAuthLoading && activeView === 'register' && systemConfig.clientRegistrationEnabled && (
          <RegisterView
            onRegister={handleRegister}
            onLogin={() => setView('login')}
            loading={loading}
          />
        )}
        {!isAuthLoading && activeView === 'chat' && (
          <ChatView onClose={onClose} client={clientSession} />
        )}
      </FormSection>
      <HelpDialog
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        onStart={handleStartHelp}
        loading={loading}
        registrationEnabled={systemConfig.clientRegistrationEnabled}
      />
    </Window>
  )
}

export default ChatWindow
