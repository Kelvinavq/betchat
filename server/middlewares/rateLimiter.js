import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 6, // máximo 6 intentos por ventana
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.',
    code: 'TOO_MANY_REQUESTS',
  },
  handler: (req, res) => {
    res.set('Retry-After', String(15 * 60));
    return res.status(429).json({
      error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo más tarde.',
      code: 'TOO_MANY_REQUESTS',
    });
  },
});
