import { useState, useRef, useEffect } from 'react'
import SearchIcon from '@mui/icons-material/Search'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import FilterListIcon from '@mui/icons-material/FilterList'
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined'
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined'
import MenuIcon from '@mui/icons-material/Menu'
import {
  Wrap, ListHeader, ListTitle, HeaderActions, IconBtn,
  DropdownMenu, DropdownItem,
  SearchWrap, SearchIcon as SearchIconWrap, SearchInput,
  ListScroll, ChatItem, ChatAvatar, OnlineDot, ChatBody,
  ChatRow, ChatUsername, ChatTime, ChatLastMsg,
  TagEl, UnreadBadge, TAG_CONFIG,
  LoadMoreBtn, EmptyState,
} from './ChatList.styles'

const TagChip = ({ tag }) => {
  const cfg = TAG_CONFIG[tag]
  if (!cfg) return null
  return (
    <TagEl style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </TagEl>
  )
}

const PAGE_SIZE = 20

const USERNAMES = [
  'dragon777', 'lucky88', 'tigre_x', 'mega_bet', 'casino_pro',
  'winner99', 'jackpot_k', 'royal_flush', 'bet_master', 'golden_7',
  'fast_win', 'ultra_bet', 'super_slot', 'pro_gamer', 'neon_king',
  'ace_high', 'hot_roll', 'big_play', 'star_bet', 'dark_horse',
  'quick_bet', 'power_play', 'night_owl', 'fire_spin', 'ice_cold',
  'thunder_b', 'crystal_x', 'shadow_77', 'lunar_bet', 'cosmic_spin',
]

const TAGS = ['carga_saldo', 'retiro', 'soporte', 'cuponera']

const LAST_MSGS = [
  '¿Cuándo se acredita el depósito?',
  'Ya realicé la transferencia',
  'El bono no aparece en mi cuenta',
  'Necesito retirar mi saldo',
  '¿Puedo usar el cupón hoy?',
  'No puedo iniciar sesión',
  'Me rechazaron el pago',
  'Gracias por la atención!',
]

const HOLDER_NAMES = ['Ana García', 'Luis Martínez', 'Carlos López', 'María Fernández', 'Pedro Díaz']
const NOTES = [
  'Cliente VIP, atención prioritaria.',
  'Ha realizado varios retiros exitosos.',
  'Primera vez que usa el sistema de retiro.',
  '',
]

const FILE_NAMES_IMG = ['comprobante', 'captura', 'foto_transferencia', 'screenshot']
const FILE_NAMES_PDF = ['contrato', 'estado_cuenta', 'formulario', 'voucher']

const ALL_CHATS = USERNAMES.map((username, i) => ({
  id: i + 1,
  username,
  tag: TAGS[i % 4],
  online: i % 3 !== 2,
  time: `${String(9 + (i % 9)).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}`,
  lastMsg: LAST_MSGS[i % LAST_MSGS.length],
  unread: i % 7 === 0 ? 3 : i % 5 === 0 ? 1 : 0,
  joinDate: `202${4 + (i % 2)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  cuit: `${20 + (i % 10)}-${String(10000000 + i * 1234).slice(0, 8)}-${i % 10}`,
  holderName: HOLDER_NAMES[i % HOLDER_NAMES.length],
  note: NOTES[i % NOTES.length],
  clientTags: i % 4 === 0 ? ['VIP', 'Frecuente'] : i % 4 === 1 ? ['Nuevo'] : i % 4 === 2 ? ['Activo'] : [],
  files: Array.from({ length: 8 }, (_, fi) => ({
    id: fi + 1,
    type: fi % 2 === 0 ? 'image' : 'pdf',
    name: fi % 2 === 0
      ? `${FILE_NAMES_IMG[fi % FILE_NAMES_IMG.length]}_${i + 1}.jpg`
      : `${FILE_NAMES_PDF[fi % FILE_NAMES_PDF.length]}_${i + 1}.pdf`,
    date: `2025-0${(fi % 3) + 1}-${String(fi * 3 + 1).padStart(2, '0')}`,
  })),
}))

const MENU_ITEMS = [
  { id: 'filter',  label: 'Filtrar por estado',  icon: <FilterListIcon />   },
  { id: 'archive', label: 'Archivar todo',        icon: <ArchiveOutlinedIcon /> },
  { id: 'block',   label: 'Bloquear selección',   icon: <BlockOutlinedIcon />   },
]

const ChatList = ({ selectedChat, onSelectChat, $width, $fullWidth, onMenuOpen }) => {
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = ALL_CHATS.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase())
  )
  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  return (
    <Wrap $width={$width} $fullWidth={$fullWidth}>
      <ListHeader>
        {onMenuOpen && (
          <IconBtn onClick={onMenuOpen} aria-label="Abrir menú">
            <MenuIcon />
          </IconBtn>
        )}
        <ListTitle>Chat</ListTitle>
        <HeaderActions ref={menuRef}>
          <IconBtn onClick={() => setMenuOpen(p => !p)} aria-label="Más opciones">
            <MoreVertIcon />
          </IconBtn>
          {menuOpen && (
            <DropdownMenu>
              {MENU_ITEMS.map(item => (
                <DropdownItem key={item.id} onClick={() => setMenuOpen(false)}>
                  {item.icon}
                  {item.label}
                </DropdownItem>
              ))}
            </DropdownMenu>
          )}
        </HeaderActions>
      </ListHeader>

      <SearchWrap>
        <SearchIconWrap>
          <SearchIcon />
        </SearchIconWrap>
        <SearchInput
          placeholder="Buscar usuario..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
      </SearchWrap>

      <ListScroll>
        {visible.length === 0 ? (
          <EmptyState>Sin resultados</EmptyState>
        ) : (
          visible.map(chat => (
            <ChatItem
              key={chat.id}
              $active={selectedChat?.id === chat.id}
              onClick={() => onSelectChat(chat)}
            >
              <ChatAvatar>
                {chat.username[0].toUpperCase()}
                <OnlineDot $online={chat.online} />
              </ChatAvatar>

              <ChatBody>
                <ChatRow>
                  <ChatUsername>{chat.username}</ChatUsername>
                  <ChatTime>{chat.time}</ChatTime>
                </ChatRow>
                <ChatRow>
                  <ChatLastMsg>{chat.lastMsg}</ChatLastMsg>
                  {chat.unread > 0
                    ? <UnreadBadge>{chat.unread}</UnreadBadge>
                    : <TagChip tag={chat.tag} />
                  }
                </ChatRow>
              </ChatBody>
            </ChatItem>
          ))
        )}
      </ListScroll>

      {hasMore && (
        <LoadMoreBtn onClick={() => setPage(p => p + 1)}>
          Cargar más ({filtered.length - visible.length} restantes)
        </LoadMoreBtn>
      )}
    </Wrap>
  )
}

export default ChatList
