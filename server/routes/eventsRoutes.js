import { Router } from 'express';
import { authenticateToken, requireRole } from '../middlewares/authMiddleware.js';
import {
  listEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  activateEvent,
  finishEvent,
  cancelEvent,
  participateEvent,
  getParticipants,
  getEventDetail,
  resetParticipation,
  payBriefcaseWinners,
  getEventRewards,
  sendVoteReminder,
  listTemplates,
  createTemplate,
  deleteTemplate,
  listAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation,
  toggleAutomation,
  getStats,
  listRewards,
  payReward,
  discardReward,
} from '../controllers/eventsController.js';

const router = Router();
const adminOnly = [authenticateToken, requireRole('admin', 'cashier')];

router.use(...adminOnly);

router.get('/', listEvents);
router.post('/', createEvent);
router.get('/templates', listTemplates);
router.post('/templates', createTemplate);
router.delete('/templates/:id', deleteTemplate);
router.get('/automations', listAutomations);
router.post('/automations', createAutomation);
router.put('/automations/:id', updateAutomation);
router.delete('/automations/:id', deleteAutomation);
router.post('/automations/:id/toggle', toggleAutomation);
router.get('/stats', getStats);
router.get('/rewards', listRewards);
router.post('/rewards/:id/pay', payReward);
router.post('/rewards/:id/discard', discardReward);

router.get('/:id', getEvent);
router.put('/:id', updateEvent);
router.delete('/:id', deleteEvent);
router.post('/:id/activate', activateEvent);
router.post('/:id/finish', finishEvent);
router.post('/:id/cancel', cancelEvent);
router.post('/:id/participate', participateEvent);
router.get('/:id/participants', getParticipants);
router.get('/:id/detail', getEventDetail);
router.delete('/:id/participants/:participantId', resetParticipation);
router.post('/:id/pay-briefcase-winners', payBriefcaseWinners);
router.post('/:id/send-vote-reminder', sendVoteReminder);
router.get('/:id/rewards', getEventRewards);

export default router;
