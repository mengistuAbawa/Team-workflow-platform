const express = require("express");
const { authenticate } = require("../middleware/auth");
const { getDashboard } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", authenticate, getDashboard);

module.exports = router;
