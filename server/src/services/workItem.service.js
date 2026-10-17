const mongoose = require("mongoose");
const WorkItem = require("../models/WorkItem");
const Team = require("../models/Team");
const { recordActivity } = require("./activity.service");
const { AppError } = require("../middleware/errorHandler");
const { resolveUserTeamRole } = require("../middleware/authorize");

const ALLOWED_TRANSITIONS = {
  OPEN: ["IN_PROGRESS", "BLOCKED", "CLOSED"],
  IN_PROGRESS: ["BLOCKED", "PENDING_APPROVAL", "RESOLVED", "OPEN"],
  BLOCKED: ["IN_PROGRESS", "OPEN"],
  PENDING_APPROVAL: ["RESOLVED", "IN_PROGRESS"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

async function verifyTeamMembership(teamId, userId) {
  if (!mongoose.isValidObjectId(teamId)) {
    throw new AppError("Invalid team ID", 400, "INVALID_TEAM_ID");
  }

  const team = await Team.findById(teamId);
  if (!team) {
    throw new AppError("Team not found", 404, "TEAM_NOT_FOUND");
  }

  const role = resolveUserTeamRole(team, userId);
  if (!role) {
    throw new AppError("Access denied: You are not a member of this team", 403, "FORBIDDEN");
  }

  return { team, role };
}

function verifyAssigneeInTeam(team, assigneeId) {
  if (!assigneeId) return true;
  const aid = assigneeId.toString();
  const isOwner = team.owner.toString() === aid || (team.createdBy && team.createdBy.toString() === aid);
  const isMember = team.members.some((m) => m.user.toString() === aid);

  if (!isOwner && !isMember) {
    throw new AppError("Assignee must belong to the selected team", 400, "INVALID_ASSIGNEE");
  }
  return true;
}

async function createWorkItem(data, userId, idempotencyKey = null) {
  const teamId = data.team || data.teamId;
  const { team } = await verifyTeamMembership(teamId, userId);

  const assigneeId = data.assignee || data.assigneeId || null;
  if (assigneeId) {
    verifyAssigneeInTeam(team, assigneeId);
  }

  // Idempotency check: if an idempotency key was supplied, check for existing item
  if (idempotencyKey) {
    const existing = await WorkItem.findOne({
      team: team._id,
      idempotencyKey,
    })
      .populate("createdBy", "name email")
      .populate("assignee", "name email");

    if (existing) {
      return { workItem: existing, isDuplicate: true };
    }
  }

  const workItem = await WorkItem.create({
    title: data.title.trim(),
    description: data.description.trim(),
    type: data.type || data.category || "OPERATIONAL",
    priority: data.priority || "MEDIUM",
    team: team._id,
    createdBy: userId,
    assignee: assigneeId || null,
    dueDate: data.dueDate ? new Date(data.dueDate) : null,
    version: 0,
    idempotencyKey: idempotencyKey || undefined,
  });

  await recordActivity({
    teamId: team._id,
    workItemId: workItem._id,
    actorId: userId,
    action: "WORK_ITEM_CREATED",
    changes: [
      { field: "status", oldValue: null, newValue: workItem.status },
      { field: "priority", oldValue: null, newValue: workItem.priority },
    ],
  });

  const populated = await WorkItem.findById(workItem._id)
    .populate("createdBy", "name email")
    .populate("assignee", "name email");

  return { workItem: populated, isDuplicate: false };
}

async function getWorkItemById(id, userId) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid work item ID", 400, "INVALID_ID");
  }

  const workItem = await WorkItem.findById(id)
    .populate("team", "name description")
    .populate("createdBy", "name email")
    .populate("assignee", "name email");

  if (!workItem) {
    throw new AppError("Work item not found", 404, "WORK_ITEM_NOT_FOUND");
  }

  // Enforce access control: user must belong to the item's team
  await verifyTeamMembership(workItem.team._id || workItem.team, userId);

  return workItem;
}

async function updateWorkItem(id, updates, userId) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid work item ID", 400, "INVALID_ID");
  }

  const existing = await WorkItem.findById(id);
  if (!existing) {
    throw new AppError("Work item not found", 404, "WORK_ITEM_NOT_FOUND");
  }

  await verifyTeamMembership(existing.team, userId);

  const expectedVersion = updates.version;
  if (typeof expectedVersion !== "number" || expectedVersion < 0) {
    throw new AppError("A valid version integer is required for optimistic concurrency", 400, "INVALID_VERSION");
  }

  // Allowlist editable fields
  const allowedFields = ["title", "description", "type", "category", "priority", "dueDate"];
  const setPayload = {};
  const changes = [];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      const fieldKey = field === "category" ? "type" : field;
      let val = updates[field];
      if (field === "dueDate") {
        val = val ? new Date(val) : null;
      }
      if (String(existing[fieldKey]) !== String(val)) {
        setPayload[fieldKey] = val;
        changes.push({
          field: fieldKey,
          oldValue: existing[fieldKey],
          newValue: val,
        });
      }
    }
  }

  if (Object.keys(setPayload).length === 0) {
    return existing;
  }

  // Atomic conditional update enforcing version
  const updated = await WorkItem.findOneAndUpdate(
    {
      _id: id,
      version: expectedVersion,
    },
    {
      $set: setPayload,
      $inc: { version: 1 },
    },
    { returnDocument: "after", runValidators: true }
  )
    .populate("createdBy", "name email")
    .populate("assignee", "name email");

  if (!updated) {
    // Current item exists, but version did not match -> Conflict
    throw new AppError(
      "This item was changed by another user. Please refresh and try again.",
      409,
      "VERSION_CONFLICT"
    );
  }

  if (changes.length > 0) {
    await recordActivity({
      teamId: updated.team,
      workItemId: updated._id,
      actorId: userId,
      action: "WORK_ITEM_UPDATED",
      changes,
    });
  }

  return updated;
}

async function assignWorkItem(id, { assignee, assigneeId, expectedVersion }, userId) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid work item ID", 400, "INVALID_ID");
  }

  const existing = await WorkItem.findById(id);
  if (!existing) {
    throw new AppError("Work item not found", 404, "WORK_ITEM_NOT_FOUND");
  }

  const { team } = await verifyTeamMembership(existing.team, userId);

  const targetAssignee = assignee !== undefined ? assignee : assigneeId;
  const targetId = targetAssignee ? targetAssignee.toString() : null;

  if (targetId) {
    verifyAssigneeInTeam(team, targetId);
  }

  if (typeof expectedVersion !== "number" || expectedVersion < 0) {
    throw new AppError("expectedVersion is required for safe concurrent assignment", 400, "INVALID_VERSION");
  }

  // Atomic conditional update: guarantees at most one assignment succeeds
  const updated = await WorkItem.findOneAndUpdate(
    {
      _id: id,
      version: expectedVersion,
    },
    {
      $set: { assignee: targetId },
      $inc: { version: 1 },
    },
    { returnDocument: "after", runValidators: true }
  )
    .populate("createdBy", "name email")
    .populate("assignee", "name email");

  if (!updated) {
    throw new AppError(
      "Conflict: Work item was updated or assigned by another user.",
      409,
      "VERSION_CONFLICT"
    );
  }

  await recordActivity({
    teamId: updated.team,
    workItemId: updated._id,
    actorId: userId,
    action: "ASSIGNEE_CHANGED",
    changes: [
      {
        field: "assignee",
        oldValue: existing.assignee ? existing.assignee.toString() : null,
        newValue: targetId,
      },
    ],
  });

  return updated;
}

async function transitionWorkItem(id, { status: nextStatus, expectedVersion }, userId) {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError("Invalid work item ID", 400, "INVALID_ID");
  }

  const existing = await WorkItem.findById(id);
  if (!existing) {
    throw new AppError("Work item not found", 404, "WORK_ITEM_NOT_FOUND");
  }

  await verifyTeamMembership(existing.team, userId);

  if (typeof expectedVersion !== "number" || expectedVersion < 0) {
    throw new AppError("expectedVersion is required for state transitions", 400, "INVALID_VERSION");
  }

  if (!ALLOWED_TRANSITIONS[existing.status]) {
    throw new AppError(`Current status ${existing.status} does not allow transitions`, 400, "INVALID_STATUS");
  }

  if (!ALLOWED_TRANSITIONS[existing.status].includes(nextStatus)) {
    throw new AppError(
      `Cannot transition status from ${existing.status} to ${nextStatus}`,
      422,
      "INVALID_TRANSITION"
    );
  }

  // Atomic conditional update matching both status and expectedVersion
  const updated = await WorkItem.findOneAndUpdate(
    {
      _id: id,
      status: existing.status,
      version: expectedVersion,
    },
    {
      $set: { status: nextStatus },
      $inc: { version: 1 },
    },
    { returnDocument: "after", runValidators: true }
  )
    .populate("createdBy", "name email")
    .populate("assignee", "name email");

  if (!updated) {
    throw new AppError(
      "Conflict: Work item status was modified by another operation.",
      409,
      "VERSION_CONFLICT"
    );
  }

  await recordActivity({
    teamId: updated.team,
    workItemId: updated._id,
    actorId: userId,
    action: "STATUS_CHANGED",
    changes: [
      {
        field: "status",
        oldValue: existing.status,
        newValue: nextStatus,
      },
    ],
  });

  return updated;
}

async function getWorkItems(query, userId) {
  const {
    teamId,
    team,
    status,
    priority,
    assignee,
    assigneeId,
    search,
    sortBy = "updatedAt",
    order = "desc",
    page = 1,
    limit = 20,
  } = query;

  const targetTeamId = teamId || team;
  if (!targetTeamId) {
    throw new AppError("team query parameter is required to list work items", 400, "MISSING_TEAM_PARAM");
  }

  await verifyTeamMembership(targetTeamId, userId);

  const filter = { team: new mongoose.Types.ObjectId(targetTeamId) };

  if (status) {
    filter.status = status;
  }

  if (priority) {
    filter.priority = priority;
  }

  const targetAssignee = assignee || assigneeId;
  if (targetAssignee) {
    if (targetAssignee === "unassigned") {
      filter.assignee = null;
    } else if (mongoose.isValidObjectId(targetAssignee)) {
      filter.assignee = new mongoose.Types.ObjectId(targetAssignee);
    }
  }

  if (search && search.trim()) {
    const s = search.trim();
    filter.$or = [
      { title: { $regex: s, $options: "i" } },
      { description: { $regex: s, $options: "i" } },
    ];
  }

  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (p - 1) * l;

  const sortDirection = order.toLowerCase() === "asc" ? 1 : -1;
  const allowedSortFields = ["updatedAt", "createdAt", "priority", "status", "title", "dueDate"];
  const sortField = allowedSortFields.includes(sortBy) ? sortBy : "updatedAt";

  const [items, total] = await Promise.all([
    WorkItem.find(filter)
      .sort({ [sortField]: sortDirection })
      .skip(skip)
      .limit(l)
      .populate("createdBy", "name email")
      .populate("assignee", "name email")
      .lean(),
    WorkItem.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => {
      item.id = item._id.toString();
      item.teamId = item.team.toString();
      item.assigneeId = item.assignee ? item.assignee._id.toString() : null;
      return item;
    }),
    pagination: {
      page: p,
      limit: l,
      total,
      totalPages: Math.ceil(total / l),
    },
  };
}

async function addComment(id, { comment }, userId) {
  const workItem = await getWorkItemById(id, userId);
  const activity = await recordActivity({
    teamId: workItem.team._id || workItem.team,
    workItemId: workItem._id,
    actorId: userId,
    action: "COMMENT_ADDED",
    metadata: { comment: comment.trim() },
  });
  return activity;
}

module.exports = {
  createWorkItem,
  getWorkItemById,
  updateWorkItem,
  assignWorkItem,
  transitionWorkItem,
  getWorkItems,
  addComment,
  ALLOWED_TRANSITIONS,
};
