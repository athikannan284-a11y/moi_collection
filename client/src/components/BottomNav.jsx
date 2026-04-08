import React from 'react';
import { Home, Search, Settings, Cloud, CloudOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const BottomNav = ({ isOnline, onSync, pendingCount }) => {
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
        className={`nav-item sync-btn ${pendingCount > 0 ? 'has-pending' : ''}`}
        onClick={onSync}
        disabled={!isOnline}
      >
        {isOnline ? <Cloud size={24} /> : <CloudOff size={24} className="offline" />}
        <span>{pendingCount > 0 ? `Sync (${pendingCount})` : 'Synced'}</span>
      </button>

      <button className="nav-item">
        <Settings size={24} />
        <span>Settings</span>
      </button>
    </div>
  );
};

export default BottomNav;
