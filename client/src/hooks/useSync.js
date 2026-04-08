import { useState, useEffect } from 'react';
import { offlineDB } from '../db';
import { apiFetch } from '../api';

export const useSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check for pending items
  const checkPending = async () => {
    const pFolders = await offlineDB.getUnsyncedFolders();
    const pEntries = await offlineDB.getUnsyncedEntries();
    setPendingCount(pFolders.length + pEntries.length);
  };

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 5000); // Check every 5s
    return () => clearInterval(interval);
  }, []);

  // Sync logic
  const performSync = async () => {
    if (!isOnline || isSyncing) return;
    setIsSyncing(true);
    
    try {
      // 1. Sync Folders
      const pFolders = await offlineDB.getUnsyncedFolders();
      for (const folder of pFolders) {
        try {
          const result = await apiFetch('/folders', {
            method: 'POST',
            body: JSON.stringify({ folder_name: folder.folder_name })
          });
          // Update local ID to match server ID and mark as synced
          await offlineDB.updateFolder(folder.id, { isSynced: 1, serverId: result.id });
          
          // Update entries mapping for this folder
          const folderEntries = await offlineDB.getEntriesByFolder(folder.id);
          for (const entry of folderEntries) {
            await offlineDB.updateEntry(entry.id, { folder_id: result.id });
          }
        } catch (err) {
          console.error('Failed to sync folder:', err);
        }
      }

      // 2. Sync Entries
      const pEntries = await offlineDB.getUnsyncedEntries();
      for (const entry of pEntries) {
        // Only sync entries whose folder is already synced (has a folder_id that is NOT an integer from Dexie)
        if (typeof entry.folder_id === 'string' || entry.serverId) {
          try {
            await apiFetch('/entries', {
              method: 'POST',
              body: JSON.stringify({
                folder_id: entry.folder_id,
                name: entry.name,
                place: entry.place,
                mobile: entry.mobile,
                amount: entry.amount
              })
            });
            await offlineDB.markEntrySynced(entry.id);
          } catch (err) {
            console.error('Failed to sync entry:', err);
          }
        }
      }
      
      await checkPending();
    } finally {
      setIsSyncing(false);
    }
  };

  return { isOnline, pendingCount, isSyncing, performSync };
};
