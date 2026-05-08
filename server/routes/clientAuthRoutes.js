import { Router } from 'express'
import {
  autoLoginClient,
  loginClient,
  registerClient,
  createHelpSession,
  logoutClient,
  meClient,
} from '../controllers/clientAuthController.js'
import { authLimiter } from '../middlewares/rateLimiter.js'

const router = Router()

router.post('/auto-login', authLimiter, autoLoginClient)
router.post('/login', authLimiter, loginClient)
router.post('/register', authLimiter, registerClient)
router.post('/help-session', authLimiter, createHelpSession)
router.post('/logout', logoutClient)
router.get('/me', meClient)

export default router
