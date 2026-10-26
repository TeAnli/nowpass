import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'

type ThemeMode = 'light' | 'dark'

interface ThemeContextValue {
  mode: ThemeMode
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue>({ mode: 'light', toggle: () => undefined })

export function useThemeMode() {
  return useContext(ThemeContext)
}

const STORAGE_KEY = 'nowpass.theme'

function initialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') return stored
  } catch {
    // ignore
  }
  return 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(initialMode)

  useEffect(() => {
    document.documentElement.dataset.theme = mode
    document.documentElement.style.colorScheme = mode
    const meta = document.querySelector('meta[name="theme-color"]')
    meta?.setAttribute('content', mode === 'dark' ? '#101d1d' : '#fbfaf6')
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch {
      // ignore
    }
  }, [mode])

  const value = useMemo(
    () => ({ mode, toggle: () => setMode((current) => (current === 'light' ? 'dark' : 'light')) }),
    [mode],
  )

  const isDark = mode === 'dark'

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        locale={zhCN}
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: {
            colorPrimary: isDark ? '#71b5a4' : '#17635c',
            colorInfo: isDark ? '#71b5a4' : '#17635c',
            colorError: isDark ? '#e69c83' : '#95472f',
            colorWarning: isDark ? '#d4b166' : '#9a6a19',
            colorSuccess: isDark ? '#b2c87b' : '#536c2e',
            colorText: isDark ? '#edf3eb' : '#172a2a',
            colorTextSecondary: isDark ? '#bfd0c5' : '#35504e',
            colorBgLayout: isDark ? '#101d1d' : '#fbfaf6',
            colorBgContainer: isDark ? '#142525' : '#fffefb',
            colorBorder: isDark ? '#29423f' : '#e9e4d6',
            borderRadius: 8,
            fontFamily: '"Manrope", "PingFang SC", "Microsoft YaHei", sans-serif',
          },
          components: {
            Button: { controlHeight: 40, fontWeight: 600 },
            Input: { controlHeight: 44 },
            Select: { controlHeight: 40 },
            Table: {
              headerBg: isDark ? '#1d3130' : '#f4f1e8',
              headerColor: isDark ? '#bfd0c5' : '#35504e',
            },
            Menu: { itemBorderRadius: 8 },
          },
        }}
      >
        <AntApp>{children}</AntApp>
      </ConfigProvider>
    </ThemeContext.Provider>
  )
}
