import React from 'react';
import { Home, Search, Settings, Cloud, CloudOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const BottomNav = ({ isOnline, onSync, pendingCount, isSyncing }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  // Function to force a full page reload to clear PWA cache
  const handleHardRefresh = () => {
    if (window.confirm('Reload app to apply latest updates?')) {
      window.location.reload(true);
    }
  };

  return (
    <div className="bottom-nav-wrapper">
      <div className="bottom-nav">
        <button 
          className={`nav-item ${isActive('/') ? 'active' : ''}`}
          onClick={() => navigate('/')}
        >
          <div className="nav-icon-box">
            <Home size={22} />
          </div>
          <span className="nav-label">Home</span>
        </button>
        
        <button className="nav-item">
          <div className="nav-icon-box">
            <Search size={22} />
          </div>
          <span className="nav-label">Search</span>
        </button>

        <button 
          className={`nav-item sync-btn ${pendingCount > 0 ? 'has-pending' : ''} ${isSyncing ? 'syncing' : ''}`}
          onClick={onSync}
          disabled={isSyncing}
        >
          <div className="nav-icon-box">
            {isOnline ? (
              <Cloud size={22} className={isSyncing ? 'animate-spin-gpu' : ''} />
            ) : (
              <CloudOff size={22} className="offline" />
            )}
          </div>
          <span className="nav-label sync-label">
            {isSyncing ? 'Wait' : (pendingCount > 0 ? `Sync` : 'Saved')}
          </span>
        </button>

        <button 
          className="nav-item refresh-btn"
          onClick={handleHardRefresh}
        >
          <div className="nav-icon-box">
            <Settings size={22} />
          </div>
          <span className="nav-label">Reset</span>
        </button>
      </div>

      <style>{`
        .bottom-nav-wrapper {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 65px;
          background: #0f172a;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 1000;
          transform: translateZ(0); /* Create composite layer for GPU */
        }
        .bottom-nav {
          display: flex;
          height: 100%;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          position: relative;
        }
        .nav-item {
          flex: 0 0 25% !important; /* Force EXACT 25% width */
          width: 25% !important;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0;
          margin: 0;
          background: transparent;
          border: none;
          color: #94a3b8;
          transition: none; /* Disable all transitions to prevent jitter */
          position: relative;
        }
        .nav-item.active {
          color: #6366f1;
        }
        .nav-icon-box {
          height: 24px;
          width: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }
        .nav-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          width: 100%;
          text-align: center;
        }
        .animate-spin-gpu {
          animation: spin-gpu 1.2s linear infinite;
          will-change: transform;
          backface-visibility: hidden;
          perspective: 1000px;
          transform: translateZ(0); /* Force GPU */
        }
        @keyframes spin-gpu {
          from { transform: rotate(0deg) translateZ(0); }
          to { transform: rotate(360deg) translateZ(0); }
        }
        .sync-btn.syncing {
          color: #3b82f6;
        }
        .sync-btn.has-pending {
          color: #fbbf24;
        }
        .refresh-btn {
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default BottomNav;
