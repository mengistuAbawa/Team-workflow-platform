const express = require("express");
const router = express.Router();

const {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getProjectTasks,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} = require("../controllers/projectController");

const { authenticate } = require("../middleware/auth");

router.use(authenticate);

router.get("/", getProjects);
router.post("/", createProject);
router.get("/:id/tasks", getProjectTasks);
router.get("/:id/members", getProjectMembers);
router.post("/:id/members", addProjectMember);
router.delete("/:id/members/:userId", removeProjectMember);
router.get("/:id", getProjectById);
router.put("/:id", updateProject);
router.delete("/:id", deleteProject);

module.exports = router;
