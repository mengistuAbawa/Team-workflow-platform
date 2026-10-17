const pool = require("../config/db");
const projectService = require("../services/projectService");
const taskService = require("../services/taskService");
const activityService = require("../services/activityService");

async function getDashboard(req, res, next) {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // 1. Fetch user's projects
    const projects = await projectService.findForUser(userId, role);

    // 2. Fetch user's tasks
    const rawTasks = await taskService.findForUser(userId, {}, role);

    // Format tasks so that assignee array and counts are present for frontend
    const tasks = rawTasks.map((t) => ({
      ...t,
      assignee: t.assignee_id
        ? {
            id: t.assignee_id,
            full_name: t.assignee_name,
            avatar: t.assignee_avatar,
          }
        : null,
      assignees: t.assignee_id
        ? [
            {
              id: t.assignee_id,
              full_name: t.assignee_name,
              avatar: t.assignee_avatar,
            },
          ]
        : [],
      comment_count: Number(t.comment_count || 0),
      comments_count: Number(t.comment_count || 0),
    }));

    // 3. Fetch active team members
    const [members] = await pool.execute(
      `SELECT id, full_name, email, avatar, role
       FROM users
       WHERE is_active = 1
       ORDER BY full_name ASC
       LIMIT 30`
    );

    // 4. Fetch recent user / workspace activities
    let activity = [];
    try {
      if (role === "admin") {
        const [rows] = await pool.execute(
          `SELECT a.id, a.action, a.details, a.created_at,
                  u.full_name AS user_name, u.avatar AS user_avatar,
                  p.name AS project_name, t.title AS task_title
           FROM activity_logs a
           LEFT JOIN users u ON u.id = a.user_id
           LEFT JOIN projects p ON p.id = a.project_id
           LEFT JOIN tasks t ON t.id = a.task_id
           ORDER BY a.created_at DESC
           LIMIT 15`
        );
        activity = rows;
      } else {
        activity = await activityService.getUserActivity(userId, 15);
      }
    } catch {
      activity = [];
    }

    // 5. Review queue for admins & managers
    let reviewQueue = [];
    if (["admin", "manager"].includes(role)) {
      const [reviewRows] = await pool.execute(
        `SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.project_id,
                p.name AS project_name, u.full_name AS assignee_name, u.avatar AS assignee_avatar
         FROM tasks t
         INNER JOIN projects p ON p.id = t.project_id
         LEFT JOIN users u ON u.id = t.assignee_id
         WHERE t.status = 'in_review'
         ORDER BY t.updated_at DESC
         LIMIT 10`
      );
      reviewQueue = reviewRows;
    }

    // 6. User summary stats for Admin
    let systemUserStats = null;
    if (role === "admin") {
      const [[userCounts]] = await pool.execute(
        `SELECT
           COUNT(*) AS total_users,
           SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) AS admins,
           SUM(CASE WHEN role = 'manager' THEN 1 ELSE 0 END) AS managers,
           SUM(CASE WHEN role = 'member' THEN 1 ELSE 0 END) AS members,
           SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_users
         FROM users`
      );
      systemUserStats = userCounts;
    }

    // 7. Compute real stats
    const totalProjects = projects.length;
    const completedProjects = projects.filter(
      (p) => p.status === "completed"
    ).length;
    const inProgressProjects = projects.filter(
      (p) => p.status === "active"
    ).length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "done").length;
    const openTasks = totalTasks - completedTasks;
    const pendingReviews = tasks.filter((t) => t.status === "in_review").length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const upcomingDeadlines = tasks.filter(
      (t) => t.status !== "done" && t.due_date && String(t.due_date).slice(0, 10) >= todayStr
    ).length;

    const teamProgress = totalTasks
      ? Math.round((completedTasks / totalTasks) * 100)
      : totalProjects
      ? Math.round((completedProjects / totalProjects) * 100)
      : 0;

    return res.status(200).json({
      success: true,
      data: {
        user: req.user,
        role,
        projects,
        tasks,
        members,
        activity,
        reviewQueue,
        systemUserStats,
        stats: {
          projects: totalProjects,
          openTasks,
          completedTasks,
          pendingReviews,
          upcomingDeadlines,
          completedProjects,
          inProgressProjects,
          teamProgress,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { getDashboard };
