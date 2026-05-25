import { Router } from 'express'
import { getChatClientBalance, getClientMessages, markClientChatDelivered, markClientChatRead, resetClientBotSelf, sendClientMessage } from '../controllers/chatController.js'
import { reportHgCashPaymentByClientCuil } from '../controllers/hgCashController.js'

const router = Router()

router.get('/:chatId/messages', getClientMessages)
router.get('/:chatId/balance', getChatClientBalance)
router.post('/:chatId/hgcash/report-payment', reportHgCashPaymentByClientCuil)
router.post('/:chatId/bot/reset', resetClientBotSelf)
router.post('/:chatId/messages', sendClientMessage)
router.put('/:chatId/delivered', markClientChatDelivered)
router.put('/:chatId/read', markClientChatRead)

export default router
