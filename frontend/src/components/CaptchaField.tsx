import { useState } from 'react'
import { Button, Form, Input, Space } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth'

export function useCaptcha(scope: string) {
  const query = useQuery({
    queryKey: ['captcha', scope],
    queryFn: authApi.captcha,
    staleTime: 0,
    gcTime: 0,
    retry: 1,
  })

  return {
    captcha: query.data,
    loading: query.isFetching,
    error: query.isError,
    refresh: () => void query.refetch(),
  }
}

interface CaptchaFieldProps {
  scope: string
  captcha: ReturnType<typeof useCaptcha>
}

export function CaptchaField({ scope, captcha }: CaptchaFieldProps) {
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Form.Item label="图形验证码" required>
      <Space.Compact block>
        <Form.Item
          name="captchaCode"
          noStyle
          rules={[
            { required: true, message: '请输入图形验证码' },
            { min: 1, max: 8, message: '验证码格式不正确' },
          ]}
        >
          <Input
            placeholder={`例如 3 + 5 的答案`}
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            aria-label="图形验证码"
          />
        </Form.Item>
        <Button
          type="default"
          className="captcha-button"
          onClick={captcha.refresh}
          loading={captcha.loading}
          aria-label="图形验证码，点击更换"
          title="看不清？换一张"
        >
          {captcha.captcha && !imageFailed ? (
            <img
              src={captcha.captcha.img}
              alt="图形验证码"
              width={140}
              height={44}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <span className="captcha-button__placeholder">
              <ReloadOutlined /> 换一张
            </span>
          )}
        </Button>
      </Space.Compact>
      <div className="field-hint">
        看不清？点击图片换一张。本题为算式验证码，请填写计算结果。
        <span className="visually-hidden">验证码作用域：{scope}</span>
      </div>
    </Form.Item>
  )
}

export function useSendEmailCode() {
  return useMutation({
    mutationFn: authApi.sendEmailCode,
  })
}
