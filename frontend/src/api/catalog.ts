import { apiRequest, toQueryString } from '@/lib/api'
import type {
  PageResult,
  QuestionAnswer,
  QuestionCategory,
  QuestionDetail,
  QuestionListItem,
  QuestionQuery,
} from '@/types/api'

export const catalogApi = {
  listQuestions: (query: QuestionQuery) =>
    apiRequest<PageResult<QuestionListItem>>(`/api/questions${toQueryString({ ...query })}`),

  getQuestion: (id: number) => apiRequest<QuestionDetail>(`/api/questions/${id}`),

  getAnswer: (id: number) => apiRequest<QuestionAnswer>(`/api/questions/${id}/answer`),

  listCategories: () => apiRequest<QuestionCategory[]>('/api/categories'),
}
