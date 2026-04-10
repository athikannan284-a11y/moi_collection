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
        const parentFolder = (await offlineDB.getAllFolders()).find(f => f.id === entry.folder_id || f.serverId === entry.folder_id);
        const serverFolderId = parentFolder?.serverId || entry.folder_id;
        
        if (serverFolderId && typeof serverFolderId === 'string') {
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
  };

  return { isOnline, pendingCount, isSyncing, performSync };
};
