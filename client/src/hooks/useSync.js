import { useState, useEffect, useCallback } from 'react';
import { offlineDB } from '../db';
import { apiFetch } from '../api';

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Verification helper to check if we actually have internet
  const verifyConnection = async () => {
    try {
      // Use a small timeout to avoid hanging on poor mobile connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/health', { 
        method: 'HEAD', 
        cache: 'no-store',
        signal: controller.signal 
      });
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  };

  // Check for pending items
  const checkPending = async () => {
    const pFolders = await offlineDB.getUnsyncedFolders();
    const pEntries = await offlineDB.getUnsyncedEntries();
    const count = pFolders.length + pEntries.length;
    setPendingCount(count);
    return count;
  };

  // Sync logic
  const performSync = useCallback(async () => {
    if (isSyncing) return;
    
    // 1. Check if there's anything to sync
    const count = await checkPending();
    if (count === 0) return;

    // 2. Verify we are actually online before starting
    const reallyOnline = await verifyConnection();
    setIsOnline(reallyOnline);
    if (!reallyOnline) return;

    setIsSyncing(true);
    
    try {
      // 1. Sync Folders
      const pFolders = await offlineDB.getUnsyncedFolders();
      for (const folder of pFolders) {
        try {
          const response = await apiFetch('/folders', {
            method: 'POST',
            body: JSON.stringify({ folder_name: folder.folder_name })
          });
          if (response.ok) {
            const result = await response.json();
            // Update local folder with server ID and mark as synced
            await offlineDB.updateFolder(folder.id, { isSynced: 1, serverId: result.id });
            
            // Update entries that belong to this folder to use the server folder ID
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
      for (const entry of pEntries) {
        // Only sync entries whose parent folder has already been synced to the server
        const allFolders = await offlineDB.getAllFolders();
        const parentFolder = allFolders.find(f => f.id === entry.folder_id || f.serverId === entry.folder_id);
        const serverFolderId = parentFolder?.serverId || (typeof entry.folder_id === 'string' ? entry.folder_id : null);
        
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
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Online status and automatic triggers
  useEffect(() => {
    const handleConnectivityChange = async () => {
      const status = navigator.onLine;
      if (status) {
        const verified = await verifyConnection();
        setIsOnline(verified);
        if (verified) performSync();
      } else {
        setIsOnline(false);
      }
    };
    
    window.addEventListener('online', handleConnectivityChange);
    window.addEventListener('offline', handleConnectivityChange);
    
    // Initial check and sync on mount
    handleConnectivityChange();

    // UI update interval for pending count
    const countInterval = setInterval(checkPending, 5000);

    // Heartbeat sync for mobile (every 30 seconds if online and has pending)
    const heartbeatInterval = setInterval(() => {
        if (navigator.onLine) performSync();
    }, 30000);
    
    return () => {
      window.removeEventListener('online', handleConnectivityChange);
      window.removeEventListener('offline', handleConnectivityChange);
      clearInterval(countInterval);
      clearInterval(heartbeatInterval);
    };
  }, [performSync]);

  return { isOnline, pendingCount, isSyncing, performSync };
};

