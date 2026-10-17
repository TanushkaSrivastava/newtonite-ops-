const express = require("express");
const workItemController = require("../controllers/workItem.controller");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const {
  createWorkItemSchema,
  updateWorkItemSchema,
  assignWorkItemSchema,
  transitionWorkItemSchema,
  addCommentSchema,
} = require("../validators/workItem.validator");

const router = express.Router();

// All work item operations require authentication
router.use(authenticate);

router.get("/", workItemController.getWorkItems);
router.post("/", validate(createWorkItemSchema), workItemController.createWorkItem);
router.get("/:id", workItemController.getWorkItemById);
router.patch("/:id", validate(updateWorkItemSchema), workItemController.updateWorkItem);
router.post("/:id/assign", validate(assignWorkItemSchema), workItemController.assignWorkItem);
router.post(
  "/:id/transition",
  validate(transitionWorkItemSchema),
  workItemController.transitionWorkItem
);
router.get("/:id/activity", workItemController.getWorkItemActivities);
router.post(
  "/:id/comments",
  validate(addCommentSchema),
  workItemController.addComment
);

module.exports = router;
