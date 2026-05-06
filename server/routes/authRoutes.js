import { Router } from 'express';
import { login } from '../controllers/authController.js';
import { validateLogin } from '../middlewares/validateAuth.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

router.post('/login', authLimiter, validateLogin, login);

export default router;
