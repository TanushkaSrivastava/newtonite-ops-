const mongoose = require("mongoose");
const WorkItem = require("../models/WorkItem");
const Team = require("../models/Team");
const { AppError } = require("../middleware/errorHandler");
const { resolveUserTeamRole } = require("../middleware/authorize");

async function getDashboardSummary(req, res, next) {
  try {
    const { team: teamId } = req.query;

    if (!teamId || !mongoose.isValidObjectId(teamId)) {
      return next(
        new AppError("A valid team query parameter is required for the dashboard", 400, "MISSING_TEAM_PARAM")
      );
    }

    const team = await Team.findById(teamId);
    if (!team) {
      return next(new AppError("Team not found", 404, "TEAM_NOT_FOUND"));
    }

    const role = resolveUserTeamRole(team, req.user.id);
    if (!role) {
      return next(new AppError("Access denied: You are not a member of this team", 403, "FORBIDDEN"));
    }

    const teamObjectId = new mongoose.Types.ObjectId(teamId);
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    // MongoDB Aggregation Pipeline: compute metrics on the database side
    const [countsResult, recentlyUpdated, assignedToMeCount] = await Promise.all([
      WorkItem.aggregate([
        { $match: { team: teamObjectId } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            open: {
              $sum: { $cond: [{ $eq: ["$status", "OPEN"] }, 1, 0] },
            },
            inProgress: {
              $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] },
            },
            blocked: {
              $sum: { $cond: [{ $eq: ["$status", "BLOCKED"] }, 1, 0] },
            },
            pendingApproval: {
              $sum: { $cond: [{ $eq: ["$status", "PENDING_APPROVAL"] }, 1, 0] },
            },
            resolved: {
              $sum: { $cond: [{ $eq: ["$status", "RESOLVED"] }, 1, 0] },
            },
            closed: {
              $sum: { $cond: [{ $eq: ["$status", "CLOSED"] }, 1, 0] },
            },
            criticalOrUrgent: {
              $sum: {
                $cond: [
                  { $in: ["$priority", ["HIGH", "CRITICAL", "URGENT"]] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),

      WorkItem.find({ team: teamObjectId })
        .sort({ updatedAt: -1 })
        .limit(5)
        .populate("assignee", "name email")
        .populate("createdBy", "name email")
        .lean(),

      WorkItem.countDocuments({
        team: teamObjectId,
        assignee: userObjectId,
        status: { $nin: ["CLOSED", "RESOLVED"] },
      }),
    ]);

    const metrics = countsResult[0] || {
      total: 0,
      open: 0,
      inProgress: 0,
      blocked: 0,
      pendingApproval: 0,
      resolved: 0,
      closed: 0,
      criticalOrUrgent: 0,
    };

    delete metrics._id;
    metrics.assignedToMe = assignedToMeCount;

    res.status(200).json({
      success: true,
      data: {
        team: {
          id: team._id,
          name: team.name,
          role,
        },
        metrics,
        recentlyUpdated: recentlyUpdated.map((item) => {
          item.id = item._id.toString();
          delete item._id;
          return item;
        }),
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboardSummary,
};
