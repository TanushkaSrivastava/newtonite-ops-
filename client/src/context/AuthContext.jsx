import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService';
import { teamService } from '../services/teamService';
import { getAuthToken } from '../services/api';
import { isDemoMode, MOCK_USERS, MOCK_TEAMS } from '../services/mockAdapter';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getSavedUser());
  const [token, setToken] = useState(() => getAuthToken());
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeamState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const setActiveTeam = useCallback((team) => {
    setActiveTeamState(team);
    if (team?.id) {
      localStorage.setItem('newtonite_active_team_id', team.id);
    }
  }, []);

  const refreshTeams = useCallback(async () => {
    if (isDemoMode()) {
      setTeams(MOCK_TEAMS);
      const savedTeamId = localStorage.getItem('newtonite_active_team_id');
      const found = MOCK_TEAMS.find((t) => t.id === savedTeamId) || MOCK_TEAMS[0];
      setActiveTeam(found);
      return MOCK_TEAMS;
    }

    try {
      const teamList = await teamService.getTeams();
      setTeams(teamList);

      const savedTeamId = localStorage.getItem('newtonite_active_team_id');
      const found = teamList.find((t) => t.id === savedTeamId) || teamList[0];
      if (found) {
        setActiveTeam(found);
      }
      return teamList;
    } catch (err) {
      console.warn('Could not fetch teams from API:', err.message);
      return [];
    }
  }, [setActiveTeam]);

  const refreshUser = useCallback(async () => {
    if (isDemoMode()) {
      setUser(MOCK_USERS[0]);
      return MOCK_USERS[0];
    }

    const currentToken = getAuthToken();
    if (!currentToken) {
      setUser(null);
      setTeams([]);
      setActiveTeamState(null);
      setLoading(false);
      return null;
    }

    try {
      const profile = await authService.getMe();
      setUser(profile);
      await refreshTeams();
      return profile;
    } catch (err) {
      console.warn('Session verification failed:', err.message);
      authService.logout();
      setUser(null);
      setToken(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [refreshTeams]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email, password) => {
    setAuthError(null);
    try {
      const data = await authService.login({ email, password });
      setUser(data.user);
      setToken(data.token);
      await refreshTeams();
      return data;
    } catch (err) {
      setAuthError(err.message || 'Login failed');
      throw err;
    }
  };

  const register = async (name, email, password) => {
    setAuthError(null);
    try {
      const data = await authService.register({ name, email, password });
      setUser(data.user);
      setToken(data.token);
      await refreshTeams();
      return data;
    } catch (err) {
      setAuthError(err.message || 'Registration failed');
      throw err;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
    setTeams([]);
    setActiveTeamState(null);
  };

  const isTeamAdmin = useCallback(
    (teamId = activeTeam?.id) => {
      if (!user || !teamId) return false;
      const mem = user.memberships?.find(
        (m) => (m.teamId?.id || m.teamId || '').toString() === teamId.toString()
      );
      if (mem?.role === 'ADMIN') return true;
      if (activeTeam?.owner?._id === user.id || activeTeam?.owner === user.id) return true;
      return false;
    },
    [user, activeTeam]
  );

  const isTeamManager = useCallback(
    (teamId = activeTeam?.id) => {
      if (!user || !teamId) return false;
      const mem = user.memberships?.find(
        (m) => (m.teamId?.id || m.teamId || '').toString() === teamId.toString()
      );
      return mem?.role === 'ADMIN' || mem?.role === 'MANAGER';
    },
    [user, activeTeam]
  );

  const value = {
    user,
    token,
    teams,
    activeTeam,
    setActiveTeam,
    refreshTeams,
    refreshUser,
    login,
    register,
    logout,
    isTeamAdmin,
    isTeamManager,
    isAuthenticated: !!user && !!token,
    loading,
    authError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
