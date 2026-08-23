import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Editor from './pages/Editor'
import Public from './pages/Public'
import ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from 'sonner'

function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Toaster richColors position="top-center" />
        <Routes>
          {/* Auth */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected - Akun 2 */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/dashboard/:slug" element={<ProtectedRoute><Editor /></ProtectedRoute>} />

          {/* Public - Akun 3 - HARUS di bawah /dashboard agar tidak bentrok */}
          <Route path="/:slug" element={<Public />} />

          {/* Default */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  )
}

export default App
