import { Button, Result } from 'antd'
import { ApiError } from '@/lib/api'

interface ErrorStateProps {
  title?: string
  error?: unknown
  onRetry?: () => void
}

export function ErrorState({ title = '这段内容暂时打不开', error, onRetry }: ErrorStateProps) {
  const description =
    error instanceof ApiError ? error.message : error instanceof Error ? error.message : '请稍后重试。'

  return (
    <Result
      status="warning"
      title={title}
      subTitle={description}
      extra={
        onRetry ? (
          <Button type="primary" onClick={onRetry}>
            重试
          </Button>
        ) : undefined
      }
    />
  )
}
