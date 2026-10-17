const express = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const authenticate = require("../middleware/authenticate");

const router = express.Router();

router.use(authenticate);

router.get("/summary", dashboardController.getDashboardSummary);

module.exports = router;
