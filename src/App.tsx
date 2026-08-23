import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { Toaster } from "sonner"

import { AuthProvider } from "@/context/AuthContext"
import { ProtectedRoute } from "@/routes/ProtectedRoute"
import Login from "@/pages/Login"
import Dashboard from "@/pages/Dashboard"
import PublicMicrosite from "@/pages/PublicMicrosite" // <-- TAMBAHAN

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          {/* TAMBAHAN TAHAP 2: Halaman publik */}
          <Route path="/:username" element={<PublicMicrosite />} />

          <Route
            path="*"
            element={
              <div className="flex min-h-screen items-center justify-center text-muted-foreground">
                404 — Halaman tidak ditemukan.
              </div>
            }
          />
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-center" />
    </AuthProvider>
  )
}