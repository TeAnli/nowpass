import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button } from 'antd'
import {
  AppstoreOutlined,
  CloseOutlined,
  FileTextOutlined,
  HistoryOutlined,
  HomeOutlined,
  MenuOutlined,
  TeamOutlined,
  DesktopOutlined,
} from '@ant-design/icons'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'

const navItems = [
  { to: '/admin/questions', label: '题目管理', icon: <FileTextOutlined aria-hidden="true" /> },
  { to: '/admin/categories', label: '分类管理', icon: <AppstoreOutlined aria-hidden="true" /> },
  { to: '/admin/users', label: '用户管理', icon: <TeamOutlined aria-hidden="true" /> },
  { to: '/admin/online', label: '在线会话', icon: <DesktopOutlined aria-hidden="true" /> },
  { to: '/admin/logs', label: '操作日志', icon: <HistoryOutlined aria-hidden="true" /> },
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
          icon={menuOpen ? <CloseOutlined /> : <MenuOutlined />}
          onClick={() => setMenuOpen((open) => !open)}
        />
        <Link to="/admin/questions" className="admin-topbar__title">
          后台工作台
        </Link>
        <div className="admin-topbar__actions">
          <Link to="/" className="admin-back-link">
            <HomeOutlined aria-hidden="true" /> 返回题库
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
              {item.icon}
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
          <Outlet />
        </main>
      </div>
    </div>
  )
}
