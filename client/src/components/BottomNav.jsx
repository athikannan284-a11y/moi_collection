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
        disabled={isSyncing}
      >
        <div className="icon-container" style={{ 
          height: '24px', 
          width: '24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          {isOnline ? (
            <Cloud size={24} className={isSyncing ? 'animate-spin' : ''} />
          ) : (
            <CloudOff size={24} className="offline" />
          )}
        </div>
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
          display: inline-block;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .sync-btn.syncing {
          color: #3b82f6;
        }
        .icon-container {
          margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
};

export default BottomNav;
