import { Router } from 'express'
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js'
import {
  archiveChat,
  createChatLabel,
  getChatClientDetails,
  getChatLabels,
  getAdminChats,
  getMessages,
  markChatRead,
  sendAdminMessage,
  updateChatClientDetails,
  updateChatClientLabels,
} from '../controllers/chatController.js'

const router = Router()

router.use(authenticateToken)
router.use(requireRole('admin', 'cashier'))

router.get('/', getAdminChats)
router.get('/labels', getChatLabels)
router.post('/labels', createChatLabel)
router.get('/:chatId/client', getChatClientDetails)
router.put('/:chatId/client', updateChatClientDetails)
router.put('/:chatId/client/labels', updateChatClientLabels)
router.get('/:chatId/messages', getMessages)
router.post('/:chatId/messages', sendAdminMessage)
router.put('/:chatId/read', markChatRead)
router.put('/:chatId/archive', archiveChat)

export default router
