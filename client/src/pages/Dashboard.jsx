import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Folder, Trash2, LogOut, ChevronRight, Plus, MoreVertical, Edit2, Search, Cloud } from 'lucide-react';
import { apiFetch } from '../api';
import { offlineDB, db } from '../db';
import LoadingButton from '../components/LoadingButton';
import Toast from '../components/Toast';

const Dashboard = ({ setAuth, isSyncing, pendingCount }) => {
    const [folders, setFolders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const [toast, setToast] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Strict Hardware Lock for preventing double-submits
    const submitLockRef = useRef(false);
    const navigate = useNavigate();

    useEffect(() => {
        console.log('[DEBUG] [LISTENER]: Registering Dashboard global listeners');
        loadFolders();
        const closeDropdown = () => setActiveDropdown(null);
        window.addEventListener('click', closeDropdown);
        return () => {
            console.log('[DEBUG] [LISTENER]: Cleaning up Dashboard listeners');
            window.removeEventListener('click', closeDropdown);
        };
    }, []);

    const loadFolders = async () => {
        if (navigator.onLine) {
            try {
                const response = await apiFetch('/folders');
                if (response.ok) {
                    const cloudFolders = await response.json();
                    
                    // Controlled Upsert: Only update if changed, prevents flashing
                    for (const f of cloudFolders) {
                        const existing = await db.folders.where('serverId').equals(f.id || f._id).first();
                        if (!existing) {
                            await db.folders.add({
                                folder_name: f.folder_name,
                                serverId: f.id || f._id,
                                isSynced: 1,
                                createdAt: new Date(f.createdAt)
                            });
                        } else if (existing.folder_name !== f.folder_name) {
                            await db.folders.update(existing.id, { folder_name: f.folder_name });
                        }
                    }
                }
            } catch (err) {
                console.warn('[DEBUG] [SYNC]: Cloud fetch failed, using local mirror');
            }
        }
        
        const localFolders = await offlineDB.getAllFolders();
        setFolders(localFolders);
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        if (submitLockRef.current) return;

        submitLockRef.current = true;
        setIsSubmitting(true);
        setLoading(true);

        try {
            const folderNameValue = newFolderName.trim();
            if (!folderNameValue) return;

            // Step 1: Save locally (instant)
            const localId = await offlineDB.addFolder({ folder_name: folderNameValue });
            setNewFolderName('');
            await loadFolders();

            // Step 2: Attempt to sync to cloud
            if (navigator.onLine) {
                try {
                    const response = await apiFetch('/folders', {
                        method: 'POST',
                        body: JSON.stringify({ folder_name: folderNameValue })
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
            setToast({ message: 'Error creating folder.', type: 'error' });
        } finally {
            setLoading(false);
            setIsSubmitting(false);
            submitLockRef.current = false;
        }
    };

    const handleRenameFolder = async (id, currentName, e) => {
        e.stopPropagation();
        const newName = prompt('Enter new folder name:', currentName);
        if (!newName || newName === currentName) return;

        try {
            // Update locally first
            await offlineDB.updateFolder(id, { folder_name: newName, isSynced: 0 });
            
            // Push to server BEFORE reloading so we don't fetch the old name
            if (navigator.onLine) {
                const folder = await offlineDB.getAllFolders().then(fs => fs.find(f => f.id === id));
                const targetId = folder.serverId || id;
                await apiFetch(`/folders/${targetId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ folder_name: newName })
                });
                await offlineDB.markFolderSynced(id);
            }

            // Now safely reload to reflect changes
            await loadFolders();
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

    const filteredFolders = folders
        .filter(folder => folder.folder_name.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });

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
                                style={{ position: 'relative', zIndex: activeDropdown === folder.id ? 20 : 1 }}
                            >
                                <div className="folder-info">
                                    <div className="folder-icon-wrapper">
                                        <Folder size={28} className="folder-icon" />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <h3>{folder.folder_name}</h3>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                            {folder.createdAt && (
                                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                                    {new Date(folder.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '0.7rem', color: folder.isSynced ? 'var(--success)' : '#fbbf24' }}>
                                                {folder.isSynced ? '✓ Synced' : '● Pending Sync'}
                                            </span>
                                        </div>
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

                <div className="test-update-trigger" style={{ marginTop: '2rem', padding: '1rem', textAlign: 'center', opacity: 0.5 }}>
                    <button 
                        onClick={() => window.dispatchEvent(new CustomEvent('moi-test-update'))}
                        style={{ background: 'none', border: '1px dashed var(--text-muted)', color: 'var(--text-muted)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                        Test Update UI (Admin Only)
                    </button>
                </div>
            </main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default Dashboard;
