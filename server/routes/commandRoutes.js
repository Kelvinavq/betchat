import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { createCommand, deleteCommand, getCommands, updateCommand } from '../controllers/commandController.js'

const router = Router()

router.get('/', authenticateToken, requireRole('admin'), getCommands)
router.post('/', authenticateToken, requireRole('admin'), createCommand)
router.put('/:id', authenticateToken, requireRole('admin'), updateCommand)
router.delete('/:id', authenticateToken, requireRole('admin'), deleteCommand)

export default router
