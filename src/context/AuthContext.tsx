import * as React from "react"
import { onAuthStateChanged, type User } from "firebase/auth"

import { auth } from "@/lib/firebase"

interface AuthContextValue {
  user: User | null
  loading: boolean
}

const AuthContext = React.createContext<AuthContextValue | undefined>(
  undefined
)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const value = React.useMemo(() => ({ user, loading }), [user, loading])

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = React.useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
