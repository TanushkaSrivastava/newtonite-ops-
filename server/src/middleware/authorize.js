const mongoose = require("mongoose");
const Team = require("../models/Team");
const { AppError } = require("./errorHandler");

/**
 * Resolves the user's role within a given team document.
 * Returns 'ADMIN', 'MANAGER', 'MEMBER', or null if not a member.
 */
function resolveUserTeamRole(team, userId) {
  if (!team || !userId) return null;
  const uidStr = userId.toString();

  if (team.owner && team.owner.toString() === uidStr) {
    return "ADMIN";
  }

  if (team.createdBy && team.createdBy.toString() === uidStr) {
    return "ADMIN";
  }

  if (Array.isArray(team.members)) {
    const member = team.members.find(
      (m) => m.user && m.user.toString() === uidStr
    );
    if (member) {
      return member.role || "MEMBER";
    }
  }

  return null;
}

/**
 * Middleware requiring the authenticated user to be a member of the team
 * with at least one of the specified roles (e.g. ['ADMIN'], ['ADMIN', 'MANAGER']).
 *
 * Extracts teamId from req.params.teamId, req.params.id (for team routes),
 * req.body.team, req.body.teamId, or req.query.team.
 */
function requireTeamRole(allowedRoles = ["ADMIN", "MANAGER", "MEMBER"]) {
  return async (req, res, next) => {
    try {
      const teamId =
        req.params.teamId ||
        req.params.id ||
        req.body.team ||
        req.body.teamId ||
        req.query.team;

      if (!teamId || !mongoose.isValidObjectId(teamId)) {
        return next(
          new AppError("A valid team ID is required for access control", 400, "INVALID_TEAM_ID")
        );
      }

      const team = await Team.findById(teamId);
      if (!team) {
        return next(new AppError("Team not found", 404, "TEAM_NOT_FOUND"));
      }

      const userRole = resolveUserTeamRole(team, req.user.id);
      if (!userRole) {
        return next(
          new AppError("Access denied: You are not a member of this team", 403, "FORBIDDEN")
        );
      }

      if (!allowedRoles.includes(userRole)) {
        return next(
          new AppError(
            `Access denied: Required role (${allowedRoles.join("/")}), but you are ${userRole}`,
            403,
            "INSUFFICIENT_PERMISSIONS"
          )
        );
      }

      req.team = team;
      req.userTeamRole = userRole;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = {
  resolveUserTeamRole,
  requireTeamRole,
};
