import { useEffect, useState } from 'react'
import { Alert, App as AntApp, Button, Form, Input, Result, Space } from 'antd'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import { authApi } from '@/api/auth'
import { AuthShell } from '@/components/AuthShell'
import { EmailCodeDialog } from '@/components/EmailCodeDialog'

interface RegisterFormValues {
  username: string
  password: string
  nickname?: string
  email: string
  emailCode: string
}

export function RegisterPage() {
  const [form] = Form.useForm<RegisterFormValues>()
  const email = Form.useWatch('email', form)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { message } = AntApp.useApp()
  const register = useMutation({ mutationFn: authApi.register })

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

  const onSubmit = (values: RegisterFormValues) => {
    setErrorMessage(null)
    register.mutate(values, {
      onSuccess: () => setSuccess(true),
      onError: (error) => {
        const apiError = error instanceof ApiError ? error : null
        setErrorMessage(apiError?.message ?? '注册失败，请稍后重试。')
      },
    })
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="03 / SUBMITTED"
        headline={<>登记好了，<br />等管理员翻到你的名字。</>}
        note="审批通过后你就能登录。题库人数不多，审核通常不会太久。"
      >
        <Result
          status="success"
          title="注册已提交"
          subTitle="账号正在等待管理员审批。通过后使用刚才的用户名和密码登录即可。"
          extra={
            <Space direction="vertical">
              <Link to="/login">
                <Button type="primary">返回登录</Button>
              </Link>
              <Button type="link" onClick={() => setSuccess(false)}>
                再注册一个账号
              </Button>
            </Space>
          }
        />
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="02 / REQUEST ACCESS"
      headline={<>注册不是开门即进，<br />是递一张申请。</>}
      note="为了不让题库变成公开网页，注册后需要管理员审批。邮箱验证码只用一次。"
    >
      <div className="auth-card__head">
        <p className="eyebrow">REQUEST AN ACCOUNT</p>
        <h2>申请一个账号</h2>
        <p>填写邮箱并验证，提交后等待管理员审批。</p>
      </div>

      {errorMessage && (
        <Alert type="error" showIcon message={errorMessage} className="auth-alert" role="alert" />
      )}

      <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark="optional">
        <Form.Item
          label="用户名"
          name="username"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 3, max: 30, message: '用户名需为 3~30 个字符' },
            { pattern: /^[A-Za-z][A-Za-z0-9_]{2,29}$/, message: '以字母开头，只能包含字母、数字、下划线' },
          ]}
        >
          <Input autoComplete="username" spellCheck={false} placeholder="例如 kotlin_reader" />
        </Form.Item>
        <Form.Item label="昵称" name="nickname" rules={[{ max: 30, message: '昵称不能超过 30 个字符' }]}>
          <Input placeholder="留空则使用用户名" autoComplete="nickname" />
        </Form.Item>
        <Form.Item
          label="邮箱"
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
        <Form.Item
          label="邮箱验证码"
          required
          rules={[{ required: true }]}
        >
          <Space.Compact block>
            <Form.Item
              name="emailCode"
              noStyle
              rules={[{ required: true, message: '请输入邮箱验证码' }]}
            >
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                spellCheck={false}
                placeholder="6 位数字"
              />
            </Form.Item>
            <Button onClick={() => void openDialog()} disabled={countdown > 0}>
              {countdown > 0 ? `${countdown}s 后重发` : '重新发送'}
            </Button>
          </Space.Compact>
        </Form.Item>
        <Form.Item
          label="密码"
          name="password"
          rules={[
            { required: true, message: '请输入密码' },
            { min: 8, max: 64, message: '密码长度需在 8~64 位之间' },
            {
              pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/,
              message: '密码必须同时包含字母和数字',
            },
          ]}
          extra="至少 8 位，需同时包含字母和数字。"
        >
          <Input.Password autoComplete="new-password" placeholder="设置登录密码" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={register.isPending}>
          {register.isPending ? '提交中…' : '提交注册申请'}
        </Button>
      </Form>

      <div className="auth-links">
        <Link to="/login">已有账号，去登录</Link>
      </div>

      <EmailCodeDialog
        open={dialogOpen}
        scene="register"
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
