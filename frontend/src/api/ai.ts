import { apiRequest, toQueryString } from '@/lib/api'
import type { AiOverview, AiPrompt, AiUsageItem, PageResult, SupportReply } from '@nowpass/api-contracts'

export const adminAiApi = {
  overview: () => apiRequest<AiOverview>('/api/admin/ai/overview'),
  prompts: () => apiRequest<AiPrompt[]>('/api/admin/ai/prompts'),
  updatePrompt: (key: string, content: string) =>
    apiRequest<void>(`/api/admin/ai/prompts/${key}`, { method: 'PUT', body: { content } }),
  usage: (page = 1, pageSize = 20) =>
    apiRequest<PageResult<AiUsageItem>>(`/api/admin/ai/usage${toQueryString({ page, pageSize })}`),
}

export interface SupportMessage {
  role: 'user' | 'assistant'
  content: string
}

export const supportApi = {
  chat: (message: string, history: SupportMessage[]) =>
    apiRequest<SupportReply>('/api/support/chat', {
      method: 'POST',
      body: { message, history: history.slice(-8) },
    }),
}
