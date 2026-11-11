import { apiRequest, toQueryString } from '@/lib/api'
import type {
  CreateUserCommand,
  OnlineSession,
  OperLogItem,
  OperLogQuery,
  PageResult,
  QuestionAnswer,
  QuestionCategory,
  QuestionDetail,
  QuestionListItem,
  QuestionQuery,
  QuestionUpsertCommand,
  RoleOption,
  UserListItem,
  UserQuery,
} from '@nowpass/api-contracts'

export const adminApi = {
  listQuestions: (query: QuestionQuery) =>
    apiRequest<PageResult<QuestionListItem>>(`/api/admin/questions${toQueryString({ ...query })}`),

  getQuestion: (id: number) => apiRequest<QuestionDetail>(`/api/admin/questions/${id}`),

  getAnswer: (id: number) => apiRequest<QuestionAnswer>(`/api/admin/questions/${id}/answer`),

  createQuestion: (command: QuestionUpsertCommand) =>
    apiRequest<number>('/api/admin/questions', { method: 'POST', body: command }),

  updateQuestion: (id: number, command: QuestionUpsertCommand) =>
    apiRequest<void>(`/api/admin/questions/${id}`, { method: 'PUT', body: command }),

  deleteQuestion: (id: number) =>
    apiRequest<void>(`/api/admin/questions/${id}`, { method: 'DELETE' }),

  listCategories: () => apiRequest<QuestionCategory[]>('/api/admin/categories'),

  createCategory: (name: string, icon: string | null, sort: number) =>
    apiRequest<number>('/api/admin/categories', { method: 'POST', body: { name, icon, sort } }),

  updateCategory: (id: number, name: string, icon: string | null, sort: number) =>
    apiRequest<void>(`/api/admin/categories/${id}`, { method: 'PUT', body: { name, icon, sort } }),

  deleteCategory: (id: number) =>
    apiRequest<void>(`/api/admin/categories/${id}`, { method: 'DELETE' }),

  listUsers: (query: UserQuery) =>
    apiRequest<PageResult<UserListItem>>(`/api/admin/users${toQueryString({ ...query })}`),

  listRoles: () => apiRequest<RoleOption[]>('/api/admin/users/roles'),

  createUser: (command: CreateUserCommand) =>
    apiRequest<number>('/api/admin/users', { method: 'POST', body: command }),

  changeUserStatus: (id: number, status: UserListItem['status']) =>
    apiRequest<void>(`/api/admin/users/${id}/status`, { method: 'PUT', body: { status } }),

  changeUserRole: (id: number, roleKey: string) =>
    apiRequest<void>(`/api/admin/users/${id}/role`, { method: 'PUT', body: { roleKey } }),

  resetUserPassword: (id: number, newPassword: string) =>
    apiRequest<void>(`/api/admin/users/${id}/reset-password`, {
      method: 'PUT',
      body: { newPassword },
    }),

  deleteUser: (id: number) => apiRequest<void>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  listOnlineSessions: () => apiRequest<OnlineSession[]>('/api/admin/online'),

  forceLogout: (tokenId: string) =>
    apiRequest<void>(`/api/admin/online/${encodeURIComponent(tokenId)}`, { method: 'DELETE' }),

  listOperLogs: (query: OperLogQuery) =>
    apiRequest<PageResult<OperLogItem>>(`/api/admin/oper-logs${toQueryString({ ...query })}`),
}
