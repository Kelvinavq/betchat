import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { listFaqItems, createFaqItem, updateFaqItem, deleteFaqItem } from '../controllers/faqController.js'

const router = Router()

// Public — active FAQ items (no auth)
router.get('/', listFaqItems)

// Admin CRUD
router.post('/',    authenticateToken, requireRole('admin'), createFaqItem)
router.put('/:id',  authenticateToken, requireRole('admin'), updateFaqItem)
router.delete('/:id', authenticateToken, requireRole('admin'), deleteFaqItem)

export default router
