import { BgColorsOutlined } from '@ant-design/icons'
import { Button, Tooltip } from 'antd'
import { useThemeMode } from '@/theme/ThemeProvider'

export function ThemeToggle() {
  const { mode, toggle } = useThemeMode()
  return (
    <Tooltip title={mode === 'light' ? '切换到深色主题' : '切换到浅色主题'}>
      <Button
        type="text"
        aria-label={mode === 'light' ? '切换到深色主题' : '切换到浅色主题'}
        icon={<BgColorsOutlined />}
        onClick={toggle}
      />
    </Tooltip>
  )
}
