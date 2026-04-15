import { useState, useEffect, useCallback } from 'react';
import { offlineDB } from '../db';
import { apiFetch } from '../api';

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Check for pending items
  const checkPending = async () => {
    const pFolders = await offlineDB.getUnsyncedFolders();
    const pEntries = await offlineDB.getUnsyncedEntries();
    const count = pFolders.length + pEntries.length;
    setPendingCount(prev => {
      if (prev === count) return prev;
      return count;
    });
    return count;
  };

  // Sync logic
  const performSync = useCallback(async () => {
    if (isSyncing || !navigator.onLine) return;
    
    // 1. Check if there's anything to sync
    const count = await checkPending();
    if (count === 0) return;

    setIsSyncing(true);
    
    try {
      // 1. Sync Folders
      const pFolders = await offlineDB.getUnsyncedFolders();
      for (const folder of pFolders) {
        try {
          let response;
          if (folder.serverId) {
              // Existing folder - UPDATE
              response = await apiFetch(`/folders/${folder.serverId}`, {
                  method: 'PUT',
                  body: JSON.stringify({ folder_name: folder.folder_name })
              });
          } else {
              // New folder - CREATE
              response = await apiFetch('/folders', {
                  method: 'POST',
                  body: JSON.stringify({ folder_name: folder.folder_name })
              });
          }

          if (response.ok) {
            const result = await response.json();
            // Update local folder with server ID and mark as synced
            await offlineDB.updateFolder(folder.id, { isSynced: 1, serverId: result.id });
            
            // Update entries that belong to this folder to use the server folder ID
            const folderEntries = await offlineDB.getEntriesByFolder(folder.id);
            for (const entry of folderEntries) {
              await offlineDB.updateEntry(entry.id, { folder_id: result.id });
            }
            if (!isOnline) setIsOnline(true);
          }
        } catch (err) {
          console.error('Failed to sync folder:', err);
          if (isOnline) setIsOnline(false);
        }
      }

      // 2. Sync Entries
      const pEntries = await offlineDB.getUnsyncedEntries();
      const allFolders = await offlineDB.getAllFolders();

      for (const entry of pEntries) {
        // Robust ID Matching: Match by local ID (number) or serverId (string)
        // Use loose equality (==) for ID matching to handle number/string variations
        const parentFolder = allFolders.find(f => 
          f.id == entry.folder_id || 
          f.serverId == entry.folder_id
        );

        let serverFolderId = null;
        if (parentFolder?.serverId) {
          serverFolderId = parentFolder.serverId;
          // Auto-recovery: If local entry still uses the numeric ID, update it now
          if (entry.folder_id != serverFolderId) {
            await offlineDB.updateEntry(entry.id, { folder_id: serverFolderId });
          }
        } else if (typeof entry.folder_id === 'string' && entry.folder_id.length > 5) {
          // If folder_id already looks like a server ID (string), try to use it directly
          serverFolderId = entry.folder_id;
        }
        
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
              if (!isOnline) setIsOnline(true);
            }
          } catch (err) {
            console.error('Failed to sync entry:', err);
            if (isOnline) setIsOnline(false);
          }
        }
      }
      
      await checkPending();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  // Watchdog: If isSyncing is stuck for too long (e.g. 60s), force reset it
  useEffect(() => {
    let timeoutId;
    if (isSyncing) {
      timeoutId = setTimeout(() => {
        console.warn('Sync watchdog triggered: Resetting stuck sync state');
        setIsSyncing(false);
      }, 60000); // 60 seconds fail-safe
    }
    return () => clearTimeout(timeoutId);
  }, [isSyncing]);

  // Online status and automatic triggers
  useEffect(() => {
    const handleConnectivityChange = () => {
      const status = navigator.onLine;
      setIsOnline(status);
      if (status) performSync();
    };
    
    window.addEventListener('online', handleConnectivityChange);
    window.addEventListener('offline', handleConnectivityChange);
    
    // Initial check and sync on mount
    if (navigator.onLine) performSync();

    // UI update interval for pending count (Increased to 15s to reduce overhead)
    const countInterval = setInterval(checkPending, 15000);

    // Heartbeat sync for mobile (every 60 seconds if online and has pending)
    const heartbeatInterval = setInterval(() => {
        if (navigator.onLine && !isSyncing) performSync();
    }, 60000);
    
    return () => {
      window.removeEventListener('online', handleConnectivityChange);
      window.removeEventListener('offline', handleConnectivityChange);
      clearInterval(countInterval);
      clearInterval(heartbeatInterval);
    };
  }, [performSync, isSyncing]);

  return { isOnline, pendingCount, isSyncing, performSync };
};

