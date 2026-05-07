import { useContext, useState, useRef, useEffect } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import FilterListIcon from '@mui/icons-material/FilterList'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import MarkChatUnreadOutlinedIcon from '@mui/icons-material/MarkChatUnreadOutlined'
import { AuthContext } from '../../../context/AuthContext'
import { api } from '../../../utils/api'
import { getSocket } from '../../../utils/socket'
import {
  Wrap, ListHeader, ListTitle, HeaderActions, IconBtn,
  DropdownMenu, DropdownItem, QuickMenu, QuickMenuItem,
  SearchWrap, SearchIcon as SearchIconWrap, SearchInput,
  ProcessChip, ProcessDot, ProcessFilters,
  ListScroll, ChatItem, ChatAvatar, OnlineDot, ChatBody,
  AssignedPill, ChatRow, ChatUsername, ChatTime, ChatLastMsg,
  TagEl, UnreadBadge, TAG_CONFIG,
  LoadMoreBtn, EmptyState,
} from './ChatList.styles'

const CHAT_PAGE_SIZE = 50

const TagChip = ({ archived }) => {
  if (!archived) return null
  const cfg = TAG_CONFIG.soporte
  return <TagEl style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>Archivado</TagEl>
}

const MENU_ITEMS = [
  { id: 'filter',  label: 'Filtrar por estado',  icon: <FilterListIcon /> },
  { id: 'archive', label: 'Ver archivados',      icon: <ArchiveOutlinedIcon /> },
  { id: 'block',   label: 'Bloquear seleccion',  icon: <BlockOutlinedIcon /> },
]

const lastPreview = (chat) => {
  if (!chat.lastMsg) return 'Sin mensajes'
  if (chat.lastMessageType === 'image') return `Imagen: ${chat.lastMsg}`
  if (chat.lastMessageType === 'pdf') return `PDF: ${chat.lastMsg}`
  return chat.lastMsg
}

const PROCESS_PALETTE = [
  { bg: 'rgba(245,158,11,0.14)', color: '#f59e0b' },
  { bg: 'rgba(34,197,94,0.14)', color: '#22c55e' },
  { bg: 'rgba(59,130,246,0.14)', color: '#60a5fa' },
  { bg: 'rgba(236,72,153,0.14)', color: '#f472b6' },
  { bg: 'rgba(139,92,246,0.14)', color: '#a78bfa' },
]

const normalizeLabel = (value) => String(value || '').replace(/^[^\p{L}\p{N}]+/u, '').trim()

const ChatList = ({ selectedChat, onSelectChat, $width, $fullWidth, onMenuOpen }) => {
  const { user } = useContext(AuthContext) || {}
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [archived, setArchived] = useState(false)
  const [activeProcess, setActiveProcess] = useState('all')
  const [processOptions, setProcessOptions] = useState([])
  const [quickMenu, setQuickMenu] = useState(null)
  const [chats, setChats] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: CHAT_PAGE_SIZE,
    total: 0,
    totalPages: 1,
    hasMore: false,
  })
  const menuRef = useRef(null)
  const quickMenuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
      if (quickMenuRef.current && !quickMenuRef.current.contains(e.target)) setQuickMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = () => setQuickMenu(null)
    window.addEventListener('scroll', handler, true)
    window.addEventListener('resize', handler)
    return () => {
      window.removeEventListener('scroll', handler, true)
      window.removeEventListener('resize', handler)
    }
  }, [])

  useEffect(() => {
    let alive = true
    const loadChats = async () => {
      setPage(1)
      setLoading(true)
      try {
        const data = await api.get(`/api/chats?archived=${archived ? 'true' : 'false'}&search=${encodeURIComponent(search)}&page=1&limit=${CHAT_PAGE_SIZE}`)
        if (!alive) return
        setChats(data.chats || [])
        setPagination(data.pagination || {
          page: 1,
          limit: CHAT_PAGE_SIZE,
          total: data.chats?.length || 0,
          totalPages: 1,
          hasMore: false,
        })
      } catch {
        if (alive) {
          setChats([])
          setPagination({
            page: 1,
            limit: CHAT_PAGE_SIZE,
            total: 0,
            totalPages: 1,
            hasMore: false,
          })
        }
      } finally {
        if (alive) setLoading(false)
      }
    }
    const t = setTimeout(loadChats, 160)
    return () => { alive = false; clearTimeout(t) }
  }, [archived, search])

  const loadMoreChats = async () => {
    if (loading || loadingMore || !pagination.hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const data = await api.get(`/api/chats?archived=${archived ? 'true' : 'false'}&search=${encodeURIComponent(search)}&page=${nextPage}&limit=${CHAT_PAGE_SIZE}`)
      const nextChats = data.chats || []
      setChats(prev => {
        const seen = new Set(prev.map(chat => chat.id))
        return [...prev, ...nextChats.filter(chat => !seen.has(chat.id))]
      })
      setPage(data.pagination?.page || nextPage)
      setPagination(data.pagination || {
        page: nextPage,
        limit: CHAT_PAGE_SIZE,
        total: chats.length + nextChats.length,
        totalPages: nextPage,
        hasMore: nextChats.length === CHAT_PAGE_SIZE,
      })
    } catch {
      // Keep the current page visible; the user can retry with the same button.
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    let alive = true
    const loadFlow = async () => {
      try {
        const data = await api.get('/api/bot-builder')
        const buttons = (data.flow?.screens || [])
          .flatMap(screen => screen.items || [])
          .filter(item => item.type === 'button' && item.label && !item.isBack)

        const unique = []
        const seen = new Set()
        for (const button of buttons) {
          if (seen.has(button.id)) continue
          seen.add(button.id)
          const color = PROCESS_PALETTE[unique.length % PROCESS_PALETTE.length]
          unique.push({
            id: button.id,
            label: normalizeLabel(button.label),
            ...color,
          })
        }
        if (alive) setProcessOptions(unique)
      } catch {
        if (alive) setProcessOptions([])
      }
    }
    loadFlow()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const socket = getSocket('admin')
    const onChatUpdated = (chat) => {
      setChats(prev => {
        const belongs = Boolean(chat.isArchived) === archived
        const without = prev.filter(item => item.id !== chat.id)
        if (!belongs) return without
        return [chat, ...without].sort((a, b) => new Date(b.lastMessageAt || b.createdAt || 0) - new Date(a.lastMessageAt || a.createdAt || 0))
      })
    }
    socket.on('chat:updated', onChatUpdated)
    return () => socket.off('chat:updated', onChatUpdated)
  }, [archived])

  const visibleChats = activeProcess === 'all'
    ? chats
    : chats.filter(chat => chat.botLastButtonId === activeProcess)
  const processById = new Map(processOptions.map(option => [option.id, option]))

  const openQuickMenu = (event, chat) => {
    event.preventDefault()
    const menuWidth = 210
    const menuHeight = 156
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 10)
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 10)
    setQuickMenu({ chat, x: Math.max(10, x), y: Math.max(10, y) })
  }

  const updateChatLocal = (chat) => {
    setChats(prev => {
      const belongs = Boolean(chat.isArchived) === archived
      const without = prev.filter(item => item.id !== chat.id)
      if (!belongs) return without
      return [chat, ...without].sort((a, b) => new Date(b.lastMessageAt || b.createdAt || 0) - new Date(a.lastMessageAt || a.createdAt || 0))
    })
  }

  const runQuickAction = async (action) => {
    const chat = quickMenu?.chat
    if (!chat) return
    setQuickMenu(null)
    try {
      if (action === 'read') {
        const data = await api.put(`/api/chats/${chat.id}/read`, {})
        if (data.chat) updateChatLocal(data.chat)
      }
      if (action === 'archive') {
        const data = await api.put(`/api/chats/${chat.id}/archive`, { archived: true })
        if (data.chat) updateChatLocal(data.chat)
      }
      if (action === 'unarchive') {
        const data = await api.put(`/api/chats/${chat.id}/archive`, { archived: false })
        if (data.chat) updateChatLocal(data.chat)
      }
    } catch {
      // Socket updates or the next refresh will reconcile the list.
    }
  }

  return (
    <Wrap $width={$width} $fullWidth={$fullWidth}>
      <ListHeader>
        {onMenuOpen && (
          <IconBtn onClick={onMenuOpen} aria-label="Abrir menu">
            <MenuIcon />
          </IconBtn>
        )}
        <ListTitle>{archived ? 'Archivados' : 'Chat'}</ListTitle>
        <HeaderActions ref={menuRef}>
          <IconBtn onClick={() => setMenuOpen(p => !p)} aria-label="Mas opciones">
            <MoreVertIcon />
          </IconBtn>
          {menuOpen && (
            <DropdownMenu>
              {MENU_ITEMS.map(item => (
                <DropdownItem
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'archive') setArchived(p => !p)
                    setMenuOpen(false)
                  }}
                >
                  {item.icon}
                  {item.id === 'archive' ? (archived ? 'Ver activos' : item.label) : item.label}
                </DropdownItem>
              ))}
            </DropdownMenu>
          )}
        </HeaderActions>
      </ListHeader>

      <SearchWrap>
        <SearchIconWrap><SearchIcon /></SearchIconWrap>
        <SearchInput
          placeholder="Buscar usuario..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </SearchWrap>

      {processOptions.length > 0 && (
        <ProcessFilters aria-label="Filtrar por proceso">
          <ProcessChip
            type="button"
            $active={activeProcess === 'all'}
            $bg="rgba(30,133,255,0.16)"
            $color="#60a5fa"
            onClick={() => setActiveProcess('all')}
          >
            <ProcessDot $color="#60a5fa" />
            Todos
          </ProcessChip>
          {processOptions.map(option => (
            <ProcessChip
              key={option.id}
              type="button"
              $active={activeProcess === option.id}
              $bg={option.bg}
              $color={option.color}
              onClick={() => setActiveProcess(option.id)}
            >
              <ProcessDot $color={option.color} />
              {option.label}
            </ProcessChip>
          ))}
        </ProcessFilters>
      )}

      <ListScroll>
        {visibleChats.length === 0 ? (
          <EmptyState>{loading ? 'Cargando chats...' : 'Sin resultados'}</EmptyState>
        ) : (
          visibleChats.map(chat => {
            const process = processById.get(chat.botLastButtonId)
            const isAssignedToMe = chat.assignedUserId && Number(chat.assignedUserId) === Number(user?.id)
            return (
            <ChatItem
              key={chat.id}
              $active={selectedChat?.id === chat.id}
              onClick={() => onSelectChat(chat)}
              onDoubleClick={event => openQuickMenu(event, chat)}
              onContextMenu={event => openQuickMenu(event, chat)}
            >
              <ChatAvatar>
                {chat.username?.[0]?.toUpperCase() || '?'}
                <OnlineDot $online={chat.online} />
              </ChatAvatar>

              <ChatBody>
                <ChatRow>
                  <ChatUsername>{chat.username}</ChatUsername>
                  {chat.assignedUserId ? (
                    <AssignedPill $own={isAssignedToMe}>
                      {isAssignedToMe ? 'Atendido por mi' : `Atiende ${chat.assignedFullName || chat.assignedUsername}`}
                    </AssignedPill>
                  ) : (
                    <ChatTime>{chat.time}</ChatTime>
                  )}
                </ChatRow>
                <ChatRow>
                  <ChatLastMsg>{lastPreview(chat)}</ChatLastMsg>
                  {chat.unread > 0
                    ? <UnreadBadge>{chat.unread}</UnreadBadge>
                    : process
                      ? <TagEl style={{ background: process.bg, color: process.color, border: `1px solid ${process.color}44` }}>{process.label}</TagEl>
                      : <TagChip archived={chat.isArchived} />
                  }
                </ChatRow>
              </ChatBody>
            </ChatItem>
            )
          })
        )}
        {pagination.hasMore && (
          <LoadMoreBtn type="button" onClick={loadMoreChats} disabled={loadingMore}>
            {loadingMore ? 'Cargando...' : 'Cargar mas'}
          </LoadMoreBtn>
        )}
      </ListScroll>

      {quickMenu && (
        <QuickMenu ref={quickMenuRef} $x={quickMenu.x} $y={quickMenu.y}>
          <QuickMenuItem type="button" onClick={() => runQuickAction('read')}>
            <DoneAllIcon /> Marcar como leido
          </QuickMenuItem>
          {quickMenu.chat.isArchived ? (
            <QuickMenuItem type="button" onClick={() => runQuickAction('unarchive')}>
              <UnarchiveOutlinedIcon /> Desarchivar
            </QuickMenuItem>
          ) : (
            <QuickMenuItem type="button" onClick={() => runQuickAction('archive')}>
              <ArchiveOutlinedIcon /> Archivar
            </QuickMenuItem>
          )}
          <QuickMenuItem type="button" onClick={() => onSelectChat(quickMenu.chat)}>
            <MarkChatUnreadOutlinedIcon /> Abrir chat
          </QuickMenuItem>
        </QuickMenu>
      )}
    </Wrap>
  )
}

export default ChatList
