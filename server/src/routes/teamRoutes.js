
const express = require("express");
const { authenticate } = require("../middleware/auth");
const teamController = require("../controllers/teamController");

const router = express.Router();

// Protect all team routes
router.use(authenticate);

// GET /api/team
router.get("/", teamController.getTeamMembers);

module.exports = router;
