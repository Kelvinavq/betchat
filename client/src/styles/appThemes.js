export const CLIENT_THEMES = [
  {
    id: 'betchat-dark',
    name: 'BetChat Dark',
    desc: 'Tema por defecto. Oscuro con acentos azules.',
    headerBg: '#0f1122', headerColor: '#ffffff',
    bodyBg: '#08080f',
    sentBubble: '#1e40af', sentText: '#dbeafe',
    recvBubble: '#1a1a2e', recvText: '#e2e8f0',
    inputBg: '#111124', accent: '#2563eb',
    isDark: true,
    surface: '#111124', surface2: '#1a1a30',
    border: 'rgba(255,255,255,0.08)',
    textPrimary: '#f8fafc', textSecondary: '#94a3b8', textMuted: 'rgba(255,255,255,0.28)',
    waTheme: false,
    buttonGradient: 'linear-gradient(135deg, #0d1d6e 0%, #2563eb 100%)',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Tema claro estilo WhatsApp con patron de fondo.',
    headerBg: '#128C7E', headerColor: '#ffffff',
    bodyBg: '#e5ddd5',
    sentBubble: '#dcf8c6', sentText: '#111b21',
    recvBubble: '#ffffff', recvText: '#111b21',
    inputBg: '#f0f2f5', accent: '#128C7E',
    isDark: false,
    surface: '#ffffff', surface2: '#f0f2f5',
    border: 'rgba(0,0,0,0.09)',
    textPrimary: '#111b21', textSecondary: '#54656f', textMuted: 'rgba(0,0,0,0.35)',
    waTheme: true,
    buttonGradient: 'linear-gradient(135deg, #085a52 0%, #128C7E 100%)',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    desc: 'Oscuro profundo con acentos violeta.',
    headerBg: '#1a0a2e', headerColor: '#e9d5ff',
    bodyBg: '#0d0520',
    sentBubble: '#5b21b6', sentText: '#ede9fe',
    recvBubble: '#1e1040', recvText: '#ddd6fe',
    inputBg: '#150830', accent: '#7c3aed',
    isDark: true,
    surface: '#1a1040', surface2: '#22164e',
    border: 'rgba(167,139,250,0.12)',
    textPrimary: '#ede9fe', textSecondary: '#a78bfa', textMuted: 'rgba(221,214,254,0.32)',
    waTheme: false,
    buttonGradient: 'linear-gradient(135deg, #380d78 0%, #7c3aed 100%)',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    desc: 'Azul profundo con acentos cyan.',
    headerBg: '#0c1a2e', headerColor: '#bae6fd',
    bodyBg: '#071525',
    sentBubble: '#0369a1', sentText: '#e0f2fe',
    recvBubble: '#0f2a44', recvText: '#bae6fd',
    inputBg: '#0a2038', accent: '#0891b2',
    isDark: true,
    surface: '#0f2a44', surface2: '#143454',
    border: 'rgba(186,230,253,0.10)',
    textPrimary: '#e0f2fe', textSecondary: '#7dd3fc', textMuted: 'rgba(186,230,253,0.32)',
    waTheme: false,
    buttonGradient: 'linear-gradient(135deg, #043a5e 0%, #0891b2 100%)',
  },
  {
    id: 'esmeralda',
    name: 'Esmeralda',
    desc: 'Verde oscuro con acentos esmeralda.',
    headerBg: '#052e16', headerColor: '#bbf7d0',
    bodyBg: '#021a0c',
    sentBubble: '#166534', sentText: '#dcfce7',
    recvBubble: '#0a2e14', recvText: '#bbf7d0',
    inputBg: '#041a0a', accent: '#059669',
    isDark: true,
    surface: '#0a2e14', surface2: '#0e3a1a',
    border: 'rgba(187,247,208,0.10)',
    textPrimary: '#dcfce7', textSecondary: '#86efac', textMuted: 'rgba(187,247,208,0.30)',
    waTheme: false,
    buttonGradient: 'linear-gradient(135deg, #073c1a 0%, #059669 100%)',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    desc: 'Oscuro calido con acentos naranja-rojo.',
    headerBg: '#1c0a0a', headerColor: '#fecaca',
    bodyBg: '#120505',
    sentBubble: '#991b1b', sentText: '#fee2e2',
    recvBubble: '#2a0c0c', recvText: '#fecaca',
    inputBg: '#1a0808', accent: '#dc2626',
    isDark: true,
    surface: '#2a0c0c', surface2: '#350f0f',
    border: 'rgba(254,202,202,0.10)',
    textPrimary: '#fee2e2', textSecondary: '#fca5a5', textMuted: 'rgba(254,202,202,0.30)',
    waTheme: false,
    buttonGradient: 'linear-gradient(135deg, #5c0808 0%, #dc2626 100%)',
  },
  {
    id: 'lime',
    name: 'Lime',
    desc: 'Oscuro moderno con acentos lima vibrantes.',
    headerBg: '#0c0e06',
    headerColor: '#b8d040',
    bodyBg: '#080908',
    sentBubble: '#1a2603',
    sentText: '#e0f07a',
    recvBubble: '#111410',
    recvText: '#c4d8a0',
    inputBg: '#0c0e07',
    accent: '#a0b828',
    isDark: true,
    surface: '#131708',
    surface2: '#1c2109',
    border: 'rgba(160,184,40,0.13)',
    textPrimary: '#d4e878',
    textSecondary: '#728040',
    textMuted: 'rgba(212,232,120,0.28)',
    waTheme: false,
    buttonGradient: 'linear-gradient(135deg, #1a2603 0%, #a0b828 100%)',
  },
  {
    id: 'gold',
    name: 'Gold',
    desc: 'Oscuro premium con acentos dorados.',
    headerBg: '#13110c',
    headerColor: '#f5e6c8',
    bodyBg: '#0a0804',
    sentBubble: '#3d2a0c',
    sentText: '#f7e8c4',
    recvBubble: '#1a160e',
    recvText: '#e8dcc8',
    inputBg: '#0f0d09',
    accent: '#d4a520',
    isDark: true,
    surface: '#1a160e',
    surface2: '#231e14',
    border: 'rgba(212,165,32,0.14)',
    textPrimary: '#f0e6d0',
    textSecondary: '#b09070',
    textMuted: 'rgba(240,230,208,0.28)',
    waTheme: false,
    buttonGradient: 'linear-gradient(135deg, #2e1c06 0%, #d4a520 100%)',
  },
]

export const ADMIN_THEMES = [
  {
    id: 'dark-blue',
    name: 'Dark Blue',
    desc: 'Tema por defecto del panel.',
    sidebarBg: '#0b0b18', sidebarAccent: '#1e85ff',
    topbarBg: '#0d0d1f', contentBg: '#08080f', cardBg: '#111124',
    swatches: ['#0b0b18', '#1e85ff', '#08080f'],
  },
  {
    id: 'dark-purple',
    name: 'Dark Purple',
    desc: 'Acentos violeta intenso.',
    sidebarBg: '#120920', sidebarAccent: '#8b5cf6',
    topbarBg: '#15092a', contentBg: '#0d0618', cardBg: '#1a0f30',
    swatches: ['#120920', '#8b5cf6', '#0d0618'],
  },
  {
    id: 'dark-emerald',
    name: 'Dark Emerald',
    desc: 'Acentos esmeralda vibrantes.',
    sidebarBg: '#071a10', sidebarAccent: '#10b981',
    topbarBg: '#091f14', contentBg: '#041209', cardBg: '#0a2010',
    swatches: ['#071a10', '#10b981', '#041209'],
  },
  {
    id: 'dark-rose',
    name: 'Dark Rose',
    desc: 'Acentos rosa-rojo vibrantes.',
    sidebarBg: '#1a0810', sidebarAccent: '#f43f5e',
    topbarBg: '#1e0a14', contentBg: '#120408', cardBg: '#22081c',
    swatches: ['#1a0810', '#f43f5e', '#120408'],
  },
  {
    id: 'dark-cyan',
    name: 'Dark Cyan',
    desc: 'Acentos cian electrico.',
    sidebarBg: '#06131e', sidebarAccent: '#22d3ee',
    topbarBg: '#081828', contentBg: '#040c18', cardBg: '#0a1e2c',
    swatches: ['#06131e', '#22d3ee', '#040c18'],
  },
  {
    id: 'slate',
    name: 'Slate',
    desc: 'Minimalista gris pizarra.',
    sidebarBg: '#0f172a', sidebarAccent: '#94a3b8',
    topbarBg: '#1e293b', contentBg: '#0a1020', cardBg: '#1e293b',
    swatches: ['#0f172a', '#94a3b8', '#0a1020'],
  },
]

export const DEFAULT_CLIENT_FORM = {
  name: '', headerBg: '#0f1122', headerColor: '#ffffff',
  bodyBg: '#08080f', sentBubble: '#1e40af', sentText: '#dbeafe',
  recvBubble: '#1a1a2e', recvText: '#e2e8f0', inputBg: '#111124', accent: '#2563eb',
  waTheme: false,
  surface: '#111124', textPrimary: '#f8fafc', textSecondary: '#94a3b8',
  onAccent: '#ffffff', buttonFrom: '#0d1d6e', buttonTo: '#2563eb',
  isDark: true,
}

export const DEFAULT_ADMIN_FORM = {
  name: '', sidebarBg: '#0b0b18', sidebarAccent: '#1e85ff',
  topbarBg: '#0d0d1f', contentBg: '#08080f', cardBg: '#111124',
}

const hexToRgb = (hex) => {
  const clean = String(hex || '').replace('#', '')
  const value = clean.length === 3
    ? clean.split('').map(char => char + char).join('')
    : clean
  const int = parseInt(value || '000000', 16)
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`
}

const getLuminance = (hex) => {
  const clean = String(hex || '').replace('#', '')
  const value = clean.length === 3
    ? clean.split('').map(char => char + char).join('')
    : clean
  const int = parseInt(value || '000000', 16)
  const channels = [(int >> 16) & 255, (int >> 8) & 255, int & 255].map(channel => {
    const srgb = channel / 255
    return srgb <= 0.03928
      ? srgb / 12.92
      : ((srgb + 0.055) / 1.055) ** 2.4
  })
  return (0.2126 * channels[0]) + (0.7152 * channels[1]) + (0.0722 * channels[2])
}

const getContrastText = (hex, dark = '#111827', light = '#ffffff') => (
  getLuminance(hex) > 0.18 ? dark : light
)

const setVar = (name, value) => {
  document.documentElement.style.setProperty(name, value)
}

export function readCustomThemes(scope) {
  const key = scope === 'admin' ? 'custom_admin_themes' : 'custom_client_themes'
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}

export function findClientTheme(id, customThemes = []) {
  return [...CLIENT_THEMES, ...customThemes, ...readCustomThemes('client')].find(theme => theme.id === id) || CLIENT_THEMES[0]
}

export function findAdminTheme(id, customThemes = []) {
  return [...ADMIN_THEMES, ...customThemes, ...readCustomThemes('admin')].find(theme => theme.id === id) || ADMIN_THEMES[0]
}

export function applyClientTheme(themeId, customThemes = []) {
  const theme = findClientTheme(themeId, customThemes)
  const onAccent = theme.onAccent || getContrastText(theme.accent, '#111827', '#ffffff')
  const onHeader = theme.headerColor || theme.headerText || getContrastText(theme.headerBg, '#111827', '#ffffff')
  const buttonGradientValue = theme.buttonGradient ||
    (theme.buttonFrom && theme.buttonTo
      ? `linear-gradient(135deg, ${theme.buttonFrom} 0%, ${theme.buttonTo} 100%)`
      : `linear-gradient(135deg, ${theme.sentBubble} 0%, ${theme.accent} 100%)`)
  setVar('--bc-client-header-bg',       theme.headerBg)
  setVar('--bc-client-header-color',    onHeader)
  setVar('--bc-client-body-bg',         theme.bodyBg)
  setVar('--bc-client-sent-bubble',     theme.sentBubble)
  setVar('--bc-client-sent-text',       theme.sentText)
  setVar('--bc-client-recv-bubble',     theme.recvBubble)
  setVar('--bc-client-recv-text',       theme.recvText)
  setVar('--bc-client-input-bg',        theme.inputBg)
  setVar('--bc-client-accent',          theme.accent)
  setVar('--bc-client-accent-rgb',      hexToRgb(theme.accent))
  setVar('--bc-client-on-accent',       onAccent)
  setVar('--bc-client-button-text',      onAccent)
  setVar('--bc-client-button-bg',        theme.buttonBg || theme.accent)
  setVar('--bc-client-button-hover',     theme.buttonHover || theme.sentBubble)
  setVar('--bc-client-button-gradient',  buttonGradientValue)
  // Extended surface / text vars
  const isDark = theme.isDark !== false
  setVar('--bc-client-is-dark',         isDark ? '1' : '0')
  setVar('--bc-client-surface',         theme.surface  || (isDark ? '#111124' : '#ffffff'))
  setVar('--bc-client-surface2',        theme.surface2 || (isDark ? '#1a1a30' : '#f0f2f5'))
  setVar('--bc-client-border',          theme.border   || (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)'))
  setVar('--bc-client-text',            theme.textPrimary   || (isDark ? '#f8fafc' : '#111b21'))
  setVar('--bc-client-text-2',          theme.textSecondary || (isDark ? '#94a3b8' : '#54656f'))
  setVar('--bc-client-text-muted',      theme.textMuted     || (isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.35)'))
  document.documentElement.dataset.clientTheme = theme.id

  let metaTheme = document.querySelector('meta[name="theme-color"]')
  if (!metaTheme) {
    metaTheme = document.createElement('meta')
    metaTheme.name = 'theme-color'
    document.head.appendChild(metaTheme)
  }
  metaTheme.content = theme.headerBg
}

export function applyAdminTheme(themeId, customThemes = []) {
  const theme = findAdminTheme(themeId, customThemes)
  setVar('--bc-admin-sidebar-bg',       theme.sidebarBg)
  setVar('--bc-admin-accent',           theme.sidebarAccent)
  setVar('--bc-admin-accent-rgb',       hexToRgb(theme.sidebarAccent))
  setVar('--bc-admin-topbar-bg',        theme.topbarBg)
  setVar('--bc-admin-content-bg',       theme.contentBg)
  setVar('--bc-admin-card-bg',          theme.cardBg)
  setVar('--bc-admin-button-gradient',  `linear-gradient(135deg, ${theme.cardBg} 0%, ${theme.sidebarAccent} 100%)`)
  document.documentElement.dataset.adminTheme = theme.id
}

export function applyThemeConfig(config = {}) {
  applyClientTheme(config.clientTheme || 'betchat-dark', config.customThemes?.client || [])
  applyAdminTheme(config.adminTheme || 'dark-blue', config.customThemes?.admin || [])
}
