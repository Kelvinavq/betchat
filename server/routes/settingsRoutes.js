import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  getSettings,
  updateAmounts,
  updateApiConfig,
  updateChatBank,
  updatePassword,
  updateProfile,
} from '../controllers/settingsController.js'

const router = Router()

router.get('/', authenticateToken, requireRole('admin'), getSettings)
router.put('/profile', authenticateToken, requireRole('admin'), updateProfile)
router.put('/password', authenticateToken, requireRole('admin'), updatePassword)
router.put('/amounts', authenticateToken, requireRole('admin'), updateAmounts)
router.put('/apis/:provider', authenticateToken, requireRole('admin'), updateApiConfig)
router.put('/chat-bank', authenticateToken, requireRole('admin'), updateChatBank)

export default router
