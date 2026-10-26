import { apiRequest } from '@/lib/api'
import type { CaptchaResponse, LoginResult, UserProfile } from '@/types/api'

export interface LoginPayload {
  username: string
  password: string
  captchaUuid: string
  captchaCode: string
}

export interface RegisterPayload {
  username: string
  password: string
  nickname?: string
  email: string
  emailCode: string
}

export interface ResetPasswordPayload {
  email: string
  emailCode: string
  newPassword: string
}

export interface EmailCodePayload {
  email: string
  scene: 'register' | 'reset'
  captchaUuid: string
  captchaCode: string
}

export const authApi = {
  captcha: () => apiRequest<CaptchaResponse>('/api/auth/captcha', { auth: false }),

  login: (payload: LoginPayload) =>
    apiRequest<LoginResult>('/api/auth/login', { method: 'POST', body: payload, auth: false }),

  sendEmailCode: (payload: EmailCodePayload) =>
    apiRequest<void>('/api/auth/email-code', { method: 'POST', body: payload, auth: false }),

  register: (payload: RegisterPayload) =>
    apiRequest<number>('/api/auth/register', { method: 'POST', body: payload, auth: false }),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiRequest<void>('/api/auth/reset-password', { method: 'POST', body: payload, auth: false }),

  me: () => apiRequest<UserProfile>('/api/auth/me'),

  logout: () => apiRequest<void>('/api/auth/logout', { method: 'POST' }),

  updateProfile: (nickname: string) =>
    apiRequest<void>('/api/user/profile', { method: 'PUT', body: { nickname } }),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiRequest<void>('/api/user/password', {
      method: 'PUT',
      body: { oldPassword, newPassword },
    }),
}
