import { Alert, App as AntApp, Button, Form, Input, Tag } from 'antd'
import { AppIcon } from '@/components/AppIcon'
import { LearningPanel } from '@/components/LearningPanel'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth'

interface NicknameForm { nickname: string }
interface PasswordForm { oldPassword: string; newPassword: string; confirmPassword: string }

export function ProfilePage() {
  const user = useAuthStore((state) => state.user)
  const setUser = useAuthStore((state) => state.setUser)
  const clear = useAuthStore((state) => state.clear)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { message } = AntApp.useApp()
  const nicknameMutation = useMutation({ mutationFn: authApi.updateProfile })
  const passwordMutation = useMutation({
    mutationFn: ({ oldPassword, newPassword }: { oldPassword: string; newPassword: string }) =>
      authApi.changePassword(oldPassword, newPassword),
  })

  const updateNickname = async (values: NicknameForm) => {
    await nicknameMutation.mutateAsync(values.nickname)
    if (user) setUser({ ...user, nickname: values.nickname.trim() })
    message.success('昵称已更新')
  }

  const changePassword = async (values: PasswordForm) => {
    await passwordMutation.mutateAsync({ oldPassword: values.oldPassword, newPassword: values.newPassword })
    try {
      await authApi.logout()
    } catch {
      // 会话已因改密失效
    }
    clear()
    queryClient.clear()
    message.success('密码已修改，所有旧会话已失效，请重新登录。')
    navigate('/login', { replace: true })
  }

  return (
    <div className="page-container profile-page">
      <header className="page-heading">
        <p className="eyebrow">YOUR READING CARD / 个人中心</p>
        <h1>你的阅读卡</h1>
        <p className="page-heading__lead">账号信息与密码。这里不展示答题记录，也不做打卡。</p>
      </header>
      <div className="profile-grid">
        <section className="surface-card profile-card" aria-labelledby="account-title">
          <div className="profile-card__avatar" aria-hidden="true"><AppIcon icon="lucide:user-round" size={24} /></div>
          <h2 id="account-title">{user?.nickname ?? '阅读者'}</h2>
          <p className="mono muted">@{user?.username}</p>
          <dl className="profile-meta">
            <div><dt>邮箱</dt><dd>{user?.email || '—'}</dd></div>
            <div><dt>角色</dt><dd><Tag bordered={false} className="tag-plain">{user?.roles.join('、') || 'user'}</Tag></dd></div>
            <div><dt>后台权限</dt><dd>{user?.canEnterAdmin ? '可进入' : '仅题库'}</dd></div>
          </dl>
        </section>
        <div className="profile-forms">
          <section className="surface-card form-card" aria-labelledby="nickname-title">
            <div className="form-card__head">
              <span className="form-card__icon" aria-hidden="true"><AppIcon icon="lucide:user-round" size={18} /></span>
              <div><h2 id="nickname-title">修改昵称</h2><p>昵称会显示在页面右上角。</p></div>
            </div>
            <Form layout="vertical" initialValues={{ nickname: user?.nickname }} onFinish={(values: NicknameForm) => void updateNickname(values)} requiredMark="optional">
              <Form.Item label="昵称" name="nickname" rules={[{ required: true, message: '请输入昵称' }, { max: 30, message: '昵称最多 30 个字符' }]}>
                <Input placeholder="你希望被怎么称呼" autoComplete="nickname" />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={nicknameMutation.isPending}>保存昵称</Button>
            </Form>
          </section>
          <section className="surface-card form-card" aria-labelledby="password-title">
            <div className="form-card__head">
              <span className="form-card__icon" aria-hidden="true"><AppIcon icon="lucide:lock-keyhole" size={18} /></span>
              <div><h2 id="password-title">修改密码</h2><p>改密后全部旧会话立即失效。</p></div>
            </div>
            <Alert type="warning" showIcon message="修改密码是一个严肃操作" description="提交后当前设备与其他设备都会退出，需要使用新密码重新登录。" className="form-alert" />
            <Form layout="vertical" onFinish={(values: PasswordForm) => void changePassword(values)} requiredMark="optional">
              <Form.Item label="当前密码" name="oldPassword" rules={[{ required: true, message: '请输入当前密码' }]}>
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Form.Item label="新密码" name="newPassword" rules={[
                { required: true, message: '请输入新密码' },
                { min: 8, max: 64, message: '密码长度需在 8~64 位之间' },
                { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: '密码必须同时包含字母和数字' },
              ]}>
                <Input.Password autoComplete="new-password" placeholder="至少 8 位，包含字母和数字" />
              </Form.Item>
              <Form.Item label="确认新密码" name="confirmPassword" dependencies={['newPassword']} rules={[
                { required: true, message: '请再次输入新密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve()
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}>
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button danger htmlType="submit" loading={passwordMutation.isPending}>修改密码并退出</Button>
            </Form>
          </section>
        </div>
      </div>
      <LearningPanel />
    </div>
  )
}
