import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="forbidden-state">
      <p className="eyebrow">404 / LOST PAGE</p>
      <h1>这一页没有被装进题库。</h1>
      <p>链接可能已经失效，也可能只是地址打错了一个字符。</p>
      <Link className="text-link" to="/">
        回到题库
      </Link>
    </div>
  )
}
