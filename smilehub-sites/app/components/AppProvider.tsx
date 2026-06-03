'use client'

import { createContext, useContext } from 'react'

type AuthContextValue = {
  status: 'authenticated' | 'unauthenticated' | 'loading'
  user: string | null
  email: string | null
  role: string | null
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  status: 'unauthenticated',
  user: null,
  email: null,
  role: null,
  logout: async () => {},
  refreshSession: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export default function AppProvider({ children }: { children: React.ReactNode }) {
  return <AuthContext.Provider value={{ status: 'unauthenticated', user: null, email: null, role: null, logout: async () => {}, refreshSession: async () => {} }}>{children}</AuthContext.Provider>
}
