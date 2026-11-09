const pool = require("../config/db");
const notificationService = require("../services/notificationService");
const { isValidDate, isValidId, isNonEmptyString } = require("../utils/validators");

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

async function findReport(reportId) {
  const [rows] = await pool.execute(
    `SELECT r.*, p.name AS project_name, p.owner_id,
            author.full_name AS author_name,
            manager.full_name AS manager_name,
            reviewer.full_name AS admin_name
     FROM daily_activity_reports r
     INNER JOIN projects p ON p.id = r.project_id
     INNER JOIN users author ON author.id = r.user_id
     LEFT JOIN users manager ON manager.id = r.manager_reviewed_by
     LEFT JOIN users reviewer ON reviewer.id = r.admin_reviewed_by
     WHERE r.id = ?
     LIMIT 1`,
    [reportId],
  );
  return rows[0] || null;
}

async function notifyProjectManagers(connection, projectId, authorId, message) {
  const [managers] = await connection.execute(
    `SELECT DISTINCT u.id
     FROM projects p
     INNER JOIN users u
       ON u.role = 'manager'
       AND (u.id = p.owner_id OR EXISTS (
         SELECT 1 FROM project_members pm
         WHERE pm.project_id = p.id AND pm.user_id = u.id
           AND pm.project_role = 'manager'
       ))
     WHERE p.id = ? AND u.id <> ?`,
    [projectId, authorId],
  );
  const managerIds = managers.map((manager) => Number(manager.id));
  if (!managerIds.length) return false;

  await notificationService.createForUsers(
    managerIds,
    {
      title: "Daily activity report submitted",
      message,
      link: "/reports",
    },
    connection,
  );
  return true;
}

exports.getReports = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = String(req.user.role || "").toLowerCase();
    const conditions = [];
    const values = [];

    if (role === "manager") {
      conditions.push(
        `(p.owner_id = ? OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = ?
            AND pm.project_role = 'manager'
        ))`,
      );
      values.push(userId, userId);
    } else if (role !== "admin") {
      conditions.push("r.user_id = ?");
      values.push(userId);
    }

    const [reports] = await pool.execute(
      `SELECT r.*, p.name AS project_name,
              author.full_name AS author_name,
              manager.full_name AS manager_name,
              reviewer.full_name AS admin_name
       FROM daily_activity_reports r
       INNER JOIN projects p ON p.id = r.project_id
       INNER JOIN users author ON author.id = r.user_id
       LEFT JOIN users manager ON manager.id = r.manager_reviewed_by
       LEFT JOIN users reviewer ON reviewer.id = r.admin_reviewed_by
       ${conditions.length ? `WHERE ${conditions.join(" AND ")}` : ""}
       ORDER BY r.activity_date DESC, r.created_at DESC`,
      values,
    );

    return res.json({ success: true, data: { reports } });
  } catch (error) {
    return next(error);
  }
};

exports.createReport = async (req, res, next) => {
  let connection;
  try {
    const { project_id, activity_date, content } = req.body;

    if (!isValidId(project_id))
      return sendError(res, 400, "A valid project is required.");
    if (!isValidDate(activity_date))
      return sendError(res, 400, "Activity date must be a valid YYYY-MM-DD date.");
    if (!isNonEmptyString(content, 10000))
      return sendError(res, 400, "Describe your daily activity (up to 10,000 characters).");

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [projects] = await connection.execute(
      `SELECT p.id, p.name FROM projects p
       LEFT JOIN project_members pm
         ON pm.project_id = p.id AND pm.user_id = ?
       WHERE p.id = ? AND (p.owner_id = ? OR pm.user_id IS NOT NULL)
       LIMIT 1`,
      [req.user.id, Number(project_id), req.user.id],
    );
    if (!projects.length) {
      await connection.rollback();
      return sendError(res, 403, "You must be a project member to submit a report.");
    }

    const [result] = await connection.execute(
      `INSERT INTO daily_activity_reports
        (project_id, user_id, activity_date, content)
       VALUES (?, ?, ?, ?)
       RETURNING id`,
      [Number(project_id), req.user.id, activity_date, content.trim()],
    );
    const delivered = await notifyProjectManagers(
      connection,
      Number(project_id),
      Number(req.user.id),
      `A daily activity report from ${req.user.full_name} for ${projects[0].name} is ready for review.`,
    );
    if (!delivered) {
      await connection.rollback();
      return sendError(
        res,
        409,
        "This project has no assigned manager to receive reports.",
      );
    }
    await connection.commit();

    const report = await findReport(result.insertId);
    return res.status(201).json({
      success: true,
      message: "Daily activity report submitted for manager review.",
      data: { report },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
};

exports.updateReport = async (req, res, next) => {
  let connection;
  try {
    const { id } = req.params;
    const { activity_date, content } = req.body;
    if (!isValidId(id)) return sendError(res, 400, "Invalid report ID.");
    if (!isValidDate(activity_date))
      return sendError(res, 400, "Activity date must be a valid YYYY-MM-DD date.");
    if (!isNonEmptyString(content, 10000))
      return sendError(res, 400, "Describe your daily activity (up to 10,000 characters).");

    const report = await findReport(Number(id));
    if (!report) return sendError(res, 404, "Report not found.");
    if (Number(report.user_id) !== Number(req.user.id))
      return sendError(res, 403, "You can only update your own reports.");
    if (report.review_stage !== "member_action")
      return sendError(res, 409, "This report is not waiting for your changes.");

    connection = await pool.getConnection();
    await connection.beginTransaction();
    await connection.execute(
      `UPDATE daily_activity_reports
       SET activity_date = ?, content = ?, review_stage = 'manager_review',
           manager_comment = NULL, manager_reviewed_by = NULL,
           manager_reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [activity_date, content.trim(), Number(id)],
    );
    const delivered = await notifyProjectManagers(
      connection,
      Number(report.project_id),
      Number(req.user.id),
      `${req.user.full_name} resubmitted a daily activity report for ${report.project_name}.`,
    );
    if (!delivered) {
      await connection.rollback();
      return sendError(
        res,
        409,
        "This project has no assigned manager to receive reports.",
      );
    }
    await connection.commit();
    return res.json({
      success: true,
      message: "Report updated and resubmitted for manager review.",
      data: { report: await findReport(Number(id)) },
    });
  } catch (error) {
    if (connection) await connection.rollback();
    return next(error);
  } finally {
    connection?.release();
  }
};

exports.reviewReport = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, comment = "" } = req.body;
    const role = String(req.user.role || "").toLowerCase();
    if (!isValidId(id)) return sendError(res, 400, "Invalid report ID.");
    if (typeof comment !== "string" || comment.length > 5000)
      return sendError(res, 400, "Review comment must be text of at most 5,000 characters.");

    const report = await findReport(Number(id));
    if (!report) return sendError(res, 404, "Report not found.");

    if (role === "admin") {
      if (report.review_stage !== "admin_review")
        return sendError(res, 409, "This report is not waiting for admin review.");
      if (!["approved", "changes_requested"].includes(decision))
        return sendError(res, 400, "Admin decision must be approved or changes_requested.");
      if (decision === "changes_requested" && !comment.trim())
        return sendError(res, 400, "Explain what changes are required.");

      await pool.execute(
        `UPDATE daily_activity_reports
         SET review_stage = ?, admin_comment = ?, admin_reviewed_by = ?,
             admin_reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [decision, comment.trim() || null, req.user.id, Number(id)],
      );
    } else if (role === "manager") {
      if (!["forwarded", "changes_requested"].includes(decision))
        return sendError(res, 400, "Manager decision must be forwarded or changes_requested.");
      if (!comment.trim())
        return sendError(res, 400, "Add your evaluation before submitting this report.");
      if (report.review_stage !== "manager_review")
        return sendError(res, 409, "This report is not waiting for manager review.");

      const [access] = await pool.execute(
        `SELECT p.id FROM projects p
         LEFT JOIN project_members pm
           ON pm.project_id = p.id AND pm.user_id = ?
         WHERE p.id = ? AND (p.owner_id = ? OR pm.project_role = 'manager')
         LIMIT 1`,
        [req.user.id, report.project_id, req.user.id],
      );
      if (!access.length)
        return sendError(res, 403, "You cannot review reports for this project.");

      await pool.execute(
        `UPDATE daily_activity_reports
         SET review_stage = ?, manager_comment = ?, manager_reviewed_by = ?,
             manager_reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          decision === "forwarded" ? "admin_review" : "member_action",
          comment.trim(),
          req.user.id,
          Number(id),
        ],
      );
    } else {
      return sendError(res, 403, "Only managers and admins can review reports.");
    }

    return res.json({
      success: true,
      message: "Report review saved.",
      data: { report: await findReport(Number(id)) },
    });
  } catch (error) {
    return next(error);
  }
};
