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
        <Home size={24} />
        <span>Home</span>
      </button>
      
      <button className="nav-item">
        <Search size={24} />
        <span>Search</span>
      </button>

      <button 
        className={`nav-item sync-btn ${pendingCount > 0 ? 'has-pending' : ''} ${isSyncing ? 'syncing' : ''}`}
        onClick={onSync}
        disabled={!isOnline || isSyncing}
      >
        {isOnline ? (
          <Cloud size={24} className={isSyncing ? 'animate-spin' : ''} />
        ) : (
          <CloudOff size={24} className="offline" />
        )}
        <span>
          {isSyncing ? 'Syncing...' : (pendingCount > 0 ? `Sync (${pendingCount})` : 'Synced')}
        </span>
      </button>

      <button className="nav-item">
        <Settings size={24} />
        <span>Settings</span>
      </button>

      <style>{`
        .animate-spin {
          animation: spin 2s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sync-btn.syncing {
          color: #3b82f6;
        }
      `}</style>
    </div>
  );
};

export default BottomNav;
