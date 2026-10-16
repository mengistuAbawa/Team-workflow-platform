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
      activity = await activityService.getUserActivity(userId, 15);
    } catch {
      activity = [];
    }

    // 5. Compute real stats
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
        projects,
        tasks,
        members,
        activity,
        stats: {
          projects: totalProjects,
          openTasks,
          completedTasks,
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
