import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Suspense, lazy, useContext } from 'react'
import { ToastProvider } from './context/ToastContext'
import { ChatContext, ChatProvider } from './context/ChatContext'
import { SystemConfigProvider } from './context/SystemConfigContext'
import ThemeRuntime from './components/common/ThemeRuntime'

const ClientPage = lazy(() => import('./pages/client/ClientPage'))
const AdminLoginRoute = lazy(() => import('./pages/admin/AdminLoginRoute'))
const AdminRedirectRoute = lazy(() => import('./pages/admin/AdminRedirectRoute'))
const AdminDashboardRoute = lazy(() => import('./pages/admin/AdminDashboardRoute'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const GameModal = lazy(() => import('./components/client/events/GameModal'))

function ClientEventModalHost() {
  const { activeClientEvent, clientSession, setActiveClientEvent } = useContext(ChatContext)

  if (!activeClientEvent) return null

  return (
    <GameModal
      event={activeClientEvent}
      clientId={clientSession?.id ?? null}
      onClose={() => setActiveClientEvent(null)}
    />
  )
}

function ClientShell() {
  return (
    <ChatProvider>
      <ClientEventModalHost />
      <ClientPage />
    </ChatProvider>
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SystemConfigProvider>
          <ThemeRuntime>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/" element={<ClientShell />} />
                <Route path="/admin/login" element={<AdminLoginRoute />} />
                <Route path="/admin" element={<AdminRedirectRoute />} />
                <Route path="/admin/:section" element={<AdminDashboardRoute />} />
                <Route path="/admin/:section/:tab" element={<AdminDashboardRoute />} />
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </ThemeRuntime>
        </SystemConfigProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default App
