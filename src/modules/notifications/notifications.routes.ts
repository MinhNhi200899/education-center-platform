import { Router } from 'express';
import { authenticate } from '../auth/middleware/authenticate';
import {
  listMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from './notifications.controller';

const router = Router();

router.use(authenticate);

router.get('/', listMyNotifications);
router.post('/read-all', markAllNotificationsRead);
router.patch('/:id/read', markNotificationRead);

export default router;
