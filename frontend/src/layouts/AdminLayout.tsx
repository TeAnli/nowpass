import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button } from 'antd'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AppIcon } from '@/components/AppIcon'
import { RouteMotion } from '@/components/RouteMotion'

const navItems = [
  { to: '/admin/questions', label: '题目管理', icon: 'lucide:file-text' },
  { to: '/admin/categories', label: '分类管理', icon: 'lucide:folder-open' },
  { to: '/admin/videos', label: '视频管理', icon: 'lucide:clapperboard' },
  { to: '/admin/video-categories', label: '视频分类', icon: 'lucide:tags' },
  { to: '/admin/ai', label: 'AI 管理', icon: 'lucide:sparkles' },
  { to: '/admin/agent', label: 'AI 智能体', icon: 'lucide:bot' },
  { to: '/admin/users', label: '用户管理', icon: 'lucide:users' },
  { to: '/admin/online', label: '在线会话', icon: 'lucide:monitor-dot' },
  { to: '/admin/logs', label: '操作日志', icon: 'lucide:history' },
]

export function AdminLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="admin-shell">
      <a className="skip-link" href="#admin-main">
        跳到主要内容
      </a>
      <header className="admin-topbar">
        <Button
          type="text"
          className="admin-menu-toggle"
          aria-label={menuOpen ? '关闭后台导航' : '打开后台导航'}
          aria-expanded={menuOpen}
          icon={<AppIcon icon={menuOpen ? 'lucide:x' : 'lucide:menu'} size={18} />}
          onClick={() => setMenuOpen((open) => !open)}
        />
        <Link to="/admin/questions" className="admin-topbar__title">
          后台工作台
        </Link>
        <div className="admin-topbar__actions">
          <Link to="/" className="admin-back-link">
            <AppIcon icon="lucide:home" size={16} /> 返回题库
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <aside className={menuOpen ? 'admin-sider is-open' : 'admin-sider'} aria-label="后台导航">
        <div className="admin-sider__brand">
          <BrandMark />
        </div>
        <nav className="admin-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'admin-nav__item is-active' : 'admin-nav__item')}
            >
              <AppIcon icon={item.icon} size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="admin-sider__footer">
          <p className="eyebrow">NOWPASS / ADMIN</p>
          <p>所有改动都会写入操作日志。</p>
        </div>
      </aside>

      {menuOpen && <button type="button" className="admin-scrim" aria-label="关闭后台导航" onClick={() => setMenuOpen(false)} />}

      <div className="admin-content">
        <main id="admin-main" className="admin-main">
          <RouteMotion>
            <Outlet />
          </RouteMotion>
        </main>
      </div>
    </div>
  )
}
