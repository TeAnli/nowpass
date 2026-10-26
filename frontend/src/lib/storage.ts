const TOKEN_KEY = 'nowpass.token'
const EXPIRE_KEY = 'nowpass.tokenExpireAt'

export const authStorage = {
  getToken(): string | null {
    try {
      return sessionStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  setToken(token: string): void {
    try {
      sessionStorage.setItem(TOKEN_KEY, token)
    } catch {
      // 浏览器禁用存储时退化为仅内存会话
    }
  },
  getExpireAt(): number | null {
    try {
      const value = sessionStorage.getItem(EXPIRE_KEY)
      return value ? Number(value) : null
    } catch {
      return null
    }
  },
  setExpireAt(expireAt: number): void {
    try {
      sessionStorage.setItem(EXPIRE_KEY, String(expireAt))
    } catch {
      // ignore
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem(EXPIRE_KEY)
    } catch {
      // ignore
    }
  },
}
