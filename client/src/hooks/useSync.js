import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineDB } from '../db';
import { apiFetch } from '../api';

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Use Ref for internal synchronization lock to prevent dependency loops in useEffect
  const isSyncingRef = useRef(false);

  // Check for pending items
  const checkPending = async () => {
    const pFolders = await offlineDB.getUnsyncedFolders();
    const pEntries = await offlineDB.getUnsyncedEntries();
    const count = pFolders.length + pEntries.length;
    setPendingCount(prev => (prev === count ? prev : count));
    return count;
  };

  // Sync logic
  const performSync = useCallback(async () => {
    // Check both state and ref for safety
    if (isSyncingRef.current || !navigator.onLine) {
        return;
    }
    
    const count = await checkPending();
    if (count === 0) return;

    console.log('[DEBUG] [SYNC]: Starting synchronization...');
    isSyncingRef.current = true;
    setIsSyncing(true);
    
    try {
      // 1. Sync Folders
      const pFolders = await offlineDB.getUnsyncedFolders();
      for (const folder of pFolders) {
        try {
          let response;
          if (folder.serverId) {
              response = await apiFetch(`/folders/${folder.serverId}`, {
                  method: 'PUT',
                  body: JSON.stringify({ folder_name: folder.folder_name })
              });
          } else {
              response = await apiFetch('/folders', {
                  method: 'POST',
                  body: JSON.stringify({ folder_name: folder.folder_name })
              });
          }

          if (response.ok) {
            const result = await response.json();
            await offlineDB.updateFolder(folder.id, { isSynced: 1, serverId: result.id });
            const folderEntries = await offlineDB.getEntriesByFolder(folder.id);
            for (const entry of folderEntries) {
              await offlineDB.updateEntry(entry.id, { folder_id: result.id });
            }
          }
        } catch (err) {
          console.error('Failed to sync folder:', err);
        }
      }

      // 2. Sync Entries
      const pEntries = await offlineDB.getUnsyncedEntries();
      const allFolders = await offlineDB.getAllFolders();

      for (const entry of pEntries) {
        const parentFolder = allFolders.find(f => f.id == entry.folder_id || f.serverId == entry.folder_id);
        const serverFolderId = parentFolder?.serverId || (typeof entry.folder_id === 'string' && entry.folder_id.length > 5 ? entry.folder_id : null);
        
        if (serverFolderId) {
          try {
            const response = await apiFetch('/entries', {
              method: 'POST',
              body: JSON.stringify({
                folder_id: serverFolderId,
                name: entry.name,
                place: entry.place,
                mobile: entry.mobile,
                amount: entry.amount,
                paymentMode: entry.paymentMode || 'Cash'
              })
            });
            if (response.ok) {
              const result = await response.json();
              await offlineDB.updateEntry(entry.id, { isSynced: 1, serverId: result.id });
            }
          } catch (err) {
            console.error('Failed to sync entry:', err);
          }
        }
      }
      
      await checkPending();
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
      console.log('[DEBUG] [SYNC]: Synchronization complete.');
    }
  }, []); // NO DEPENDENCIES here because we use refs and direct navigator.onLine

  // Watchdog: If isSyncing is stuck for too long (e.g. 60s), force reset it
  useEffect(() => {
    let timeoutId;
    if (isSyncing) {
      timeoutId = setTimeout(() => {
        console.warn('Sync watchdog triggered: Resetting stuck sync state');
        isSyncingRef.current = false;
        setIsSyncing(false);
      }, 60000);
    }
    return () => clearTimeout(timeoutId);
  }, [isSyncing]);

  // Online status and automatic triggers - REGISTERED ONLY ONCE
  useEffect(() => {
    console.log('[DEBUG] [SYNC]: Registering global listeners (One-time only)');
    
    const handleConnectivityChange = () => {
      const status = navigator.onLine;
      setIsOnline(status);
      if (status) performSync();
    };
    
    window.addEventListener('online', handleConnectivityChange);
    window.addEventListener('offline', handleConnectivityChange);
    
    if (navigator.onLine) performSync();

    const countInterval = setInterval(checkPending, 15000);
    const heartbeatInterval = setInterval(() => {
        if (navigator.onLine && !isSyncingRef.current) {
            console.log('[DEBUG] [SYNC]: Pulse triggered (1min heartbeat)');
            performSync();
        }
    }, 60000);
    
    return () => {
      console.log('[DEBUG] [SYNC]: Cleaning up global listeners');
      window.removeEventListener('online', handleConnectivityChange);
      window.removeEventListener('offline', handleConnectivityChange);
      clearInterval(countInterval);
      clearInterval(heartbeatInterval);
    };
  }, [performSync]); // Dep only on stable performSync

  return { isOnline, pendingCount, isSyncing, performSync };
};

