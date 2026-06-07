import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useContext } from 'react'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ChatContext, ChatProvider } from './context/ChatContext'
import { SystemConfigProvider } from './context/SystemConfigContext'
import { TourProvider } from './context/TourContext'
import { BroadcastNotifProvider } from './context/BroadcastNotifContext'
import ClientPage from './pages/client/ClientPage'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import NotFoundPage from './pages/NotFoundPage'
import ThemeRuntime from './components/common/ThemeRuntime'
import GameModal from './components/client/events/GameModal'

function ClientEventModalHost() {
  const location = useLocation()
  const { activeClientEvent, clientSession, setActiveClientEvent } = useContext(ChatContext)

  if (location.pathname !== '/') return null
  if (!activeClientEvent) return null

  return (
    <GameModal
      event={activeClientEvent}
      clientId={clientSession?.id ?? null}
      onClose={() => setActiveClientEvent(null)}
    />
  )
}

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
        <SystemConfigProvider>
          <ChatProvider>
            <TourProvider>
              <ThemeRuntime>
                <BroadcastNotifProvider>
                <ClientEventModalHost />
                <Routes>
                  <Route path="/" element={<ClientPage />} />
                  <Route path="/admin/login" element={<LoginPage />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <Navigate to="/admin/chat" replace />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/:section"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/admin/:section/:tab"
                    element={
                      <ProtectedRoute>
                        <DashboardPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
                </BroadcastNotifProvider>
              </ThemeRuntime>
            </TourProvider>
          </ChatProvider>
        </SystemConfigProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
