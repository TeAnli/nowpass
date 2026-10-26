import { useEffect, useState } from 'react'
import { Alert, App as AntApp, Button, Form, Input, Result, Space } from 'antd'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import { authApi } from '@/api/auth'
import { AuthShell } from '@/components/AuthShell'
import { EmailCodeDialog } from '@/components/EmailCodeDialog'

interface ResetFormValues {
  email: string
  emailCode: string
  newPassword: string
  confirmPassword: string
}

export function ResetPasswordPage() {
  const [form] = Form.useForm<ResetFormValues>()
  const email = Form.useWatch('email', form)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { message } = AntApp.useApp()
  const navigate = useNavigate()
  const resetPassword = useMutation({ mutationFn: authApi.resetPassword })

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  const openDialog = async () => {
    const result = await form.validateFields(['email']).catch(() => null)
    if (!result) return
    setDialogOpen(true)
  }

  const onSubmit = (values: ResetFormValues) => {
    setErrorMessage(null)
    resetPassword.mutate(
      {
        email: values.email,
        emailCode: values.emailCode,
        newPassword: values.newPassword,
      },
      {
        onSuccess: () => setSuccess(true),
        onError: (error) => {
          const apiError = error instanceof ApiError ? error : null
          setErrorMessage(apiError?.message ?? '重置失败，请稍后重试。')
        },
      },
    )
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="04 / RESET DONE"
        headline={<>旧密码已经作废，<br />重新进来一次。</>}
        note="出于安全考虑，修改密码后该账号的所有旧会话都失效了。"
      >
        <Result
          status="success"
          title="密码已重置"
          subTitle="请使用新密码登录。所有旧会话已失效。"
          extra={
            <Button type="primary" onClick={() => navigate('/login', { replace: true })}>
              去登录
            </Button>
          }
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="04 / RESET PASSWORD"
      headline={<>忘了密码没关系，<br />邮箱还认得你。</>}
      note="先确认邮箱收到验证码，再设置新密码。新密码同样需要同时包含字母与数字。"
    >
      <div className="auth-card__head">
        <p className="eyebrow">PASSWORD RECOVERY</p>
        <h2>找回密码</h2>
        <p>通过注册邮箱验证身份，然后设置新密码。</p>
      </div>

      {errorMessage && (
        <Alert type="error" showIcon message={errorMessage} className="auth-alert" role="alert" />
      )}

      <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark="optional">
        <Form.Item
          label="注册邮箱"
          name="email"
          rules={[
            { required: true, message: '请输入邮箱' },
            { type: 'email', message: '邮箱格式不正确' },
          ]}
        >
          <Input
            type="email"
            autoComplete="email"
            spellCheck={false}
            placeholder="you@example.com"
            addonAfter={
              <Button type="link" size="small" onClick={() => void openDialog()}>
                发送验证码
              </Button>
            }
          />
        </Form.Item>
        <Form.Item label="邮箱验证码" required>
          <Space.Compact block>
            <Form.Item
              name="emailCode"
              noStyle
              rules={[{ required: true, message: '请输入邮箱验证码' }]}
            >
              <Input inputMode="numeric" autoComplete="one-time-code" spellCheck={false} placeholder="6 位数字" />
            </Form.Item>
            <Button onClick={() => void openDialog()} disabled={countdown > 0}>
              {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
            </Button>
          </Space.Compact>
        </Form.Item>
        <Form.Item
          label="新密码"
          name="newPassword"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, max: 64, message: '密码长度需在 8~64 位之间' },
            { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: '密码必须同时包含字母和数字' },
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="至少 8 位，包含字母和数字" />
        </Form.Item>
        <Form.Item
          label="确认新密码"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                return Promise.reject(new Error('两次输入的密码不一致'))
              },
            }),
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="再次输入新密码" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={resetPassword.isPending}>
          {resetPassword.isPending ? '提交中…' : '重置密码'}
        </Button>
      </Form>

      <div className="auth-links">
        <Link to="/login">返回登录</Link>
      </div>

      <EmailCodeDialog
        open={dialogOpen}
        scene="reset"
        email={email ?? ''}
        onCancel={() => setDialogOpen(false)}
        onSent={() => {
          message.success('验证码已发送，请检查邮箱（本地开发可打开 Mailpit）。')
          setCountdown(60)
        }}
      />
    </AuthShell>
  )
}
