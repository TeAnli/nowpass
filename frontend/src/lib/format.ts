const dateTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

const dateFormatter = new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function toDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === '') return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value: string | number | null | undefined): string {
  const date = toDate(value)
  return date ? dateTimeFormatter.format(date) : '—'
}

export function formatDate(value: string | number | null | undefined): string {
  const date = toDate(value)
  return date ? dateFormatter.format(date) : '—'
}

export function formatDuration(milliseconds: number | null | undefined): string {
  if (milliseconds === null || milliseconds === undefined) return '—'
  if (milliseconds < 1000) return `${milliseconds} ms`
  return `${(milliseconds / 1000).toFixed(2)} s`
}

/** 视频秒数格式化为 12:34 / 1:02:03 */
export function formatVideoDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds <= 0) return '00:00'
  const seconds = Math.floor(totalSeconds)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remain = seconds % 60
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remain).padStart(2, '0')}`
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0'
  return new Intl.NumberFormat('zh-CN').format(value)
}

export const DIFFICULTY_LABEL = {
  easy: '基础',
  medium: '进阶',
  hard: '深入',
} as const

export function difficultyLabel(value: string | null | undefined): string {
  if (value === 'easy' || value === 'medium' || value === 'hard') return DIFFICULTY_LABEL[value]
  return '未标注'
}
