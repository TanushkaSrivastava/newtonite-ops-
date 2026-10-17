const workItemService = require("../services/workItem.service");
const activityService = require("../services/activity.service");

async function createWorkItem(req, res, next) {
  try {
    const idempotencyKey =
      req.headers["idempotency-key"] || req.headers["x-idempotency-key"] || null;
    const { workItem, isDuplicate } = await workItemService.createWorkItem(
      req.body,
      req.user.id,
      idempotencyKey
    );

    res.status(isDuplicate ? 200 : 201).json({
      success: true,
      data: workItem,
      isDuplicate,
    });
  } catch (error) {
    next(error);
  }
}

async function getWorkItems(req, res, next) {
  try {
    const result = await workItemService.getWorkItems(req.query, req.user.id);
    res.status(200).json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function getWorkItemById(req, res, next) {
  try {
    const workItem = await workItemService.getWorkItemById(
      req.params.id,
      req.user.id
    );
    res.status(200).json({
      success: true,
      data: workItem,
    });
  } catch (error) {
    next(error);
  }
}

async function updateWorkItem(req, res, next) {
  try {
    const updated = await workItemService.updateWorkItem(
      req.params.id,
      req.body,
      req.user.id
    );
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function assignWorkItem(req, res, next) {
  try {
    const updated = await workItemService.assignWorkItem(
      req.params.id,
      req.body,
      req.user.id
    );
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function transitionWorkItem(req, res, next) {
  try {
    const updated = await workItemService.transitionWorkItem(
      req.params.id,
      req.body,
      req.user.id
    );
    res.status(200).json({
      success: true,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

async function getWorkItemActivities(req, res, next) {
  try {
    // First verify user has access to this work item
    await workItemService.getWorkItemById(req.params.id, req.user.id);

    const result = await activityService.getWorkItemActivities(
      req.params.id,
      req.query
    );
    res.status(200).json({
      success: true,
      data: result.activities,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

async function addComment(req, res, next) {
  try {
    const activity = await workItemService.addComment(
      req.params.id,
      req.body,
      req.user.id
    );
    res.status(201).json({
      success: true,
      data: activity,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createWorkItem,
  getWorkItems,
  getWorkItemById,
  updateWorkItem,
  assignWorkItem,
  transitionWorkItem,
  getWorkItemActivities,
  addComment,
};
