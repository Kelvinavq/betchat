import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { getAutoMessages, updateAutoMessages } from '../controllers/autoMessagesController.js'

const router = Router()

router.use(authenticateToken)
router.use(requireRole('admin'))

router.get('/', getAutoMessages)
router.put('/', updateAutoMessages)

export default router
