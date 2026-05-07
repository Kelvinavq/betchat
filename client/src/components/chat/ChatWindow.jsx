import { useContext, useState, useRef, useEffect } from 'react'
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
import { ChatContext } from '../../context/ChatContext'
import { api } from '../../utils/api'
import {
  Window, VisualSection, CloseBtn, VisualLogo, AppLabel,
  FormSection, FormTitle, FormHint, FormGroup, InputLabel,
  ErrorBanner,
  StyledInput, PasswordWrapper, PasswordInput, PasswordToggle,
  ForgotLink, ActionBtn, OrDivider, SwitchText,
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
  AuthLoadingScreen,
} from './ChatWindow.styles'

/* ── login view ── */

const LoginView = ({ onLogin, onRegister, loading }) => {
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
      <ActionBtn type="submit" disabled={loading}>
        {loading ? 'Ingresando...' : 'Ingresar'}
      </ActionBtn>
      <OrDivider>O</OrDivider>

      <SwitchText>
        ¿No tienes cuenta? <a onClick={onRegister}>Regístrate</a>
      </SwitchText>
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
  const { clientSession, setClientSession, clientAuthLoading, setClientAuthLoading } = useContext(ChatContext)
  const [view, setView] = useState(clientSession ? 'chat' : 'login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const isAuthLoading = loading || clientAuthLoading
  const activeView = clientSession ? 'chat' : view
  const isChat = activeView === 'chat' || isAuthLoading

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
        {isAuthLoading && <ChatAuthLoader />}
        {error && !isChat && <ErrorBanner role="alert">{error}</ErrorBanner>}
        {!isAuthLoading && activeView === 'login' && (
          <LoginView
            onLogin={handleLogin}
            onRegister={() => setView('register')}
            loading={loading}
          />
        )}
        {!isAuthLoading && activeView === 'register' && (
          <RegisterView
            onRegister={handleRegister}
            onLogin={() => setView('login')}
            loading={loading}
          />
        )}
        {!isAuthLoading && activeView === 'chat' && (
          <ChatView onClose={onClose} username="Juan García" />
        )}
      </FormSection>
    </Window>
  )
}

export default ChatWindow
