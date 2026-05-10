export const USER_PERMISSION_MODULES = [
  'dashboard',
  'clients',
  'chats',
  'chats_balance',
  'chats_movements',
  'chats_withdrawals',
  'modals',
  'push_notifications',
  'commands',
  'bot_builder',
  'settings',
  'reports',
  'users',
  'support',
]

export const USER_PERMISSION_ACTIONS = ['can_view', 'can_create', 'can_edit', 'can_delete']

export function defaultPermissions(role = 'cashier') {
  return USER_PERMISSION_MODULES.reduce((acc, module) => {
    const enabled = role === 'admin'
    acc[module] = {
      can_view: enabled,
      can_create: enabled,
      can_edit: enabled,
      can_delete: enabled,
    }
    return acc
  }, {})
}

export function normalizePermissions(input = {}, role = 'cashier') {
  const fallback = defaultPermissions(role)

  return USER_PERMISSION_MODULES.reduce((acc, module) => {
    const source = input?.[module] || fallback[module]
    acc[module] = USER_PERMISSION_ACTIONS.reduce((actions, action) => {
      actions[action] = Boolean(source?.[action])
      return actions
    }, {})
    return acc
  }, {})
}

export function rowsToPermissions(rows = [], role = 'cashier') {
  const permissions = defaultPermissions(role)

  rows.forEach((row) => {
    if (!USER_PERMISSION_MODULES.includes(row.module)) return
    permissions[row.module] = {
      can_view: Boolean(row.can_view),
      can_create: Boolean(row.can_create),
      can_edit: Boolean(row.can_edit),
      can_delete: Boolean(row.can_delete),
    }
  })

  return permissions
}

export async function fetchPermissions(connection, userId, role = 'cashier') {
  const [rows] = await connection.execute(
    'SELECT module, can_view, can_create, can_edit, can_delete FROM user_permissions WHERE user_id = ?',
    [userId]
  )

  return rowsToPermissions(rows, role)
}

export async function replacePermissions(connection, userId, permissions, role = 'cashier') {
  const normalized = normalizePermissions(permissions, role)

  await connection.execute('DELETE FROM user_permissions WHERE user_id = ?', [userId])

  for (const [module, actions] of Object.entries(normalized)) {
    await connection.execute(
      'INSERT INTO user_permissions (user_id, module, can_view, can_create, can_edit, can_delete) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userId,
        module,
        actions.can_view ? 1 : 0,
        actions.can_create ? 1 : 0,
        actions.can_edit ? 1 : 0,
        actions.can_delete ? 1 : 0,
      ]
    )
  }

  return normalized
}
