import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  archiveChat,
  clearChatMessages,
  closeHelpChat,
  completeWithdrawal,
  createChatLabel,
  deleteChat,
  getChatClientDetails,
  getChatLabels,
  getAdminChats,
  getMessages,
  getPendingCounts,
  markChatRead,
  pinChat,
  resetClientBotAdmin,
  sendAdminMessage,
  updateChatClientDetails,
  updateChatClientLabels,
} from '../controllers/chatController.js'
import {
  getChatMovements,
  updateManualMovementStatus,
  resolveManualMovement,
} from '../controllers/movementController.js'
import { listWithdrawals } from '../controllers/withdrawalController.js'

const router = Router()

router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/', getAdminChats)
router.get('/labels', getChatLabels)
router.post('/labels', createChatLabel)
router.get('/:chatId/client', getChatClientDetails)
router.put('/:chatId/client', updateChatClientDetails)
router.put('/:chatId/client/labels', updateChatClientLabels)
router.get('/:chatId/movements', getChatMovements)
router.get('/:chatId/withdrawals', listWithdrawals)
router.get('/:chatId/pending-counts', getPendingCounts)
router.put('/:chatId/movements/manual/:id/status', updateManualMovementStatus)
router.put('/:chatId/movements/manual/:id/resolve', resolveManualMovement)
router.post('/:chatId/bot/reset', resetClientBotAdmin)
router.get('/:chatId/messages', getMessages)
router.post('/:chatId/messages', sendAdminMessage)
router.post('/:chatId/withdrawal/complete', completeWithdrawal)
router.put('/:chatId/read', markChatRead)
router.put('/:chatId/archive', archiveChat)
router.put('/:chatId/pin', pinChat)
router.delete('/:chatId/messages', clearChatMessages)
router.delete('/:chatId', deleteChat)
router.put('/:chatId/help/close', closeHelpChat)

export default router
