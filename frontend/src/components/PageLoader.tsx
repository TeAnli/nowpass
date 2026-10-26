import { Skeleton } from 'antd'

export function PageLoader({ label = '正在打开页面…' }: { label?: string }) {
  return (
    <div className="page-loader" role="status" aria-live="polite">
      <span className="eyebrow">{label}</span>
      <Skeleton active paragraph={{ rows: 4 }} title={{ width: '42%' }} />
    </div>
  )
}
