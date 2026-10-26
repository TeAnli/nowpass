import { Link } from 'react-router-dom'

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand" to="/" aria-label="NowPass 题库首页">
      <span className="brand__mark" aria-hidden="true">
        <span>N</span>
      </span>
      {!compact && (
        <span className="brand__text">
          <strong>NowPass</strong>
          <small>INTERVIEW NOTES</small>
        </span>
      )}
    </Link>
  )
}
