import { Avatar, Dropdown, Button } from 'antd'
import type { MenuProps } from 'antd'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AppIcon } from '@/components/AppIcon'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'

export function AppHeader() {
  const user = useAuthStore((state) => state.user)
  const clear = useAuthStore((state) => state.clear)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { modal } = AntApp.useApp()

  const handleLogout = () => {
    modal.confirm({
      title: '退出当前账号？',
      content: '当前会话会立即结束，下次访问需要重新登录。',
      okText: '退出登录',
      cancelText: '继续阅读',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await authApi.logout()
        } catch {
          // 会话可能已过期，退出操作仍然要完成
        }
        clear()
        queryClient.clear()
        navigate('/login', { replace: true })
      },
    })
  }

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <AppIcon icon="lucide:user-round" size={16} />,
      label: '个人中心',
    },
    ...(user?.canEnterAdmin
      ? [
          {
            key: 'admin',
            icon: <AppIcon icon="lucide:layout-dashboard" size={16} />,
            label: '后台管理',
          },
        ]
      : []),
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <AppIcon icon="lucide:log-out" size={16} />,
      label: '退出登录',
      danger: true,
    },
  ]

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'profile') navigate('/profile')
    if (key === 'admin') navigate('/admin/questions')
    if (key === 'logout') handleLogout()
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <BrandMark />
        <nav className="main-nav" aria-label="主导航">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>
            题库
          </NavLink>
          {user?.canEnterAdmin && (
            <NavLink
              to="/admin/questions"
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              后台
            </NavLink>
          )}
        </nav>
        <div className="header-actions">
          <ThemeToggle />
          <Dropdown menu={{ items: menuItems, onClick: onMenuClick }} trigger={['click']}>
            <Button type="text" className="account-trigger" aria-label="账号菜单">
              <Avatar size={28} icon={<AppIcon icon="lucide:user-round" size={16} />} />
              <span className="account-trigger__name">{user?.nickname ?? '未登录'}</span>
              <AppIcon icon="lucide:chevron-down" size={12} className="account-trigger__caret" />
            </Button>
          </Dropdown>
        </div>
      </div>
      <span className="visually-hidden" aria-live="polite">
        当前页面：{location.pathname}
      </span>
    </header>
  )
}
