import { Router } from 'express';
import {
  login,
  logout,
  me,
  webauthnAuthOptions,
  webauthnAuthVerify,
  webauthnRegisterOptions,
  webauthnRegisterVerify,
} from '../controllers/authController.js';
import { validateLogin } from '../middlewares/validateAuth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', authLimiter, validateLogin, login);
router.post('/webauthn/register-options', authenticateToken, webauthnRegisterOptions);
router.post('/webauthn/register-verify', authenticateToken, webauthnRegisterVerify);
router.post('/webauthn/auth-options', authLimiter, webauthnAuthOptions);
router.post('/webauthn/auth-verify', authLimiter, webauthnAuthVerify);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);

export default router;
