import React, { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Download, X } from 'lucide-react';

const UpdatePrompt = ({ onUpdating }) => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  // Listen for custom "Test Update" event
  useEffect(() => {
    const handleTestUpdate = () => {
      console.log('[DEBUG]: Triggering manual update test UI');
      setNeedRefresh(true);
    };

    window.addEventListener('moi-test-update', handleTestUpdate);
    return () => window.removeEventListener('moi-test-update', handleTestUpdate);
  }, [setNeedRefresh]);

  const close = () => {
    setNeedRefresh(false);
  };

  const handleUpdate = () => {
    onUpdating(); // Trigger the splash screen transition
    setTimeout(() => {
      updateServiceWorker(true);
    }, 5000); // 5 second premium delay
  };

  if (!needRefresh) return null;

  return (
    <div className="pwa-update-container">
      <div className="pwa-update-header">
        <div className="update-icon-wrapper">
          <Download size={24} />
        </div>
        <div className="pwa-update-info">
          <h4>Update Available</h4>
          <p>A new version of Moi Master is ready. Upgrade for a better experience.</p>
        </div>
      </div>
      <div className="pwa-update-actions">
        <button className="close-prompt-btn" onClick={close}>
          Later
        </button>
        <button className="update-btn" onClick={handleUpdate}>
          Update Now
        </button>
      </div>
    </div>
  );
};

export default UpdatePrompt;
