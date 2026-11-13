import { apiRequest, toQueryString } from '@/lib/api'
import type {
  FavoriteItem,
  FavoriteState,
  InterviewSessionDetail,
  InterviewSessionItem,
  LearningSummary,
  PageResult,
  ProgressItem,
  SelfRating,
} from '@nowpass/api-contracts'

export const learningApi = {
  favorites: (page = 1, pageSize = 20) =>
    apiRequest<PageResult<FavoriteItem>>(`/api/user/favorites${toQueryString({ page, pageSize })}`),
  favoriteState: (questionId: number) =>
    apiRequest<FavoriteState>(`/api/user/favorites/${questionId}`),
  addFavorite: (questionId: number) =>
    apiRequest<void>('/api/user/favorites', { method: 'POST', body: { questionId } }),
  removeFavorite: (questionId: number) =>
    apiRequest<void>(`/api/user/favorites/${questionId}`, { method: 'DELETE' }),
  recordProgress: (questionId: number, payload: { answerRevealed?: boolean; selfRating?: SelfRating }) =>
    apiRequest<void>(`/api/user/progress/${questionId}`, { method: 'POST', body: payload }),
  progress: (page = 1, pageSize = 20) =>
    apiRequest<PageResult<ProgressItem>>(`/api/user/progress${toQueryString({ page, pageSize })}`),
  summary: () => apiRequest<LearningSummary>('/api/user/learning/summary'),
}

export const interviewHistoryApi = {
  create: (questionId: number, questionTitle: string, provider?: string | null) =>
    apiRequest<number>('/api/interview/sessions', {
      method: 'POST',
      body: { questionId, questionTitle, provider: provider ?? null },
    }),
  appendTurn: (sessionId: number, userContent: string | null, assistantContent: string, provider?: string | null) =>
    apiRequest<void>(`/api/interview/sessions/${sessionId}/turns`, {
      method: 'POST',
      body: { userContent, assistantContent, provider: provider ?? null },
    }),
  finish: (sessionId: number, reportMd?: string | null) =>
    apiRequest<void>(`/api/interview/sessions/${sessionId}/finish`, {
      method: 'POST',
      body: { reportMd: reportMd ?? null },
    }),
  list: (page = 1, pageSize = 20) =>
    apiRequest<PageResult<InterviewSessionItem>>(`/api/interview/sessions${toQueryString({ page, pageSize })}`),
  detail: (sessionId: number) => apiRequest<InterviewSessionDetail>(`/api/interview/sessions/${sessionId}`),
}
