export const colors = {
  // Brand
  primary:        'var(--bc-admin-accent, #2563eb)',   // admin, chat UI
  primaryLight:   'var(--bc-admin-accent, #1e85ff)',   // login glassmorphism
  primaryLighter: 'var(--bc-admin-accent, #46aaff)',   // hovers
  primaryAccent:  '#e8f4ff',   // muy claro (texto sobre botón)

  // Fondos
  bgBlack: '#000000',
  bgDark:  'var(--bc-admin-sidebar-bg, #1e293b)',   // sidebar admin
  bgLight: 'var(--bc-admin-card-bg, #f8fafc)',   // panel admin
  bgPage:  '#f5f5f5',
  white:   '#ffffff',

  // Texto
  textMuted:  '#94a3b8',
  textSubtle: '#64748b',

  // Bordes
  border:      '#e2e8f0',
  borderLight: '#eee',
  borderInput: '#ddd',

  // Glassmorphism (login)
  glass: {
    bg:          'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.05)',
    bgHover:     'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.09)',
    bgFocus:     'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.11)',
    border:      'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.12)',
    borderHover: 'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.22)',
    divider:     'rgba(var(--bc-admin-accent-rgb, 30, 133, 255), 0.18)',
    text:        'rgba(80, 160, 255, 0.40)',
    textInput:   'rgba(80, 160, 255, 0.42)',
    textSubtle:  'rgba(80, 160, 255, 0.38)',
    textTitle:   'rgba(80, 160, 255, 0.45)',
    textWhite60: 'rgba(255, 255, 255, 0.60)',
    textWhite85: 'rgba(255, 255, 255, 0.85)',
  },
}

export const gradients = {
  btn:       'var(--bc-admin-button-gradient, linear-gradient(135deg, #0a2e50 0%, #0d4fe8 100%))',
  btnHover:  'var(--bc-admin-button-gradient, linear-gradient(135deg, #16538d 0%, #1a5ef5 100%))',
  btnActive: 'var(--bc-admin-button-gradient, linear-gradient(135deg, #1a8aee 0%, #0840cc 100%))',
  loginBg:   'radial-gradient(ellipse at center, #000000 0%, #000000 70%)',
  card:      'radial-gradient(ellipse at 50% 0%, rgba(37, 45, 76, 0.52), rgba(2, 4, 18, 0.44))',
}

export const shadows = {
  card:     '0 2px 12px rgba(0,0,0,0.10)',
  chat:     '0 8px 24px rgba(0,0,0,0.15)',
  bubble:   '0 4px 12px rgba(0,0,0,0.20)',
  glassFocus:  '0 0 0 2px #1e85ff, 0 0 24px rgba(30, 133, 255, 0.22)',
  glassCard:   'inset 0 1px 0 rgba(80, 170, 255, 0.09), 0 48px 96px -24px rgba(0, 0, 0, 0.80)',
  glassBubble: 'inset 0 1px 0 rgba(80, 170, 255, 0.09), 0 8px 32px -4px rgba(0, 0, 0, 0.60)',
}
