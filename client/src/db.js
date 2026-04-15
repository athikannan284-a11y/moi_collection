import Dexie from 'dexie';

export const db = new Dexie('MoiCollectionDB');

// Define database schema
db.version(2).stores({
  folders: '++id, folder_name, isSynced, createdAt',
  entries: '++id, folder_id, name, place, mobile, amount, isSynced, createdAt, [folder_id+createdAt]'
});

// Helper functions for common operations
export const offlineDB = {
  // Folders
  getAllFolders: () => db.folders.orderBy('createdAt').reverse().toArray(),
  addFolder: (folder) => db.folders.add({ ...folder, isSynced: 0, createdAt: new Date() }),
  updateFolder: (id, folder) => db.folders.update(id, folder),
  deleteFolder: (id) => db.folders.delete(id),
  
  // Entries
  getEntriesByFolder: (folderId) => db.entries.where('[folder_id+createdAt]').between([folderId, Dexie.minKey], [folderId, Dexie.maxKey]).reverse().toArray(),
  addEntry: (entry) => db.entries.add({ ...entry, isSynced: 0, createdAt: new Date() }),
  updateEntry: (id, entry) => db.entries.update(id, entry),
  deleteEntry: (id) => db.entries.delete(id),
  
  // Sync Status
  getUnsyncedFolders: () => db.folders.where('isSynced').equals(0).toArray(),
  getUnsyncedEntries: () => db.entries.where('isSynced').equals(0).toArray(),
  markFolderSynced: (id) => db.folders.update(id, { isSynced: 1 }),
  markEntrySynced: (id) => db.entries.update(id, { isSynced: 1 })
};
