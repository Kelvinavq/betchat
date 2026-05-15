import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, resolveApiAsset } from '../utils/api'

const DEFAULT_SYSTEM_CONFIG = {
  appName: 'BetChat',
  logoUrl: '',
  faviconUrl: '',
  timezone: 'America/Bogota',
  supportType: 'phone',
  supportValue: '',
  clientRegistrationEnabled: true,
  clientLogoutEnabled: true,
}

const SystemConfigContext = createContext({
  systemConfig: DEFAULT_SYSTEM_CONFIG,
  refreshSystemConfig: async () => DEFAULT_SYSTEM_CONFIG,
  setSystemConfig: () => {},
})

const configFlag = (value, fallback = true) => {
  if (value === undefined || value === null) return fallback
  return !(value === false || value === 0 || value === '0')
}

const normalizeSystemConfig = (config = {}) => ({
  appName: String(config.appName || config.app_name || DEFAULT_SYSTEM_CONFIG.appName).trim() || DEFAULT_SYSTEM_CONFIG.appName,
  logoUrl: resolveApiAsset(config.logoUrl || config.logo_url || ''),
  faviconUrl: resolveApiAsset(config.faviconUrl || config.favicon_url || ''),
  timezone: String(config.timezone || DEFAULT_SYSTEM_CONFIG.timezone),
  supportType: config.supportType === 'link' || config.support_type === 'link' ? 'link' : 'phone',
  supportValue: String(config.supportValue || config.support_value || ''),
  clientRegistrationEnabled: configFlag(config.clientRegistrationEnabled ?? config.client_registration_enabled, true),
  clientLogoutEnabled: configFlag(config.clientLogoutEnabled ?? config.client_logout_enabled, true),
})

export const SystemConfigProvider = ({ children }) => {
  const [systemConfig, setSystemConfigState] = useState(DEFAULT_SYSTEM_CONFIG)

  const setSystemConfig = useCallback((config) => {
    setSystemConfigState(normalizeSystemConfig(config))
  }, [])

  const refreshSystemConfig = useCallback(async () => {
    const data = await api.get('/api/settings/public')
    const next = normalizeSystemConfig(data.system || data.systemConfig || {})
    setSystemConfigState(next)
    return next
  }, [])

  /* keep browser title + favicon in sync with config */
  useEffect(() => {
    document.title = systemConfig.appName

    const link = document.querySelector("link[rel~='icon']")
    if (link) {
      const iconUrl = systemConfig.faviconUrl || systemConfig.logoUrl
      if (iconUrl) {
        link.type = ''
        link.href = iconUrl
      } else {
        link.type = 'image/svg+xml'
        link.href = '/favicon.svg'
      }
    }
  }, [systemConfig.appName, systemConfig.faviconUrl, systemConfig.logoUrl])

  useEffect(() => {
    refreshSystemConfig().catch(() => {})
  }, [refreshSystemConfig])

  const value = useMemo(() => ({
    systemConfig,
    refreshSystemConfig,
    setSystemConfig,
  }), [refreshSystemConfig, setSystemConfig, systemConfig])

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  )
}

export const useSystemConfig = () => useContext(SystemConfigContext)

export default SystemConfigContext
