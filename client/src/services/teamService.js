import { request } from './api';

export const teamService = {
  async getTeams() {
    const res = await request('/teams');
    return res.data || [];
  },

  async getTeamById(id) {
    const res = await request(`/teams/${id}`);
    return res.data;
  },

  async createTeam({ name, description }) {
    const res = await request('/teams', {
      method: 'POST',
      body: { name, description },
    });
    return res.data;
  },

  async addTeamMember(teamId, { userId, role = 'MEMBER' }) {
    const res = await request(`/teams/${teamId}/members`, {
      method: 'POST',
      body: { userId, role },
    });
    return res.data;
  },
};
