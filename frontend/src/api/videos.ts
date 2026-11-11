import { apiRequest, toQueryString } from '@/lib/api'
import type {
  PageResult,
  VideoAdminItem,
  VideoCategory,
  VideoDetail,
  VideoListItem,
  VideoQuery,
  VideoUploadTicket,
  VideoUpsertCommand,
} from '@nowpass/api-contracts'

export const videoApi = {
  list: (query: VideoQuery) => apiRequest<PageResult<VideoListItem>>(`/api/videos${toQueryString({ ...query })}`),
  detail: (id: number) => apiRequest<VideoDetail>(`/api/videos/${id}`),
  playUrl: (id: number) => apiRequest<{ url: string }>(`/api/videos/${id}/play`),
  tags: () => apiRequest<string[]>('/api/videos/tags'),
  categories: () => apiRequest<VideoCategory[]>('/api/videos/categories'),
}

export const adminVideoApi = {
  list: (query: VideoQuery) =>
    apiRequest<PageResult<VideoAdminItem>>(`/api/admin/videos${toQueryString({ ...query })}`),
  detail: (id: number) => apiRequest<VideoAdminItem>(`/api/admin/videos/${id}`),
  create: (command: VideoUpsertCommand) =>
    apiRequest<number>('/api/admin/videos', { method: 'POST', body: command }),
  update: (id: number, command: VideoUpsertCommand) =>
    apiRequest<void>(`/api/admin/videos/${id}`, { method: 'PUT', body: command }),
  uploadUrl: (id: number, kind: 'video' | 'cover', contentType: string) =>
    apiRequest<VideoUploadTicket>(`/api/admin/videos/${id}/upload-url`, {
      method: 'POST',
      body: { kind, contentType },
    }),
  finalize: (id: number, durationSeconds: number) =>
    apiRequest<void>(`/api/admin/videos/${id}/finalize`, {
      method: 'POST',
      body: { durationSeconds },
    }),
  publish: (id: number) => apiRequest<void>(`/api/admin/videos/${id}/publish`, { method: 'POST' }),
  offline: (id: number) => apiRequest<void>(`/api/admin/videos/${id}/offline`, { method: 'POST' }),
  remove: (id: number) => apiRequest<void>(`/api/admin/videos/${id}`, { method: 'DELETE' }),
  previewUrl: (id: number) => apiRequest<{ url: string }>(`/api/admin/videos/${id}/preview-url`),
  cleanup: () => apiRequest<{ deletedDrafts: number; deletedObjects: number }>('/api/admin/videos/cleanup', { method: 'POST' }),
  listCategories: () => apiRequest<VideoCategory[]>('/api/admin/video-categories'),
  createCategory: (name: string, sort: number) =>
    apiRequest<number>('/api/admin/video-categories', { method: 'POST', body: { name, sort } }),
  updateCategory: (id: number, name: string, sort: number) =>
    apiRequest<void>(`/api/admin/video-categories/${id}`, { method: 'PUT', body: { name, sort } }),
  deleteCategory: (id: number) =>
    apiRequest<void>(`/api/admin/video-categories/${id}`, { method: 'DELETE' }),
}
