import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ChatProvider } from './context/ChatContext'
import { SystemConfigProvider } from './context/SystemConfigContext'
import ClientPage from './pages/client/ClientPage'
import LoginPage from './pages/admin/LoginPage'
import DashboardPage from './pages/admin/DashboardPage'
import ProtectedRoute from './components/common/ProtectedRoute'
import NotFoundPage from './pages/NotFoundPage'
import ThemeRuntime from './components/common/ThemeRuntime'

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SystemConfigProvider>
          <ChatProvider>
            <ThemeRuntime>
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
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </ThemeRuntime>
          </ChatProvider>
        </SystemConfigProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
