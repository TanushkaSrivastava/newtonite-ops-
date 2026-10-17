const mongoose = require("mongoose");
const Activity = require("../models/Activity");

async function recordActivity({
  teamId,
  workItemId,
  actorId,
  action,
  changes = [],
  metadata = {},
  requestId = null,
}) {
  try {
    return await Activity.create({
      team: teamId,
      workItem: workItemId,
      actor: actorId,
      action,
      changes,
      metadata,
      requestId,
    });
  } catch (error) {
    console.error("Failed to record activity log:", error.message);
    // Non-blocking log failure in standard environments or propagate if critical
    return null;
  }
}

async function getWorkItemActivities(workItemId, { page = 1, limit = 20 } = {}) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const [activities, total] = await Promise.all([
    Activity.find({ workItem: workItemId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(l)
      .populate("actor", "name email")
      .lean(),
    Activity.countDocuments({ workItem: workItemId }),
  ]);

  return {
    activities,
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
    },
  };
}

module.exports = {
  recordActivity,
  getWorkItemActivities,
};
