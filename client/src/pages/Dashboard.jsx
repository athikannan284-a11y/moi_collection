import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Folder, Trash2, LogOut, ChevronRight, LayoutDashboard, Plus, MoreVertical, Edit2, Search, Cloud } from 'lucide-react';
import { apiFetch } from '../api';
import { offlineDB, db } from '../db';
import LoadingButton from '../components/LoadingButton';

const Dashboard = ({ setAuth, isSyncing, pendingCount }) => {
    const [folders, setFolders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadFolders();
        // Close dropdown when clicking outside
        const closeDropdown = () => setActiveDropdown(null);
        window.addEventListener('click', closeDropdown);
        return () => window.removeEventListener('click', closeDropdown);
    }, []);

    const loadFolders = async () => {
        if (navigator.onLine) {
            try {
                // SERVER-FIRST: When online, server is the single source of truth
                const response = await apiFetch('/folders');
                if (response.ok) {
                    const cloudFolders = await response.json();
                    
                    // Clear local folders and re-insert clean server data
                    await db.folders.clear();
                    for (const f of cloudFolders) {
                        await db.folders.add({
                            folder_name: f.folder_name,
                            serverId: f.id || f._id,
                            isSynced: 1,
                            createdAt: new Date(f.createdAt)
                        });
                    }
                    
                    const freshFolders = await offlineDB.getAllFolders();
                    setFolders(freshFolders);
                    return;
                }
            } catch (err) {
                console.warn('Server fetch failed, falling back to local:', err);
            }
        }
        
        // Offline fallback: use local IndexedDB
        const localFolders = await offlineDB.getAllFolders();
        setFolders(localFolders);
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setLoading(true);

        try {
            // Step 1: Save locally (instant)
            const localId = await offlineDB.addFolder({ folder_name: newFolderName });
            setNewFolderName('');
            await loadFolders();

            // Step 2: Attempt to sync to cloud
            if (navigator.onLine) {
                try {
                    const response = await apiFetch('/folders', {
                        method: 'POST',
                        body: JSON.stringify({ folder_name: newFolderName })
                    });
                    if (response.ok) {
                        const result = await response.json();
                        await offlineDB.updateFolder(localId, { isSynced: 1, serverId: result.id });
                    }
                } catch (err) {
                    console.log('Postponing cloud sync (Offline)');
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleRenameFolder = async (id, currentName, e) => {
        e.stopPropagation();
        const newName = prompt('Enter new folder name:', currentName);
        if (!newName || newName === currentName) return;

        try {
            await offlineDB.updateFolder(id, { folder_name: newName, isSynced: 0 });
            await loadFolders();
            
            if (navigator.onLine) {
                const folder = await offlineDB.getAllFolders().then(fs => fs.find(f => f.id === id));
                const targetId = folder.serverId || id;
                await apiFetch(`/folders/${targetId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ folder_name: newName })
                });
                await offlineDB.markFolderSynced(id);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteFolder = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this folder and all its entries?')) return;

        try {
            const folder = (await offlineDB.getAllFolders()).find(f => f.id === id);
            await offlineDB.deleteFolder(id);
            await loadFolders();

            if (navigator.onLine) {
                const targetId = folder.serverId || id;
                await apiFetch(`/folders/${targetId}`, { method: 'DELETE' });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const filteredFolders = folders.filter(folder => 
        folder.folder_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="dashboard-page page-transition">
            <header className="main-header">
                <div className="header-left">
                    <div className="title-group">
                        <img src="/logo.png" alt="Logo" className="header-logo" />
                        <h1>Moi Master</h1>
                    </div>
                </div>
                <div className="header-spacer">{/* Grid Spacer */}</div>
                <div className="header-right" style={{ display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setAuth(false)} className="logout-btn">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </header>

            <main className="content">
                <section className="create-folder-section">
                    <form onSubmit={handleCreateFolder} className="folder-form">
                        <div className="input-group">
                            <FolderPlus size={20} className="icon" />
                            <input 
                                type="text" 
                                value={newFolderName} 
                                onChange={(e) => setNewFolderName(e.target.value)} 
                                placeholder="E.g., Wedding Collection..."
                                required 
                            />
                        </div>
                        <LoadingButton type="submit" loading={loading}>
                            <Plus size={18} /> Add Folder
                        </LoadingButton>
                    </form>
                </section>

                <div className="search-container">
                    <div className="search-bar">
                        <Search size={20} />
                        <input 
                            type="text" 
                            placeholder="Search folders..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Folders</h2>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Cloud size={14} /> Local Mirror
                    </span>
                </div>

                <section className="folders-grid">
                    {filteredFolders.length === 0 ? (
                        <div className="no-data-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                            <p className="no-data" style={{ color: 'var(--text-muted)' }}>
                                {searchTerm ? 'No folders match search.' : 'Start by creating a folder.'}
                            </p>
                        </div>
                    ) : (
                        filteredFolders.map(folder => (
                            <div 
                                key={folder.id} 
                                className="folder-card"
                                onClick={() => navigate(`/folder/${folder.id}`, { state: { folderName: folder.folder_name, serverId: folder.serverId } })}
                            >
                                <div className="folder-info">
                                    <div className="folder-icon-wrapper">
                                        <Folder size={28} className="folder-icon" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h3>{folder.folder_name}</h3>
                                        <span style={{ fontSize: '0.7rem', color: folder.isSynced ? 'var(--success)' : '#fbbf24' }}>
                                            {folder.isSynced ? '✓ Synced' : '● Pending Sync'}
                                        </span>
                                    </div>
                                </div>
                                <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
                                    <div className="folder-options">
                                        <button 
                                            className="options-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActiveDropdown(activeDropdown === folder.id ? null : folder.id);
                                            }}
                                        >
                                            <MoreVertical size={20} />
                                        </button>
                                        
                                        {activeDropdown === folder.id && (
                                            <div className="dropdown-menu">
                                                <button className="dropdown-item" onClick={(e) => handleRenameFolder(folder.id, folder.folder_name, e)}>
                                                    <Edit2 size={16} /> Rename
                                                </button>
                                                <button className="dropdown-item delete" onClick={(e) => handleDeleteFolder(folder.id, e)}>
                                                    <Trash2 size={16} /> Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <ChevronRight size={20} className="arrow-icon" style={{ marginLeft: '0.5rem' }} />
                                </div>
                            </div>
                        ))
                    )}
                </section>
            </main>
        </div>
    );
};

export default Dashboard;
