import { useState } from 'react'
import { AppIcon } from '@/components/AppIcon'
import { formatVideoDuration } from '@/lib/format'

interface VideoCoverProps {
  url: string | null | undefined
  title: string
  durationSeconds?: number
  className?: string
}

export function VideoCover({ url, title, durationSeconds = 0, className = '' }: VideoCoverProps) {
  const [failed, setFailed] = useState(false)
  return (
    <div className={`video-cover ${className}`}>
      {url && !failed ? (
        <img src={url} alt={`${title} 封面`} loading="lazy" onError={() => setFailed(true)} />
      ) : (
        <div className="video-cover__placeholder" aria-hidden="true">
          <span>{title.slice(0, 1)}</span>
          <AppIcon icon="lucide:play" size={22} />
        </div>
      )}
      {durationSeconds > 0 && (
        <span className="video-cover__duration mono">{formatVideoDuration(durationSeconds)}</span>
      )}
    </div>
  )
}
