import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  getSettings,
  getAmountsListRoute,
  createAmount,
  updateAmounts,
  updateAmount,
  deleteAmount,
  updateApiConfig,
  updateChatBank,
  updatePassword,
  updateProfile,
} from '../controllers/settingsController.js'

const router = Router()

router.get('/', authenticateToken, requireRole('admin'), getSettings)
router.get('/amounts', authenticateToken, requireRole('admin'), getAmountsListRoute)
router.post('/amounts', authenticateToken, requireRole('admin'), createAmount)
router.put('/amounts', authenticateToken, requireRole('admin'), updateAmounts)
router.put('/amounts/:currency/:operation', authenticateToken, requireRole('admin'), updateAmount)
router.delete('/amounts/:currency/:operation', authenticateToken, requireRole('admin'), deleteAmount)
router.put('/profile', authenticateToken, requireRole('admin'), updateProfile)
router.put('/password', authenticateToken, requireRole('admin'), updatePassword)
router.put('/apis/:provider', authenticateToken, requireRole('admin'), updateApiConfig)
router.put('/chat-bank', authenticateToken, requireRole('admin'), updateChatBank)

export default router
