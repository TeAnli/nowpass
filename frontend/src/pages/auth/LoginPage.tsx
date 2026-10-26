import { useEffect, useState } from 'react'
import { Alert, App as AntApp, Button, Form, Input } from 'antd'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'
import { AuthShell } from '@/components/AuthShell'
import { CaptchaField, useCaptcha } from '@/components/CaptchaField'

interface LoginFormValues { username: string; password: string; captchaCode: string }

const ERROR_COPY: Record<number, string> = {
  611: '请输入图形验证码。',
  612: '验证码错误或已失效，已为你换了一张。',
  621: '用户名或密码不正确。',
  622: '账号已停用，请联系管理员。',
  623: '账号正在等待管理员审批，通过后即可登录。',
  624: '连续登录失败次数过多，账号已临时锁定，请稍后再试。',
  651: '尝试过于频繁，请稍后再试。',
}

export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>()
  const navigate = useNavigate()
  const location = useLocation()
  const { message } = AntApp.useApp()
  const setSession = useAuthStore((state) => state.setSession)
  const token = useAuthStore((state) => state.token)
  const captcha = useCaptcha('login')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const login = useMutation({ mutationFn: authApi.login })

  useEffect(() => {
    if (token) navigate('/', { replace: true })
  }, [navigate, token])

  const onSubmit = (values: LoginFormValues) => {
    if (!captcha.captcha) {
      setErrorMessage('验证码图片尚未加载，请点击图片重试。')
      return
    }
    setErrorMessage(null)
    login.mutate(
      { ...values, captchaUuid: captcha.captcha.uuid },
      {
        onSuccess: (result) => {
          setSession(result)
          message.success(`欢迎回来，${result.user.nickname}`)
          const from = (location.state as { from?: string } | null)?.from
          navigate(from && from.startsWith('/') ? from : '/', { replace: true })
        },
        onError: (error) => {
          const apiError = error instanceof ApiError ? error : null
          setErrorMessage(apiError ? (ERROR_COPY[apiError.code] ?? apiError.message) : '登录失败，请稍后重试。')
          if (apiError?.code === 611 || apiError?.code === 612) {
            captcha.refresh()
            form.setFieldValue('captchaCode', '')
          }
        },
      },
    )
  }

  return (
    <AuthShell
      eyebrow="01 / SIGN IN"
      headline={<>先把问题想清楚，<br />再翻开答案。</>}
      note="这里没有排行榜，也没有打卡压力。一次只读一道题，想好了再看标准答案。"
    >
      <div className="auth-card__head">
        <p className="eyebrow">WELCOME BACK</p>
        <h2>登录 NowPass</h2>
        <p>使用管理员分配的账号，或先注册等待审批。</p>
      </div>
      {errorMessage && (
        <Alert className="auth-alert" type="error" showIcon message={errorMessage} role="alert" aria-live="polite" />
      )}
      <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark="optional">
        <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
          <Input autoComplete="username" spellCheck={false} placeholder="例如 admin" autoFocus />
        </Form.Item>
        <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password autoComplete="current-password" placeholder="输入密码" />
        </Form.Item>
        <CaptchaField scope="login" captcha={captcha} />
        <Button type="primary" htmlType="submit" block size="large" loading={login.isPending} className="auth-submit">
          {login.isPending ? '登录中…' : '进入题库'}
        </Button>
      </Form>
      <div className="auth-links">
        <Link to="/reset-password">忘记密码</Link>
        <Link to="/register">还没有账号？注册</Link>
      </div>
    </AuthShell>
  )
}
