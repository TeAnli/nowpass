import { Outlet } from 'react-router-dom'
import { AppHeader } from '@/components/AppHeader'

export function UserLayout() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <AppHeader />
      <main id="main-content" className="site-main">
        <Outlet />
      </main>
      <footer className="site-footer">
        <span className="mono">NOWPASS · 先思考，再核对</span>
        <span>少量题目，认真读。</span>
      </footer>
    </div>
  )
}
