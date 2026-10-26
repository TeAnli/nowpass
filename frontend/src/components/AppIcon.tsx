import { Icon } from '@iconify/react'
import type { CSSProperties } from 'react'

interface AppIconProps {
  icon: string
  size?: number | string
  className?: string
  style?: CSSProperties
}

export function AppIcon({ icon, size = 18, className, style }: AppIconProps) {
  return (
    <Icon
      icon={icon}
      width={size}
      height={size}
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    />
  )
}
