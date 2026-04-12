import React, { useState, useEffect } from 'react';

const SplashScreen = ({ onFinish }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Exact 5 second timing
    // Start fade out at 4.2s to smoothly transition
    const fadeTimer = setTimeout(() => setFadeOut(true), 4200);
    const finishTimer = setTimeout(() => onFinish(), 5000);
    
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div className={`splash-screen ${fadeOut ? 'splash-fade-out' : ''}`}>
      {/* Dynamic Background Mesh */}
      <div className="splash-mesh">
        <div className="mesh-ball mesh-ball-1"></div>
        <div className="mesh-ball mesh-ball-2"></div>
        <div className="mesh-ball mesh-ball-3"></div>
      </div>

      {/* Ambient Light Rings */}
      <div className="splash-rings-container">
        <div className="splash-ring-premium"></div>
        <div className="splash-ring-premium delay-1"></div>
        <div className="splash-ring-premium delay-2"></div>
      </div>

      <div className="splash-content-premium">
        {/* Logo with Glassmorphism & Glow */}
        <div className="splash-logo-wrapper">
          <div className="logo-glass-shield"></div>
          <div className="logo-glow-aura"></div>
          <img src="/logo.jpg" alt="Moi Master" className="logo-premium" />
        </div>

        {/* Brand Identity with Staggered Motion */}
        <div className="brand-reveal">
          <h1 className="brand-name-premium">
            <span className="text-gradient-moi">Moi</span>
            <span className="text-gradient-master">Master</span>
          </h1>
          <div className="tagline-container">
            <span className="tagline-premium">The Ultimate Digital Ledger</span>
            <div className="tagline-shimmer"></div>
          </div>
        </div>

        {/* High-End Progress Indicator */}
        <div className="loader-container-premium">
          <div className="loader-bar-premium">
            <div className="loader-fill-premium"></div>
          </div>
          <div className="loader-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        {/* Footer Info */}
        <div className="splash-footer-premium">
          <span className="lux-version">PREMIUM EDITION v2.1</span>
          <div className="lux-divider"></div>
          <span className="lux-copyright">© 2026 MOI MASTER</span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;

