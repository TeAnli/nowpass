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

export const interviewApi = {
  chat: (questionId: number, history: InterviewMessage[]) =>
    apiRequest<InterviewReply>('/api/interview/chat', {
      method: 'POST',
      body: { questionId, history },
    }),
}
