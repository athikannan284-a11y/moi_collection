import React from 'react';
import { Home, Search, Settings, Cloud, CloudOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const BottomNav = ({ isOnline, onSync, pendingCount, isSyncing }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  return (
    <div className="bottom-nav">
      <button 
        className={`nav-item ${isActive('/') ? 'active' : ''}`}
        onClick={() => navigate('/')}
      >
        <div className="nav-icon-box">
          <Home size={24} />
        </div>
        <span>Home</span>
      </button>
      
      <button className="nav-item">
        <div className="nav-icon-box">
          <Search size={24} />
        </div>
        <span>Search</span>
      </button>

      <button 
        className={`nav-item sync-btn ${pendingCount > 0 ? 'has-pending' : ''} ${isSyncing ? 'syncing' : ''}`}
        onClick={onSync}
        disabled={isSyncing}
      >
        <div className="nav-icon-box sync-icon-box">
          {isOnline ? (
            <Cloud size={24} className={isSyncing ? 'animate-spin' : ''} />
          ) : (
            <CloudOff size={24} className="offline" />
          )}
        </div>
        <span className="sync-text">
          {isSyncing ? 'Syncing' : (pendingCount > 0 ? `Sync (${pendingCount})` : 'Synced')}
        </span>
      </button>

      <button className="nav-item">
        <div className="nav-icon-box">
          <Settings size={24} />
        </div>
        <span>Settings</span>
      </button>

      <style>{`
        .bottom-nav {
          display: flex;
          justify-content: center; /* Center the items */
          align-items: stretch;
          padding: 0; /* Remove horizontal padding that might cause shifts */
        }
        .nav-item {
          flex: 1; /* Each item takes exactly 1/4th of the width */
          min-width: 0; /* Prevent flex items from overflowing */
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin: 0;
          background: transparent;
          border: none;
          gap: 2px;
        }
        .nav-icon-box {
          height: 28px;
          width: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .nav-item span {
          font-size: 10px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
          text-align: center;
        }
        .animate-spin {
          animation: spin 1.5s linear infinite;
          will-change: transform;
          transform-origin: center center;
          backface-visibility: hidden;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sync-btn.syncing {
          color: #3b82f6;
        }
        .sync-text {
          transition: none; /* Disable transitions on text to prevent jumpy layout */
        }
      `}</style>
    </div>
  );
};

export default BottomNav;
