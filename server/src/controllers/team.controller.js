const teamService = require("../services/team.service");

async function createTeam(req, res, next) {
  try {
    const team = await teamService.createTeam(req.body, req.user.id);
    res.status(201).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
}

async function getTeams(req, res, next) {
  try {
    const teams = await teamService.getUserTeams(req.user.id);
    res.status(200).json({
      success: true,
      data: teams,
    });
  } catch (error) {
    next(error);
  }
}

async function getTeamById(req, res, next) {
  try {
    const team = await teamService.getTeamById(req.params.id, req.user.id);
    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
}

async function addTeamMember(req, res, next) {
  try {
    const team = await teamService.addTeamMember(
      req.params.id,
      req.body,
      req.user.id
    );
    res.status(200).json({
      success: true,
      data: team,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTeam,
  getTeams,
  getTeamById,
  addTeamMember,
};
