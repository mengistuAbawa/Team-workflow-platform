const pool = require("../config/db");
const taskService = require("../services/taskService");
const notificationService = require("../services/notificationService");
const activityService = require("../services/activityService");

const allowedStatuses = ["todo", "in_progress", "in_review", "done"];
const allowedPriorities = ["low", "medium", "high", "urgent"];

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function getUserId(req) {
  return req.user?.id ?? req.user?.userId;
}

function getRole(req) {
  return String(req.user?.role || "").toLowerCase();
}

function isManager(req) {
  return ["admin", "manager"].includes(getRole(req));
}

function validId(value) {
  return /^\d+$/.test(String(value)) && Number(value) > 0;
}

async function canManageTask(taskId, userId, role) {
  if (role === "admin") return true;
  const [rows] = await pool.execute(
    `SELECT t.id FROM tasks t
     INNER JOIN projects p ON p.id = t.project_id
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
     WHERE t.id = ? AND (p.owner_id = ? OR pm.project_role = 'manager' OR t.created_by = ?)
     LIMIT 1`,
    [userId, taskId, userId, userId],
  );
  return rows.length > 0;
}

async function canManageProject(projectId, userId, role) {
  if (role === "admin") return true;
  const [rows] = await pool.execute(
    `SELECT p.id FROM projects p
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
     WHERE p.id = ? AND (p.owner_id = ? OR pm.project_role = 'manager')
     LIMIT 1`,
    [userId, projectId, userId],
  );
  return rows.length > 0;
}

async function canViewTask(taskId, userId, role) {
  if (role === "admin") return true;
  const [rows] = await pool.execute(
    `SELECT t.id FROM tasks t
     INNER JOIN projects p ON p.id = t.project_id
     LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
     WHERE t.id = ? AND (
       p.owner_id = ? OR pm.user_id IS NOT NULL OR t.assignee_id = ? OR t.created_by = ?
     )
     LIMIT 1`,
    [userId, taskId, userId, userId, userId],
  );
  return rows.length > 0;
}

// GET /api/tasks
exports.getTasks = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const role = getRole(req);

    if (!userId) {
      return sendError(res, 401, "Authentication required.");
    }

    const tasks = await taskService.findForUser(userId, req.query, role);
    return res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

// GET /api/tasks/:id
exports.getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    const allowed = await canViewTask(Number(id), getUserId(req), getRole(req));
    if (!allowed) {
      return sendError(res, 403, "You are not allowed to view this task.");
    }

    const task = await taskService.findById(Number(id));
    if (!task) {
      return sendError(res, 404, "Task not found.");
    }

    return res.json({ success: true, data: { task } });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks
exports.createTask = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const role = getRole(req);

    const {
      project_id,
      title,
      description = "",
      assignee_id = null,
      priority = "medium",
      due_date = null,
    } = req.body;

    if (!validId(project_id) || typeof title !== "string" || !title.trim()) {
      return sendError(
        res,
        400,
        "A valid project ID and task title are required.",
      );
    }

    const allowed = await canManageProject(Number(project_id), userId, role);
    if (!allowed) {
      return sendError(
        res,
        403,
        "You do not have permission to create tasks in this project.",
      );
    }

    if (!allowedPriorities.includes(priority)) {
      return sendError(res, 400, "Invalid task priority.");
    }

    if (typeof description !== "string") {
      return sendError(res, 400, "Description must be text.");
    }

    if (assignee_id) {
      if (!validId(assignee_id)) {
        return sendError(res, 400, "Invalid assignee ID.");
      }
      const [users] = await pool.execute(
        "SELECT id, is_active FROM users WHERE id = ? LIMIT 1",
        [Number(assignee_id)],
      );
      if (!users.length || Number(users[0].is_active) !== 1) {
        return sendError(res, 404, "Active assignee not found.");
      }
    }

    const [maxPos] = await pool.execute(
      "SELECT MAX(position) AS max_pos FROM tasks WHERE project_id = ?",
      [Number(project_id)],
    );
    const position = (maxPos[0]?.max_pos || 0) + 1;

    const [result] = await pool.execute(
      `INSERT INTO tasks
        (project_id, title, description, status, priority,
         assignee_id, created_by, due_date, position)
       VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, ?)`,
      [
        Number(project_id),
        title.trim(),
        description.trim(),
        priority,
        assignee_id ? Number(assignee_id) : null,
        userId,
        due_date || null,
        position,
      ],
    );

    const createdTask = await taskService.findById(result.insertId);

    // Activity log + notification for assignee
    try {
      await activityService.create({
        project_id: Number(project_id),
        task_id: result.insertId,
        user_id: userId,
        action: "created_task",
        details: { title: title.trim() },
      });
    } catch {
      // non-blocking
    }

    try {
      if (assignee_id && Number(assignee_id) !== Number(userId)) {
        await notificationService.create({
          user_id: Number(assignee_id),
          title: "New task assigned to you",
          message: `"${createdTask.title}" in ${createdTask.project_name} has been assigned to you.`,
          link: `/tasks`,
        });
      }
    } catch {
      // non-blocking
    }

    return res.status(201).json({
      success: true,
      message: "Task created successfully.",
      data: { task: createdTask },
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/tasks/:id
exports.updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const role = getRole(req);

    if (!validId(id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    const [existing] = await pool.execute(
      "SELECT id, project_id FROM tasks WHERE id = ?",
      [Number(id)],
    );

    if (!existing.length) {
      return sendError(res, 404, "Task not found.");
    }

    const allowed = await canManageTask(Number(id), userId, role);
    if (!allowed) {
      return sendError(res, 403, "You cannot edit this task.");
    }

    const {
      title,
      description,
      priority,
      status,
      due_date,
      project_id,
      assignee_id,
    } = req.body;

    const fields = [];
    const values = [];

    if (title !== undefined) {
      if (typeof title !== "string" || !title.trim()) {
        return sendError(res, 400, "Task title cannot be empty.");
      }
      fields.push("title = ?");
      values.push(title.trim());
    }

    if (description !== undefined) {
      if (typeof description !== "string") {
        return sendError(res, 400, "Description must be text.");
      }
      fields.push("description = ?");
      values.push(description.trim());
    }

    if (status !== undefined) {
      if (!allowedStatuses.includes(status)) {
        return sendError(res, 400, "Invalid task status.");
      }
      fields.push("status = ?");
      values.push(status);
    }

    if (priority !== undefined) {
      if (!allowedPriorities.includes(priority)) {
        return sendError(res, 400, "Invalid task priority.");
      }
      fields.push("priority = ?");
      values.push(priority);
    }

    if (due_date !== undefined) {
      fields.push("due_date = ?");
      values.push(due_date || null);
    }

    if (project_id !== undefined) {
      if (!validId(project_id)) {
        return sendError(res, 400, "Invalid project ID.");
      }
      const [projects] = await pool.execute(
        "SELECT id FROM projects WHERE id = ?",
        [Number(project_id)],
      );
      if (!projects.length) {
        return sendError(res, 404, "Project not found.");
      }
      fields.push("project_id = ?");
      values.push(Number(project_id));
    }

    if (assignee_id !== undefined) {
      if (assignee_id !== null && assignee_id !== "") {
        if (!validId(assignee_id)) {
          return sendError(res, 400, "Invalid assignee ID.");
        }
        const [users] = await pool.execute(
          "SELECT id, is_active FROM users WHERE id = ?",
          [Number(assignee_id)],
        );
        if (!users.length || Number(users[0].is_active) !== 1) {
          return sendError(res, 404, "Active assignee not found.");
        }
        fields.push("assignee_id = ?");
        values.push(Number(assignee_id));
      } else {
        fields.push("assignee_id = ?");
        values.push(null);
      }
    }

    if (!fields.length) {
      return sendError(res, 400, "No valid task fields were provided.");
    }

    values.push(Number(id));

    await pool.execute(
      `UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    const updated = await taskService.findById(Number(id));

    return res.json({
      success: true,
      message: "Task updated successfully.",
      data: { task: updated },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tasks/:id
exports.deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = getUserId(req);
    const role = getRole(req);

    if (!validId(id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    const [existing] = await pool.execute("SELECT id FROM tasks WHERE id = ?", [
      Number(id),
    ]);

    if (!existing.length) {
      return sendError(res, 404, "Task not found.");
    }

    const allowed = await canManageTask(Number(id), userId, role);
    if (!allowed) {
      return sendError(
        res,
        403,
        "You do not have permission to delete this task.",
      );
    }

    await pool.execute("DELETE FROM tasks WHERE id = ?", [Number(id)]);

    return res.json({
      success: true,
      message: "Task deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/status
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = getUserId(req);
    const role = getRole(req);

    if (!validId(id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    if (!allowedStatuses.includes(status)) {
      return sendError(res, 400, "Invalid task status.");
    }

    const [tasks] = await pool.execute(
      "SELECT id, project_id, assignee_id, status FROM tasks WHERE id = ?",
      [Number(id)],
    );

    if (!tasks.length) {
      return sendError(res, 404, "Task not found.");
    }

    const task = tasks[0];
    const isAssignee = Number(task.assignee_id) === Number(userId);
    const canManage = await canManageTask(Number(id), userId, role);

    if (!canManage && !isAssignee) {
      return sendError(
        res,
        403,
        "You can only update tasks assigned to you or in your projects.",
      );
    }

    // ── Review workflow enforcement ──────────────────────────────
    // Members (non-managers) can move a task to in_progress or submit
    // for review (in_review), but cannot set it to done — only
    // managers/admins can approve work. Once a task is in_review,
    // only a manager can change its status (approve or request changes).
    if (!canManage) {
      if (status === "done") {
        return sendError(
          res,
          403,
          "You can submit work for review, but only a manager can approve it as done.",
        );
      }

      if (task.status === "in_review" && status !== "in_review") {
        return sendError(
          res,
          403,
          "This task is awaiting review. Only a manager can approve it or request changes.",
        );
      }
    }

    await pool.execute(
      `UPDATE tasks
       SET status = ?,
           review_status = CASE
             WHEN ? = 'in_review' THEN 'pending'
             ELSE review_status
           END,
           review_comment = CASE
             WHEN ? = 'in_review' THEN NULL
             ELSE review_comment
           END,
           reviewed_by = CASE
             WHEN ? = 'in_review' THEN NULL
             ELSE reviewed_by
           END,
           reviewed_at = CASE
             WHEN ? = 'in_review' THEN NULL
             ELSE reviewed_at
           END
       WHERE id = ?`,
      [status, status, status, status, status, Number(id)],
    );

    const updatedTask = await taskService.findById(Number(id));

    // ── Activity log ─────────────────────────────────────────────
    try {
      await activityService.create({
        project_id: task.project_id,
        task_id: Number(id),
        user_id: userId,
        action:
          status === "in_review" ? "submitted_for_review" : "status_changed",
        details: { from: task.status, to: status },
      });
    } catch {
      // non-blocking — log failures should not fail the request
    }

    // ── Notifications ─────────────────────────────────────────────
    try {
      if (status === "in_review") {
        // Notify project managers and admins about the submission
        const [managers] = await pool.execute(
          `SELECT DISTINCT u.id FROM users u
           LEFT JOIN project_members pm ON pm.user_id = u.id
           WHERE pm.project_id = ? AND (pm.project_role = 'manager' OR u.role = 'admin')
              OR u.role = 'admin'
           ORDER BY u.id`,
          [task.project_id],
        );
        const managerIds = managers
          .map((m) => Number(m.id))
          .filter((mid) => mid !== Number(userId));
        if (managerIds.length) {
          await notificationService.createForUsers(managerIds, {
            title: "Task submitted for review",
            message: `"${updatedTask.title}" in ${updatedTask.project_name} is ready for review.`,
            link: `/projects/${task.project_id}`,
          });
        }
      } else if (
        task.assignee_id &&
        Number(task.assignee_id) !== Number(userId)
      ) {
        // Notify the assignee that their task status was changed
        await notificationService.create({
          user_id: Number(task.assignee_id),
          title: "Task status updated",
          message: `"${updatedTask.title}" was moved to ${status.replace("_", " ")}.`,
          link: `/tasks`,
        });
      }
    } catch {
      // non-blocking
    }

    return res.json({
      success: true,
      message:
        status === "in_review"
          ? "Work submitted for review."
          : "Task status updated successfully.",
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/review
exports.reviewTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, comment = "" } = req.body;
    const userId = getUserId(req);
    const role = getRole(req);

    if (!validId(id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    const allowed = await canManageTask(Number(id), userId, role);
    if (!allowed) {
      return sendError(
        res,
        403,
        "Only managers and project leads can review work.",
      );
    }

    if (!["approved", "changes_requested"].includes(decision)) {
      return sendError(
        res,
        400,
        "Decision must be approved or changes_requested.",
      );
    }

    if (typeof comment !== "string") {
      return sendError(res, 400, "Review comment must be text.");
    }

    if (decision === "changes_requested" && !comment.trim()) {
      return sendError(res, 400, "Explain what changes are required.");
    }

    const [tasks] = await pool.execute(
      "SELECT id, status FROM tasks WHERE id = ?",
      [Number(id)],
    );

    if (!tasks.length) {
      return sendError(res, 404, "Task not found.");
    }

    const newStatus = decision === "approved" ? "done" : "in_progress";

    await pool.execute(
      `UPDATE tasks
       SET status = ?,
           review_status = ?,
           review_comment = ?,
           reviewed_by = ?,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [newStatus, decision, comment.trim() || null, userId, Number(id)],
    );

    const updatedTask = await taskService.findById(Number(id));

    // Activity log + notification for assignee
    try {
      await activityService.create({
        project_id: updatedTask.project_id,
        task_id: Number(id),
        user_id: userId,
        action: decision === "approved" ? "approved_task" : "requested_changes",
        details: { comment: comment.trim() || null },
      });
    } catch {
      // non-blocking
    }

    try {
      if (updatedTask.assignee_id) {
        await notificationService.create({
          user_id: Number(updatedTask.assignee_id),
          title:
            decision === "approved"
              ? "Task approved"
              : "Changes requested on your task",
          message:
            decision === "approved"
              ? `"${updatedTask.title}" has been approved.`
              : `"${updatedTask.title}" needs changes. ${comment.trim() || ""}`.trim(),
          link: `/tasks`,
        });
      }
    } catch {
      // non-blocking
    }

    return res.json({
      success: true,
      message:
        decision === "approved"
          ? "Task approved successfully."
          : "Changes requested. Update the task and submit it again.",
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/tasks/:id/assign
exports.assignTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assignee_id } = req.body;
    const userId = getUserId(req);
    const role = getRole(req);

    if (!validId(id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    const allowed = await canManageTask(Number(id), userId, role);
    if (!allowed) {
      return sendError(
        res,
        403,
        "You do not have permission to assign this task.",
      );
    }

    let nextAssigneeId = null;
    if (
      assignee_id !== null &&
      assignee_id !== "" &&
      assignee_id !== undefined
    ) {
      if (!validId(assignee_id)) {
        return sendError(res, 400, "Invalid assignee ID.");
      }
      const [users] = await pool.execute(
        "SELECT id, is_active FROM users WHERE id = ?",
        [Number(assignee_id)],
      );
      if (!users.length || Number(users[0].is_active) !== 1) {
        return sendError(res, 404, "Active assignee not found.");
      }
      nextAssigneeId = Number(assignee_id);
    }

    await pool.execute("UPDATE tasks SET assignee_id = ? WHERE id = ?", [
      nextAssigneeId,
      Number(id),
    ]);

    const updatedTask = await taskService.findById(Number(id));

    // Activity log + notification for new assignee
    try {
      await activityService.create({
        project_id: updatedTask.project_id,
        task_id: Number(id),
        user_id: userId,
        action: "assigned_task",
        details: { assignee_id: nextAssigneeId },
      });
    } catch {
      // non-blocking
    }

    try {
      if (nextAssigneeId && Number(nextAssigneeId) !== Number(userId)) {
        await notificationService.create({
          user_id: nextAssigneeId,
          title: "Task assigned to you",
          message: `"${updatedTask.title}" in ${updatedTask.project_name} has been assigned to you.`,
          link: `/tasks`,
        });
      }
    } catch {
      // non-blocking
    }

    return res.json({
      success: true,
      message: "Task reassigned successfully.",
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/tasks/:id/comments
exports.getTaskComments = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!validId(id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    const allowed = await canViewTask(Number(id), getUserId(req), getRole(req));
    if (!allowed) {
      return sendError(res, 403, "You cannot view comments on this task.");
    }

    const comments = await taskService.getComments(Number(id));

    return res.json({ success: true, data: { comments } });
  } catch (error) {
    next(error);
  }
};

// POST /api/tasks/:id/comments
exports.addTaskComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const commentText = req.body.content || req.body.comment;

    if (!validId(id)) {
      return sendError(res, 400, "Invalid task ID.");
    }

    if (typeof commentText !== "string" || !commentText.trim()) {
      return sendError(res, 400, "Comment text is required.");
    }

    const allowed = await canViewTask(Number(id), getUserId(req), getRole(req));
    if (!allowed) {
      return sendError(res, 403, "You cannot comment on this task.");
    }

    const comment = await taskService.addComment(
      Number(id),
      getUserId(req),
      commentText.trim(),
    );

    return res.status(201).json({
      success: true,
      message: "Comment added successfully.",
      data: { comment },
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/tasks/:id/comments/:commentId
exports.deleteTaskComment = async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const userId = getUserId(req);
    const role = getRole(req);

    if (!validId(id) || !validId(commentId)) {
      return sendError(res, 400, "Invalid task or comment ID.");
    }

    const [comments] = await pool.execute(
      `SELECT c.id, c.user_id
       FROM comments c
       WHERE c.id = ? AND c.task_id = ?`,
      [Number(commentId), Number(id)],
    );

    if (!comments.length) {
      return sendError(res, 404, "Comment not found.");
    }

    const comment = comments[0];
    const isOwner = Number(comment.user_id) === Number(userId);
    const isLead = await canManageTask(Number(id), userId, role);

    if (!isLead && !isOwner) {
      return sendError(res, 403, "You cannot delete this comment.");
    }

    await taskService.deleteComment(Number(commentId), Number(id));

    return res.json({
      success: true,
      message: "Comment deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};
