import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  archiveChat,
  getAdminChats,
  getMessages,
  markChatRead,
  sendAdminMessage,
} from '../controllers/chatController.js'

const router = Router()

router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/', getAdminChats)
router.get('/:chatId/messages', getMessages)
router.post('/:chatId/messages', sendAdminMessage)
router.put('/:chatId/read', markChatRead)
router.put('/:chatId/archive', archiveChat)

export default router
