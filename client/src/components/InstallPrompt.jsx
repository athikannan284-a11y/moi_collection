import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the prompt if the app isn't already installed
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setShowPrompt(false);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className={`install-prompt-banner ${!showPrompt ? 'hidden' : ''}`}>
      <div className="install-prompt-content">
        <div className="install-prompt-info">
          <div className="install-prompt-icon">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h3 className="install-prompt-title">Install Moi Master</h3>
            <p className="install-prompt-desc">Add to home screen for faster access</p>
          </div>
        </div>
        <div className="install-prompt-actions">
          <button 
            onClick={handleInstallClick}
            className="install-btn"
          >
            Install
          </button>
          <button 
            onClick={() => setShowPrompt(false)}
            className="close-prompt-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
