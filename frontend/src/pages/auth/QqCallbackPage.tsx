import { useEffect, useRef, useState } from 'react'
import { Alert, Button } from 'antd'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { AuthShell } from '@/components/AuthShell'
import { AppIcon } from '@/components/AppIcon'
import { ApiError } from '@/lib/api'

export function QqCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setSession = useAuthStore((state) => state.setSession)
  const ticket = params.get('ticket')
  const errorParam = params.get('error')
  const [error, setError] = useState<string | null>(errorParam)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    if (errorParam) {
      setError(errorParam)
      return
    }
    if (!ticket) {
      setError('QQ 登录回调缺少票据，请重新登录。')
      return
    }
    authApi.qqExchange(ticket)
      .then((result) => {
        setSession(result)
        navigate('/', { replace: true })
      })
      .catch((requestError) => {
        setError(requestError instanceof ApiError ? requestError.message : 'QQ 登录失败，请稍后重试。')
      })
  }, [errorParam, navigate, setSession, ticket])

  return (
    <AuthShell
      eyebrow="06 / CONNECT"
      headline={<>正在连接 QQ，<br />准备进入题库。</>}
      note="QQ 只用于确认身份。NowPass 不会读取你的 QQ 密码，也不会发布任何内容。"
    >
      <div className="auth-card__head">
        <p className="eyebrow">QQ CONNECT</p>
        <h2>{error ? 'QQ 登录未完成' : '正在完成登录…'}</h2>
        <p>{error ? '可以返回登录页重新尝试，或使用账号密码登录。' : '正在验证一次性登录票据，请稍候。'}</p>
      </div>
      {error ? (
        <>
          <Alert className="auth-alert" type="error" showIcon message={error} role="alert" />
          <Link to="/login" className="auth-back-link">
            <AppIcon icon="lucide:arrow-left" size={15} /> 返回登录
          </Link>
        </>
      ) : (
        <div className="qq-callback-loading" aria-live="polite">
          <span className="qq-callback-spinner" aria-hidden="true" />
          <span>正在验证 QQ 身份…</span>
        </div>
      )}
      {!error && (
        <Button type="text" className="auth-cancel-link" onClick={() => navigate('/login', { replace: true })}>
          取消并返回登录
        </Button>
      )}
    </AuthShell>
  )
}
