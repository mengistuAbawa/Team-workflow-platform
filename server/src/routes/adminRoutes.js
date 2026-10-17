const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const {
  listUsers,
  createUser,
  updateUser,
  toggleUserStatus,
  deleteUser,
  getSystemStats,
} = require("../controllers/adminController");

const router = express.Router();

// Guard all admin routes with authentication and admin role authorization
router.use(authenticate);
router.use(authorize("admin"));

router.get("/users", listUsers);
router.post("/users", createUser);
router.put("/users/:id", updateUser);
router.patch("/users/:id/status", toggleUserStatus);
router.delete("/users/:id", deleteUser);

router.get("/stats", getSystemStats);

module.exports = router;
