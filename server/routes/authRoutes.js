import { Router } from 'express';
import { login, logout, me } from '../controllers/authController.js';
import { validateLogin } from '../middlewares/validateAuth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { authenticateToken } from '../middlewares/authMiddleware.js';

const router = Router();

router.post('/login', authLimiter, validateLogin, login);
router.post('/logout', logout);
router.get('/me', authenticateToken, me);

export default router;
