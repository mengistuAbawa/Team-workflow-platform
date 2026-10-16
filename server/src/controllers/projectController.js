const projectService = require("../services/projectService");
const taskService = require("../services/taskService");
const {
  isValidId,
  isValidProjectStatus,
  isNonEmptyString,
  isValidDate,
} = require("../utils/validators");

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function getAccess(projectId, user) {
  const project = await projectService.findById(projectId);
  if (!project) return { project: null, allowed: false, manager: false };
  const members = await projectService.getMembers(projectId);
  const member = members.find((item) => Number(item.id) === Number(user.id));
  const owner = Number(project.owner_id) === Number(user.id);
  const allowed = user.role === "admin" || owner || Boolean(member);
  return {
    project,
    allowed,
    manager: user.role === "admin" || user.role === "manager" || owner || member?.project_role === "manager",
  };
}

const getProjects = asyncHandler(async (req, res) => {
  const projects = await projectService.findForUser(req.user.id, req.user.role);
  res.json({ success: true, data: { projects } });
});

const getProjectById = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return sendError(res, 400, "Invalid project ID.");
  const access = await getAccess(req.params.id, req.user);
  if (!access.project) return sendError(res, 404, "Project not found.");
  if (!access.allowed) return sendError(res, 403, "You do not have access to this project.");
  res.json({ success: true, data: { project: access.project } });
});

const createProject = asyncHandler(async (req, res) => {
  const { name, description = "", status = "planning", due_date = null, start_date = null, color } = req.body;
  if (!isNonEmptyString(name, 150)) return sendError(res, 400, "Project name is required and must be at most 150 characters.");
  if (typeof description !== "string" || description.length > 5000) return sendError(res, 400, "Description must be at most 5000 characters.");
  if (!isValidProjectStatus(status)) return sendError(res, 400, "Invalid project status.");
  if (due_date && !isValidDate(due_date)) return sendError(res, 400, "Due date must be a valid YYYY-MM-DD date.");
  if (start_date && !isValidDate(start_date)) return sendError(res, 400, "Start date must be a valid YYYY-MM-DD date.");
  if (color !== undefined && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) return sendError(res, 400, "Project color must be a six-digit hex color.");

  const project = await projectService.create(
    { name, description, status, due_date, start_date, ...(color ? { color } : {}) },
    req.user.id
  );
  res.status(201).json({ success: true, message: "Project created successfully.", data: { project } });
});

const updateProject = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return sendError(res, 400, "Invalid project ID.");
  const access = await getAccess(req.params.id, req.user);
  if (!access.project) return sendError(res, 404, "Project not found.");
  if (!access.manager) return sendError(res, 403, "You cannot update this project.");
  const { name, description, status, due_date, start_date, color } = req.body;
  if (name !== undefined && !isNonEmptyString(name, 150)) return sendError(res, 400, "Project name is required and must be at most 150 characters.");
  if (description !== undefined && (typeof description !== "string" || description.length > 5000)) return sendError(res, 400, "Description must be at most 5000 characters.");
  if (status !== undefined && !isValidProjectStatus(status)) return sendError(res, 400, "Invalid project status.");
  if (due_date && !isValidDate(due_date)) return sendError(res, 400, "Due date must be a valid YYYY-MM-DD date.");
  if (start_date && !isValidDate(start_date)) return sendError(res, 400, "Start date must be a valid YYYY-MM-DD date.");
  if (color !== undefined && (typeof color !== "string" || !/^#[0-9a-fA-F]{6}$/.test(color))) return sendError(res, 400, "Project color must be a six-digit hex color.");
  const project = await projectService.update(req.params.id, req.body);
  res.json({ success: true, data: { project } });
});

const deleteProject = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return sendError(res, 400, "Invalid project ID.");
  const access = await getAccess(req.params.id, req.user);
  if (!access.project) return sendError(res, 404, "Project not found.");
  if (!access.manager) return sendError(res, 403, "You cannot delete this project.");
  await projectService.delete(req.params.id);
  res.json({ success: true, message: "Project deleted successfully." });
});

const getProjectTasks = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return sendError(res, 400, "Invalid project ID.");
  const access = await getAccess(req.params.id, req.user);
  if (!access.project) return sendError(res, 404, "Project not found.");
  if (!access.allowed) return sendError(res, 403, "You do not have access to this project.");
  const tasks = await taskService.findForUser(req.user.id, { ...req.query, project_id: req.params.id }, req.user.role);
  res.json({ success: true, data: { tasks } });
});

const getProjectMembers = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return sendError(res, 400, "Invalid project ID.");
  const access = await getAccess(req.params.id, req.user);
  if (!access.project) return sendError(res, 404, "Project not found.");
  if (!access.allowed) return sendError(res, 403, "You do not have access to this project.");
  const members = await projectService.getMembers(req.params.id);
  res.json({ success: true, data: { members } });
});

const addProjectMember = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id)) return sendError(res, 400, "Invalid project ID.");
  const access = await getAccess(req.params.id, req.user);
  if (!access.project) return sendError(res, 404, "Project not found.");
  if (!access.manager) return sendError(res, 403, "You cannot manage this project's members.");
  const userId = req.body.user_id;
  const projectRole = req.body.project_role || "member";
  if (!isValidId(userId)) return sendError(res, 400, "A valid user_id is required.");
  if (!["member", "manager"].includes(projectRole)) return sendError(res, 400, "Invalid project role.");
  await projectService.addMember(req.params.id, userId, projectRole);
  res.status(201).json({ success: true, message: "Project member added." });
});

const removeProjectMember = asyncHandler(async (req, res) => {
  if (!isValidId(req.params.id) || !isValidId(req.params.userId)) return sendError(res, 400, "Invalid project or user ID.");
  const access = await getAccess(req.params.id, req.user);
  if (!access.project) return sendError(res, 404, "Project not found.");
  if (!access.manager) return sendError(res, 403, "You cannot manage this project's members.");
  const removed = await projectService.removeMember(req.params.id, req.params.userId);
  if (!removed) return sendError(res, 404, "Project member not found.");
  res.json({ success: true, message: "Project member removed." });
});

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
};


