import { useState, useRef, useEffect, useContext } from 'react'
import { useDateFormat } from '../../../hooks/useDateFormat'
import { parseDateValue } from '../../../utils/dateUtils'
import { AuthContext } from '../../../context/AuthContext'
import { createPortal } from 'react-dom'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatOutlined'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
import MicIcon from '@mui/icons-material/Mic'
import CheckIcon from '@mui/icons-material/Check'
import BoltIcon from '@mui/icons-material/Bolt'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import ReplyIcon from '@mui/icons-material/Reply'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import PersonOffOutlinedIcon from '@mui/icons-material/BlockOutlined'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined'
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange'
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined'
import DropUpload from '../../common/DropUpload'
import { useConfirm } from '../../common/ConfirmDialog'
import MovementDrawer from './MovementDrawer'
import WithdrawalDrawer from './WithdrawalDrawer'
import TransactionHistoryDrawer from './TransactionHistoryDrawer'
import { api, resolveApiAsset } from '../../../utils/api'
import { getSocket, makeClientMessageId } from '../../../utils/socket'
import { hasRichText, htmlToPlainText, sanitizeRichHtml } from '../../../utils/richText'
import {
  Wrap, EmptyState,
  Header, BackBtn, HeaderAvatar, OnlineDot, HeaderInfo, HeaderName, HeaderStatus,
  HeaderMenuWrap, HeaderMenuBtn, HeaderBtnWrap, HeaderBtnBadge, DropdownMenu, DropdownItem,
  PinnedMessageBar, PinnedMessageMain, PinnedMessageIcon, PinnedMessageText,
  PinnedMessageTitle, PinnedMessagePreview, PinnedMessageClose,
  MessagesArea, MessagesList, MsgRow, MsgAvatar, MsgContent, MsgSenderName, MsgBubble, MsgMeta, MsgStatus, MsgTime,
  FormSubmissionCard, FormSubmissionTitle, FormSubmissionRow, FormSubmissionLabel, FormSubmissionValue, FormSubmissionCopy,
  MessageActionMenu, MessageActionItem, ReplyQuote, ReplyAuthor, ReplyText,
  LoadEarlierBtn, TypingBubble, TypingDot, TypingText,
  ScrollDownBtn, MediaMsgImg, MediaMsgPdf,
  BottomArea,
  CommandSuggestions, CommandSuggestionBtn, CommandSuggestionMeta, CommandSuggestionName,
  CommandSuggestionPreview, CommandSuggestionTrigger, CommandPreview, CommandPreviewHead,
  CommandPreviewKicker, CommandPreviewTitle, CommandPreviewBody, CommandPreviewClose,
  EmojiPanel, EmojiCategoryBar, EmojiCategoryBtn, EmojiGrid, EmojiBtn,
  Footer, FooterBtn, FooterInput, SendBtn, MicBtn,
  ReplyComposer, ReplyComposerText, ReplyComposerTitle, ReplyComposerBody, ReplyComposerClose,
  RecordFooter, RecordCancelBtn, RecordVisual, RecordDot,
  RecordBarsWrap, RecordBar, RecordTimer, RecordSendBtn,
  VoiceBubble, VoicePlayBtn, VoiceWave, VoiceProgress, VoiceBar, VoiceSeek, VoiceTime, VoiceSpeedBtn,
  SendingBubbleWrap,
  ViewerOverlay, ViewerContent, ViewerFileName, ViewerImg, ViewerEmbed, ViewerActions, ViewerBtn,
} from './AdminChatView.styles'

/* ── emoji data ── */
const EMOJI_GROUPS = [
  {
    icon: '😊',
    emojis: [
      '😀','😃','😄','😁','😆','😅','🤣','😂','😊','😇','🥰','😍','😘',
      '😋','😛','😜','😝','🤑','🤗','🤔','😐','😑','😶','😏','😒','🙄',
      '😬','😌','😔','😪','😴','😷','🤒','🥺','😢','😭','😡','😎','🥳',
    ],
  },
  {
    icon: '👍',
    emojis: [
      '👍','👎','👊','✊','🤛','🤜','🤞','✌️','🤙','👋','✋','👌',
      '🤏','🤝','🙏','💪','👏','🙌','🤲','✍️',
    ],
  },
  {
    icon: '❤️',
    emojis: [
      '❤️','🧡','💛','💚','💙','💜','🖤','🤍','💔','💕','💞','💓',
      '💗','💖','💘','💝','🔥','✨','⭐','🌟','💫','💥','🎉','🎊',
      '🎈','🏆','🥇','✅','❌','⚠️','💯','🆗','🆙',
    ],
  },
]

let _adminChatTz = undefined
const messageTime = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', ...(_adminChatTz && { timeZone: _adminChatTz }) })

const replyPreviewText = (message) => {
  if (!message) return ''
  if (message.type === 'image' || message.messageType === 'image') return message.fileName ? `Imagen: ${message.fileName}` : 'Imagen'
  if (message.type === 'pdf' || message.messageType === 'pdf') return message.fileName ? `PDF: ${message.fileName}` : 'Documento PDF'
  if (message.type === 'voice' || message.type === 'audio' || message.messageType === 'audio') return 'Audio'
  const text = message.text || message.content || ''
  return hasRichText(text) ? htmlToPlainText(text) : text
}

const replyAuthorLabel = (reply, currentUserSent = false) => {
  if (!reply) return ''
  if (reply.senderType) return reply.senderType === 'client' ? 'Cliente' : 'Soporte'
  return currentUserSent ? 'Tu' : 'Cliente'
}

const formatPreviousDayLabel = (dateString) => {
  if (!dateString) return 'Cargar dia anterior'
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return `Cargar ${date.toLocaleDateString('es', { day: '2-digit', month: 'short', ...(_adminChatTz && { timeZone: _adminChatTz }) })}`
}

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
  reader.readAsDataURL(file)
})

const isInteractiveMessageTarget = (target) =>
  Boolean(target?.closest?.('button,a,input,textarea,select,audio,video,[role="button"]'))

const audioRecorderMimeType = () => [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
].find(type => MediaRecorder.isTypeSupported(type)) || ''

const audioExtensionFromMime = (mimeType = '') => {
  const clean = mimeType.split(';')[0]
  if (clean === 'audio/mp4') return 'm4a'
  if (clean === 'audio/ogg') return 'ogg'
  if (clean === 'audio/mpeg') return 'mp3'
  if (clean === 'audio/wav' || clean === 'audio/x-wav') return 'wav'
  return 'webm'
}

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
  sent: msg.senderType !== 'client',
  createdAt: parseDateValue(msg.createdAtUtc || msg.createdAt),
  time: msg.time,
  deliveredAt: msg.deliveredAt || null,
  readAt: msg.readAt || null,
  deliveryState: msg.readAt ? 'read' : msg.deliveredAt ? 'delivered' : 'sent',
  replyTo: msg.replyTo,
  senderDisplayName: msg.senderDisplayName || '',
})

const mapApiCommand = (command) => ({
  id: command.id,
  trigger: command.trigger,
  response: command.response,
  matchType: command.match_type,
  active: Boolean(command.is_active),
})

const deliveryLabel = (msg) => {
  if (!msg.sent) return ''
  if (msg.readAt || msg.deliveryState === 'read') return 'Visto'
  if (msg.deliveredAt || msg.deliveryState === 'delivered') return 'Entregado'
  return 'Enviado'
}

const adminDisplayName = (user) => {
  const name = String(user?.full_name || user?.username || '').trim()
  return name || 'Admin'
}

/* ── voice waveform pattern (visual only) ── */
const WAVEFORM = [
  0.40,0.65,0.85,0.50,0.95,0.75,0.42,0.88,0.60,1.00,
  0.52,0.78,0.92,0.45,0.68,0.82,0.55,0.72,0.38,0.86,
  0.62,0.90,0.48,0.74,0.56,0.80,0.58,0.42,0.70,0.50,
]

/* ── format seconds as M:SS ── */
const fmt = (s) => {
  const n = Math.floor(s)
  return `${Math.floor(n / 60)}:${(n % 60).toString().padStart(2, '0')}`
}

/* ── recording equalizer bar timings (deterministic) ── */
const BAR_COUNT = 26
const BAR_DURS  = [480,380,560,440,520,360,500,420,580,400,460,540,380,500,440,580,360,520,480,400,560,440,500,380,520,460]
const BAR_DELS  = [0,60,30,90,15,75,45,105,20,80,40,100,10,70,35,95,25,85,50,110,5,65,55,115,45,80]

/* ── loader ── */
const LOADER_TEXTS = {
  image: ['Enviando imagen', 'Ya casi terminamos', 'Un momento más'],
  pdf:   ['Enviando archivo', 'Ya casi terminamos', 'Un momento más'],
}
const TYPING_IDLE_MS = 1400
const pinnedStorageKey = (chatId) => `admin-chat-pinned-message:${chatId}`

const pinnedMessageSnapshot = (message) => ({
  id: message.id,
  dbId: message.dbId,
  sent: Boolean(message.sent),
  senderType: message.sent ? 'admin' : 'client',
  type: message.type,
  messageType: message.type === 'voice' ? 'audio' : message.type,
  text: message.text || '',
  content: message.text || '',
  fileName: message.fileName || '',
  time: message.time || '',
})

const parseFormSubmission = (text = '') => {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  if (!lines[0]?.toLowerCase().startsWith('formulario:')) return null
  return {
    title: lines[0].replace(/^formulario:\s*/i, '').trim() || 'Formulario',
    rows: lines.slice(1).map(line => {
      const index = line.indexOf(':')
      return index === -1
        ? { label: 'Dato', value: line }
        : { label: line.slice(0, index).trim() || 'Dato', value: line.slice(index + 1).trim() }
    }).filter(row => row.value),
  }
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
        <span key={i} className="loader-letter" style={{ animationDelay: `${i * 0.1}s` }}>
          {char === ' ' ? ' ' : char}
        </span>
      ))}
    </div>
  )
}

/* ── voice message player ── */
const VoiceMessage = ({ audioUrl, duration, sent }) => {
  const audioRef             = useRef(null)
  const frameRef             = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [total,   setTotal]   = useState(duration ?? 0)
  const [rate, setRate] = useState(1)
  const [playbackError, setPlaybackError] = useState(false)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    setPlaybackError(false)
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setElapsed(0) }
    const onTime  = () => setElapsed(a.currentTime)
    const onMeta  = () => { if (isFinite(a.duration)) setTotal(a.duration) }
    const onError = () => setPlaybackError(true)
    a.addEventListener('play',            onPlay)
    a.addEventListener('pause',           onPause)
    a.addEventListener('ended',           onEnded)
    a.addEventListener('timeupdate',      onTime)
    a.addEventListener('loadedmetadata',  onMeta)
    a.addEventListener('error',           onError)
    return () => {
      a.removeEventListener('play',           onPlay)
      a.removeEventListener('pause',          onPause)
      a.removeEventListener('ended',          onEnded)
      a.removeEventListener('timeupdate',     onTime)
      a.removeEventListener('loadedmetadata', onMeta)
      a.removeEventListener('error',          onError)
    }
  }, [audioUrl])

  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(frameRef.current)
      return undefined
    }
    const tick = () => {
      const a = audioRef.current
      if (a) setElapsed(a.currentTime)
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [playing])

  useEffect(() => {
    const a = audioRef.current
    if (a) a.playbackRate = rate
  }, [rate, audioUrl])

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      return
    }
    a.play().catch(() => setPlaybackError(true))
  }

  const progress = total > 0 ? elapsed / total : 0
  const seekTo = (event) => {
    const a = audioRef.current
    if (!a || total <= 0) return
    const next = (Number(event.target.value) / 100) * total
    a.currentTime = next
    setElapsed(next)
  }
  const cycleRate = () => setRate(current => current === 1 ? 1.5 : current === 1.5 ? 2 : 1)

  return (
    <VoiceBubble $sent={sent}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <VoicePlayBtn
        $sent={sent}
        onPointerDown={event => event.stopPropagation()}
        onClick={togglePlay}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
      >
        {playing ? <PauseIcon /> : <PlayArrowIcon />}
      </VoicePlayBtn>
      <VoiceWave $progress={progress} $sent={sent}>
        <VoiceProgress $progress={progress} $sent={sent} />
        {WAVEFORM.map((h, i) => (
          <VoiceBar
            key={i}
            $h={h}
            $active={(i + 1) / WAVEFORM.length <= progress}
            $sent={sent}
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
          $sent={sent}
          onPointerDown={event => event.stopPropagation()}
          onChange={seekTo}
          aria-label="Adelantar audio"
        />
      </VoiceWave>
      <VoiceTime $sent={sent}>
        {fmt(playing ? elapsed : total)}
      </VoiceTime>
      <VoiceSpeedBtn
        type="button"
        $sent={sent}
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

/* ── media viewer ── */
const MediaViewer = ({ data, onClose }) => {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = data.url; a.download = data.name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
  return (
    <ViewerOverlay onClick={onClose}>
      <ViewerContent onClick={e => e.stopPropagation()}>
        <ViewerFileName>{data.name}</ViewerFileName>
        {data.type === 'image'
          ? <ViewerImg src={data.url} alt={data.name} />
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

/* ── main component ── */
const AdminChatView = ({ chat, onBack, onOpenClient, onChatDeleted }) => {
  const { timezone, formatTime } = useDateFormat()
  const { user } = useContext(AuthContext) || {}
  useEffect(() => { _adminChatTz = timezone; return () => { _adminChatTz = undefined } }, [timezone])
  const { confirm, alert: alertDialog, dialogNode } = useConfirm()
  const [input, setInput]           = useState('')
  const [messages, setMessages]     = useState([])
  const [messagePage, setMessagePage] = useState({ previousDate: null, hasPrevious: false })
  const [loadingEarlier, setLoadingEarlier] = useState(false)
  const [dropOpen, setDropOpen]     = useState(false)
  const [emojiOpen, setEmojiOpen]   = useState(false)
  const [emojiGroup, setEmojiGroup] = useState(0)
  const [showScroll, setShowScroll] = useState(false)
  const [viewerData, setViewerData] = useState(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [clientTyping, setClientTyping] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [messageMenu, setMessageMenu] = useState(null)
  const [commands, setCommands] = useState([])
  const [commandDraft, setCommandDraft] = useState(null)
  const [commandIndex, setCommandIndex] = useState(0)
  const [swipeReply, setSwipeReply] = useState(null)
  const [pinnedMessage, setPinnedMessage] = useState(null)
  const [pinnedFlashId, setPinnedFlashId] = useState(null)
  const [movementDrawerOpen, setMovementDrawerOpen] = useState(false)
  const [withdrawalDrawerOpen, setWithdrawalDrawerOpen] = useState(false)
  const [txHistoryOpen, setTxHistoryOpen] = useState(false)
  const [pendingCounts, setPendingCounts] = useState({ movements: 0, withdrawals: 0 })

  /* recording */
  const [isRecording, setIsRecording] = useState(false)
  const [recTime, setRecTime]         = useState(0)
  const mediaRecRef  = useRef(null)
  const audioChunks  = useRef([])
  const recTimerRef  = useRef(null)
  const recTimeRef   = useRef(0)

  const listRef   = useRef(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const menuRef   = useRef(null)
  const messageMenuRef = useRef(null)
  const pointerStartRef = useRef(null)
  const typingTimerRef = useRef(null)
  const clientTypingTimerRef = useRef(null)
  const typingActiveRef = useRef(false)
  const shouldScrollBottomRef = useRef(false)

  const isCommandLookup = /^\/[a-z0-9_-]*$/i.test(input)
  const commandQuery = isCommandLookup ? input.slice(1).toLowerCase() : ''
  const suggestedCommands = isCommandLookup
    ? commands
      .filter(command => !commandQuery || command.trigger.includes(commandQuery))
      .slice(0, 6)
    : []
  const showCommandSuggestions = suggestedCommands.length > 0 && !commandDraft
  const currentPinnedMessage = pinnedMessage
    ? messages.find(message => message.dbId && Number(message.dbId) === Number(pinnedMessage.dbId)) || pinnedMessage
    : null

  const scrollToBottom = (smooth = true) => {
    const el = listRef.current
    if (!el) return
    if (smooth) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    else        el.scrollTop = el.scrollHeight
  }

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    setShowScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 80)
  }

  useEffect(() => { scrollToBottom(false) }, [])
  useEffect(() => {
    if (!shouldScrollBottomRef.current) return
    const instant = shouldScrollBottomRef.current === 'instant'
    shouldScrollBottomRef.current = false
    scrollToBottom(!instant)
  }, [messages])

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const handler = () => scrollToBottom(false)
    vv.addEventListener('resize', handler)
    return () => vv.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (messageMenuRef.current && !messageMenuRef.current.contains(e.target)) setMessageMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!chat?.id) {
      setPinnedMessage(null)
      return
    }
    try {
      const stored = window.localStorage.getItem(pinnedStorageKey(chat.id))
      setPinnedMessage(stored ? JSON.parse(stored) : null)
    } catch {
      setPinnedMessage(null)
    }
  }, [chat?.id])

  useEffect(() => {
    let alive = true
    const loadCommands = async () => {
      try {
        const params = new URLSearchParams({ status: 'active', limit: '100' })
        const data = await api.get('/api/commands?' + params.toString())
        if (!alive) return
        setCommands((data.commands || []).map(mapApiCommand).filter(command => command.active))
      } catch {
        if (alive) setCommands([])
      }
    }
    loadCommands()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    setCommandIndex(0)
  }, [commandQuery])

  useEffect(() => {
    if (!chat?.id) {
      return undefined
    }

    let alive = true
    const socket = getSocket('admin')
    const chatId = chat.id

    socket.emit('chat:join', { chatId })

    const replaceOrAppend = (incoming) => {
      setMessages(prev => {
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
        shouldScrollBottomRef.current = true
        return [...prev, mapped]
      })
    }

    const onNewMessage = (message) => {
      if (Number(message.chatId) !== Number(chatId)) return
      replaceOrAppend(message)
      if (message.senderType === 'client') {
        window.clearTimeout(clientTypingTimerRef.current)
        setClientTyping(false)
        api.put(`/api/chats/${chatId}/read`, {}).catch(() => {})
      }
    }
    const onTyping = (event) => {
      if (Number(event.chatId) !== Number(chatId) || event.senderType !== 'client') return
      window.clearTimeout(clientTypingTimerRef.current)
      const isTyping = Boolean(event.isTyping)
      setClientTyping(isTyping)
      if (isTyping) {
        clientTypingTimerRef.current = window.setTimeout(() => setClientTyping(false), TYPING_IDLE_MS + 1600)
      }
    }
    const onMessageStatus = ({ chatId: statusChatId, statuses } = {}) => {
      if (Number(statusChatId) !== Number(chatId)) return
      setMessages(prev => prev.map(message => {
        const status = statuses?.find(item => Number(item.id) === Number(message.dbId))
        if (!status) return message
        return {
          ...message,
          deliveredAt: status.deliveredAt || message.deliveredAt,
          readAt: status.readAt || message.readAt,
          deliveryState: status.readAt ? 'read' : status.deliveredAt ? 'delivered' : message.deliveryState,
        }
      }))
    }

    const loadMessages = async () => {
      try {
        const data = await api.get(`/api/chats/${chatId}/messages?mode=day`)
        if (!alive) return
        shouldScrollBottomRef.current = 'instant'
        setMessages((data.messages || []).map(mapDbMessage))
        setMessagePage(data.pagination || { previousDate: null, hasPrevious: false })
        await api.put(`/api/chats/${chatId}/read`, {})
      } catch {
        if (alive) {
          setMessages([])
          setMessagePage({ previousDate: null, hasPrevious: false })
        }
      }
    }

    socket.on('message:new', onNewMessage)
    socket.on('typing', onTyping)
    socket.on('messages:status', onMessageStatus)
    loadMessages()

    return () => {
      alive = false
      socket.off('message:new', onNewMessage)
      socket.off('typing', onTyping)
      socket.off('messages:status', onMessageStatus)
      socket.emit('chat:leave', { chatId })
    }
  }, [chat?.id])

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      clearInterval(recTimerRef.current)
      if (mediaRecRef.current?.state === 'recording') {
        mediaRecRef.current.stream?.getTracks().forEach(t => t.stop())
      }
      window.clearTimeout(typingTimerRef.current)
      window.clearTimeout(clientTypingTimerRef.current)
      if (typingActiveRef.current && chat?.id) getSocket('admin').emit('typing', { chatId: chat.id, isTyping: false })
    }
  }, [chat?.id])

  /* pending counts badge */
  const fetchPendingCounts = async () => {
    if (!chat?.id) return
    try {
      const data = await api.get(`/api/chats/${chat.id}/pending-counts`)
      setPendingCounts({ movements: data.movements || 0, withdrawals: data.withdrawals || 0 })
    } catch {
      setPendingCounts({ movements: 0, withdrawals: 0 })
    }
  }
  useEffect(() => {
    setPendingCounts({ movements: 0, withdrawals: 0 })
    fetchPendingCounts()
  }, [chat?.id])

  const emitTyping = (isTyping) => {
    if (!chat?.id) return
    typingActiveRef.current = isTyping
    getSocket('admin').emit('typing', { chatId: chat.id, isTyping })
  }

  const loadEarlierMessages = async () => {
    if (!chat?.id || loadingEarlier || !messagePage?.hasPrevious || !messagePage?.previousDate) return
    const el = listRef.current
    const previousScrollHeight = el?.scrollHeight || 0
    const previousScrollTop = el?.scrollTop || 0
    setLoadingEarlier(true)
    try {
      const data = await api.get(`/api/chats/${chat.id}/messages?mode=day&date=${messagePage.previousDate}`)
      const earlierMessages = (data.messages || []).map(mapDbMessage)
      shouldScrollBottomRef.current = false
      setMessages(prev => {
        const seen = new Set(prev.map(message => message.dbId || message.id))
        return [...earlierMessages.filter(message => !seen.has(message.dbId || message.id)), ...prev]
      })
      setMessagePage(data.pagination || { previousDate: null, hasPrevious: false })
      window.requestAnimationFrame(() => {
        const nextEl = listRef.current
        if (!nextEl) return
        nextEl.scrollTop = nextEl.scrollHeight - previousScrollHeight + previousScrollTop
      })
    } catch {
      // Keep the current day loaded; the button can be retried.
    } finally {
      setLoadingEarlier(false)
    }
  }

  const handleInputChange = (event) => {
    const nextValue = event.target.value
    if (commandDraft && nextValue !== `/${commandDraft.trigger}`) setCommandDraft(null)
    setInput(nextValue)
    if (nextValue.trim()) {
      if (!typingActiveRef.current) emitTyping(true)
    } else {
      emitTyping(false)
    }
    window.clearTimeout(typingTimerRef.current)
    typingTimerRef.current = window.setTimeout(() => emitTyping(false), TYPING_IDLE_MS)
  }

  const selectCommand = (command) => {
    setCommandDraft(command)
    setInput(`/${command.trigger}`)
    setEmojiOpen(false)
    setDropOpen(false)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const clearCommandDraft = () => {
    setCommandDraft(null)
    setInput('')
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  /* ── text send ── */
  const sendText = () => {
    const text = commandDraft ? String(commandDraft.response || '').trim() : input.trim()
    if (!text || !chat?.id) return
    const clientMessageId = makeClientMessageId('admin-text')
    const replyToMessageId = replyingTo?.dbId || null
    shouldScrollBottomRef.current = true
    setMessages(prev => [...prev, {
      id: clientMessageId,
      clientMessageId,
      type: 'text',
      text,
      sent: true,
      createdAt: new Date(),
      time: messageTime(),
      deliveryState: 'sent',
      senderDisplayName: adminDisplayName(user),
      replyTo: replyingTo ? {
        id: replyingTo.dbId,
        senderType: replyingTo.sent ? 'admin' : 'client',
        messageType: replyingTo.type,
        content: replyingTo.text || '',
        fileName: replyingTo.fileName || '',
      } : null,
    }])
    setInput('')
    setCommandDraft(null)
    setReplyingTo(null)
    setEmojiOpen(false)
    emitTyping(false)
    getSocket('admin').emit('message:send', {
      chatId: chat.id,
      clientMessageId,
      messageType: 'text',
      content: text,
      replyToMessageId,
    }, (ack) => {
      if (!ack?.ok) return
      setMessages(prev => prev.map(msg =>
        msg.id === clientMessageId || msg.clientMessageId === clientMessageId ? mapDbMessage(ack.message) : msg
      ))
    })
  }

  const handleKeyDown = (e) => {
    if (showCommandSuggestions && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setCommandIndex(prev => {
        const direction = e.key === 'ArrowDown' ? 1 : -1
        return (prev + direction + suggestedCommands.length) % suggestedCommands.length
      })
      return
    }
    if (showCommandSuggestions && (e.key === 'Tab' || e.key === 'Enter')) {
      e.preventDefault()
      selectCommand(suggestedCommands[commandIndex] || suggestedCommands[0])
      return
    }
    if ((showCommandSuggestions || commandDraft) && e.key === 'Escape') {
      e.preventDefault()
      setCommandDraft(null)
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendText() }
  }

  const insertEmoji = (emoji) => {
    const el = inputRef.current
    if (!el) { setInput(p => p + emoji); setEmojiOpen(false); return }
    const start = el.selectionStart ?? input.length
    const end   = el.selectionEnd   ?? input.length
    const next  = input.slice(0, start) + emoji + input.slice(end)
    setInput(next)
    setEmojiOpen(false)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + emoji.length, start + emoji.length)
    }, 0)
  }

  /* ── media send ── */
  const handleChatDragEnter = (e) => {
    if (e.dataTransfer?.types?.includes('Files') && !dropOpen) setDropOpen(true)
  }

  const sendMedia = async (type, url, name, file) => {
    if (!chat?.id || !file) return
    setDropOpen(false)
    const sendingId = makeClientMessageId(`admin-${type}`)
    const replyToMessageId = replyingTo?.dbId || null
    shouldScrollBottomRef.current = true
    setMessages(prev => [...prev, { id: sendingId, clientMessageId: sendingId, type: 'sending', mediaType: type, sent: true, createdAt: new Date(), time: messageTime(), deliveryState: 'sent', senderDisplayName: adminDisplayName(user), replyTo: replyingTo }])
    setReplyingTo(null)
    try {
      const dataUrl = await fileToDataUrl(file)
      getSocket('admin').emit('message:send', {
        chatId: chat.id,
        clientMessageId: sendingId,
        messageType: type,
        dataUrl,
        fileName: name,
        replyToMessageId,
      }, (ack) => {
        if (!ack?.ok) return
        setMessages(prev => prev.map(msg =>
          msg.id === sendingId || msg.clientMessageId === sendingId ? mapDbMessage(ack.message) : msg
        ))
      })
    } catch {
      setMessages(prev => prev.map(msg =>
        msg.id === sendingId ? { ...msg, type, mediaUrl: url, fileName: name } : msg
      ))
    }
  }

  /* ── voice recording ── */
  const startRecording = async () => {
    if (isRecording) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunks.current = []
      const preferredMimeType = audioRecorderMimeType()
      const mr = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream)
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunks.current.push(e.data) }
      mr.start(100)
      mediaRecRef.current = mr
      recTimeRef.current = 0
      setRecTime(0)
      setIsRecording(true)
      setEmojiOpen(false)
      setDropOpen(false)
      recTimerRef.current = setInterval(() => {
        recTimeRef.current += 1
        setRecTime(recTimeRef.current)
      }, 1000)
    } catch {
      /* mic access denied – fail silently */
    }
  }

  const stopRecording = (send = true) => {
    clearInterval(recTimerRef.current)
    const dur = recTimeRef.current
    const mr  = mediaRecRef.current
    setIsRecording(false)
    setRecTime(0)
    recTimeRef.current = 0
    if (!mr) return
    mr.onstop = async () => {
      if (send && dur >= 1) {
        const blob = new Blob(audioChunks.current, { type: mr.mimeType || 'audio/webm' })
        const extension = audioExtensionFromMime(blob.type)
        const url  = URL.createObjectURL(blob)
        const time = messageTime()
        const voiceId = makeClientMessageId('admin-audio')
        const replyToMessageId = replyingTo?.dbId || null
        shouldScrollBottomRef.current = true
        setMessages(prev => [...prev, {
          id: voiceId,
          clientMessageId: voiceId,
          type: 'voice',
          audioUrl: url,
          duration: dur,
          sent: true,
          time,
          deliveryState: 'sent',
          senderDisplayName: adminDisplayName(user),
          replyTo: replyingTo ? {
            id: replyingTo.dbId,
            senderType: replyingTo.sent ? 'admin' : 'client',
            messageType: replyingTo.type === 'voice' ? 'audio' : replyingTo.type,
            content: replyingTo.text || '',
            fileName: replyingTo.fileName || '',
          } : null,
        }])
        setReplyingTo(null)
        try {
          const dataUrl = await fileToDataUrl(blob)
          getSocket('admin').emit('message:send', {
            chatId: chat.id,
            clientMessageId: voiceId,
            messageType: 'audio',
            content: String(dur),
            dataUrl,
            fileName: `${voiceId}.${extension}`,
            replyToMessageId,
          }, (ack) => {
            if (!ack?.ok) return
            setMessages(prev => prev.map(msg => {
              if (msg.id !== voiceId && msg.clientMessageId !== voiceId) return msg
              return { ...mapDbMessage(ack.message), duration: dur || msg.duration || 0 }
            }))
          })
        } catch {
          // Keep the local playback if the upload cannot be prepared.
        }
      }
      mr.stream?.getTracks().forEach(t => t.stop())
      mediaRecRef.current = null
    }
    mr.stop()
  }

  const pinCurrentChat = async () => {
    if (!chat?.id) return
    setMenuOpen(false)
    try {
      await api.put(`/api/chats/${chat.id}/pin`)
    } catch (err) {
      alertDialog({ variant: 'error', title: 'Error', message: err?.message || 'No se pudo fijar el chat.' })
    }
  }

  const clearCurrentChat = async () => {
    if (!chat?.id) return
    setMenuOpen(false)
    const ok = await confirm({
      variant: 'danger',
      title: 'Vaciar historial',
      message: `¿Eliminar todos los mensajes de ${chat.username}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Vaciar',
    })
    if (!ok) return
    try {
      await api.delete(`/api/chats/${chat.id}/messages`)
      setMessages([])
    } catch (err) {
      alertDialog({ variant: 'error', title: 'Error', message: err?.message || 'No se pudo vaciar el chat.' })
    }
  }

  const deleteCurrentChat = async () => {
    if (!chat?.id) return
    setMenuOpen(false)
    const ok = await confirm({
      variant: 'danger',
      title: 'Eliminar chat',
      message: `¿Eliminar permanentemente el chat de ${chat.username}? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    try {
      await api.delete(`/api/chats/${chat.id}`)
      onChatDeleted?.()
      onBack?.()
    } catch (err) {
      alertDialog({ variant: 'error', title: 'Error', message: err?.message || 'No se pudo eliminar el chat.' })
    }
  }

  const resetBotForClient = async () => {
    if (!chat?.id) return
    setMenuOpen(false)
    try {
      await api.post(`/api/chats/${chat.id}/bot/reset`)
    } catch (err) {
      alertDialog({ variant: 'error', title: 'Error', message: err?.message || 'No se pudo restablecer el bot.' })
    }
  }

  const archiveCurrentChat = async () => {
    if (!chat?.id) return
    try {
      await api.put(`/api/chats/${chat.id}/archive`, { archived: true })
      setMenuOpen(false)
      onBack?.()
    } catch {
      setMenuOpen(false)
    }
  }

  const completeWithdrawal = async () => {
    if (!chat?.id) return
    const clientMessageId = makeClientMessageId('withdrawal-complete')
    try {
      const result = await api.post(`/api/chats/${chat.id}/withdrawal/complete`, { clientMessageId })
      if (result.message) {
        setMessages(prev => {
          const mapped = mapDbMessage(result.message)
          if (prev.some(item => item.dbId && Number(item.dbId) === Number(mapped.dbId))) return prev
          return [...prev, mapped]
        })
      }
    } catch (error) {
      alertDialog({ variant: 'error', title: 'Error', message: error.message || 'No se pudo marcar el retiro como completado.' })
    } finally {
      setMenuOpen(false)
    }
  }

  const beginReply = (message) => {
    if (!message?.dbId) return
    setReplyingTo(message)
    setMessageMenu(null)
    window.requestAnimationFrame(() => inputRef.current?.focus())
  }

  const pinMessage = (message) => {
    if (!chat?.id || !message?.dbId) return
    const snapshot = pinnedMessageSnapshot(message)
    setPinnedMessage(snapshot)
    try {
      window.localStorage.setItem(pinnedStorageKey(chat.id), JSON.stringify(snapshot))
    } catch {
      // The pinned message still works for this session if storage is unavailable.
    }
    setMessageMenu(null)
  }

  const unpinMessage = () => {
    if (!chat?.id) return
    setPinnedMessage(null)
    try {
      window.localStorage.removeItem(pinnedStorageKey(chat.id))
    } catch {
      // Ignore storage failures; the in-memory state is already cleared.
    }
    setMessageMenu(null)
  }

  const togglePinnedMessage = (message) => {
    if (pinnedMessage?.dbId && Number(pinnedMessage.dbId) === Number(message?.dbId)) {
      unpinMessage()
      return
    }
    pinMessage(message)
  }

  const copyPlainText = async (text) => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(hasRichText(text) ? htmlToPlainText(text) : text)
    } catch {
      const area = document.createElement('textarea')
      area.value = hasRichText(text) ? htmlToPlainText(text) : text
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      document.body.removeChild(area)
    }
  }

  const copyMessageText = async (message) => {
    const text = message?.text || message?.content || replyPreviewText(message)
    await copyPlainText(text)
    setMessageMenu(null)
  }

  const jumpToPinnedMessage = () => {
    if (!currentPinnedMessage?.dbId) return
    const target = listRef.current?.querySelector(`[data-db-id="${currentPinnedMessage.dbId}"]`)
    if (!target) return
    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setPinnedFlashId(currentPinnedMessage.dbId)
    window.setTimeout(() => setPinnedFlashId(null), 1400)
  }

  const openMessageMenu = (event, message) => {
    event.preventDefault()
    if (!message?.dbId) return
    const menuWidth = 150
    const menuHeight = 132
    setMessageMenu({
      message,
      x: Math.min(event.clientX, window.innerWidth - menuWidth - 10),
      y: Math.min(event.clientY, window.innerHeight - menuHeight - 10),
    })
  }

  const handleMessagePointerDown = (event, message) => {
    if (!message?.dbId) return
    if (isInteractiveMessageTarget(event.target)) return
    pointerStartRef.current = { x: event.clientX, y: event.clientY, messageId: message.id }
    event.currentTarget?.setPointerCapture?.(event.pointerId)
  }

  const closeHelpChat = async () => {
    if (!chat?.id) return
    try {
      await api.put(`/api/chats/${chat.id}/help/close`, {})
      setMenuOpen(false)
      onBack?.()
    } catch (error) {
      alertDialog({ variant: 'error', title: 'Error', message: error.message || 'No se pudo cerrar la ayuda.' })
      setMenuOpen(false)
    }
  }

  const handleMessagePointerMove = (event, message) => {
    const start = pointerStartRef.current
    if (!start || start.messageId !== message.id || !message?.dbId) return
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

  const renderReplyQuote = (reply, sent) => {
    if (!reply) return null
    return (
      <ReplyQuote $sent={sent}>
        <ReplyAuthor $sent={sent}>{replyAuthorLabel(reply, sent)}</ReplyAuthor>
        <ReplyText>{replyPreviewText(reply)}</ReplyText>
      </ReplyQuote>
    )
  }

  if (!chat) {
    return (
      <Wrap data-tour="chat-view">
        <EmptyState>
          <ChatBubbleOutlineIcon />
          <p>Selecciona una conversación</p>
        </EmptyState>
      </Wrap>
    )
  }

  return (
    <Wrap onDragEnter={handleChatDragEnter} data-tour="chat-view">
      {dropOpen && (
        <DropUpload onSend={sendMedia} onClose={() => setDropOpen(false)} />
      )}

      {dialogNode}
      {viewerData && createPortal(
        <MediaViewer data={viewerData} onClose={() => setViewerData(null)} />,
        document.body
      )}
      {movementDrawerOpen && createPortal(
        <MovementDrawer chat={chat} onClose={() => { setMovementDrawerOpen(false); fetchPendingCounts() }} />,
        document.body
      )}
      {withdrawalDrawerOpen && createPortal(
        <WithdrawalDrawer chat={chat} onClose={() => { setWithdrawalDrawerOpen(false); fetchPendingCounts() }} />,
        document.body
      )}
      {txHistoryOpen && createPortal(
        <TransactionHistoryDrawer chat={chat} onClose={() => setTxHistoryOpen(false)} />,
        document.body
      )}
      {messageMenu && createPortal(
        <MessageActionMenu ref={messageMenuRef} $x={messageMenu.x} $y={messageMenu.y}>
          <MessageActionItem type="button" onClick={() => beginReply(messageMenu.message)}>
            <ReplyIcon />Responder
          </MessageActionItem>
          <MessageActionItem type="button" onClick={() => togglePinnedMessage(messageMenu.message)}>
            <PushPinOutlinedIcon />
            {pinnedMessage?.dbId && Number(pinnedMessage.dbId) === Number(messageMenu.message.dbId) ? 'Desfijar' : 'Fijar'}
          </MessageActionItem>
          <MessageActionItem type="button" onClick={() => copyMessageText(messageMenu.message)}>
            <ContentCopyIcon />Copiar
          </MessageActionItem>
        </MessageActionMenu>,
        document.body
      )}

      {/* header */}
      <Header data-tour="chat-header">
        <BackBtn onClick={onBack} aria-label="Volver">
          <ArrowBackIosNewIcon />
        </BackBtn>

        <HeaderAvatar>
          {chat.username?.[0]?.toUpperCase() || '?'}
          <OnlineDot $online={chat.online} />
        </HeaderAvatar>

        <HeaderInfo>
          <HeaderName>{chat.username || 'Cliente'}</HeaderName>
          <HeaderStatus $online={chat.online}>
            {chat.online ? 'En línea' : 'Desconectado'}
          </HeaderStatus>
        </HeaderInfo>

        {onOpenClient && (
          <HeaderMenuBtn onClick={onOpenClient} aria-label="Info del cliente">
            <InfoOutlinedIcon />
          </HeaderMenuBtn>
        )}

        <HeaderBtnWrap>
          <HeaderMenuBtn onClick={() => setMovementDrawerOpen(true)} aria-label="Movimientos del cliente">
            <AccountBalanceWalletOutlinedIcon />
          </HeaderMenuBtn>
          {pendingCounts.movements > 0 && <HeaderBtnBadge>{pendingCounts.movements > 9 ? '9+' : pendingCounts.movements}</HeaderBtnBadge>}
        </HeaderBtnWrap>

        <HeaderBtnWrap>
          <HeaderMenuBtn onClick={() => setWithdrawalDrawerOpen(true)} aria-label="Solicitudes de retiro">
            <CurrencyExchangeIcon />
          </HeaderMenuBtn>
          {pendingCounts.withdrawals > 0 && <HeaderBtnBadge>{pendingCounts.withdrawals > 9 ? '9+' : pendingCounts.withdrawals}</HeaderBtnBadge>}
        </HeaderBtnWrap>

        <HeaderBtnWrap>
          <HeaderMenuBtn onClick={() => setTxHistoryOpen(true)} aria-label="Historial de transacciones">
            <ReceiptLongOutlinedIcon />
          </HeaderMenuBtn>
        </HeaderBtnWrap>

        <HeaderMenuWrap ref={menuRef}>
          <HeaderMenuBtn onClick={() => setMenuOpen(p => !p)}>
            <MoreVertIcon />
          </HeaderMenuBtn>
          {menuOpen && (
            <DropdownMenu>
              {chat.isHelpRequest && (
                <DropdownItem onClick={closeHelpChat}>
                  <CloseIcon />Cerrar ayuda temporal
                </DropdownItem>
              )}
              <DropdownItem onClick={resetBotForClient}>
                <RestartAltIcon />Restablecer bot al cliente
              </DropdownItem>
              <DropdownItem onClick={pinCurrentChat}>
                {chat?.isPinned ? <><PushPinIcon />Desfijar chat</> : <><PushPinOutlinedIcon />Fijar chat</>}
              </DropdownItem>
              <DropdownItem onClick={archiveCurrentChat}>
                <ArchiveOutlinedIcon />Archivar conversación
              </DropdownItem>
              <DropdownItem onClick={completeWithdrawal}>
                <CheckIcon />Marcar retiro completado
              </DropdownItem>
              <DropdownItem onClick={() => setMenuOpen(false)}>
                <PersonOffOutlinedIcon />Bloquear usuario
              </DropdownItem>
              <DropdownItem onClick={() => setMenuOpen(false)}>
                <CloseIcon />Cerrar chat
              </DropdownItem>
              {user?.role === 'admin' && (
                <DropdownItem $danger onClick={clearCurrentChat}>
                  <DeleteSweepOutlinedIcon />Vaciar historial
                </DropdownItem>
              )}
              {user?.role === 'admin' && (
                <DropdownItem $danger onClick={deleteCurrentChat}>
                  <DeleteOutlineIcon />Eliminar chat
                </DropdownItem>
              )}
            </DropdownMenu>
          )}
        </HeaderMenuWrap>
      </Header>

      {currentPinnedMessage && (
        <PinnedMessageBar>
          <PinnedMessageMain type="button" onClick={jumpToPinnedMessage}>
            <PinnedMessageIcon><PushPinIcon /></PinnedMessageIcon>
            <PinnedMessageText>
              <PinnedMessageTitle>
                Fijado por soporte · {replyAuthorLabel(currentPinnedMessage, currentPinnedMessage.sent)}
              </PinnedMessageTitle>
              <PinnedMessagePreview>{replyPreviewText(currentPinnedMessage)}</PinnedMessagePreview>
            </PinnedMessageText>
          </PinnedMessageMain>
          <PinnedMessageClose type="button" onClick={unpinMessage} aria-label="Desfijar mensaje">
            <CloseIcon />
          </PinnedMessageClose>
        </PinnedMessageBar>
      )}

      {/* messages */}
      <MessagesArea data-tour="chat-messages">
        <MessagesList ref={listRef} onScroll={handleScroll}>
          {messagePage?.hasPrevious && (
            <LoadEarlierBtn type="button" onClick={loadEarlierMessages} disabled={loadingEarlier}>
              {loadingEarlier ? 'Cargando...' : formatPreviousDayLabel(messagePage.previousDate)}
            </LoadEarlierBtn>
          )}
          {messages.map(msg => (
            <MsgRow
              key={msg.id}
              data-db-id={msg.dbId || undefined}
              $sent={msg.sent}
              $pinnedFlash={pinnedFlashId && Number(pinnedFlashId) === Number(msg.dbId)}
              onContextMenu={event => openMessageMenu(event, msg)}
              onPointerDown={event => handleMessagePointerDown(event, msg)}
              onPointerMove={event => handleMessagePointerMove(event, msg)}
              onPointerUp={event => handleMessagePointerUp(event, msg)}
              onPointerCancel={handleMessagePointerCancel}
              $swipeOffset={swipeReply?.messageId === msg.id ? swipeReply.offset : 0}
            >
              {!msg.sent && <MsgAvatar>{chat.username?.[0]?.toUpperCase() || '?'}</MsgAvatar>}
              <MsgContent $sent={msg.sent}>
                {msg.sent && (
                  <MsgSenderName title={msg.senderDisplayName || adminDisplayName(user)}>
                    {msg.senderDisplayName || adminDisplayName(user)}
                  </MsgSenderName>
                )}
                {msg.type === 'sending' ? (
                  <>
                    {renderReplyQuote(msg.replyTo, msg.sent)}
                    <SendingBubbleWrap><SendingLoader mediaType={msg.mediaType} /></SendingBubbleWrap>
                  </>
                ) : msg.type === 'image' ? (
                  <>
                    {renderReplyQuote(msg.replyTo, msg.sent)}
                    {msg.text && <MsgBubble $sent={msg.sent}>{msg.text}</MsgBubble>}
                    <MediaMsgImg
                      src={msg.mediaUrl} alt={msg.fileName}
                      loading="lazy"
                      onClick={() => setViewerData({ type: 'image', url: msg.mediaUrl, name: msg.fileName })}
                    />
                  </>
                ) : msg.type === 'pdf' ? (
                  <>
                    {renderReplyQuote(msg.replyTo, msg.sent)}
                    {msg.text && <MsgBubble $sent={msg.sent}>{msg.text}</MsgBubble>}
                    <MediaMsgPdf onClick={() => setViewerData({ type: 'pdf', url: msg.mediaUrl, name: msg.fileName })}>
                      <DescriptionIcon /><span>{msg.fileName}</span>
                    </MediaMsgPdf>
                  </>
                ) : msg.type === 'voice' ? (
                  <>
                    {renderReplyQuote(msg.replyTo, msg.sent)}
                    <VoiceMessage audioUrl={msg.audioUrl || msg.mediaUrl} duration={msg.duration} sent={msg.sent} />
                  </>
                ) : (
                  (() => {
                    const formSubmission = !msg.sent ? parseFormSubmission(msg.text) : null
                    if (formSubmission) {
                      return (
                        <FormSubmissionCard>
                          {renderReplyQuote(msg.replyTo, msg.sent)}
                          <FormSubmissionTitle>{formSubmission.title}</FormSubmissionTitle>
                          {formSubmission.rows.map((row, index) => (
                            <FormSubmissionRow key={`${row.label}-${index}`}>
                              <div>
                                <FormSubmissionLabel>{row.label}</FormSubmissionLabel>
                                <FormSubmissionValue>{row.value}</FormSubmissionValue>
                              </div>
                              <FormSubmissionCopy type="button" onClick={() => copyPlainText(row.value)} title="Copiar dato">
                                <ContentCopyIcon />
                              </FormSubmissionCopy>
                            </FormSubmissionRow>
                          ))}
                        </FormSubmissionCard>
                      )
                    }
                    return (
                      <MsgBubble $sent={msg.sent}>
                        {renderReplyQuote(msg.replyTo, msg.sent)}
                        {msg.sent && hasRichText(msg.text)
                          ? <span dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(msg.text) }} />
                          : msg.text
                        }
                      </MsgBubble>
                    )
                  })()
                )}
                <MsgMeta>
                  <MsgTime>{msg.createdAt ? formatTime(msg.createdAt) : msg.time}</MsgTime>
                  {msg.sent && <MsgStatus $state={msg.deliveryState}>{deliveryLabel(msg)}</MsgStatus>}
                </MsgMeta>
              </MsgContent>
            </MsgRow>
          ))}
          {clientTyping && (
            <TypingBubble>
              <TypingDot $delay={0} />
              <TypingDot $delay={140} />
              <TypingDot $delay={280} />
              <TypingText>{chat.username || 'Cliente'} escribiendo</TypingText>
            </TypingBubble>
          )}
          <div ref={bottomRef} />
        </MessagesList>

        {showScroll && (
          <ScrollDownBtn onClick={() => scrollToBottom()}>
            <KeyboardArrowDownIcon />Ir abajo
          </ScrollDownBtn>
        )}
      </MessagesArea>

      {/* bottom area */}
      <BottomArea data-tour="chat-footer">
        {!isRecording && emojiOpen && (
          <EmojiPanel>
            <EmojiCategoryBar>
              {EMOJI_GROUPS.map((g, i) => (
                <EmojiCategoryBtn
                  key={i}
                  type="button"
                  $active={emojiGroup === i}
                  onClick={() => setEmojiGroup(i)}
                >
                  {g.icon}
                </EmojiCategoryBtn>
              ))}
            </EmojiCategoryBar>
            <EmojiGrid>
              {EMOJI_GROUPS[emojiGroup].emojis.map((emoji, i) => (
                <EmojiBtn key={i} type="button" onClick={() => insertEmoji(emoji)}>
                  {emoji}
                </EmojiBtn>
              ))}
            </EmojiGrid>
          </EmojiPanel>
        )}

        {/* ── recording bar ── */}
        {isRecording && (
          <RecordFooter>
            <RecordCancelBtn
              onClick={() => stopRecording(false)}
              aria-label="Cancelar grabación"
            >
              <CloseIcon />
            </RecordCancelBtn>

            <RecordVisual>
              <RecordDot />
              <RecordBarsWrap>
                {Array.from({ length: BAR_COUNT }, (_, i) => (
                  <RecordBar
                    key={i}
                    style={{ '--dur': `${BAR_DURS[i]}ms`, '--del': `${BAR_DELS[i]}ms` }}
                  />
                ))}
              </RecordBarsWrap>
              <RecordTimer>{fmt(recTime)}</RecordTimer>
            </RecordVisual>

            <RecordSendBtn
              onClick={() => stopRecording(true)}
              aria-label="Enviar audio"
            >
              <CheckIcon />
            </RecordSendBtn>
          </RecordFooter>
        )}

        {/* ── normal footer ── */}
        {!isRecording && (
          <>
          {showCommandSuggestions && (
            <CommandSuggestions>
              {suggestedCommands.map((command, index) => (
                <CommandSuggestionBtn
                  key={command.id}
                  type="button"
                  $active={index === commandIndex}
                  onMouseDown={event => { event.preventDefault(); selectCommand(command) }}
                >
                  <BoltIcon />
                  <CommandSuggestionMeta>
                    <CommandSuggestionName>{htmlToPlainText(command.response) || `/${command.trigger}`}</CommandSuggestionName>
                    <CommandSuggestionPreview>{htmlToPlainText(command.response)}</CommandSuggestionPreview>
                  </CommandSuggestionMeta>
                  <CommandSuggestionTrigger>/{command.trigger}</CommandSuggestionTrigger>
                </CommandSuggestionBtn>
              ))}
            </CommandSuggestions>
          )}
          {commandDraft && (
            <CommandPreview>
              <CommandPreviewHead>
                <div>
                  <CommandPreviewKicker>Comando /{commandDraft.trigger}</CommandPreviewKicker>
                  <CommandPreviewTitle>Vista previa del mensaje</CommandPreviewTitle>
                </div>
                <CommandPreviewClose type="button" onClick={clearCommandDraft} aria-label="Cancelar comando">
                  <CloseIcon />
                </CommandPreviewClose>
              </CommandPreviewHead>
              <CommandPreviewBody dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(commandDraft.response) }} />
            </CommandPreview>
          )}
          {replyingTo && (
            <ReplyComposer>
              <ReplyComposerText>
                <ReplyComposerTitle>Respondiendo a {replyingTo.sent ? 'ti' : chat.username || 'cliente'}</ReplyComposerTitle>
                <ReplyComposerBody>{replyPreviewText(replyingTo)}</ReplyComposerBody>
              </ReplyComposerText>
              <ReplyComposerClose type="button" onClick={() => setReplyingTo(null)} aria-label="Cancelar respuesta">
                <CloseIcon />
              </ReplyComposerClose>
            </ReplyComposer>
          )}
          <Footer>
            <FooterBtn
              type="button"
              $active={emojiOpen}
              onClick={() => setEmojiOpen(p => !p)}
              aria-label="Emojis"
            >
              <EmojiEmotionsOutlinedIcon />
            </FooterBtn>

            <FooterInput
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje (o / para usar comandos)"
            />

            <FooterBtn
              type="button"
              $active={dropOpen}
              $rotate={dropOpen}
              onClick={() => { setDropOpen(p => !p); setEmojiOpen(false) }}
              aria-label="Adjuntar archivo"
            >
              <AddIcon />
            </FooterBtn>

            {input.trim() ? (
              <SendBtn type="button" onClick={sendText} aria-label="Enviar">
                <SendIcon />
              </SendBtn>
            ) : (
              <MicBtn type="button" onClick={startRecording} aria-label="Grabar mensaje de voz">
                <MicIcon />
              </MicBtn>
            )}
          </Footer>
          </>
        )}
      </BottomArea>
    </Wrap>
  )
}

export default AdminChatView
