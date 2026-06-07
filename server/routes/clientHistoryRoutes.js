import { Router } from 'express'
import { getClientMovements } from '../controllers/clientHistoryController.js'

const router = Router()

// GET /api/client/history/movements — requires client JWT cookie
router.get('/movements', getClientMovements)

export default router
