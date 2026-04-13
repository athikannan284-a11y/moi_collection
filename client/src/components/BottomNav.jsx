import React from 'react';
import { Home, Search, Settings, Cloud, CloudOff } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const BottomNav = () => {
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
            <Home size={24} />
          </div>
          <span className="nav-label">Home</span>
        </button>
        
        <button 
          className="nav-item refresh-btn"
          onClick={handleHardRefresh}
        >
          <div className="nav-icon-box">
            <Settings size={24} />
          </div>
          <span className="nav-label">Reset App</span>
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
          transform: translateZ(0); 
          contain: layout size paint;
        }
        .bottom-nav {
          display: grid;
          grid-template-columns: repeat(2, 1fr); /* Only 2 items now - Home and Reset */
          height: 100%;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
        }
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #94a3b8;
          padding: 0;
          margin: 0;
          width: 100%;
          height: 100%;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .nav-item.active {
          color: #6366f1;
        }
        .nav-icon-box {
          height: 28px;
          width: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4px;
        }
        .nav-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .refresh-btn {
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default BottomNav;
