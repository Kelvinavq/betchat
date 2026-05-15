import { useState } from 'react'
import ChatOutlinedIcon                  from '@mui/icons-material/ChatOutlined'
import GroupOutlinedIcon                 from '@mui/icons-material/GroupOutlined'
import PersonOutlinedIcon                from '@mui/icons-material/PersonOutlined'
import BoltOutlinedIcon                  from '@mui/icons-material/BoltOutlined'
import SettingsOutlinedIcon              from '@mui/icons-material/SettingsOutlined'
import AccountBalanceOutlinedIcon        from '@mui/icons-material/AccountBalanceOutlined'
import NotificationsOutlinedIcon         from '@mui/icons-material/NotificationsOutlined'
import VideoLabelOutlinedIcon            from '@mui/icons-material/VideoLabelOutlined'
import SmartToyOutlinedIcon              from '@mui/icons-material/SmartToyOutlined'
import BarChartOutlinedIcon              from '@mui/icons-material/BarChartOutlined'
import AccountBalanceWalletOutlinedIcon  from '@mui/icons-material/AccountBalanceWalletOutlined'
import SportsEsportsOutlinedIcon         from '@mui/icons-material/SportsEsportsOutlined'
import MenuIcon                          from '@mui/icons-material/Menu'
import ChevronRightIcon                  from '@mui/icons-material/ChevronRight'
import LogoutOutlinedIcon                from '@mui/icons-material/LogoutOutlined'
import useAuth                           from '../../../hooks/useAuth'
import { useSystemConfig }               from '../../../context/SystemConfigContext'
import { canViewSection }                from '../../../utils/adminPermissions'
import {
  SidebarWrap, SidebarTop, LogoWrap, LogoBadge, LogoText, ToggleBtn,
  NavSection, SectionLabel, NavList, NavItem, NavBtn, NavIcon, NavLabel, NavArrow,
  SubList, SubBtn, NavTooltip,
  NavScrollArea, SidebarSpacer, SidebarBottom,
  UserRow, UserAvatarWrap, UserMeta, UserName, UserRole, LogoutBtn, LogoutIconBtn,
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
    icon: <VideoLabelOutlinedIcon />,
    children: [],
  },
  {
    id: 'bot',
    label: 'Bot',
    icon: <SmartToyOutlinedIcon />,
    children: [],
  },
  {
    id: 'events',
    label: 'Eventos',
    icon: <SportsEsportsOutlinedIcon />,
    children: [
      { id: 'games', label: 'Juegos' },
      { id: 'agenda', label: 'Agenda' },
      { id: 'stats', label: 'Estadísticas' },
      { id: 'rewards', label: 'Premios' },
    ],
  },
  {
    id: 'metricas',
    label: 'Métricas',
    icon: <BarChartOutlinedIcon />,
    children: [],
  },
  {
    id: 'retiros',
    label: 'Retiros',
    icon: <AccountBalanceWalletOutlinedIcon />,
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

const ROLE_LABELS = {
  admin:    'Administrador',
  manager:  'Gerente',
  support:  'Soporte',
  operator: 'Operador',
}

const Sidebar = ({ expanded, onToggle, onNavigate, activeSection, activeSubsection }) => {
  const { user, logout }     = useAuth()
  const { systemConfig }     = useSystemConfig()
  const [openItems, setOpenItems] = useState({})
  const [loggingOut, setLoggingOut] = useState(false)
  const activeItem = activeSection ?? 'chat'

  const toggleSub = (id) => setOpenItems(p => ({ ...p, [id]: !p[id] }))

  const handleNavClick = (item, child = null) => {
    if (item.children.length && expanded && !child) {
      toggleSub(item.id)
      onNavigate?.(item.id)
      return
    }
    if (child) {
      onNavigate?.(item.id === 'events' ? `events-${child.id}` : child.id)
      return
    }
    onNavigate?.(item.id)
  }

  const handleLogout = async () => {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  const navItems    = NAV_ITEMS.filter(item => canViewSection(user, item.id))
  const bottomItems = BOTTOM_ITEMS.filter(item => canViewSection(user, item.id))
  const logoInitials = systemConfig.appName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'BC'
  const userInitials = (user?.username || user?.name || 'U').slice(0, 2).toUpperCase()
  const roleLabel    = ROLE_LABELS[user?.role] || 'Operador'

  return (
    <SidebarWrap $expanded={expanded}>

      {/* ── header ── */}
      <SidebarTop>
        <LogoWrap $expanded={expanded}>
          <LogoBadge>{systemConfig.logoUrl ? <img src={systemConfig.logoUrl} alt="" /> : logoInitials}</LogoBadge>
          <LogoText>{systemConfig.appName}</LogoText>
        </LogoWrap>
        <ToggleBtn onClick={onToggle} aria-label="Toggle sidebar">
          <MenuIcon />
        </ToggleBtn>
      </SidebarTop>

      {/* ── navigation (scrollable) ── */}
      <NavScrollArea>
        <NavSection $first>
          <SectionLabel $visible={expanded}>Navegación</SectionLabel>
        </NavSection>

        <NavList>
          {navItems.map(item => {
            const childIds = item.children.map(c => c.id)
            const isActive = expanded
              ? (activeItem === item.id || childIds.includes(activeItem) || childIds.includes(activeSubsection))
              : activeItem === item.id
            const isOpen = expanded && openItems[item.id]
            return (
              <NavItem key={item.id}>
                <NavBtn $active={isActive} $expanded={expanded} onClick={() => handleNavClick(item)}>
                  <NavIcon>{item.icon}</NavIcon>
                  {expanded && <NavLabel $active={isActive}>{item.label}</NavLabel>}
                  {expanded && item.children.length > 0 && (
                    <NavArrow $open={isOpen}><ChevronRightIcon /></NavArrow>
                  )}
                  {!expanded && <NavTooltip>{item.label}</NavTooltip>}
                </NavBtn>

                {item.children.length > 0 && expanded && (
                  <SubList $open={isOpen}>
                    {item.children.map(child => (
                      <li key={child.id}>
                        <SubBtn
                          $expanded={expanded}
                          $active={activeItem === child.id || (item.id === 'events' && activeSubsection === child.id)}
                          onClick={() => handleNavClick(item, child)}
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

        {/* ── system section ── */}
        <NavSection>
          <SectionLabel $visible={expanded}>Sistema</SectionLabel>
        </NavSection>

        <NavList>
          {bottomItems.map(item => {
            const isActive = activeItem === item.id
            return (
              <NavItem key={item.id}>
                <NavBtn $active={isActive} $expanded={expanded} onClick={() => handleNavClick(item)}>
                  <NavIcon>{item.icon}</NavIcon>
                  {expanded && <NavLabel $active={isActive}>{item.label}</NavLabel>}
                  {!expanded && <NavTooltip>{item.label}</NavTooltip>}
                </NavBtn>
              </NavItem>
            )
          })}
        </NavList>
      </NavScrollArea>

      {/* ── bottom: user info + logout ── */}
      <SidebarBottom>

        {/* expanded: avatar pill */}
        <UserRow $expanded={expanded}>
          <UserAvatarWrap>{userInitials}</UserAvatarWrap>
          <UserMeta>
            <UserName>{user?.username || user?.name || 'Admin'}</UserName>
            <UserRole>{roleLabel}</UserRole>
          </UserMeta>
          <LogoutBtn
            onClick={handleLogout}
            disabled={loggingOut}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
          >
            <LogoutOutlinedIcon />
          </LogoutBtn>
        </UserRow>

        {/* collapsed: icon button with tooltip */}
        <LogoutIconBtn
          $expanded={expanded}
          onClick={handleLogout}
          disabled={loggingOut}
          aria-label="Cerrar sesión"
        >
          <LogoutOutlinedIcon />
          <NavTooltip>Cerrar sesión</NavTooltip>
        </LogoutIconBtn>

      </SidebarBottom>

    </SidebarWrap>
  )
}

export default Sidebar
