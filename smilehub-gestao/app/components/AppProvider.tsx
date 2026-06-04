'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'

type AdminSession = {
  id?: string
  user: string
  email?: string
  role: string
  phone?: string | null
  avatarUrl?: string | null
  clinic?: { id: string; name: string; logoUrl?: string | null } | null
  subscription?: {
    planCode?: string | null
    planLabel?: string | null
    status?: string | null
    statusLabel?: string | null
    trialEndsAt?: string | null
    currentPeriodEndsAt?: string | null
    hasAccess: boolean
    reason?: string | null
    message?: string | null
    daysLeft?: number | null
  } | null
}

type AuthContextValue = {
  session: AdminSession | null
  status: 'loading' | 'authenticated' | 'unauthenticated'
  refreshSession: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function AppProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AdminSession | null>(null)
  const [status, setStatus] = useState<AuthContextValue['status']>('loading')

  const refreshSession = useCallback(async () => {
    setStatus('loading')
    const res = await fetch('/api/me', { cache: 'no-store' })

    if (res.ok) {
      const data = await res.json()
      setSession({ id: data.id, user: data.user, email: data.email, role: data.role, phone: data.phone, avatarUrl: data.avatarUrl, clinic: data.clinic ?? null, subscription: data.subscription ?? null })
      setStatus('authenticated')
      return
    }

    setSession(null)
    setStatus('unauthenticated')
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setSession(null)
    setStatus('unauthenticated')
  }, [])

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const value = useMemo(
    () => ({ session, status, refreshSession, logout }),
    [logout, refreshSession, session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)

  if (!value) {
    throw new Error('useAuth deve ser usado dentro de AppProvider')
  }

  return value
}

export default AppProvider
