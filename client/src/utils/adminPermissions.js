export const SECTION_MODULES = {
  chat: 'chats',
  clientes: 'clients',
  usuarios: 'users',
  comandos: 'commands',
  notificaciones: 'push_notifications',
  modales: 'modals',
  bot: 'bot_builder',
  cuentas: 'settings',
  ajustes: 'settings',
}

export const DEFAULT_ADMIN_SECTION = 'chat'

export const canViewModule = (user, module) => {
  if (!module) return true
  if (user?.permissions?.[module]) {
    return Boolean(user.permissions[module].can_view)
  }
  if (user?.role === 'admin') return true
  return Boolean(user?.permissions?.[module]?.can_view)
}

export const canViewSection = (user, section) => {
  return canViewModule(user, SECTION_MODULES[section])
}
