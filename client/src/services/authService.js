import { request, setAuthToken, clearSession } from './api';

export const authService = {
  async login({ email, password }) {
    const res = await request('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    if (res.data?.token) {
      setAuthToken(res.data.token);
      localStorage.setItem('newtonite_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async register({ name, email, password }) {
    const res = await request('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    if (res.data?.token) {
      setAuthToken(res.data.token);
      localStorage.setItem('newtonite_user', JSON.stringify(res.data.user));
    }
    return res.data;
  },

  async getMe() {
    const res = await request('/auth/me');
    if (res.data) {
      localStorage.setItem('newtonite_user', JSON.stringify(res.data));
    }
    return res.data;
  },

  logout() {
    clearSession();
  },

  getSavedUser() {
    try {
      const saved = localStorage.getItem('newtonite_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },
};
