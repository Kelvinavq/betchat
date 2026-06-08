import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, resolveApiAsset } from '../utils/api'
import { DEFAULT_BUBBLE_CONFIG } from '../utils/bubbleIcons'

const DEFAULT_SYSTEM_CONFIG = {
  appName: 'BetChat',
  logoUrl: '',
  faviconUrl: '',
  iframeUrl: '',
  timezone: 'America/Bogota',
  supportType: 'phone',
  supportValue: '',
  supportText: '',
  clientRegistrationEnabled: true,
  clientLogoutEnabled: true,
  clientMenuVisible:    true,
  clientMenuEvents:     true,
  clientMenuHistory:    true,
  clientMenuFaq:        true,
  clientBalanceVisible: true,
  botMode: 'manual',
  botAiModel: '',
  botAiTemperature: 0.1,
  botAiMaxTokens: 250,
  bubbleConfig: DEFAULT_BUBBLE_CONFIG,
}

const SystemConfigContext = createContext({
  systemConfig: DEFAULT_SYSTEM_CONFIG,
  configLoading: true,
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
  iframeUrl: String(config.iframeUrl || config.iframe_url || ''),
  timezone: String(config.timezone || DEFAULT_SYSTEM_CONFIG.timezone),
  supportType: config.supportType === 'link' || config.support_type === 'link' ? 'link' : 'phone',
  supportValue: String(config.supportValue || config.support_value || ''),
  supportText:  String(config.supportText  || config.support_text  || ''),
  clientRegistrationEnabled: configFlag(config.clientRegistrationEnabled ?? config.client_registration_enabled, true),
  clientLogoutEnabled:       configFlag(config.clientLogoutEnabled       ?? config.client_logout_enabled,       true),
  clientMenuVisible:         configFlag(config.clientMenuVisible         ?? config.client_menu_visible,         true),
  clientMenuEvents:          configFlag(config.clientMenuEvents          ?? config.client_menu_events,          true),
  clientMenuHistory:         configFlag(config.clientMenuHistory         ?? config.client_menu_history,         true),
  clientMenuFaq:             configFlag(config.clientMenuFaq             ?? config.client_menu_faq,             true),
  clientBalanceVisible:      configFlag(config.clientBalanceVisible      ?? config.client_balance_visible,      true),
  botMode: String(config.botMode || config.bot_mode || DEFAULT_SYSTEM_CONFIG.botMode).toLowerCase() === 'hybrid_ai' ? 'hybrid_ai' : 'manual',
  botAiModel: String(config.botAiModel || config.bot_ai_model || ''),
  botAiTemperature: Number.isFinite(Number(config.botAiTemperature ?? config.bot_ai_temperature))
    ? Math.max(0, Math.min(2, Number(config.botAiTemperature ?? config.bot_ai_temperature)))
    : DEFAULT_SYSTEM_CONFIG.botAiTemperature,
  botAiMaxTokens: Number.isFinite(Number(config.botAiMaxTokens ?? config.bot_ai_max_tokens))
    ? Math.max(1, Math.min(2000, Math.floor(Number(config.botAiMaxTokens ?? config.bot_ai_max_tokens))))
    : DEFAULT_SYSTEM_CONFIG.botAiMaxTokens,
  bubbleConfig: config.bubbleConfig
    ? { ...DEFAULT_BUBBLE_CONFIG, ...config.bubbleConfig }
    : DEFAULT_BUBBLE_CONFIG,
})

export const SystemConfigProvider = ({ children }) => {
  const [systemConfig, setSystemConfigState] = useState(DEFAULT_SYSTEM_CONFIG)
  const [configLoading, setConfigLoading] = useState(true)

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
    refreshSystemConfig()
      .catch(() => {})
      .finally(() => setConfigLoading(false))
  }, [refreshSystemConfig])

  const value = useMemo(() => ({
    systemConfig,
    configLoading,
    refreshSystemConfig,
    setSystemConfig,
  }), [refreshSystemConfig, setSystemConfig, systemConfig, configLoading])

  return (
    <SystemConfigContext.Provider value={value}>
      {children}
    </SystemConfigContext.Provider>
  )
}

export const useSystemConfig = () => useContext(SystemConfigContext)

export default SystemConfigContext
