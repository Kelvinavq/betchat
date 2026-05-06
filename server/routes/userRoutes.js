import { Router } from 'express'
import { createUser, getUsers, updateUser, deleteUser } from '../controllers/userController.js'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { validateCreateUser } from '../middlewares/validateUser.js'

const router = Router()

router.get('/',    authenticateToken, requireRole('admin'), getUsers)
router.post('/',   authenticateToken, requireRole('admin'), validateCreateUser, createUser)
router.put('/:id', authenticateToken, requireRole('admin'), updateUser)
router.delete('/:id', authenticateToken, requireRole('admin'), deleteUser)

export default router
