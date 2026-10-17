import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { isDemoMode, setDemoMode } from '../../services/mockAdapter';
import { AlertCircle } from 'lucide-react';

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const demoActive = isDemoMode();

  return (
    <div className="app-shell">
      {/* Demo Mode Notice Banner if user toggled offline demo */}
      {demoActive && (
        <div className="demo-banner">
          <AlertCircle size={14} />
          <span>Demo preview adapter active (offline fallback mode).</span>
          <button
            type="button"
            className="demo-banner-btn"
            onClick={() => {
              setDemoMode(false);
              window.location.reload();
            }}
          >
            Connect live backend
          </button>
        </div>
      )}

      <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="app-main-wrapper">
        <Topbar onOpenMobile={() => setMobileOpen(true)} />
        <main className="app-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
