import { useEffect } from 'react'
import { api } from '../../utils/api'
import { applyThemeConfig } from '../../styles/appThemes'

const fallback = { clientTheme: 'betchat-dark', adminTheme: 'dark-blue' }

const ThemeRuntime = ({ children }) => {
  useEffect(() => {
    let alive = true
    applyThemeConfig(fallback)

    api.get('/api/settings/themes')
      .then(data => {
        if (!alive) return
        applyThemeConfig(data.themeConfig || fallback)
      })
      .catch(() => {
        if (alive) applyThemeConfig(fallback)
      })

    return () => { alive = false }
  }, [])

  return children
}

export default ThemeRuntime
