import { Router } from 'express'
import { getActivePopups } from '../controllers/modalController.js'

const router = Router()

router.get('/active', getActivePopups)

export default router
