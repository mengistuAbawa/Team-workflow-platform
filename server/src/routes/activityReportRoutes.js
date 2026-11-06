const express = require("express");
const { authenticate } = require("../middleware/auth");
const reportController = require("../controllers/activityReportController");

const router = express.Router();

router.use(authenticate);
router.get("/", reportController.getReports);
router.post("/", reportController.createReport);
router.patch("/:id", reportController.updateReport);
router.patch("/:id/review", reportController.reviewReport);

module.exports = router;
