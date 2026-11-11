export interface ApiEnvelope<T> {
  code: number
  msg: string
  data?: T
}

export interface PageResult<T> {
  total: number
  page: number
  pageSize: number
  rows: T[]
}

export interface UserProfile {
  id: number
  username: string
  nickname: string
  email: string
  roles: string[]
  permissions: string[]
  canEnterAdmin: boolean
}

export interface LoginResult {
  token: string
  expireAt: number
  user: UserProfile
}

export interface CaptchaResponse {
  uuid: string
  img: string
}

export interface QuestionOption {
  key: string
  text: string
}

export interface QuestionListItem {
  id: number
  categoryId: number
  categoryName: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  title: string
  tags: string[]
  viewCount: number
  createTime: string | null
}

export interface QuestionDetail {
  id: number
  categoryId: number
  categoryName: string | null
  difficulty: 'easy' | 'medium' | 'hard'
  title: string
  contentMd: string
  options: QuestionOption[] | null
  tags: string[]
  createTime: string | null
}

export interface QuestionAnswer {
  id: number
  answerMd: string
  answerKey: string | null
}

export interface QuestionCategory {
  id: number
  name: string
  icon: string | null
  sort: number
  questionCount: number
  majorCategoryId?: number | null
  majorCategoryName?: string | null
  majorCategorySort?: number | null
}

export interface VideoCategory {
  id: number
  name: string
  sort: number
  videoCount: number
}

export interface VideoListItem {
  id: number
  title: string
  speaker: string | null
  categoryId: number
  categoryName: string | null
  tags: string[]
  durationSeconds: number
  coverUrl: string | null
  publishedAt: string | null
}

export interface VideoDetail {
  id: number
  title: string
  description: string | null
  speaker: string | null
  categoryId: number
  categoryName: string | null
  questionId: number | null
  questionTitle: string | null
  tags: string[]
  durationSeconds: number
  coverUrl: string | null
  playUrl: string
  publishedAt: string | null
}

export interface VideoCommentItem {
  id: number
  videoId: number
  userId: number
  nickname: string
  content: string
  createTime: string
}

export type DanmakuMode = 'scroll' | 'top' | 'bottom'

export interface VideoDanmakuItem {
  id: number
  videoId: number
  userId: number
  nickname: string
  content: string
  timeMs: number
  color: string
  mode: DanmakuMode
  createTime: string
}

export interface VideoAdminItem extends VideoListItem {
  description: string | null
  questionId: number | null
  videoObjectKey: string | null
  coverObjectKey: string | null
  sizeBytes: number
  contentType: string | null
  status: 'draft' | 'published' | 'offline'
  createTime: string | null
  updateTime: string | null
}

export interface VideoQuery {
  page?: number
  pageSize?: number
  categoryId?: number | null
  keyword?: string
  tag?: string | null
  status?: string | null
}

export interface VideoUpsertCommand {
  title: string
  description?: string | null
  speaker?: string | null
  categoryId: number
  questionId?: number | null
  tags?: string[]
  durationSeconds?: number
}

export interface VideoUploadTicket {
  uploadUrl: string
  objectKey: string
  expiresInSeconds: number
}

export type Difficulty = QuestionListItem['difficulty']
export type QuestionSort = 'latest' | 'hot' | 'oldest' | 'title'

export interface QuestionQuery {
  page?: number
  pageSize?: number
  categoryId?: number | null
  difficulty?: Difficulty | null
  keyword?: string | null
  tag?: string | null
  sort?: QuestionSort | null
}

export interface QuestionUpsertCommand {
  categoryId: number
  difficulty: Difficulty
  title: string
  contentMd: string
  answerMd: string
  options: QuestionOption[] | null
  answerKey: string | null
  tags: string[]
}

export interface UserListItem {
  id: number
  username: string
  nickname: string
  email: string
  status: 'pending' | 'active' | 'disabled'
  roleKeys: string[]
  createTime: string | null
}

export interface UserQuery {
  page?: number
  pageSize?: number
  keyword?: string | null
  status?: string | null
}

export interface RoleOption {
  roleKey: string
  roleName: string
}

export interface CreateUserCommand {
  username: string
  password: string
  nickname?: string | null
  email: string
  roleKey: string
}

export interface OnlineSession {
  tokenId: string
  userId: number
  username: string
  nickname: string
  loginIp: string
  loginTime: number
  expireAt: number
}

export interface OperLogItem {
  id: number
  title: string
  businessType: string
  requestMethod: string | null
  operName: string | null
  operUrl: string | null
  operIp: string | null
  status: 'success' | 'fail'
  errorMsg: string | null
  costTime: number | null
  operTime: string | null
}

export interface OperLogQuery {
  page?: number
  pageSize?: number
  title?: string | null
  operName?: string | null
  status?: string | null
}
