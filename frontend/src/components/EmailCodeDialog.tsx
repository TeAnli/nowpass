import { useEffect, useState } from 'react'
import { Alert, Form, Modal } from 'antd'
import { AppIcon } from '@/components/AppIcon'
import { ApiError } from '@/lib/api'
import { CaptchaField, useCaptcha, useSendEmailCode } from '@/components/CaptchaField'

interface EmailCodeDialogProps {
  open: boolean
  scene: 'register' | 'reset'
  email: string
  onCancel: () => void
  onSent: () => void
}

export function EmailCodeDialog({ open, scene, email, onCancel, onSent }: EmailCodeDialogProps) {
  const [form] = Form.useForm<{ captchaCode: string }>()
  const captcha = useCaptcha(`email-${scene}`)
  const sendCode = useSendEmailCode()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      form.resetFields()
      setErrorMessage(null)
      captcha.refresh()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async () => {
    const values = await form.validateFields().catch(() => null)
    if (!values) return
    if (!captcha.captcha) {
      setErrorMessage('验证码图片尚未加载，请点击图片刷新。')
      return
    }
    setErrorMessage(null)
    sendCode.mutate(
      {
        email,
        scene,
        captchaUuid: captcha.captcha.uuid,
        captchaCode: values.captchaCode,
      },
      {
        onSuccess: () => {
          onSent()
          onCancel()
        },
        onError: (error) => {
          setErrorMessage(error instanceof ApiError ? error.message : '发送失败，请稍后重试。')
          captcha.refresh()
          form.setFieldValue('captchaCode', '')
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      title="先确认你收到了邮件"
      okText={sendCode.isPending ? '发送中…' : '发送验证码'}
      cancelText="取消"
      confirmLoading={sendCode.isPending}
      onOk={() => void submit()}
      onCancel={onCancel}
      destroyOnHidden
    >
      <p className="dialog-copy">
        验证码将发送到 <strong>{email || '你的邮箱'}</strong>，5 分钟内有效。发送前请完成图形验证码。
      </p>
      {errorMessage && (
        <Alert
          type="error"
          showIcon
          message={errorMessage}
          style={{ marginBottom: 16 }}
          role="alert"
        />
      )}
      <Form form={form} layout="vertical" requiredMark="optional">
        <CaptchaField scope={`email-${scene}`} captcha={captcha} />
      </Form>
      <p className="field-hint">
        <AppIcon icon="lucide:check-circle-2" size={14} /> 发送成功后会返回注册表单，请把邮件中的 6 位验证码填回。
      </p>
    </Modal>
  )
}
