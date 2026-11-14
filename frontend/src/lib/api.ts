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

function authHeaders(options: RequestOptions, accept: string): Headers {
  const headers = new Headers({ Accept: accept })
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json; charset=utf-8')
  }
  if (options.auth !== false) {
    const token = authStorage.getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  return headers
}

function updateTokenExpiry(response: Response): void {
  const expireHeader = response.headers.get('X-Token-Expire-At')
  if (!expireHeader) return
  const expireAt = Number(expireHeader)
  if (Number.isFinite(expireAt)) authStorage.setExpireAt(expireAt)
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: authHeaders(options, 'application/json'),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      credentials: 'omit',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('无法连接服务器，请确认后端已启动后重试。', 0, 0)
  }

  updateTokenExpiry(response)
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

export async function apiRequestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: authHeaders(options, 'audio/mpeg, application/json'),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      credentials: 'omit',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('无法连接服务器，请确认后端已启动后重试。', 0, 0)
  }

  updateTokenExpiry(response)
  if (response.status === 401 && options.auth !== false) {
    authStorage.clear()
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    throw new ApiError('登录状态已过期，请重新登录。', 401, 401)
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null
    throw new ApiError(payload?.msg ?? `语音请求失败（HTTP ${response.status}）`, payload?.code ?? response.status, response.status)
  }

  const contentType = response.headers.get('Content-Type') ?? ''
  if (contentType.includes('application/json')) {
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null
    throw new ApiError(payload?.msg ?? '语音请求失败，请稍后重试。', payload?.code ?? 500, response.status)
  }

  return response.blob()
}

function parseSseChunk(raw: string, onEvent: (event: string, data: unknown) => void): void {
  let event = 'message'
  const dataLines: string[] = []
  raw.split(/\r?\n/).forEach((line) => {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
  })
  if (dataLines.length === 0) return
  const text = dataLines.join('\n')
  let parsed: unknown = text
  try {
    parsed = JSON.parse(text)
  } catch {
    // 非 JSON 数据按原文透传
  }
  onEvent(event, parsed)
}

/** 以 SSE 方式请求接口，逐事件回调；用于流式展示思考过程。 */
export async function apiStream(
  path: string,
  options: RequestOptions,
  onEvent: (event: string, data: unknown) => void,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'POST',
      headers: authHeaders(options, 'text/event-stream'),
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      credentials: 'omit',
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError('无法连接服务器，请确认后端已启动后重试。', 0, 0)
  }

  updateTokenExpiry(response)

  if (response.status === 401 && options.auth !== false) {
    authStorage.clear()
    window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
    throw new ApiError('登录状态已过期，请重新登录。', 401, 401)
  }

  if (!response.ok || !response.body) {
    const payload = (await response.json().catch(() => null)) as ApiEnvelope<unknown> | null
    throw new ApiError(
      payload?.msg ?? `流式请求失败（HTTP ${response.status}）`,
      payload?.code ?? response.status,
      response.status,
    )
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const boundaryPattern = /\r?\n\r?\n/
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let match = boundaryPattern.exec(buffer)
    while (match) {
      parseSseChunk(buffer.slice(0, match.index), onEvent)
      buffer = buffer.slice(match.index + match[0].length)
      match = boundaryPattern.exec(buffer)
    }
  }
  if (buffer.trim()) parseSseChunk(buffer, onEvent)
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
