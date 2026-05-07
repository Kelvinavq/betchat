import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatOutlined'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import SendIcon from '@mui/icons-material/Send'
import AddIcon from '@mui/icons-material/Add'
import MicIcon from '@mui/icons-material/Mic'
import CheckIcon from '@mui/icons-material/Check'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import PauseIcon from '@mui/icons-material/Pause'
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CloseIcon from '@mui/icons-material/Close'
import DescriptionIcon from '@mui/icons-material/Description'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import PersonOffOutlinedIcon from '@mui/icons-material/BlockOutlined'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import DropUpload from '../../common/DropUpload'
import { api, resolveApiAsset } from '../../../utils/api'
import { getSocket, makeClientMessageId } from '../../../utils/socket'
import {
  Wrap, EmptyState,
  Header, BackBtn, HeaderAvatar, OnlineDot, HeaderInfo, HeaderName, HeaderStatus,
  HeaderMenuWrap, HeaderMenuBtn, DropdownMenu, DropdownItem,
  MessagesArea, MessagesList, MsgRow, MsgAvatar, MsgContent, MsgBubble, MsgMeta, MsgStatus, MsgTime,
  TypingBubble, TypingDot, TypingText,
  ScrollDownBtn, MediaMsgImg, MediaMsgPdf,
  BottomArea,
  EmojiPanel, EmojiCategoryBar, EmojiCategoryBtn, EmojiGrid, EmojiBtn,
  Footer, FooterBtn, FooterInput, SendBtn, MicBtn,
  RecordFooter, RecordCancelBtn, RecordVisual, RecordDot,
  RecordBarsWrap, RecordBar, RecordTimer, RecordSendBtn,
  VoiceBubble, VoicePlayBtn, VoiceWave, VoiceBar, VoiceTime,
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

const messageTime = () => new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
  reader.readAsDataURL(file)
})

const mapDbMessage = (msg) => ({
  id: `db-${msg.id}`,
  dbId: msg.id,
  clientMessageId: msg.clientMessageId || '',
  type: msg.messageType === 'image' ? 'image' : msg.messageType === 'pdf' ? 'pdf' : 'text',
  text: msg.content,
  mediaUrl: resolveApiAsset(msg.fileUrl),
  fileName: msg.fileName,
  sent: msg.senderType !== 'client',
  time: msg.time,
  deliveredAt: msg.deliveredAt || null,
  readAt: msg.readAt || null,
  deliveryState: msg.readAt ? 'read' : msg.deliveredAt ? 'delivered' : 'sent',
})

const deliveryLabel = (msg) => {
  if (!msg.sent) return ''
  if (msg.readAt || msg.deliveryState === 'read') return 'Visto'
  if (msg.deliveredAt || msg.deliveryState === 'delivered') return 'Entregado'
  return 'Enviado'
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
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [total,   setTotal]   = useState(duration ?? 0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    const onPlay  = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => { setPlaying(false); setElapsed(0) }
    const onTime  = () => setElapsed(a.currentTime)
    const onMeta  = () => { if (isFinite(a.duration)) setTotal(a.duration) }
    a.addEventListener('play',            onPlay)
    a.addEventListener('pause',           onPause)
    a.addEventListener('ended',           onEnded)
    a.addEventListener('timeupdate',      onTime)
    a.addEventListener('loadedmetadata',  onMeta)
    return () => {
      a.removeEventListener('play',           onPlay)
      a.removeEventListener('pause',          onPause)
      a.removeEventListener('ended',          onEnded)
      a.removeEventListener('timeupdate',     onTime)
      a.removeEventListener('loadedmetadata', onMeta)
    }
  }, [audioUrl])

  const togglePlay = () => {
    const a = audioRef.current
    if (!a) return
    playing ? a.pause() : a.play()
  }

  const progress = total > 0 ? elapsed / total : 0

  return (
    <VoiceBubble $sent={sent}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <VoicePlayBtn $sent={sent} onClick={togglePlay} aria-label={playing ? 'Pausar' : 'Reproducir'}>
        {playing ? <PauseIcon /> : <PlayArrowIcon />}
      </VoicePlayBtn>
      <VoiceWave>
        {WAVEFORM.map((h, i) => (
          <VoiceBar
            key={i}
            $h={h}
            $active={i / WAVEFORM.length <= progress}
            $sent={sent}
          />
        ))}
      </VoiceWave>
      <VoiceTime $sent={sent}>
        {fmt(playing ? elapsed : total)}
      </VoiceTime>
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
const AdminChatView = ({ chat, onBack, onOpenClient }) => {
  const [input, setInput]           = useState('')
  const [messages, setMessages]     = useState([])
  const [dropOpen, setDropOpen]     = useState(false)
  const [emojiOpen, setEmojiOpen]   = useState(false)
  const [emojiGroup, setEmojiGroup] = useState(0)
  const [showScroll, setShowScroll] = useState(false)
  const [viewerData, setViewerData] = useState(null)
  const [menuOpen, setMenuOpen]     = useState(false)
  const [clientTyping, setClientTyping] = useState(false)

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
  const typingTimerRef = useRef(null)
  const clientTypingTimerRef = useRef(null)
  const typingActiveRef = useRef(false)

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
  useEffect(() => { scrollToBottom() }, [messages])

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
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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
        const data = await api.get(`/api/chats/${chatId}/messages`)
        if (!alive) return
        setMessages((data.messages || []).map(mapDbMessage))
        await api.put(`/api/chats/${chatId}/read`, {})
      } catch {
        if (alive) setMessages([])
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

  const emitTyping = (isTyping) => {
    if (!chat?.id) return
    typingActiveRef.current = isTyping
    getSocket('admin').emit('typing', { chatId: chat.id, isTyping })
  }

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

  /* ── text send ── */
  const sendText = () => {
    const text = input.trim()
    if (!text || !chat?.id) return
    const clientMessageId = makeClientMessageId('admin-text')
    setMessages(prev => [...prev, { id: clientMessageId, clientMessageId, type: 'text', text, sent: true, time: messageTime(), deliveryState: 'sent' }])
    setInput('')
    setEmojiOpen(false)
    emitTyping(false)
    getSocket('admin').emit('message:send', {
      chatId: chat.id,
      clientMessageId,
      messageType: 'text',
      content: text,
    }, (ack) => {
      if (!ack?.ok) return
      setMessages(prev => prev.map(msg =>
        msg.id === clientMessageId || msg.clientMessageId === clientMessageId ? mapDbMessage(ack.message) : msg
      ))
    })
  }

  const handleKeyDown = (e) => {
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
    setMessages(prev => [...prev, { id: sendingId, clientMessageId: sendingId, type: 'sending', mediaType: type, sent: true, time: messageTime(), deliveryState: 'sent' }])
    try {
      const dataUrl = await fileToDataUrl(file)
      getSocket('admin').emit('message:send', {
        chatId: chat.id,
        clientMessageId: sendingId,
        messageType: type,
        dataUrl,
        fileName: name,
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
      const mr = new MediaRecorder(stream)
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
    mr.onstop = () => {
      if (send && dur >= 1) {
        const blob = new Blob(audioChunks.current, { type: 'audio/webm' })
        const url  = URL.createObjectURL(blob)
        const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
        setMessages(prev => [...prev, {
          id: Date.now(), type: 'voice', audioUrl: url, duration: dur, sent: true, time,
        }])
      }
      mr.stream?.getTracks().forEach(t => t.stop())
      mediaRecRef.current = null
    }
    mr.stop()
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

  if (!chat) {
    return (
      <Wrap>
        <EmptyState>
          <ChatBubbleOutlineIcon />
          <p>Selecciona una conversación</p>
        </EmptyState>
      </Wrap>
    )
  }

  return (
    <Wrap onDragEnter={handleChatDragEnter}>
      {dropOpen && (
        <DropUpload onSend={sendMedia} onClose={() => setDropOpen(false)} />
      )}

      {viewerData && createPortal(
        <MediaViewer data={viewerData} onClose={() => setViewerData(null)} />,
        document.body
      )}

      {/* header */}
      <Header>
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

        <HeaderMenuWrap ref={menuRef}>
          <HeaderMenuBtn onClick={() => setMenuOpen(p => !p)}>
            <MoreVertIcon />
          </HeaderMenuBtn>
          {menuOpen && (
            <DropdownMenu>
              <DropdownItem onClick={archiveCurrentChat}>
                <ArchiveOutlinedIcon />Archivar conversación
              </DropdownItem>
              <DropdownItem onClick={() => setMenuOpen(false)}>
                <PersonOffOutlinedIcon />Bloquear usuario
              </DropdownItem>
              <DropdownItem onClick={() => setMenuOpen(false)}>
                <CloseIcon />Cerrar chat
              </DropdownItem>
            </DropdownMenu>
          )}
        </HeaderMenuWrap>
      </Header>

      {/* messages */}
      <MessagesArea>
        <MessagesList ref={listRef} onScroll={handleScroll}>
          {messages.map(msg => (
            <MsgRow key={msg.id} $sent={msg.sent}>
              {!msg.sent && <MsgAvatar>{chat.username?.[0]?.toUpperCase() || '?'}</MsgAvatar>}
              <MsgContent $sent={msg.sent}>
                {msg.type === 'sending' ? (
                  <SendingBubbleWrap><SendingLoader mediaType={msg.mediaType} /></SendingBubbleWrap>
                ) : msg.type === 'image' ? (
                  <MediaMsgImg
                    src={msg.mediaUrl} alt={msg.fileName}
                    onClick={() => setViewerData({ type: 'image', url: msg.mediaUrl, name: msg.fileName })}
                  />
                ) : msg.type === 'pdf' ? (
                  <MediaMsgPdf onClick={() => setViewerData({ type: 'pdf', url: msg.mediaUrl, name: msg.fileName })}>
                    <DescriptionIcon /><span>{msg.fileName}</span>
                  </MediaMsgPdf>
                ) : msg.type === 'voice' ? (
                  <VoiceMessage audioUrl={msg.audioUrl} duration={msg.duration} sent={msg.sent} />
                ) : (
                  <MsgBubble $sent={msg.sent}>{msg.text}</MsgBubble>
                )}
                <MsgMeta>
                  <MsgTime>{msg.time}</MsgTime>
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
      <BottomArea>
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
              placeholder="Escribe un mensaje..."
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
        )}
      </BottomArea>
    </Wrap>
  )
}

export default AdminChatView
