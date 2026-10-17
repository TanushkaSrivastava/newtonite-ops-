import { request } from './api';

export const dashboardService = {
  async getDashboardSummary(teamId) {
    if (!teamId) {
      throw new Error('A team ID is required to fetch dashboard summary');
    }
    const res = await request('/dashboard/summary', {
      params: { team: teamId },
    });
    return res.data;
  },
};
