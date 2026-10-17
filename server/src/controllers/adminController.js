const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { isValidEmail, isNonEmptyString } = require("../utils/validators");

// GET /api/admin/users
async function listUsers(req, res, next) {
  try {
    const { search = "", role = "all", status = "all" } = req.query;

    const conditions = [];
    const values = [];

    if (search.trim()) {
      conditions.push("(u.full_name LIKE ? OR u.email LIKE ?)");
      values.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (role !== "all" && ["admin", "manager", "member"].includes(role)) {
      conditions.push("u.role = ?");
      values.push(role);
    }

    if (status === "active") {
      conditions.push("u.is_active = 1");
    } else if (status === "inactive") {
      conditions.push("u.is_active = 0");
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [users] = await pool.execute(
      `SELECT u.id, u.full_name, u.email, u.avatar, u.role, u.is_active, u.created_at, u.updated_at,
              (SELECT COUNT(*) FROM project_members pm WHERE pm.user_id = u.id) AS project_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id) AS task_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status = 'done') AS completed_task_count
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC`,
      values
    );

    res.json({
      success: true,
      data: {
        users,
        total: users.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

// POST /api/admin/users
async function createUser(req, res, next) {
  try {
    const fullName = typeof req.body.fullName === "string" ? req.body.fullName.trim() : (req.body.full_name || "").trim();
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password;
    const role = req.body.role || "member";

    if (!isNonEmptyString(fullName, 120)) {
      return res.status(400).json({
        success: false,
        message: "Full name is required and must not exceed 120 characters.",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "A valid email address is required.",
      });
    }

    if (typeof password !== "string" || password.length < 8 || password.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be between 8 and 72 characters.",
      });
    }

    if (!["admin", "manager", "member"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'admin', 'manager', or 'member'.",
      });
    }

    const [existing] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existing.length) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [result] = await pool.execute(
      `INSERT INTO users (full_name, email, password_hash, role, is_active)
       VALUES (?, ?, ?, ?, 1)`,
      [fullName, email, passwordHash, role]
    );

    const [created] = await pool.execute(
      "SELECT id, full_name, email, avatar, role, is_active, created_at FROM users WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully.`,
      data: { user: created[0] },
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }
    next(error);
  }
}

// PUT /api/admin/users/:id
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active, password } = req.body;

    const [existing] = await pool.execute(
      "SELECT id, email, role, is_active FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (!existing.length) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // Safeguard: Cannot demote or deactivate yourself
    if (Number(id) === Number(req.user.id)) {
      if (role && role !== "admin") {
        return res.status(400).json({
          success: false,
          message: "You cannot demote your own administrator account.",
        });
      }
      if (is_active === 0 || is_active === false) {
        return res.status(400).json({
          success: false,
          message: "You cannot deactivate your own account.",
        });
      }
    }

    const fields = [];
    const values = [];

    if (full_name !== undefined) {
      if (!isNonEmptyString(full_name, 120)) {
        return res.status(400).json({
          success: false,
          message: "Full name is required and must not exceed 120 characters.",
        });
      }
      fields.push("full_name = ?");
      values.push(full_name.trim());
    }

    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        return res.status(400).json({
          success: false,
          message: "A valid email address is required.",
        });
      }
      const [duplicate] = await pool.execute(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [cleanEmail, id]
      );
      if (duplicate.length) {
        return res.status(409).json({
          success: false,
          message: "This email address is already in use by another account.",
        });
      }
      fields.push("email = ?");
      values.push(cleanEmail);
    }

    if (role !== undefined) {
      if (!["admin", "manager", "member"].includes(role)) {
        return res.status(400).json({
          success: false,
          message: "Role must be 'admin', 'manager', or 'member'.",
        });
      }
      fields.push("role = ?");
      values.push(role);
    }

    if (is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    if (password && typeof password === "string" && password.length >= 8) {
      const passwordHash = await bcrypt.hash(password, 12);
      fields.push("password_hash = ?");
      values.push(passwordHash);
    }

    if (!fields.length) {
      return res.status(400).json({
        success: false,
        message: "No fields provided to update.",
      });
    }

    values.push(id);
    await pool.execute(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    const [updated] = await pool.execute(
      "SELECT id, full_name, email, avatar, role, is_active, updated_at FROM users WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: "User account updated successfully.",
      data: { user: updated[0] },
    });
  } catch (error) {
    next(error);
  }
}

// PATCH /api/admin/users/:id/status
async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot change the status of your own account.",
      });
    }

    const [users] = await pool.execute(
      "SELECT id, is_active, full_name FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const newStatus = users[0].is_active ? 0 : 1;
    await pool.execute("UPDATE users SET is_active = ? WHERE id = ?", [
      newStatus,
      id,
    ]);

    res.json({
      success: true,
      message: `Account for ${users[0].full_name} has been ${
        newStatus ? "activated" : "deactivated"
      }.`,
      data: { id: Number(id), is_active: newStatus },
    });
  } catch (error) {
    next(error);
  }
}

// DELETE /api/admin/users/:id
async function deleteUser(req, res, next) {
  try {
    const { id } = req.params;

    if (Number(id) === Number(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account.",
      });
    }

    const [users] = await pool.execute(
      "SELECT id, full_name FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    await pool.execute("DELETE FROM users WHERE id = ?", [id]);

    res.json({
      success: true,
      message: `User account for ${users[0].full_name} has been deleted.`,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/admin/system-stats
async function getSystemStats(req, res, next) {
  try {
    const [[usersStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_users,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_users,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admin_count,
        SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) AS manager_count,
        SUM(CASE WHEN role = 'member' THEN 1 ELSE 0 END) AS member_count
      FROM users
    `);

    const [[projectStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_projects,
        SUM(CASE WHEN status = 'planning' THEN 1 ELSE 0 END) AS planning_projects,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_projects,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_projects,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) AS archived_projects
      FROM projects
    `);

    const [[taskStats]] = await pool.execute(`
      SELECT
        COUNT(*) AS total_tasks,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) AS todo_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress_tasks,
        SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) AS in_review_tasks,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done_tasks,
        SUM(CASE WHEN priority = 'urgent' AND status <> 'done' THEN 1 ELSE 0 END) AS urgent_tasks
      FROM tasks
    `);

    const [recentActivities] = await pool.execute(`
      SELECT a.id, a.action, a.details, a.created_at,
             u.full_name AS user_name, u.role AS user_role,
             p.name AS project_name,
             t.title AS task_title
      FROM activity_logs a
      LEFT JOIN users u ON u.id = a.user_id
      LEFT JOIN projects p ON p.id = a.project_id
      LEFT JOIN tasks t ON t.id = a.task_id
      ORDER BY a.created_at DESC
      LIMIT 15
    `);

    res.json({
      success: true,
      data: {
        users: {
          total: Number(usersStats.total_users || 0),
          active: Number(usersStats.active_users || 0),
          admins: Number(usersStats.admin_count || 0),
          managers: Number(usersStats.manager_count || 0),
          members: Number(usersStats.member_count || 0),
        },
        projects: {
          total: Number(projectStats.total_projects || 0),
          planning: Number(projectStats.planning_projects || 0),
          active: Number(projectStats.active_projects || 0),
          completed: Number(projectStats.completed_projects || 0),
          archived: Number(projectStats.archived_projects || 0),
        },
        tasks: {
          total: Number(taskStats.total_tasks || 0),
          todo: Number(taskStats.todo_tasks || 0),
          in_progress: Number(taskStats.in_progress_tasks || 0),
          in_review: Number(taskStats.in_review_tasks || 0),
          done: Number(taskStats.done_tasks || 0),
          urgent: Number(taskStats.urgent_tasks || 0),
        },
        recentActivities,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getSystemStats,
};
