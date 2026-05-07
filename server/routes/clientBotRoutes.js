import { Router } from 'express'
import { getClientBotFlow, selectClientBotOption, updateClientBotState } from '../controllers/botBuilderController.js'

const router = Router()

router.get('/flow', getClientBotFlow)
router.post('/chats/:chatId/select', selectClientBotOption)
router.put('/chats/:chatId/state', updateClientBotState)

export default router
