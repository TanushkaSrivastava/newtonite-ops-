const express = require("express");
const teamController = require("../controllers/team.controller");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const {
  createTeamSchema,
  addMemberSchema,
} = require("../validators/team.validator");

const router = express.Router();

router.use(authenticate);

router.post("/", validate(createTeamSchema), teamController.createTeam);
router.get("/", teamController.getTeams);
router.get("/:id", teamController.getTeamById);
router.post("/:id/members", validate(addMemberSchema), teamController.addTeamMember);

module.exports = router;
