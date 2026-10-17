import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Users2,
  Activity as ActivityIcon,
  Settings as SettingsIcon,
  X,
  LogOut,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/work-items', label: 'Work Items', icon: CheckSquare },
  { path: '/teams', label: 'Teams', icon: Users2 },
  { path: '/activity', label: 'Activity', icon: ActivityIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export function Sidebar({ mobileOpen, onCloseMobile }) {
  const { user, activeTeam, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'NO';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`app-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        {/* Logo / Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <span className="brand-mark">NO</span>
            <div className="brand-info">
              <span className="brand-name">Newtonite Ops</span>
              <span className="brand-tag">Operations System</span>
            </div>
          </div>
          {mobileOpen && (
            <button
              type="button"
              className="sidebar-mobile-close"
              onClick={onCloseMobile}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Current Active Workspace Indicator */}
        {activeTeam && (
          <div className="sidebar-workspace-badge">
            <div className="workspace-icon">
              <Building2 size={13} />
            </div>
            <div className="workspace-text">
              <span className="workspace-label">Active Workspace</span>
              <span className="workspace-name" title={activeTeam.name}>
                {activeTeam.name}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          <span className="nav-section-title">Navigation</span>
          <ul className="nav-list">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path} className="nav-item">
                  <NavLink
                    to={item.path}
                    onClick={onCloseMobile}
                    className={({ isActive }) =>
                      `nav-link ${isActive ? 'is-active' : ''}`
                    }
                  >
                    <Icon size={17} className="nav-icon" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Bottom Profile Anchor */}
        <div className="sidebar-footer">
          <div className="user-profile-anchor">
            <div className="avatar-initials" aria-hidden="true">
              {getInitials(user?.name)}
            </div>
            <div className="user-details">
              <span className="user-name" title={user?.name}>
                {user?.name || 'Operator'}
              </span>
              <span className="user-email" title={user?.email}>
                {user?.email || 'user@newtonite.io'}
              </span>
            </div>
            <button
              type="button"
              className="sidebar-logout-btn"
              onClick={logout}
              title="Sign out of Newtonite Ops"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
