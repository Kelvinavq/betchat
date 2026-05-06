import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { createModal, deleteModal, getModals, updateModal } from '../controllers/modalController.js'

const router = Router()

router.get('/', authenticateToken, requireRole('admin'), getModals)
router.post('/', authenticateToken, requireRole('admin'), createModal)
router.put('/:id', authenticateToken, requireRole('admin'), updateModal)
router.delete('/:id', authenticateToken, requireRole('admin'), deleteModal)

export default router
