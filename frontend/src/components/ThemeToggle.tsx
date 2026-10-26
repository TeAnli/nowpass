import { Button, Tooltip } from 'antd'
import { AppIcon } from '@/components/AppIcon'
import { useThemeMode } from '@/theme/ThemeProvider'

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode()
  return (
    <Tooltip title={mode === 'light' ? '切换到深色主题' : '切换到浅色主题'}>
      <Button
        type="text"
        aria-label={mode === 'light' ? '切换到深色主题' : '切换到浅色主题'}
        icon={<AppIcon icon={mode === 'light' ? 'lucide:moon' : 'lucide:sun'} size={18} />}
        onClick={toggle}
      />
    </Tooltip>
  )
}
