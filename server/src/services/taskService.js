
const pool = require("../config/db");

const taskService = {
  async findById(taskId) {
    const [rows] = await pool.execute(
      `SELECT DISTINCT t.*,
              p.name AS project_name,
              assignee.full_name AS assignee_name,
              assignee.avatar AS assignee_avatar,
              creator.full_name AS created_by_name,
              (SELECT COUNT(*) FROM comments c
               WHERE c.task_id = t.id) AS comment_count
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       LEFT JOIN users assignee ON assignee.id = t.assignee_id
       LEFT JOIN users creator ON creator.id = t.created_by
       WHERE t.id = ?
       LIMIT 1`,
      [taskId]
    );

    return rows[0] || null;
  },

  async findForUser(userId, filters = {}, role = "member") {
    const conditions = [];
    const values = [];

    if (role !== "admin") {
      conditions.push(
        `(p.owner_id = ?
          OR pm.user_id = ?
          OR t.assignee_id = ?
          OR t.created_by = ?)`
      );
      values.push(userId, userId, userId, userId);
    }

    if (filters.project_id) {
      conditions.push("t.project_id = ?");
      values.push(Number(filters.project_id));
    }

    if (filters.status) {
      conditions.push("t.status = ?");
      values.push(filters.status);
    }

    if (filters.priority) {
      conditions.push("t.priority = ?");
      values.push(filters.priority);
    }

    if (filters.assigned_to_me) {
      conditions.push("t.assignee_id = ?");
      values.push(userId);
    }

    if (filters.search) {
      conditions.push("(t.title LIKE ? OR t.description LIKE ?)");
      values.push(
        `%${filters.search}%`,
        `%${filters.search}%`
      );
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [rows] = await pool.execute(
      `SELECT t.*,
              p.name AS project_name,
              p.color AS project_color,
              assignee.full_name AS assignee_name,
              assignee.avatar AS assignee_avatar,
              creator.full_name AS created_by_name,
              (SELECT COUNT(*) FROM comments c
               WHERE c.task_id = t.id) AS comment_count
       FROM tasks t
       INNER JOIN projects p ON p.id = t.project_id
       LEFT JOIN project_members pm
         ON pm.project_id = p.id AND pm.user_id = ?
       LEFT JOIN users assignee ON assignee.id = t.assignee_id
       LEFT JOIN users creator ON creator.id = t.created_by
       ${where}
       ORDER BY t.position ASC, t.created_at DESC`,
      [userId, ...values]
    );

    return rows;
  },

  async create(taskData, userId) {
    const {
      project_id,
      title,
      description = "",
      status = "todo",
      priority = "medium",
      assignee_id = null,
      due_date = null,
      position = 0,
    } = taskData;

    const [result] = await pool.execute(
      `INSERT INTO tasks
        (project_id, title, description, status, priority,
         assignee_id, created_by, due_date, position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id`,
      [
        project_id,
        title.trim(),
        description,
        status,
        priority,
        assignee_id || null,
        userId,
        due_date || null,
        position,
      ]
    );

    return this.findById(result.insertId);
  },

  async update(taskId, taskData) {
    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "assignee_id",
      "due_date",
      "position",
    ];

    const fields = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(taskData, field)) {
        fields.push(`${field} = ?`);

        const value = taskData[field];

        values.push(
          ["assignee_id", "due_date"].includes(field) && value === ""
            ? null
            : value
        );
      }
    }

    if (fields.length === 0) {
      return this.findById(taskId);
    }

    values.push(taskId);

    await pool.execute(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return this.findById(taskId);
  },

  async updateStatus(taskId, status) {
    await pool.execute(
      "UPDATE tasks SET status = ? WHERE id = ?",
      [status, taskId]
    );

    return this.findById(taskId);
  },

  async assign(taskId, assigneeId) {
    await pool.execute(
      "UPDATE tasks SET assignee_id = ? WHERE id = ?",
      [assigneeId || null, taskId]
    );

    return this.findById(taskId);
  },

  async delete(taskId) {
    const [result] = await pool.execute(
      "DELETE FROM tasks WHERE id = ?",
      [taskId]
    );

    return result.affectedRows > 0;
  },

  async getComments(taskId) {
    const [rows] = await pool.execute(
      `SELECT c.id, c.task_id, c.user_id, c.content, c.created_at,
              u.full_name AS user_name, u.avatar AS user_avatar
       FROM comments c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.task_id = ?
       ORDER BY c.created_at ASC`,
      [taskId]
    );

    return rows;
  },

  async addComment(taskId, userId, content) {
    const [result] = await pool.execute(
      `INSERT INTO comments (task_id, user_id, content)
       VALUES (?, ?, ?)`,
      [taskId, userId, content]
    );

    const [rows] = await pool.execute(
      `SELECT c.id, c.task_id, c.user_id, c.content, c.created_at,
              u.full_name AS user_name, u.avatar AS user_avatar
       FROM comments c
       INNER JOIN users u ON u.id = c.user_id
       WHERE c.id = ?`,
      [result.insertId]
    );

    return rows[0];
  },

  async deleteComment(commentId, taskId) {
    const [result] = await pool.execute(
      "DELETE FROM comments WHERE id = ? AND task_id = ?",
      [commentId, taskId]
    );

    return result.affectedRows > 0;
  },
};

module.exports = taskService;
