import { useEffect } from 'react'
import { useSystemConfig } from '../../context/SystemConfigContext'
import { applyThemeConfig } from '../../styles/appThemes'

const fallback = { clientTheme: 'betchat-dark', adminTheme: 'dark-blue' }

const ThemeRuntime = ({ children }) => {
  const { themeConfig } = useSystemConfig()

  useEffect(() => {
    applyThemeConfig(themeConfig || fallback)
  }, [themeConfig])

  return children
}

export default ThemeRuntime
