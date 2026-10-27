import { useCallback, useLayoutEffect, useRef } from 'react'
import { Avatar, Dropdown, Button } from 'antd'
import type { MenuProps } from 'antd'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { App as AntApp } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import gsap from 'gsap'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { AppIcon } from '@/components/AppIcon'
import { canAnimate } from '@/lib/gsap'
import { useAuthStore } from '@/store/auth'
import { authApi } from '@/api/auth'

export function AppHeader() {
  const user = useAuthStore((state) => state.user)
  const clear = useAuthStore((state) => state.clear)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { modal } = AntApp.useApp()
  const navRef = useRef<HTMLElement | null>(null)
  const inkRef = useRef<HTMLSpanElement | null>(null)
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({})

  const activeKey =
    location.pathname === '/'
      ? 'home'
      : location.pathname.startsWith('/admin')
        ? 'admin'
        : location.pathname.startsWith('/questions')
          ? 'questions'
          : location.pathname.startsWith('/topics')
            ? 'topics'
            : location.pathname.startsWith('/roadmap')
              ? 'roadmap'
              : 'home'

  const moveInk = useCallback((key: string, animate = true) => {
    const link = linkRefs.current[key]
    const ink = inkRef.current
    if (!link || !ink) return
    const x = link.offsetLeft + 6
    const width = Math.max(0, link.offsetWidth - 12)
    if (!animate || !canAnimate()) {
      gsap.set(ink, { x, width })
      return
    }
    gsap.to(ink, { x, width, duration: 0.32, ease: 'power3.out', overwrite: true })
  }, [])

  useLayoutEffect(() => {
    moveInk(activeKey, true)
    const nav = navRef.current
    if (!nav) return
    const settle = () => moveInk(activeKey, false)
    const observer = new ResizeObserver(settle)
    observer.observe(nav)
    window.addEventListener('resize', settle)
    void document.fonts?.ready.then(settle)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', settle)
    }
  }, [activeKey, moveInk, user?.canEnterAdmin])

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
        <nav
          className="main-nav"
          aria-label="主导航"
          ref={navRef}
          onMouseLeave={() => moveInk(activeKey)}
        >
          <NavLink
            to="/"
            end
            ref={(node) => {
              linkRefs.current.home = node
            }}
            onMouseEnter={() => moveInk('home')}
            className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
          >
            <AppIcon icon="lucide:house" size={16} />
            首页
          </NavLink>
          <NavLink
            to="/questions"
            ref={(node) => {
              linkRefs.current.questions = node
            }}
            onMouseEnter={() => moveInk('questions')}
            className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
          >
            <AppIcon icon="lucide:library-big" size={16} />
            题库
          </NavLink>
          <NavLink
            to="/topics"
            ref={(node) => {
              linkRefs.current.topics = node
            }}
            onMouseEnter={() => moveInk('topics')}
            className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
          >
            <AppIcon icon="lucide:tags" size={16} />
            知识标签
          </NavLink>
          <NavLink
            to="/roadmap"
            ref={(node) => {
              linkRefs.current.roadmap = node
            }}
            onMouseEnter={() => moveInk('roadmap')}
            className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
          >
            <AppIcon icon="lucide:route" size={16} />
            刷题路线
          </NavLink>
          {user?.canEnterAdmin && (
            <NavLink
              to="/admin/questions"
              ref={(node) => {
                linkRefs.current.admin = node
              }}
              onMouseEnter={() => moveInk('admin')}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              <AppIcon icon="lucide:settings-2" size={16} />
              后台
            </NavLink>
          )}
          <span className="nav-ink" ref={inkRef} aria-hidden="true" />
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
