import type { UserProfile } from '@/types/api'

export const PERMISSIONS = {
  questionAdd: 'question:add',
  questionEdit: 'question:edit',
  questionRemove: 'question:remove',
  categoryAdd: 'category:add',
  categoryEdit: 'category:edit',
  categoryRemove: 'category:remove',
  videoAdd: 'video:add',
  videoEdit: 'video:edit',
  videoRemove: 'video:remove',
  videoPublish: 'video:publish',
  videoCategoryAdd: 'video:category:add',
  videoCategoryEdit: 'video:category:edit',
  videoCategoryRemove: 'video:category:remove',
  userAdd: 'system:user:add',
  userEdit: 'system:user:edit',
  userApprove: 'system:user:approve',
  userRemove: 'system:user:remove',
  userResetPwd: 'system:user:resetPwd',
  onlineForceLogout: 'monitor:online:forceLogout',
} as const

export function hasPermission(user: UserProfile | null, permission: string): boolean {
  if (!user) return false
  if (user.permissions.includes('*:*:*')) return true
  return user.permissions.includes(permission)
}
