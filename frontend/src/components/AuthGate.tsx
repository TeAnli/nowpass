import { useEffect, useRef } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/auth'
import { PageLoader } from '@/components/PageLoader'

export function AuthGate() {
  const token = useAuthStore((state) => state.token)
  const initialized = useAuthStore((state) => state.initialized)
  const initialize = useAuthStore((state) => state.initialize)
  const location = useLocation()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void initialize()
  }, [initialize])

  if (!token) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />
  }

  if (!initialized) {
    return <PageLoader label="正在确认登录状态…" />
  }

  return <Outlet />
}

export function RequireAdmin() {
  const user = useAuthStore((state) => state.user)

  if (!user?.canEnterAdmin) {
    return (
      <div className="forbidden-state">
        <p className="eyebrow">403 / NO ACCESS</p>
        <h1>这里只对管理员开放。</h1>
        <p>你的账号可以继续刷题，但没有后台管理权限。</p>
        <Link className="text-link" to="/">
          返回题库
        </Link>
      </div>
    )
  }

  return <Outlet />
}
