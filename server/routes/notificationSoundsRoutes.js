import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  listSounds,
  uploadSound,
  deleteSound,
  getUserPreference,
  updateUserPreference,
} from '../controllers/notificationSoundsController.js'

const router = Router()

// Any authenticated admin/cashier can list sounds and manage their own preference
router.get('/',           authenticateToken, requireRole('admin', 'cashier'), listSounds)
router.get('/preference', authenticateToken, requireRole('admin', 'cashier'), getUserPreference)
router.put('/preference', authenticateToken, requireRole('admin', 'cashier'), updateUserPreference)

// Only admins can upload or delete sounds
router.post('/',    authenticateToken, requireRole('admin'), uploadSound)
router.delete('/:id', authenticateToken, requireRole('admin'), deleteSound)

export default router
