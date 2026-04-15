import React, { useEffect } from 'react';
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

  const [forceShow, setForceShow] = React.useState(true); // TEMPORARY PREVIEW MODE

  const close = () => {
    setNeedRefresh(false);
    setForceShow(false);
  };

  const handleUpdate = () => {
    onUpdating(); // Trigger the splash screen transition
    setTimeout(() => {
      // In a real update, this would be: updateServiceWorker(true);
      window.location.reload(); 
    }, 5000); // 5 second premium delay
  };

  if (!needRefresh && !forceShow) return null;

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
