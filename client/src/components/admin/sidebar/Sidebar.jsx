import { useState } from 'react'
import ChatOutlinedIcon from '@mui/icons-material/ChatOutlined'
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined'
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined'
import BoltOutlinedIcon from '@mui/icons-material/BoltOutlined'
import SettingsOutlinedIcon           from '@mui/icons-material/SettingsOutlined'
import AccountBalanceOutlinedIcon    from '@mui/icons-material/AccountBalanceOutlined'
import NotificationsOutlinedIcon     from '@mui/icons-material/NotificationsOutlined'
import VideoLabelOutlinedIcon from '@mui/icons-material/VideoLabelOutlined';
import MenuIcon from '@mui/icons-material/Menu'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import {
  SidebarWrap, SidebarTop, LogoWrap, LogoBadge, LogoText, ToggleBtn,
  NavSection, SectionLabel, NavList, NavItem, NavBtn, NavIcon, NavLabel, NavArrow,
  SubList, SubBtn, NavTooltip,
  SidebarSpacer, SidebarBottom,
  ThemeRow, ThemeIcon, ThemePill, ThemeThumb, ThemeIconBtn,
} from './Sidebar.styles'

const NAV_ITEMS = [
  {
    id: 'chat',
    label: 'Chat',
    icon: <ChatOutlinedIcon />,
    children: [
      { id: 'chat-activos',    label: 'Activos' },
      { id: 'chat-archivados', label: 'Archivados' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: <GroupOutlinedIcon />,
    children: [],
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: <PersonOutlinedIcon />,
    children: [],
  },
  {
    id: 'comandos',
    label: 'Comandos',
    icon: <BoltOutlinedIcon />,
    children: [],
  },
  {
    id: 'notificaciones',
    label: 'Notificaciones',
    icon: <NotificationsOutlinedIcon />,
    children: [],
  },
  {
    id: 'modales',
    label: 'Modales',
    icon: <VideoLabelOutlinedIcon />, // puedes cambiar el icono si querés otro
    children: [],
  },
]

const BOTTOM_ITEMS = [
  {
    id: 'cuentas',
    label: 'Cuentas',
    icon: <AccountBalanceOutlinedIcon />,
    children: [],
  },
  {
    id: 'ajustes',
    label: 'Ajustes',
    icon: <SettingsOutlinedIcon />,
    children: [],
  },
]

const Sidebar = ({ expanded, onToggle, onNavigate, activeSection }) => {
  const [openItems, setOpenItems]   = useState({})
  const [activeItem, setActiveItem] = useState(activeSection ?? 'chat')
  const [darkMode, setDarkMode]     = useState(true)

  const toggleSub = (id) => setOpenItems(p => ({ ...p, [id]: !p[id] }))

  const handleNavClick = (item) => {
    setActiveItem(item.id)
    if (item.children.length && expanded) toggleSub(item.id)
    onNavigate?.(item.id)
  }

  return (
    <SidebarWrap $expanded={expanded}>

      {/* ── header ── */}
      <SidebarTop>
        <LogoWrap $expanded={expanded}>
          <LogoBadge>BC</LogoBadge>
          <LogoText>BetChat</LogoText>
        </LogoWrap>
        <ToggleBtn onClick={onToggle} aria-label="Toggle sidebar">
          <MenuIcon />
        </ToggleBtn>
      </SidebarTop>

      {/* ── navigation ── */}
      <NavSection $first>
        <SectionLabel $visible={expanded}>Navegación</SectionLabel>
      </NavSection>

      <NavList>
        {NAV_ITEMS.map(item => {
          const isActive = activeItem === item.id || item.children.some(c => c.id === activeItem)
          const isOpen   = expanded && openItems[item.id]
          return (
            <NavItem key={item.id}>
              <NavBtn $active={isActive} onClick={() => handleNavClick(item)}>
                <NavIcon>{item.icon}</NavIcon>
                {expanded && <NavLabel $active={isActive}>{item.label}</NavLabel>}
                {expanded && item.children.length > 0 && (
                  <NavArrow $open={isOpen}><ChevronRightIcon /></NavArrow>
                )}
                {!expanded && <NavTooltip>{item.label}</NavTooltip>}
              </NavBtn>

              {item.children.length > 0 && (
                <SubList $open={isOpen}>
                  {item.children.map(child => (
                    <li key={child.id}>
                      <SubBtn
                        $active={activeItem === child.id}
                        onClick={() => setActiveItem(child.id)}
                      >
                        {child.label}
                      </SubBtn>
                    </li>
                  ))}
                </SubList>
              )}
            </NavItem>
          )
        })}
      </NavList>

      <SidebarSpacer />

      {/* ── system section (ajustes) ── */}
      <NavSection>
        <SectionLabel $visible={expanded}>Sistema</SectionLabel>
      </NavSection>

      <NavList>
        {BOTTOM_ITEMS.map(item => {
          const isActive = activeItem === item.id
          return (
            <NavItem key={item.id}>
              <NavBtn $active={isActive} onClick={() => handleNavClick(item)}>
                <NavIcon>{item.icon}</NavIcon>
                {expanded && <NavLabel $active={isActive}>{item.label}</NavLabel>}
                {!expanded && <NavTooltip>{item.label}</NavTooltip>}
              </NavBtn>
            </NavItem>
          )
        })}
      </NavList>

      {/* ── bottom: theme toggle ── */}
      <SidebarBottom>
        {/* expanded: full sun/toggle/moon row */}
        <ThemeRow $expanded={expanded}>
          <ThemeIcon>☀</ThemeIcon>
          <ThemePill $dark={darkMode} onClick={() => setDarkMode(p => !p)} aria-label="Cambiar tema">
            <ThemeThumb $dark={darkMode} />
          </ThemePill>
          <ThemeIcon>☽</ThemeIcon>
        </ThemeRow>

        {/* collapsed: single icon button */}
        <ThemeIconBtn
          $expanded={expanded}
          onClick={() => setDarkMode(p => !p)}
          aria-label="Cambiar tema"
        >
          {darkMode ? '☽' : '☀'}
        </ThemeIconBtn>
      </SidebarBottom>

    </SidebarWrap>
  )
}

export default Sidebar
