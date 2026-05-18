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
    waTheme: false,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    desc: 'Tema claro estilo WhatsApp con patron de fondo.',
    headerBg: '#128C7E', headerColor: '#ffffff',
    bodyBg: '#e5ddd5',
    sentBubble: '#dcf8c6', sentText: '#111b21',
    recvBubble: '#ffffff', recvText: '#111b21',
    inputBg: '#f0f2f5', accent: '#25d366',
    waTheme: true,
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
    waTheme: false,
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
    waTheme: false,
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
    waTheme: false,
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
    waTheme: false,
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
  setVar('--bc-client-header-bg', theme.headerBg)
  setVar('--bc-client-header-color', theme.headerColor)
  setVar('--bc-client-body-bg', theme.bodyBg)
  setVar('--bc-client-sent-bubble', theme.sentBubble)
  setVar('--bc-client-sent-text', theme.sentText)
  setVar('--bc-client-recv-bubble', theme.recvBubble)
  setVar('--bc-client-recv-text', theme.recvText)
  setVar('--bc-client-input-bg', theme.inputBg)
  setVar('--bc-client-accent', theme.accent)
  setVar('--bc-client-accent-rgb', hexToRgb(theme.accent))
  setVar('--bc-client-button-gradient', `linear-gradient(135deg, ${theme.accent} 0%, ${theme.sentBubble} 100%)`)
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
  setVar('--bc-admin-sidebar-bg', theme.sidebarBg)
  setVar('--bc-admin-accent', theme.sidebarAccent)
  setVar('--bc-admin-accent-rgb', hexToRgb(theme.sidebarAccent))
  setVar('--bc-admin-topbar-bg', theme.topbarBg)
  setVar('--bc-admin-content-bg', theme.contentBg)
  setVar('--bc-admin-card-bg', theme.cardBg)
  setVar('--bc-admin-button-gradient', `linear-gradient(135deg, ${theme.cardBg} 0%, ${theme.sidebarAccent} 100%)`)
  document.documentElement.dataset.adminTheme = theme.id
}

export function applyThemeConfig(config = {}) {
  applyClientTheme(config.clientTheme || 'betchat-dark', config.customThemes?.client || [])
  applyAdminTheme(config.adminTheme || 'dark-blue', config.customThemes?.admin || [])
}
