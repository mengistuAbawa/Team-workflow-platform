
const pool = require("../config/db");

const projectService = {
  async findById(projectId) {
    const [rows] = await pool.execute(
      `SELECT p.*, u.full_name AS owner_name
       FROM projects p
       LEFT JOIN users u ON u.id = p.owner_id
       WHERE p.id = ?
       LIMIT 1`,
      [projectId]
    );

    return rows[0] || null;
  },

  async findForUser(userId, role = "member") {
    const isAdmin = role === "admin";

    const [rows] = await pool.execute(
      `SELECT p.*,
              u.full_name AS owner_name,
              COUNT(DISTINCT t.id) AS task_count,
              COUNT(DISTINCT CASE
                WHEN t.status = 'done' THEN t.id
              END) AS completed_task_count
       FROM projects p
       LEFT JOIN users u ON u.id = p.owner_id
       LEFT JOIN tasks t ON t.project_id = p.id
       LEFT JOIN project_members pm ON pm.project_id = p.id
       WHERE (? = 1 OR p.owner_id = ? OR pm.user_id = ?)
       GROUP BY p.id
       ORDER BY p.updated_at DESC`,
      [isAdmin ? 1 : 0, userId, userId]
    );

    return rows;
  },

  async create(projectData, ownerId) {
    const {
      name,
      description = "",
      color = "#7C3AED",
      status = "planning",
      start_date = null,
      due_date = null,
    } = projectData;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `INSERT INTO projects
          (name, description, color, status, start_date, due_date, owner_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          name.trim(),
          description,
          color,
          status,
          start_date || null,
          due_date || null,
          ownerId,
        ]
      );

      await connection.execute(
        `INSERT INTO project_members
          (project_id, user_id, project_role)
         VALUES (?, ?, 'manager')`,
        [result.insertId, ownerId]
      );

      await connection.commit();

      return this.findById(result.insertId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async update(projectId, projectData) {
    const allowedFields = [
      "name",
      "description",
      "color",
      "status",
      "start_date",
      "due_date",
    ];

    const fields = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(projectData, field)) {
        fields.push(`${field} = ?`);

        const value = projectData[field];

        values.push(
          ["start_date", "due_date"].includes(field) && value === ""
            ? null
            : value
        );
      }
    }

    if (fields.length === 0) {
      return this.findById(projectId);
    }

    values.push(projectId);

    await pool.execute(
      `UPDATE projects SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return this.findById(projectId);
  },

  async delete(projectId) {
    const [result] = await pool.execute(
      "DELETE FROM projects WHERE id = ?",
      [projectId]
    );

    return result.affectedRows > 0;
  },

  async getMembers(projectId) {
    const [rows] = await pool.execute(
      `SELECT u.id, u.full_name, u.email, u.avatar, u.role,
              u.is_active, pm.project_role, pm.joined_at
       FROM project_members pm
       INNER JOIN users u ON u.id = pm.user_id
       WHERE pm.project_id = ?
       ORDER BY pm.joined_at ASC`,
      [projectId]
    );

    return rows;
  },

  async addMember(projectId, userId, projectRole = "member") {
    await pool.execute(
      `INSERT INTO project_members
        (project_id, user_id, project_role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE project_role = VALUES(project_role)`,
      [projectId, userId, projectRole]
    );

    return true;
  },

  async removeMember(projectId, userId) {
    const [result] = await pool.execute(
      `DELETE FROM project_members
       WHERE project_id = ? AND user_id = ?`,
      [projectId, userId]
    );

    return result.affectedRows > 0;
  },
};

module.exports = projectService;
