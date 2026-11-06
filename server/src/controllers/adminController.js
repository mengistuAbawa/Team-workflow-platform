const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const {
  isValidDate,
  isValidEmail,
  isNonEmptyString,
} = require("../utils/validators");

const EMPLOYMENT_STATUSES = [
  "Full-Time",
  "Part-Time",
  "Contract",
  "Intern",
  "Other",
];

function validateDeveloperProfile(profile, email) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
    return { error: "Developer profile details are required for team members." };
  }
  for (const field of ["phoneNumber", "seniorityLevel", "department"]) {
    if (profile[field] !== undefined && typeof profile[field] !== "string") {
      return { error: "Phone, seniority, and department values must be text." };
    }
  }

  const firstName = typeof profile.firstName === "string" ? profile.firstName.trim() : "";
  const lastName = typeof profile.lastName === "string" ? profile.lastName.trim() : "";
  const jobTitle = typeof profile.jobTitle === "string" ? profile.jobTitle.trim() : "";
  const phoneNumber = typeof profile.phoneNumber === "string" ? profile.phoneNumber.trim() : "";
  const seniorityLevel = typeof profile.seniorityLevel === "string" ? profile.seniorityLevel.trim() : "";
  const department = typeof profile.department === "string" ? profile.department.trim() : "";
  const employmentStatus = profile.employmentStatus || "Full-Time";
  const currency = typeof profile.currency === "string" ? profile.currency.trim().toUpperCase() : "";
  const hireDate = profile.hireDate;
  const salaryValue = String(profile.baseSalary ?? "");
  const baseSalary = Number(salaryValue);

  if (!isNonEmptyString(firstName, 50) || !isNonEmptyString(lastName, 50)) {
    return { error: "Developer first and last names are required (50 characters maximum)." };
  }
  if (!isNonEmptyString(jobTitle, 50)) {
    return { error: "Job title is required and must not exceed 50 characters." };
  }
  if (phoneNumber.length > 20 || seniorityLevel.length > 30 || department.length > 50) {
    return { error: "Phone, seniority, or department exceeds its allowed length." };
  }
  if (!EMPLOYMENT_STATUSES.includes(employmentStatus)) {
    return { error: "Choose a valid employment status." };
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: "Currency must be a three-letter code, such as USD." };
  }
  if (!/^\d{1,8}(\.\d{1,2})?$/.test(salaryValue) || !Number.isFinite(baseSalary)) {
    return { error: "Base salary must be a non-negative amount with up to two decimal places." };
  }
  if (!isValidDate(hireDate)) {
    return { error: "A valid hire date is required." };
  }
  if (!isValidEmail(email) || email.length > 100) {
    return { error: "Team member email must be valid and no longer than 100 characters." };
  }

  return {
    value: {
      firstName,
      lastName,
      email,
      phoneNumber: phoneNumber || null,
      jobTitle,
      seniorityLevel: seniorityLevel || null,
      department: department || null,
      employmentStatus,
      baseSalary,
      currency,
      hireDate,
    },
  };
}

function developerIdForUser(userId) {
  return `DEV-${BigInt(userId).toString(36).toUpperCase()}`;
}

async function saveDeveloperProfile(connection, userId, profile) {
  await connection.execute(
    `INSERT INTO developers (
       developer_id, user_id, first_name, last_name, email, phone_number,
       job_title, seniority_level, department, employment_status,
       base_salary, currency, hire_date
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       email = EXCLUDED.email,
       phone_number = EXCLUDED.phone_number,
       job_title = EXCLUDED.job_title,
       seniority_level = EXCLUDED.seniority_level,
       department = EXCLUDED.department,
       employment_status = EXCLUDED.employment_status,
       base_salary = EXCLUDED.base_salary,
       currency = EXCLUDED.currency,
       hire_date = EXCLUDED.hire_date`,
    [
      developerIdForUser(userId),
      userId,
      profile.firstName,
      profile.lastName,
      profile.email,
      profile.phoneNumber,
      profile.jobTitle,
      profile.seniorityLevel,
      profile.department,
      profile.employmentStatus,
      profile.baseSalary,
      profile.currency,
      profile.hireDate,
    ],
  );
}

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
      `SELECT u.id, u.full_name, u.email, u.avatar, u.role, u.is_active, u.approval_status, u.created_at, u.updated_at,
              d.developer_id, d.first_name AS developer_first_name,
              d.last_name AS developer_last_name, d.phone_number AS developer_phone_number,
              d.job_title AS developer_job_title, d.seniority_level AS developer_seniority_level,
              d.department AS developer_department, d.employment_status AS developer_employment_status,
              d.base_salary AS developer_base_salary, d.currency AS developer_currency,
              d.hire_date AS developer_hire_date,
              (SELECT COUNT(*) FROM project_members pm WHERE pm.user_id = u.id) AS project_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id) AS task_count,
              (SELECT COUNT(*) FROM tasks t WHERE t.assignee_id = u.id AND t.status = 'done') AS completed_task_count
       FROM users u
       LEFT JOIN developers d ON d.user_id = u.id
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
    const role = req.body.role || "member";
    const email = typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const password = req.body.password;
    const profileResult =
      role === "member"
        ? validateDeveloperProfile(req.body.developerProfile, email)
        : null;
    const fullName =
      role === "member" && profileResult?.value
        ? `${profileResult.value.firstName} ${profileResult.value.lastName}`
        : typeof req.body.fullName === "string"
          ? req.body.fullName.trim()
          : typeof req.body.full_name === "string"
            ? req.body.full_name.trim()
            : "";

    if (profileResult?.error) {
      return res.status(400).json({ success: false, message: profileResult.error });
    }

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

    const passwordHash = await bcrypt.hash(password, 12);
    const connection = await pool.getConnection();
    let created;
    try {
      await connection.beginTransaction();
      const [result] = await connection.execute(
        `INSERT INTO users (full_name, email, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, 1)
         RETURNING id`,
        [fullName, email, passwordHash, role],
      );
      const userId = result.insertId;
      if (role === "member") {
        await saveDeveloperProfile(connection, userId, profileResult.value);
      }

      [created] = await connection.execute(
        `SELECT id, full_name, email, avatar, role, is_active, created_at
         FROM users WHERE id = ?`,
        [userId],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully.`,
      data: { user: created[0] },
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "An account or developer profile with this email already exists.",
      });
    }
    next(error);
  }
}

// PUT /api/admin/users/:id
async function updateUser(req, res, next) {
  let connection;
  try {
    const { id } = req.params;
    const { full_name, email, role, is_active, password } = req.body;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      "SELECT id, email, role, is_active FROM users WHERE id = ? LIMIT 1",
      [id],
    );

    if (!existing.length) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }
    const savedRole = role ?? existing[0].role;
    const cleanEmail =
      email === undefined ? existing[0].email : String(email).trim().toLowerCase();
    const profileResult =
      savedRole === "member"
        ? validateDeveloperProfile(req.body.developerProfile, cleanEmail)
        : null;
    if (profileResult?.error) {
      await connection.rollback();
      return res.status(400).json({ success: false, message: profileResult.error });
    }
    const savedFullName =
      savedRole === "member" && profileResult?.value
        ? `${profileResult.value.firstName} ${profileResult.value.lastName}`
        : full_name;

    // Safeguard: Cannot demote or deactivate yourself
    if (Number(id) === Number(req.user.id)) {
      if (role && role !== "admin") {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "You cannot demote your own administrator account.",
        });
      }
      if (is_active === 0 || is_active === false) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "You cannot deactivate your own account.",
        });
      }
    }

    const fields = [];
    const values = [];

    if (savedFullName !== undefined) {
      if (!isNonEmptyString(savedFullName, 120)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Full name is required and must not exceed 120 characters.",
        });
      }
      fields.push("full_name = ?");
      values.push(savedFullName.trim());
    }

    if (email !== undefined) {
      if (!isValidEmail(cleanEmail)) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "A valid email address is required.",
        });
      }
      const [duplicate] = await connection.execute(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [cleanEmail, id],
      );
      if (duplicate.length) {
        await connection.rollback();
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
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Role must be 'admin', 'manager', or 'member'.",
        });
      }
      fields.push("role = ?");
      values.push(role);
      if (role !== existing[0].role) {
        fields.push("approval_status = 'approved'");
      }
    }

    if (is_active !== undefined) {
      fields.push("is_active = ?");
      values.push(is_active ? 1 : 0);
      if (is_active && existing[0].role === "admin") {
        fields.push("approval_status = 'approved'");
      }
    }

    if (password !== undefined) {
      if (
        typeof password !== "string" ||
        password.length < 8 ||
        password.length > 72
      ) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: "Password must be between 8 and 72 characters.",
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      fields.push("password_hash = ?");
      values.push(passwordHash);
    }

    if (!fields.length && !profileResult?.value) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: "No fields provided to update.",
      });
    }

    if (fields.length) {
      values.push(id);
      await connection.execute(
        `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
        values,
      );
    }

    if (profileResult?.value) {
      await saveDeveloperProfile(connection, id, profileResult.value);
    }
    const [updated] = await connection.execute(
      `SELECT id, full_name, email, avatar, role, is_active, approval_status, updated_at
       FROM users WHERE id = ?`,
      [id],
    );
    await connection.commit();

    res.json({
      success: true,
      message: "User account updated successfully.",
      data: { user: updated[0] },
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "This email address is already in use.",
      });
    }
    next(error);
  } finally {
    connection?.release();
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
      "SELECT id, is_active, full_name, role, approval_status FROM users WHERE id = ? LIMIT 1",
      [id]
    );

    if (!users.length) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    const newStatus = users[0].is_active ? 0 : 1;
    const approvePendingAdmin =
      newStatus &&
      users[0].role === "admin" &&
      users[0].approval_status === "pending";
    await pool.execute(
      approvePendingAdmin
        ? "UPDATE users SET is_active = ?, approval_status = 'approved' WHERE id = ?"
        : "UPDATE users SET is_active = ? WHERE id = ?",
      [newStatus, id],
    );

    res.json({
      success: true,
      message: approvePendingAdmin
        ? `Administrator account for ${users[0].full_name} has been approved.`
        : `Account for ${users[0].full_name} has been ${
            newStatus ? "activated" : "deactivated"
          }.`,
      data: {
        id: Number(id),
        is_active: newStatus,
        approval_status: approvePendingAdmin
          ? "approved"
          : users[0].approval_status,
      },
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
