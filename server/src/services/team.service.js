const mongoose = require("mongoose");
const Team = require("../models/Team");
const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");
const { resolveUserTeamRole } = require("../middleware/authorize");

async function createTeam({ name, description }, ownerId) {
  const team = await Team.create({
    name: name.trim(),
    description: description ? description.trim() : "",
    owner: ownerId,
    createdBy: ownerId,
    members: [{ user: ownerId, role: "ADMIN" }],
  });

  // Keep user's memberships in sync
  await User.findByIdAndUpdate(ownerId, {
    $addToSet: { memberships: { teamId: team._id, role: "ADMIN" } },
  });

  return team;
}

async function getUserTeams(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const teams = await Team.find({
    $or: [{ owner: uid }, { "members.user": uid }],
  })
    .populate("owner", "name email")
    .populate("members.user", "name email")
    .sort({ createdAt: -1 });

  return teams;
}

async function getTeamById(teamId, userId) {
  if (!mongoose.isValidObjectId(teamId)) {
    throw new AppError("Invalid team ID", 400, "INVALID_ID");
  }

  const team = await Team.findById(teamId)
    .populate("owner", "name email")
    .populate("members.user", "name email");

  if (!team) {
    throw new AppError("Team not found", 404, "TEAM_NOT_FOUND");
  }

  const role = resolveUserTeamRole(team, userId);
  if (!role) {
    throw new AppError("Access denied: You are not a member of this team", 403, "FORBIDDEN");
  }

  return team;
}

async function addTeamMember(teamId, { userId: targetUserId, role = "MEMBER" }, actorId) {
  const team = await Team.findById(teamId);
  if (!team) {
    throw new AppError("Team not found", 404, "TEAM_NOT_FOUND");
  }

  const actorRole = resolveUserTeamRole(team, actorId);
  if (actorRole !== "ADMIN") {
    throw new AppError(
      "Only team administrators can add or manage team members",
      403,
      "FORBIDDEN"
    );
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new AppError("Target user not found", 404, "USER_NOT_FOUND");
  }

  const existingMemberIndex = team.members.findIndex(
    (m) => m.user.toString() === targetUserId.toString()
  );

  if (existingMemberIndex >= 0) {
    team.members[existingMemberIndex].role = role;
  } else {
    team.members.push({ user: targetUserId, role });
  }

  await team.save();

  // Sync target user's memberships
  await User.findByIdAndUpdate(targetUserId, {
    $pull: { memberships: { teamId: team._id } },
  });
  await User.findByIdAndUpdate(targetUserId, {
    $addToSet: { memberships: { teamId: team._id, role } },
  });

  return Team.findById(teamId)
    .populate("owner", "name email")
    .populate("members.user", "name email");
}

module.exports = {
  createTeam,
  getUserTeams,
  getTeamById,
  addTeamMember,
};
