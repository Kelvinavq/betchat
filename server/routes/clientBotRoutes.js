import { Router } from 'express'
import { getClientBotFlow, selectClientBotOption, submitClientBotForm, updateClientBotState } from '../controllers/botBuilderController.js'

const router = Router()

router.get('/flow', getClientBotFlow)
router.post('/chats/:chatId/select', selectClientBotOption)
router.post('/chats/:chatId/forms', submitClientBotForm)
router.put('/chats/:chatId/state', updateClientBotState)

export default router
