import { useContext, useState, useRef, useEffect } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import MarkChatUnreadOutlinedIcon from '@mui/icons-material/MarkChatUnreadOutlined'
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import DeleteSweepOutlinedIcon from '@mui/icons-material/DeleteSweepOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import { AuthContext } from '../../../context/AuthContext'
import { useDateFormat } from '../../../hooks/useDateFormat'
import { useConfirm } from '../../common/ConfirmDialog'
import { api } from '../../../utils/api'
import { getSocket } from '../../../utils/socket'
import {
  Wrap, ListHeader, ListTitle, HeaderActions, IconBtn,
  DropdownMenu, DropdownItem, DropdownSection, DropdownLabel, LabelFilterBtn, LabelFilterDot,
  QuickMenu, QuickMenuItem,
  SearchWrap, SearchIcon as SearchIconWrap, SearchInput,
  ProcessChip, ProcessDot, ProcessFilters, FilterToggleRow, FilterActiveChip,
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
  { id: 'archive', label: 'Ver archivados',      icon: <ArchiveOutlinedIcon /> },
  { id: 'block',   label: 'Bloquear seleccion',  icon: <BlockOutlinedIcon /> },
]

const lastPreview = (chat) => {
  if (!chat.lastMsg) return 'Sin mensajes'
  if (chat.lastMessageType === 'image') return `Imagen: ${chat.lastMsg}`
  if (chat.lastMessageType === 'pdf') return `PDF: ${chat.lastMsg}`
  if (chat.lastMessageType === 'audio') return 'Audio'
  return chat.lastMsg
}

const HELP_REASON_LABELS = {
  forgot_user: 'Ayuda: usuario',
  forgot_password: 'Ayuda: contraseña',
  register: 'Ayuda: registro',
  other: 'Ayuda',
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
  const { formatTime } = useDateFormat()
  const { confirm, alert: alertDialog, dialogNode } = useConfirm()
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [archived, setArchived] = useState(false)
  const [activeProcess, setActiveProcess] = useState('all')
  const [processOptions, setProcessOptions] = useState([])
  const [activeLabel, setActiveLabel] = useState('all')
  const [labelOptions, setLabelOptions] = useState([])
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
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
        const labelParam = activeLabel === 'all' ? '' : `&labelId=${encodeURIComponent(activeLabel)}`
        const data = await api.get(`/api/chats?archived=${archived ? 'true' : 'false'}&search=${encodeURIComponent(search)}&page=1&limit=${CHAT_PAGE_SIZE}${labelParam}`)
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
  }, [archived, search, activeLabel])

  const loadMoreChats = async () => {
    if (loading || loadingMore || !pagination.hasMore) return
    const nextPage = page + 1
    setLoadingMore(true)
    try {
      const labelParam = activeLabel === 'all' ? '' : `&labelId=${encodeURIComponent(activeLabel)}`
      const data = await api.get(`/api/chats?archived=${archived ? 'true' : 'false'}&search=${encodeURIComponent(search)}&page=${nextPage}&limit=${CHAT_PAGE_SIZE}${labelParam}`)
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
    let alive = true
    const loadLabels = async () => {
      try {
        const data = await api.get('/api/chats/labels')
        if (alive) setLabelOptions(data.labels || [])
      } catch {
        if (alive) setLabelOptions([])
      }
    }
    loadLabels()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const socket = getSocket('admin')
    const onChatUpdated = (chat) => {
      setChats(prev => {
        const belongs = Boolean(chat.isArchived) === archived
          && (activeLabel === 'all' || (chat.clientTags || []).some(label => Number(label.id) === Number(activeLabel)))
        const without = prev.filter(item => item.id !== chat.id)
        if (!belongs) return without
        return sortChats([chat, ...without])
      })
    }
    const onChatDeleted = ({ chatId }) => {
      setChats(prev => prev.filter(item => item.id !== chatId))
      if (selectedChat?.id === chatId) onSelectChat(null)
    }
    socket.on('chat:updated', onChatUpdated)
    socket.on('chat:deleted', onChatDeleted)
    return () => {
      socket.off('chat:updated', onChatUpdated)
      socket.off('chat:deleted', onChatDeleted)
    }
  }, [archived, activeLabel, selectedChat, onSelectChat])

  const unreadCount = chats.filter(chat => chat.unread > 0).length

  const visibleChats = (activeProcess === 'all'
    ? chats
    : chats.filter(chat => chat.botLastButtonId === activeProcess)
  ).filter(chat => !showUnreadOnly || chat.unread > 0)
  const processById = new Map(processOptions.map(option => [option.id, option]))

  const openQuickMenu = (event, chat) => {
    event.preventDefault()
    const menuWidth = 210
    const menuHeight = 156
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 10)
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 10)
    setQuickMenu({ chat, x: Math.max(10, x), y: Math.max(10, y) })
  }

  const sortChats = (list) =>
    [...list].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return new Date(b.lastMessageAt || b.createdAt || 0) - new Date(a.lastMessageAt || a.createdAt || 0)
    })

  const updateChatLocal = (chat) => {
    setChats(prev => {
      const belongs = Boolean(chat.isArchived) === archived
      const without = prev.filter(item => item.id !== chat.id)
      if (!belongs) return without
      return sortChats([chat, ...without])
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
      if (action === 'pin') {
        const data = await api.put(`/api/chats/${chat.id}/pin`)
        if (data.chat) updateChatLocal(data.chat)
      }
      if (action === 'clear') {
        const ok = await confirm({
          variant: 'danger',
          title: 'Vaciar historial',
          message: `¿Eliminar todos los mensajes de ${chat.username}? Esta acción no se puede deshacer.`,
          confirmLabel: 'Vaciar',
        })
        if (!ok) return
        const data = await api.delete(`/api/chats/${chat.id}/messages`)
        if (data.chat) updateChatLocal(data.chat)
      }
      if (action === 'delete') {
        const ok = await confirm({
          variant: 'danger',
          title: 'Eliminar chat',
          message: `¿Eliminar permanentemente el chat de ${chat.username}? Esta acción no se puede deshacer.`,
          confirmLabel: 'Eliminar',
        })
        if (!ok) return
        await api.delete(`/api/chats/${chat.id}`)
        setChats(prev => prev.filter(item => item.id !== chat.id))
        if (selectedChat?.id === chat.id) onSelectChat(null)
      }
    } catch (err) {
      alertDialog({ variant: 'error', title: 'Error', message: err?.message || 'No se pudo completar la acción.' })
    }
  }

  return (
    <Wrap $width={$width} $fullWidth={$fullWidth}>
      {dialogNode}
      <ListHeader>
        {onMenuOpen && (
          <IconBtn onClick={onMenuOpen} aria-label="Abrir menu">
            <MenuIcon />
          </IconBtn>
        )}
        <ListTitle>{archived ? 'Archivados' : 'Chats'}</ListTitle>
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
              <DropdownSection>
                <DropdownLabel>Filtrar por etiqueta</DropdownLabel>
                <LabelFilterBtn
                  type="button"
                  $active={activeLabel === 'all'}
                  $color="#60a5fa"
                  onClick={() => { setActiveLabel('all'); setMenuOpen(false) }}
                >
                  <LabelFilterDot $color="#60a5fa" />
                  Todas las etiquetas
                </LabelFilterBtn>
                {labelOptions.length === 0 ? (
                  <LabelFilterBtn type="button" disabled>Sin etiquetas</LabelFilterBtn>
                ) : labelOptions.map(label => (
                  <LabelFilterBtn
                    key={label.id}
                    type="button"
                    $active={Number(activeLabel) === Number(label.id)}
                    $color={label.color || '#60a5fa'}
                    onClick={() => { setActiveLabel(String(label.id)); setMenuOpen(false) }}
                  >
                    <LabelFilterDot $color={label.color || '#60a5fa'} />
                    {label.name}
                  </LabelFilterBtn>
                ))}
              </DropdownSection>
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

      <FilterToggleRow
        type="button"
        $open={filtersOpen}
        onClick={() => setFiltersOpen(p => !p)}
      >
        <TuneOutlinedIcon />
        <span>Filtros</span>
        {(showUnreadOnly || activeProcess !== 'all' || activeLabel !== 'all') && (
          <FilterActiveChip>
            {[
              showUnreadOnly && 'No leídos',
              activeProcess !== 'all' && processOptions.find(o => o.id === activeProcess)?.label,
              activeLabel !== 'all' && labelOptions.find(l => String(l.id) === activeLabel)?.name,
            ].filter(Boolean).join(' · ')}
          </FilterActiveChip>
        )}
        <ExpandMoreIcon style={{ marginLeft: 'auto', transition: 'transform 0.2s', transform: filtersOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
      </FilterToggleRow>

      {filtersOpen && (
        <ProcessFilters aria-label="Filtrar por proceso">
          <ProcessChip
            type="button"
            $active={showUnreadOnly}
            $bg="rgba(239,68,68,0.14)"
            $color="#f87171"
            onClick={() => setShowUnreadOnly(p => !p)}
          >
            <ProcessDot $color="#f87171" />
            No leídos
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 5,
                background: showUnreadOnly ? 'rgba(255,255,255,0.22)' : '#ef4444',
                color: '#fff',
                fontSize: 10,
                fontWeight: 700,
                borderRadius: 8,
                padding: '1px 5px',
                lineHeight: '14px',
              }}>
                {unreadCount}
              </span>
            )}
          </ProcessChip>
          {processOptions.length > 0 && (
            <>
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
            </>
          )}
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
                  <ChatUsername>
                    {chat.isPinned && <PushPinIcon style={{ fontSize: 12, opacity: 0.6, marginRight: 4, verticalAlign: 'middle', transform: 'rotate(45deg)' }} />}
                    {chat.username}
                  </ChatUsername>
                  {chat.isHelpRequest ? (
                    <TagEl style={{ background: 'rgba(250,204,21,0.12)', color: '#facc15', border: '1px solid rgba(250,204,21,0.30)' }}>
                      {HELP_REASON_LABELS[chat.helpReason] || 'Ayuda'}
                    </TagEl>
                  ) : chat.assignedUserId ? (
                    <AssignedPill $own={isAssignedToMe}>
                      {isAssignedToMe ? 'Atendido por mi' : `Atendiendo ${chat.assignedUsername}`}
                    </AssignedPill>
                  ) : (
                    <ChatTime>{chat.lastMessageAt ? formatTime(chat.lastMessageAt) : chat.time}</ChatTime>
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
          <QuickMenuItem type="button" onClick={() => onSelectChat(quickMenu.chat)}>
            <MarkChatUnreadOutlinedIcon /> Abrir chat
          </QuickMenuItem>
          <QuickMenuItem type="button" onClick={() => runQuickAction('read')}>
            <DoneAllIcon /> Marcar como leído
          </QuickMenuItem>
          <QuickMenuItem type="button" onClick={() => runQuickAction('pin')}>
            {quickMenu.chat.isPinned
              ? <><PushPinIcon /> Desfijar chat</>
              : <><PushPinOutlinedIcon /> Fijar chat</>
            }
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
          {user?.role === 'admin' && (
            <QuickMenuItem type="button" $danger onClick={() => runQuickAction('clear')}>
              <DeleteSweepOutlinedIcon /> Vaciar historial
            </QuickMenuItem>
          )}
          {user?.role === 'admin' && (
            <QuickMenuItem type="button" $danger onClick={() => runQuickAction('delete')}>
              <DeleteOutlineIcon /> Eliminar chat
            </QuickMenuItem>
          )}
        </QuickMenu>
      )}
    </Wrap>
  )
}

export default ChatList
