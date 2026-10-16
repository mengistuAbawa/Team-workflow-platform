
const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const taskController = require("../controllers/taskController");

// Validate authentication middleware.
if (typeof authenticate !== "function") {
  throw new Error(
    "Authentication error: auth.js must export an authenticate function."
  );
}

// Validate required controller methods.
const requiredMethods = [
  "getTasks",
  "createTask",
  "getTaskById",
  "updateTask",
  "deleteTask",
  "updateTaskStatus",
  "assignTask",
  "reviewTask",
  "getTaskComments",
  "addTaskComment",
  "deleteTaskComment",
];

for (const method of requiredMethods) {
  if (typeof taskController[method] !== "function") {
    throw new Error(
      `Task controller error: taskController.${method} is missing or is not a function.`
    );
  }
}

// All task routes require authentication.
router.use(authenticate);

// Task CRUD
router.get("/", taskController.getTasks);
router.post("/", taskController.createTask);
router.get("/:id", taskController.getTaskById);
router.put("/:id", taskController.updateTask);
router.delete("/:id", taskController.deleteTask);

// Task status, assignment, and review
router.patch("/:id/status", taskController.updateTaskStatus);
router.patch("/:id/assign", taskController.assignTask);
router.patch("/:id/review", taskController.reviewTask);

// Task comments
router.get("/:id/comments", taskController.getTaskComments);
router.post("/:id/comments", taskController.addTaskComment);
router.delete(
  "/:id/comments/:commentId",
  taskController.deleteTaskComment
);

module.exports = router;
