import { Router } from 'express'
import { getClientBotFlow } from '../controllers/botBuilderController.js'

const router = Router()

router.get('/flow', getClientBotFlow)

export default router
