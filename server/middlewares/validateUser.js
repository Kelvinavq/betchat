export function validateCreateUser(req, res, next) {
  const { username, email, password, role, is_active } = req.body
  const errors = []

  const normalizedUsername = String(username || '').trim()
  const normalizedEmail = String(email || '').trim()

  if (!normalizedUsername) {
    errors.push('Nombre de usuario es requerido')
  }

  if (!normalizedEmail) {
    errors.push('Correo electrónico es requerido')
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres')
  }

  if (!['admin', 'cashier'].includes(role)) {
    errors.push('El rol debe ser admin o cajero')
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Datos de usuario inválidos',
      details: errors,
      code: 'INVALID_USER_PAYLOAD',
    })
  }

  req.body.username = normalizedUsername
  req.body.full_name = String(req.body.full_name || normalizedUsername).trim()
  req.body.email = normalizedEmail.toLowerCase()
  req.body.role = role
  req.body.is_active = Boolean(is_active !== false && is_active !== 0)

  next()
}
