
const pool = require("../config/db");

const activityService = {
  async create({
    project_id,
    task_id = null,
    user_id,
    action,
    details = null,
  }) {
    const [result] = await pool.execute(
      `INSERT INTO activity_logs
        (project_id, task_id, user_id, action, details)
       VALUES (?, ?, ?, ?, ?)`,
      [
        project_id,
        task_id,
        user_id,
        action,
        details === null ? null : JSON.stringify(details),
      ]
    );

    return result.insertId;
  },

  async getProjectActivity(projectId, limit = 20) {
    const safeLimit = Math.min(
      Math.max(Number.parseInt(limit, 10) || 20, 1),
      100
    );

    const [rows] = await pool.execute(
      `SELECT a.id, a.project_id, a.task_id, a.user_id,
              a.action, a.details, a.created_at,
              u.full_name AS user_name,
              u.avatar AS user_avatar,
              t.title AS task_title
       FROM activity_logs a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN tasks t ON t.id = a.task_id
       WHERE a.project_id = ?
       ORDER BY a.created_at DESC
       LIMIT ${safeLimit}`,
      [projectId]
    );

    return rows.map((row) => ({
      ...row,
      details:
        typeof row.details === "string"
          ? parseJson(row.details)
          : row.details,
    }));
  },

  async getUserActivity(userId, limit = 20) {
    const safeLimit = Math.min(
      Math.max(Number.parseInt(limit, 10) || 20, 1),
      100
    );

    const [rows] = await pool.execute(
      `SELECT a.id, a.project_id, a.task_id, a.user_id,
              a.action, a.details, a.created_at,
              p.name AS project_name,
              t.title AS task_title
       FROM activity_logs a
       LEFT JOIN projects p ON p.id = a.project_id
       LEFT JOIN tasks t ON t.id = a.task_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC
       LIMIT ${safeLimit}`,
      [userId]
    );

    return rows.map((row) => ({
      ...row,
      details:
        typeof row.details === "string"
          ? parseJson(row.details)
          : row.details,
    }));
  },
};

function parseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

module.exports = activityService;
