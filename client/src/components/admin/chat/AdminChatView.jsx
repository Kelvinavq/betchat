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
import {
  Wrap, EmptyState,
  Header, BackBtn, HeaderAvatar, OnlineDot, HeaderInfo, HeaderName, HeaderStatus,
  HeaderMenuWrap, HeaderMenuBtn, DropdownMenu, DropdownItem,
  MessagesArea, MessagesList, MsgRow, MsgAvatar, MsgContent, MsgBubble, MsgTime,
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

const SEND_DELAY_MS = 10000

const INITIAL_MSGS = [
  { id: 1, type: 'text', text: '¡Hola! ¿En qué puedo ayudarte?', sent: false, time: '12:00' },
  { id: 2, type: 'text', text: 'Buenas, necesito hacer un retiro', sent: true, time: '12:01' },
  { id: 3, type: 'text', text: 'Claro, te ayudo con eso. ¿Cuál es el monto?', sent: false, time: '12:02' },
]

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
  const [messages, setMessages]     = useState(INITIAL_MSGS)
  const [dropOpen, setDropOpen]     = useState(false)
  const [emojiOpen, setEmojiOpen]   = useState(false)
  const [emojiGroup, setEmojiGroup] = useState(0)
  const [showScroll, setShowScroll] = useState(false)
  const [viewerData, setViewerData] = useState(null)
  const [menuOpen, setMenuOpen]     = useState(false)

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
    if (chat) { setMessages(INITIAL_MSGS); setDropOpen(false) }
  }, [chat?.id])

  /* cleanup on unmount */
  useEffect(() => {
    return () => {
      clearInterval(recTimerRef.current)
      if (mediaRecRef.current?.state === 'recording') {
        mediaRecRef.current.stream?.getTracks().forEach(t => t.stop())
      }
    }
  }, [])

  /* ── text send ── */
  const sendText = () => {
    const text = input.trim()
    if (!text) return
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { id: Date.now(), type: 'text', text, sent: true, time }])
    setInput('')
    setEmojiOpen(false)
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

  const sendMedia = (type, url, name) => {
    setDropOpen(false)
    const sendingId = Date.now()
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { id: sendingId, type: 'sending', mediaType: type, sent: true, time }])
    setTimeout(() => {
      setMessages(prev => prev.map(m =>
        m.id === sendingId ? { ...m, type, mediaUrl: url, fileName: name } : m
      ))
    }, SEND_DELAY_MS)
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
          {chat.username[0].toUpperCase()}
          <OnlineDot $online={chat.online} />
        </HeaderAvatar>

        <HeaderInfo>
          <HeaderName>{chat.username}</HeaderName>
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
              <DropdownItem onClick={() => setMenuOpen(false)}>
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
              {!msg.sent && <MsgAvatar>{chat.username[0].toUpperCase()}</MsgAvatar>}
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
                <MsgTime>{msg.time}</MsgTime>
              </MsgContent>
            </MsgRow>
          ))}
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
              onChange={e => setInput(e.target.value)}
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
