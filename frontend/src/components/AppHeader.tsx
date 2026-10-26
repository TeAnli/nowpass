import { Avatar, Dropdown, Button } from 'antd'
import type { MenuProps } from 'antd'
import { DownOutlined, LogoutOutlined, SettingOutlined, UserOutlined } from '@ant-design/icons'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'
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
      icon: <UserOutlined aria-hidden="true" />,
      label: '个人中心',
    },
    ...(user?.canEnterAdmin
      ? [
          {
            key: 'admin',
            icon: <SettingOutlined aria-hidden="true" />,
            label: '后台管理',
          },
        ]
      : []),
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined aria-hidden="true" />,
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
              <Avatar size={28} icon={<UserOutlined aria-hidden="true" />} />
              <span className="account-trigger__name">{user?.nickname ?? '未登录'}</span>
              <DownOutlined className="account-trigger__caret" aria-hidden="true" />
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
