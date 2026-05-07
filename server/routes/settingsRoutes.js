import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  getSettings,
  getPublicThemeConfig,
  getAmountsListRoute,
  createAmount,
  updateAmounts,
  updateAmount,
  deleteAmount,
  updateApiConfig,
  updateChatBank,
  createCustomTheme,
  deleteCustomTheme,
  updateCustomTheme,
  updateThemeConfig,
  updatePassword,
  updateProfile,
} from '../controllers/settingsController.js'

const router = Router()

router.get('/themes', getPublicThemeConfig)
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
router.post('/themes/custom', authenticateToken, requireRole('admin'), createCustomTheme)
router.put('/themes/custom/:id', authenticateToken, requireRole('admin'), updateCustomTheme)
router.delete('/themes/custom/:id', authenticateToken, requireRole('admin'), deleteCustomTheme)
router.put('/themes', authenticateToken, requireRole('admin'), updateThemeConfig)

export default router
