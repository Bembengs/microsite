import * as React from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth"
import { toast } from "sonner"

import { auth, googleProvider } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Maps common Firebase Auth error codes to Indonesian, user-facing messages. */
function mapAuthError(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Format email tidak valid."
    case "auth/user-disabled":
      return "Akun ini telah dinonaktifkan."
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "Email atau password salah."
    case "auth/wrong-password":
      return "Email atau password salah."
    case "auth/email-already-in-use":
      return "Email sudah terdaftar. Silakan login."
    case "auth/weak-password":
      return "Password minimal 6 karakter."
    case "auth/popup-closed-by-user":
      return "Login dibatalkan."
    case "auth/network-request-failed":
      return "Koneksi jaringan bermasalah. Coba lagi."
    case "auth/unauthorized-domain":
      return "Domain ini belum diizinkan di Firebase Console (Authentication > Settings > Authorized domains)."
    default:
      return "Terjadi kesalahan saat login. Coba lagi."
  }
}

export default function Login() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mode, setMode] = React.useState<"signin" | "signup">("signin")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [googleSubmitting, setGoogleSubmitting] = React.useState(false)

  const redirectTo =
    (location.state as { from?: Location } | null)?.from?.pathname ??
    "/dashboard"

  // Already logged in — bounce straight to dashboard.
  if (!authLoading && user) {
    return <Navigate to={redirectTo} replace />
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, password)
        toast.success("Berhasil masuk.")
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
        toast.success("Akun berhasil dibuat.")
      }
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const code = (err as { code?: string }).code ?? ""
      toast.error(mapAuthError(code))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleSubmitting(true)
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success("Berhasil masuk dengan Google.")
      navigate(redirectTo, { replace: true })
    } catch (err) {
      const code = (err as { code?: string }).code ?? ""
      toast.error(mapAuthError(code))
    } finally {
      setGoogleSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{mode === "signin" ? "Masuk" : "Buat akun"}</CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Masuk ke akun BioLink kamu."
              : "Daftar untuk mulai membuat BioLink kamu."}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={googleSubmitting || submitting}
          >
            {googleSubmitting ? "Menghubungkan..." : "Lanjutkan dengan Google"}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">atau</span>
            </div>
          </div>

          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="nama@email.com"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Minimal 6 karakter"
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || googleSubmitting}
            >
              {submitting
                ? "Memproses..."
                : mode === "signin"
                  ? "Masuk"
                  : "Daftar"}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="justify-center">
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            onClick={() =>
              setMode((m) => (m === "signin" ? "signup" : "signin"))
            }
          >
            {mode === "signin"
              ? "Belum punya akun? Daftar"
              : "Sudah punya akun? Masuk"}
          </button>
        </CardFooter>
      </Card>
    </div>
  )
}
