import { Router } from 'express'
import { getClientMovements, getClientGameHistory } from '../controllers/clientHistoryController.js'

const router = Router()

router.get('/movements', getClientMovements)
router.get('/games',     getClientGameHistory)

export default router
