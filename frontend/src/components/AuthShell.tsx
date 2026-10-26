import type { ReactNode } from 'react'
import { BrandMark } from '@/components/BrandMark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { RouteMotion } from '@/components/RouteMotion'

interface AuthShellProps {
  eyebrow: string
  headline: ReactNode
  note: string
  children: ReactNode
}

export function AuthShell({ eyebrow, headline, note, children }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <section className="auth-aside" aria-label="NowPass 品牌介绍">
        <BrandMark />
        <div className="auth-aside__body">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{headline}</h1>
          <p className="auth-aside__note">{note}</p>
        </div>
        <p className="auth-aside__foot mono">ISSUE 01 · READ SLOWLY · THEN CHECK</p>
      </section>
      <section className="auth-main">
        <div className="auth-main__tools">
          <ThemeToggle />
        </div>
        <RouteMotion>
          <div className="auth-card">{children}</div>
        </RouteMotion>
        <p className="auth-main__foot">NowPass · 仅供少部分人使用的面试题库</p>
      </section>
    </div>
  )
}
