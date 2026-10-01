import { Router } from 'express';
import { 
  getUserNotifications, 
  addNotification, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification, 
  clearAllNotifications 
} from '../controllers/notificationController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// All routes are protected
router.use(protect);

router.get('/', getUserNotifications);
router.post('/', addNotification);
router.put('/:id/read', markNotificationAsRead);
router.put('/read-all', markAllNotificationsAsRead);
router.delete('/:id', deleteNotification);
router.delete('/', clearAllNotifications);

export default router;