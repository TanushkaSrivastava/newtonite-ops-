import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  ChevronDown,
  Building2,
  User,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Topbar({ onOpenMobile }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, teams, activeTeam, setActiveTeam, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [teamMenuOpen, setTeamMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const teamRef = useRef(null);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (teamRef.current && !teamRef.current.contains(e.target)) {
        setTeamMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifMenuOpen(false);
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/work-items?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const getBreadcrumb = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'Dashboard';
    if (path.startsWith('/work-items/')) return 'Work Item Details';
    if (path.startsWith('/work-items')) return 'Work Items';
    if (path.startsWith('/teams')) return 'Teams';
    if (path.startsWith('/activity')) return 'Activity';
    if (path.startsWith('/settings')) return 'Settings';
    return 'Operations';
  };

  const getInitials = (name) => {
    if (!name) return 'NO';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Realistic operational alerts
  const notifications = [
    {
      id: 1,
      title: 'Incident WI-7801 priority elevated to URGENT',
      time: '12m ago',
      unread: true,
      icon: AlertCircle,
      color: 'text-danger',
    },
    {
      id: 2,
      title: 'Work item status transitioned to RESOLVED',
      time: '1h ago',
      unread: true,
      icon: CheckCircle2,
      color: 'text-success',
    },
    {
      id: 3,
      title: 'New assignment: Payment webhook gateway',
      time: '3h ago',
      unread: false,
      icon: Clock,
      color: 'text-info',
    },
  ];

  return (
    <header className="app-topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="topbar-mobile-toggle"
          onClick={onOpenMobile}
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>

        <div className="topbar-breadcrumb">
          <span className="breadcrumb-root">Newtonite</span>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-current">{getBreadcrumb()}</span>
        </div>
      </div>

      <div className="topbar-center">
        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="topbar-search-form">
          <Search size={15} className="search-icon" />
          <input
            type="search"
            placeholder="Search work items, IDs, or title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="topbar-search-input"
          />
        </form>
      </div>

      <div className="topbar-right">
        {/* Team Workspace Switcher */}
        {teams && teams.length > 0 && (
          <div className="topbar-dropdown-container" ref={teamRef}>
            <button
              type="button"
              className="topbar-team-btn"
              onClick={() => setTeamMenuOpen(!teamMenuOpen)}
              aria-expanded={teamMenuOpen}
              title="Switch Team Workspace"
            >
              <Building2 size={15} className="text-secondary" />
              <span className="team-btn-name">{activeTeam?.name || 'Select Team'}</span>
              <ChevronDown size={14} className="text-tertiary" />
            </button>

            {teamMenuOpen && (
              <div className="dropdown-panel team-dropdown-panel" role="menu">
                <div className="dropdown-header">
                  <span className="dropdown-header-title">Workspaces</span>
                </div>
                <div className="dropdown-items-list">
                  {teams.map((t) => {
                    const isSelected = activeTeam?.id === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`dropdown-team-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          setActiveTeam(t);
                          setTeamMenuOpen(false);
                        }}
                      >
                        <div className="team-item-info">
                          <span className="team-item-name">{t.name}</span>
                          <span className="team-item-sub">
                            {t.members?.length || 1} members
                          </span>
                        </div>
                        {isSelected && <Check size={15} className="text-primary" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Notifications Control */}
        <div className="topbar-dropdown-container" ref={notifRef}>
          <button
            type="button"
            className="topbar-icon-btn"
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            aria-label="View notifications"
            title="Notifications"
          >
            <Bell size={17} />
            <span className="notification-indicator" />
          </button>

          {notifMenuOpen && (
            <div className="dropdown-panel notif-dropdown-panel" role="menu">
              <div className="dropdown-header">
                <span className="dropdown-header-title">Notifications</span>
                <span className="notif-badge">2 new</span>
              </div>
              <div className="notif-list">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className={`notif-item ${n.unread ? 'is-unread' : ''}`}
                    >
                      <Icon size={16} className={`notif-item-icon ${n.color}`} />
                      <div className="notif-item-content">
                        <p className="notif-item-title">{n.title}</p>
                        <span className="notif-item-time">{n.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="dropdown-footer">
                <Link
                  to="/activity"
                  className="dropdown-footer-link"
                  onClick={() => setNotifMenuOpen(false)}
                >
                  View complete activity trail →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Account Menu */}
        <div className="topbar-dropdown-container" ref={userRef}>
          <button
            type="button"
            className="topbar-user-btn"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            aria-expanded={userMenuOpen}
            aria-label="User account menu"
          >
            <div className="topbar-avatar">{getInitials(user?.name)}</div>
            <span className="topbar-user-name">{user?.name?.split(' ')[0] || 'User'}</span>
            <ChevronDown size={14} className="text-tertiary" />
          </button>

          {userMenuOpen && (
            <div className="dropdown-panel user-dropdown-panel" role="menu">
              <div className="user-dropdown-profile">
                <span className="profile-name">{user?.name}</span>
                <span className="profile-email">{user?.email}</span>
              </div>
              <div className="dropdown-divider" />
              <Link
                to="/settings"
                className="dropdown-menu-item"
                onClick={() => setUserMenuOpen(false)}
              >
                <User size={15} />
                <span>Account Settings</span>
              </Link>
              <div className="dropdown-divider" />
              <button
                type="button"
                className="dropdown-menu-item text-danger"
                onClick={() => {
                  setUserMenuOpen(false);
                  logout();
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
