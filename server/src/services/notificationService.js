
const pool = require("../config/db");

const notificationService = {
  async create({
    user_id,
    title,
    message,
    link = null,
  }) {
    const [result] = await pool.execute(
      `INSERT INTO notifications (user_id, title, message, link)
       VALUES (?, ?, ?, ?)
       RETURNING id`,
      [user_id, title, message, link]
    );

    return result.insertId;
  },

  async createForUsers(userIds, notification) {
    const uniqueIds = [
      ...new Set(
        userIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)
      ),
    ];

    if (!uniqueIds.length) return 0;

    const values = uniqueIds.flatMap((userId) => [
      userId,
      notification.title,
      notification.message,
      notification.link || null,
    ]);

    const placeholders = uniqueIds
      .map((_, index) => {
        const offset = index * 4;
        return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`;
      })
      .join(", ");
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, title, message, link)
       VALUES ${placeholders}`,
      values
    );

    return result.affectedRows;
  },

  async getForUser(userId, { unreadOnly = false, limit = 50 } = {}) {
    const safeLimit = Math.min(
      Math.max(Number.parseInt(limit, 10) || 50, 1),
      100
    );

    const conditions = ["user_id = ?"];

    if (unreadOnly) {
      conditions.push("is_read = 0");
    }

    const [rows] = await pool.execute(
      `SELECT id, user_id, title, message, link, is_read, created_at
       FROM notifications
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`,
      [userId]
    );

    return rows;
  },

  async getUnreadCount(userId) {
    const [rows] = await pool.execute(
      `SELECT COUNT(*) AS unread_count
       FROM notifications
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    return Number(rows[0].unread_count);
  },

  async markAsRead(notificationId, userId) {
    const [result] = await pool.execute(
      `UPDATE notifications
       SET is_read = 1
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  },

  async markAllAsRead(userId) {
    const [result] = await pool.execute(
      `UPDATE notifications
       SET is_read = 1
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    return result.affectedRows;
  },

  async delete(notificationId, userId) {
    const [result] = await pool.execute(
      `DELETE FROM notifications
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    return result.affectedRows > 0;
  },
};

module.exports = notificationService;
