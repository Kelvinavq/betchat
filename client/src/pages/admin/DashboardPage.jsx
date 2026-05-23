import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import Sidebar from '../../components/admin/sidebar/Sidebar'
import AdminTour from '../../components/common/AdminTour'
import ChatList from '../../components/admin/chat/ChatList'
import AdminChatView from '../../components/admin/chat/AdminChatView'
import ClientPanel from '../../components/admin/client-panel/ClientPanel'
import UsersPage from './users/UsersPage'
import ClientsPage from './clients/ClientsPage'
import CommandsPage from './commands/CommandsPage'
import SettingsPage       from './settings/SettingsPage'
import BanksPage          from './banks/BanksPage'
import NotificationsPage  from './notifications/NotificationsPage'
import PushPage           from './push/PushPage'
import ModalsPage      from './modal/ModalsPage'
import BotBuilderPage    from './botbuilder/BotBuilderPage'
import EventsPage        from './events/EventsPage'
import MetricsPage       from './metrics/MetricsPage'
import WithdrawalsPage   from './withdrawals/WithdrawalsPage'
import useAuth from '../../hooks/useAuth'
import { SECTION_MODULES, canViewSection } from '../../utils/adminPermissions'
import BroadcastNotifBubble from '../../components/admin/BroadcastNotifBubble'

const MIN_W     = 240
const MAX_W     = 560
const DEF_LIST  = 320
const DEF_PANEL = 320

const load = (key, fallback) => {
  const v = localStorage.getItem(key)
  return v ? Math.max(MIN_W, Math.min(MAX_W, parseInt(v, 10))) : fallback
}

/* ── desktop layout ── */
const Layout = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--app-height, 100dvh);
  display: flex;
  overflow: hidden;
  background: var(--bc-admin-content-bg, #08080f);
  cursor: ${({ $resizing }) => $resizing ? 'col-resize' : 'auto'};
  user-select: ${({ $resizing }) => $resizing ? 'none' : 'auto'};
`

const ResizeHandle = styled.div`
  width: 4px;
  min-width: 4px;
  height: var(--app-height, 100dvh);
  flex-shrink: 0;
  cursor: col-resize;
  background: rgba(255, 255, 255, 0.04);
  position: relative;
  z-index: 20;
  transition: background 0.15s;
  &::before { content: ''; position: absolute; inset: 0 -6px; }
  &:hover   { background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.45); }
  &:active  { background: rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.70); }
`

/* ── mobile drawer ── */
const slideFromLeft = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(0); }
`

const MobileBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
`

const MobileDrawer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  height: var(--app-height, 100dvh);
  z-index: 51;
  animation: ${slideFromLeft} 0.28s cubic-bezier(0.16, 1, 0.3, 1) both;
`

/* ── mobile view slide wrapper ── */
const slideRight = keyframes`
  from { transform: translateX(100%); opacity: 0.6; }
  to   { transform: translateX(0);    opacity: 1; }
`
const slideLeft = keyframes`
  from { transform: translateX(-30%); opacity: 0.6; }
  to   { transform: translateX(0);    opacity: 1; }
`

const MobileView = styled.div`
  width: 100%;
  height: var(--app-height, 100dvh);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation-name: ${({ $dir }) => $dir === 'back' ? slideLeft : slideRight};
  animation-duration: 0.26s;
  animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  animation-fill-mode: both;
`

const AccessDenied = styled.div`
  flex: 1;
  min-width: 0;
  height: var(--app-height, 100dvh);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: rgba(255,255,255,0.54);
  font-size: 14px;
`

/* ── component ── */
const DashboardPage = () => {
  const [selectedChat, setSelectedChat]       = useState(null)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)
  const [mobileSidebar, setMobileSidebar]     = useState(false)
  const [mobileView, setMobileView]           = useState('list')  // 'list' | 'chat' | 'client'
  const [viewDir, setViewDir]                 = useState('fwd')   // 'fwd' | 'back'
  const [isMobile, setIsMobile]               = useState(() => window.innerWidth < 1024)
  const [isResizing, setIsResizing]           = useState(false)
  const [listWidth, setListWidth]   = useState(() => load('admin_list_w',  DEF_LIST))
  const [panelWidth, setPanelWidth] = useState(() => load('admin_panel_w', DEF_PANEL))
  const { section = 'chat' }        = useParams()
  const { search }                  = useLocation()
  const navigate                    = useNavigate()
  const { user }                    = useAuth()
  const eventsSubsection = new URLSearchParams(search).get('tab') || 'games'

  const allowedSections = Object.keys(SECTION_MODULES).filter(id => canViewSection(user, id))
  const firstAllowedSection = allowedSections[0]
  const canViewCurrentSection = canViewSection(user, section)
  const currentSection = section.startsWith('events-') ? 'events' : section

  const handleNavigate = (id) => {
    if (id === 'events-games' || id === 'events-agenda' || id === 'events-stats' || id === 'events-rewards') {
      const tab = id.replace('events-', '')
      navigate(`/admin/events?tab=${tab}`)
    } else {
      navigate(`/admin/${id}`)
    }
    if (isMobile) { setMobileView('list'); setMobileSidebar(false) }
  }

  useEffect(() => { localStorage.setItem('admin_list_w',  String(listWidth))  }, [listWidth])
  useEffect(() => { localStorage.setItem('admin_panel_w', String(panelWidth)) }, [panelWidth])

  useEffect(() => {
    if (!canViewSection(user, currentSection) && firstAllowedSection) {
      navigate(`/admin/${firstAllowedSection}`, { replace: true })
    }
  }, [currentSection, firstAllowedSection, navigate, section, user])

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  /* ── resize handle drag ── */
  const startResize = (e, setter, direction = 1) => {
    e.preventDefault()
    const startX = e.clientX
    let startW
    setter(w => { startW = w; return w })
    setIsResizing(true)
    const onMove = (ev) => setter(Math.max(MIN_W, Math.min(MAX_W, startW + (ev.clientX - startX) * direction)))
    const onUp   = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
  }

  /* ── mobile navigation helpers ── */
  const selectChat = (chat) => {
    setSelectedChat(chat)
    if (isMobile) { setViewDir('fwd'); setMobileView('chat') }
  }

  const backToList = () => {
    setViewDir('back')
    setMobileView('list')
    setSelectedChat(null)
  }

  const openClient = () => { setViewDir('fwd'); setMobileView('client') }
  const backToChat = () => { setViewDir('back'); setMobileView('chat') }
  const renderAccessDenied = () => (
    <AccessDenied>No tienes permisos para acceder a esta sección.</AccessDenied>
  )

  /* ── MOBILE ── */
  if (isMobile) {
    return (
      <Layout>
        {/* sidebar drawer */}
        {mobileSidebar && (
          <>
            <MobileBackdrop onClick={() => setMobileSidebar(false)} />
            <MobileDrawer>
              <Sidebar
                expanded
                onToggle={() => setMobileSidebar(false)}
                onNavigate={handleNavigate}
                activeSection={section}
                activeSubsection={eventsSubsection}
              />
            </MobileDrawer>
          </>
        )}

        {!canViewCurrentSection && renderAccessDenied()}

        {canViewCurrentSection && section === 'usuarios' && (
          <UsersPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'clientes' && (
          <ClientsPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'comandos' && (
          <CommandsPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'cuentas' && (
          <BanksPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'ajustes' && (
          <SettingsPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'notificaciones' && (
          <PushPage onMenuClick={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'modales' && (
          <ModalsPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'bot' && (
          <BotBuilderPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && currentSection === 'events' && (
          <EventsPage onMenuOpen={() => setMobileSidebar(true)} activeSubsection={eventsSubsection} />
        )}

        {canViewCurrentSection && section === 'metricas' && (
          <MetricsPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'retiros' && (
          <WithdrawalsPage onMenuOpen={() => setMobileSidebar(true)} />
        )}

        {canViewCurrentSection && section === 'chat' && mobileView === 'list' && (
          <MobileView $dir={viewDir}>
            <ChatList
              selectedChat={selectedChat}
              onSelectChat={selectChat}
              onMenuOpen={() => setMobileSidebar(true)}
              $fullWidth
            />
          </MobileView>
        )}

        {canViewCurrentSection && section === 'chat' && mobileView === 'chat' && selectedChat && (
          <MobileView $dir={viewDir}>
            <AdminChatView
              chat={selectedChat}
              onBack={backToList}
              onOpenClient={openClient}
            />
          </MobileView>
        )}

        {canViewCurrentSection && section === 'chat' && mobileView === 'client' && selectedChat && (
          <MobileView $dir={viewDir}>
            <ClientPanel
              client={selectedChat}
              onClose={backToChat}
              $fullWidth
            />
          </MobileView>
        )}

        <AdminTour currentSection={section} />
        <BroadcastNotifBubble />
      </Layout>
    )
  }

  /* ── DESKTOP ── */
  return (
    <Layout $resizing={isResizing}>
      <Sidebar
        expanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(p => !p)}
        onNavigate={handleNavigate}
        activeSection={section}
        activeSubsection={eventsSubsection}
      />

      {!canViewCurrentSection && renderAccessDenied()}

      {canViewCurrentSection && section === 'usuarios'  && <UsersPage />}
      {canViewCurrentSection && section === 'clientes'  && <ClientsPage />}
      {canViewCurrentSection && section === 'comandos'  && <CommandsPage />}
      {canViewCurrentSection && section === 'cuentas'        && <BanksPage />}
      {canViewCurrentSection && section === 'ajustes'        && <SettingsPage />}
      {canViewCurrentSection && section === 'notificaciones' && <PushPage />}
      {canViewCurrentSection && section === 'modales'        && <ModalsPage />}
      {canViewCurrentSection && section === 'bot'            && <BotBuilderPage />}
      {canViewCurrentSection && currentSection === 'events'         && <EventsPage activeSubsection={eventsSubsection} />}
      {canViewCurrentSection && section === 'metricas'       && <MetricsPage />}
      {canViewCurrentSection && section === 'retiros'        && <WithdrawalsPage />}

      {canViewCurrentSection && section === 'chat' && (
        <>
          <ChatList
            selectedChat={selectedChat}
            onSelectChat={setSelectedChat}
            $width={listWidth}
          />

          <ResizeHandle
            onMouseDown={e => startResize(e, setListWidth, 1)}
            title="Arrastrar para cambiar ancho"
          />

          <AdminChatView
            chat={selectedChat}
            onBack={() => setSelectedChat(null)}
          />

          {selectedChat && (
            <>
              <ResizeHandle
                onMouseDown={e => startResize(e, setPanelWidth, -1)}
                title="Arrastrar para cambiar ancho"
              />
              <ClientPanel
                client={selectedChat}
                onClose={() => setSelectedChat(null)}
                $width={panelWidth}
              />
            </>
          )}
        </>
      )}

      <AdminTour currentSection={section} />
      <BroadcastNotifBubble />
    </Layout>
  )
}

export default DashboardPage
