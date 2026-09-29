import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
export const getUserNotifications = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      let notifications: any = user.notifications;
      if (typeof notifications === 'string') {
        try { notifications = JSON.parse(notifications); } catch { notifications = []; }
      }
      if (!Array.isArray(notifications)) notifications = [];
      if (notifications.length > 0 && typeof notifications[0] === 'string') {
        try {
          const parsed = JSON.parse(notifications[0]);
          if (Array.isArray(parsed)) notifications = parsed;
        } catch {
          notifications = [];
        }
      }
      res.json(notifications);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add notification
 * @route   POST /api/notifications
 * @access  Private
 */
export const addNotification = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { type, title, message } = req.body;
    const user = await User.findById(req.user._id);

    if (user) {
      const newNotification = {
        id: Date.now(),
        type,
        title,
        message,
        time: 'Just now',
        unread: true,
      };

      if (!user.notifications) {
        user.notifications = [];
      }

      user.notifications.unshift(newNotification);
      await user.save();

      res.json({
        message: 'Notification added successfully',
        notification: newNotification,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
export const markNotificationAsRead = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    if (user) {
      const notification = user.notifications?.find((n: any) => n.id === parseInt(id));

      if (notification) {
        notification.unread = false;
        await user.save();

        res.json({
          message: 'Notification marked as read',
          notification: notification,
        });
      } else {
        res.status(404);
        throw new Error('Notification not found');
      }
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllNotificationsAsRead = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.notifications?.forEach((n: any) => {
        n.unread = false;
      });

      await user.save();

      res.json({
        message: 'All notifications marked as read',
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotification = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    if (user) {
      user.notifications = user.notifications?.filter((n: any) => n.id !== parseInt(id));
      await user.save();

      res.json({
        message: 'Notification deleted successfully',
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear all notifications
 * @route   DELETE /api/notifications
 * @access  Private
 */
export const clearAllNotifications = async (
  req: any,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.notifications = [];
      await user.save();

      res.json({
        message: 'All notifications cleared successfully',
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    next(error);
  }
};