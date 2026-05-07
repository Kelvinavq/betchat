import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import { getBotFlow, saveBotFlow } from '../controllers/botBuilderController.js'

const router = Router()

router.get('/', authenticateToken, requireRole('admin'), getBotFlow)
router.put('/', authenticateToken, requireRole('admin'), saveBotFlow)

export default router
