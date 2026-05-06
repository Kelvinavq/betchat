export function validateLogin(req, res, next) {
  const { username, password } = req.body;
  const errors = [];

  if (!username || typeof username !== 'string') {
    errors.push('El campo username es obligatorio.');
  } else {
    const usernameTrimmed = username.trim();
    if (usernameTrimmed.length < 3 || usernameTrimmed.length > 60) {
      errors.push('El username debe tener entre 3 y 60 caracteres.');
    }
    req.body.username = usernameTrimmed;
  }

  if (!password || typeof password !== 'string') {
    errors.push('El campo password es obligatorio.');
  } else if (password.length < 8 || password.length > 18) {
    errors.push('El password debe tener entre 8 y 18 caracteres.');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Datos de login inválidos',
      details: errors,
    });
  }

  next();
}
