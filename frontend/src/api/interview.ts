import { apiRequest } from '@/lib/api'

export interface InterviewMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface InterviewReply {
  reply: string
  provider: string
  questionId: number
}

export type InterviewAction = 'chat' | 'hint' | 'review'

export interface InterviewStatus {
  configured: boolean
  model: string | null
  provider: string
}

export const interviewApi = {
  status: () => apiRequest<InterviewStatus>('/api/interview/status'),
  chat: (questionId: number, history: InterviewMessage[], action: InterviewAction = 'chat', signal?: AbortSignal) =>
    apiRequest<InterviewReply>('/api/interview/chat', {
      method: 'POST',
      body: { questionId, history: history.slice(-20), action },
      signal,
    }),
}
