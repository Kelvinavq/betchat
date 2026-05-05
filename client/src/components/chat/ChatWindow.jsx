import { useState, useRef, useEffect } from 'react'
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
import googleIcon from '../../assets/google.svg'
import fingerprintIcon from '../../assets/fingerprint.svg'
import {
  Window, VisualSection, CloseBtn, VisualLogo, AppLabel,
  FormSection, FormTitle, FormHint, FormGroup, InputLabel,
  StyledInput, PasswordWrapper, PasswordInput, PasswordToggle,
  ForgotLink, ActionBtn, OrDivider, SocialRow, SocialBtn, SwitchText,
  ChatViewContainer,
  ChatHeader, ChatHeaderSide, ChatHeaderCenter,
  ChatHeaderBtn,
  HeaderPill, HeaderPillText, HeaderPillBadge,
  MessagesArea, ChatMessages,
  MessageRow, MessageAvatar, MessageContent, MessageBubble, MessageTime,
  ScrollDownBtn,
  BottomArea, AttachPanel, AttachGrid, AttachOption,
  ChatFooter, PlusBtn, ChatInput, SendBtn,
  PreviewOverlay, PreviewTitle, PreviewImg, PreviewPdfCard,
  PreviewActions, PreviewBtn,
  SendingBubbleWrap,
  MediaMsgImg, MediaMsgPdf,
  ViewerOverlay, ViewerContent, ViewerFileName, ViewerImg,
  ViewerEmbed, ViewerActions, ViewerBtn,
} from './ChatWindow.styles'

/* ── login view ── */

const LoginView = ({ onLogin, onRegister }) => {
  const [showPwd, setShowPwd] = useState(false)

  return (
    <>
      <FormTitle align="center">Iniciar sesión</FormTitle>
      <FormHint align="center">Bienvenido de vuelta</FormHint>

      <FormGroup>
        <InputLabel>Nombre de usuario</InputLabel>
        <StyledInput type="text" placeholder="Nombre de usuario" />
      </FormGroup>

      <FormGroup>
        <InputLabel>Contraseña</InputLabel>
        <PasswordWrapper>
          <PasswordInput
            type={showPwd ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <PasswordToggle type="button" onClick={() => setShowPwd(p => !p)}>
            {showPwd ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </PasswordToggle>
        </PasswordWrapper>
      </FormGroup>

      <ForgotLink href="#">¿Olvidaste tu contraseña?</ForgotLink>
      <ActionBtn type="button" onClick={onLogin}>Ingresar</ActionBtn>
      <OrDivider>O</OrDivider>

      <SwitchText>
        ¿No tienes cuenta? <a onClick={onRegister}>Regístrate</a>
      </SwitchText>
    </>
  )
}

/* ── register view ── */

const RegisterView = ({ onRegister, onLogin }) => {
  const [showPwd, setShowPwd] = useState(false)

  return (
    <>
      <FormTitle align="center">Crear cuenta</FormTitle>
      <FormHint align="center">Únete para chatear con soporte</FormHint>

      <FormGroup>
        <InputLabel>Nombre</InputLabel>
        <StyledInput type="text" placeholder="Tu nombre" autoComplete="name" />
      </FormGroup>

      <FormGroup>
        <InputLabel>Contraseña</InputLabel>
        <PasswordWrapper>
          <PasswordInput
            type={showPwd ? 'text' : 'password'}
            placeholder="••••••••"
            autoComplete="new-password"
          />
          <PasswordToggle type="button" onClick={() => setShowPwd(p => !p)}>
            {showPwd ? <VisibilityOffIcon /> : <VisibilityIcon />}
          </PasswordToggle>
        </PasswordWrapper>
      </FormGroup>

      <ActionBtn type="button" onClick={onRegister}>Crear cuenta</ActionBtn>
      <OrDivider>O</OrDivider>

      <SwitchText>
        ¿Ya tienes cuenta? <a onClick={onLogin}>Inicia sesión</a>
      </SwitchText>
    </>
  )
}

/* ── sending loader ── */

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

const INITIAL_MESSAGES = [
  { id: 1, type: 'text', text: '¡Hola! ¿En qué puedo ayudarte hoy?', received: true, time: '12:00', avatar: 'A' },
]

const SEND_DELAY_MS = 10000

const ChatView = ({ onClose, username = 'Juan García' }) => {
  const [input, setInput]             = useState('')
  const [messages, setMessages]       = useState(INITIAL_MESSAGES)
  const [attachOpen, setAttachOpen]   = useState(false)
  const [showScroll, setShowScroll]   = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [viewerData, setViewerData]   = useState(null)

  const messagesRef  = useRef(null)
  const bottomRef    = useRef(null)
  const imageInputRef = useRef(null)
  const pdfInputRef   = useRef(null)

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

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    setMessages(prev => [...prev, { id: Date.now(), type: 'text', text, received: false, time }])
    setInput('')
    setAttachOpen(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleFileSelect = (e, type) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewData({ type, url, name: file.name })
    setAttachOpen(false)
    e.target.value = ''
  }

  const sendMedia = () => {
    if (!previewData) return
    const { type, url, name } = previewData
    setPreviewData(null)

    const sendingId = Date.now()
    const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

    setMessages(prev => [...prev, {
      id: sendingId,
      type: 'sending',
      mediaType: type,
      received: false,
      time,
    }])

    setTimeout(() => {
      setMessages(prev => prev.map(msg =>
        msg.id === sendingId
          ? { ...msg, type, mediaUrl: url, fileName: name }
          : msg
      ))
    }, SEND_DELAY_MS)
  }

  useEffect(() => { scrollToBottom(false) }, [])
  useEffect(() => { scrollToBottom() }, [messages])

  return (
    <ChatViewContainer>

      {/* preview modal — overlays the full chat container */}
      {previewData && (
        <MediaPreviewModal
          data={previewData}
          onClose={() => setPreviewData(null)}
          onSend={sendMedia}
        />
      )}

      {/* viewer lightbox — rendered via portal to escape Window overflow */}
      {viewerData && createPortal(
        <MediaViewer data={viewerData} onClose={() => setViewerData(null)} />,
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
            <HeaderPillBadge>En línea</HeaderPillBadge>
          </HeaderPill>
        </ChatHeaderCenter>

        <ChatHeaderSide $right />
      </ChatHeader>

      {/* messages */}
      <MessagesArea>
        <ChatMessages ref={messagesRef} onScroll={handleScroll}>
          {messages.map(msg => (
            <MessageRow key={msg.id} $received={msg.received}>
              {msg.received && <MessageAvatar>{msg.avatar}</MessageAvatar>}
              <MessageContent $received={msg.received}>
                {msg.type === 'sending' ? (
                  <SendingBubbleWrap>
                    <SendingLoader mediaType={msg.mediaType} />
                  </SendingBubbleWrap>
                ) : msg.type === 'image' ? (
                  <MediaMsgImg
                    src={msg.mediaUrl}
                    alt={msg.fileName}
                    onClick={() => setViewerData({ type: 'image', url: msg.mediaUrl, name: msg.fileName })}
                  />
                ) : msg.type === 'pdf' ? (
                  <MediaMsgPdf
                    onClick={() => setViewerData({ type: 'pdf', url: msg.mediaUrl, name: msg.fileName })}
                  >
                    <DescriptionIcon />
                    <span>{msg.fileName}</span>
                  </MediaMsgPdf>
                ) : (
                  <MessageBubble $received={msg.received}>{msg.text}</MessageBubble>
                )}
                <MessageTime>{msg.time}</MessageTime>
              </MessageContent>
            </MessageRow>
          ))}
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
            onChange={e => setInput(e.target.value)}
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

    </ChatViewContainer>
  )
}

/* ── main window ── */

const ChatWindow = ({ onClose }) => {
  const [view, setView] = useState('login')
  const isChat = view === 'chat'

  return (
    <Window>
      {!isChat && (
        <VisualSection>
          <CloseBtn onClick={onClose} aria-label="Cerrar">
            <CloseIcon />
          </CloseBtn>
          <VisualLogo>
            <ChatOutlinedIcon />
          </VisualLogo>
          <AppLabel>Soporte en vivo</AppLabel>
        </VisualSection>
      )}

      <FormSection $isChat={isChat}>
        {view === 'login' && (
          <LoginView
            onLogin={() => setView('chat')}
            onRegister={() => setView('register')}
          />
        )}
        {view === 'register' && (
          <RegisterView
            onRegister={() => setView('chat')}
            onLogin={() => setView('login')}
          />
        )}
        {view === 'chat' && (
          <ChatView onClose={onClose} username="Juan García" />
        )}
      </FormSection>
    </Window>
  )
}

export default ChatWindow
