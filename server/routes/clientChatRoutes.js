import { Router } from 'express'
import { getClientMessages, markClientChatDelivered, markClientChatRead, sendClientMessage } from '../controllers/chatController.js'

const router = Router()

router.get('/:chatId/messages', getClientMessages)
router.post('/:chatId/messages', sendClientMessage)
router.put('/:chatId/delivered', markClientChatDelivered)
router.put('/:chatId/read', markClientChatRead)

export default router
