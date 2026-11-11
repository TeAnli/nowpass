import { create } from 'zustand'
import type { LoginResult, UserProfile } from '@nowpass/api-contracts'
import { authStorage } from '@/lib/storage'
import { authApi } from '@/api/auth'

interface AuthState {
  token: string | null
  user: UserProfile | null
  initialized: boolean
  setSession: (result: LoginResult) => void
  setUser: (user: UserProfile) => void
  clear: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: authStorage.getToken(),
  user: null,
  initialized: false,

  setSession: (result) => {
    authStorage.setToken(result.token)
    authStorage.setExpireAt(result.expireAt)
    set({ token: result.token, user: result.user, initialized: true })
  },

  setUser: (user) => set({ user }),

  clear: () => {
    authStorage.clear()
    set({ token: null, user: null, initialized: true })
  },

  initialize: async () => {
    if (get().initialized) return
    const token = get().token
    if (!token) {
      set({ initialized: true })
      return
    }
    try {
      const user = await authApi.me()
      set({ user, initialized: true })
    } catch {
      authStorage.clear()
      set({ token: null, user: null, initialized: true })
    }
  },
}))
