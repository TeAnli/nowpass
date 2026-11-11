import type { ApiEnvelope } from '@nowpass/api-contracts'
import { authStorage } from '@/lib/storage'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export const AUTH_EXPIRED_EVENT = 'nowpass:auth-expired'

export class ApiError extends Error {
  readonly code: number
  readonly status: number

  constructor(message: string, code = 0, status = 0) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json; charset=utf-8')
  }
  if (options.auth !== false) {
    const token = authStorage.getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      credentials: 'omit',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('无法连接服务器，请确认后端已启动后重试。', 0, 0)
  }

  const expireHeader = response.headers.get('X-Token-Expire-At')
  if (expireHeader) {
    const expireAt = Number(expireHeader)
    if (Number.isFinite(expireAt)) authStorage.setExpireAt(expireAt)
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null

  if (response.status === 401 && options.auth !== false) {
    authStorage.clear()
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    throw new ApiError(payload?.msg ?? '登录状态已过期，请重新登录。', payload?.code ?? 401, 401)
  }

  if (!response.ok) {
    throw new ApiError(
      payload?.msg ?? `请求失败（HTTP ${response.status}）`,
      payload?.code ?? response.status,
      response.status,
    )
  }

  if (!payload) {
    throw new ApiError('服务器返回了无法解析的响应。', 500, response.status)
  }

  if (payload.code !== 200) {
    throw new ApiError(payload.msg || '操作失败，请稍后重试。', payload.code, response.status)
  }

  return payload.data as T
}

export function toQueryString(params: Record<string, unknown>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    if (Array.isArray(value)) {
      if (value.length > 0) search.set(key, value.join(','))
      return
    }
    search.set(key, String(value))
  })
  const query = search.toString()
  return query ? `?${query}` : ''
}
