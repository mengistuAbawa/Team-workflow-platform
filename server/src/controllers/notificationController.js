const notificationService = require("../services/notificationService");

async function getNotifications(req, res, next) {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const notifications = await notificationService.getForUser(req.user.id, {
      unreadOnly,
      limit: req.query.limit,
    });

    res.json({ success: true, data: { notifications } });
  } catch (error) {
    next(error);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const updated = await notificationService.markAsRead(
      req.params.id,
      req.user.id
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({ success: true, message: "Notification marked as read." });
  } catch (error) {
    next(error);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const updated = await notificationService.markAllAsRead(req.user.id);
    res.json({
      success: true,
      message: "Notifications marked as read.",
      data: { updated },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteNotification(req, res, next) {
  try {
    const deleted = await notificationService.delete(
      req.params.id,
      req.user.id
    );

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Notification not found.",
      });
    }

    res.json({ success: true, message: "Notification deleted." });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
};
