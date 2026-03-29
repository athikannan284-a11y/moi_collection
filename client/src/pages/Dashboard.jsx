import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderPlus, Folder, Trash2, LogOut, ChevronRight, LayoutDashboard, Plus, MoreVertical, Edit2, Search } from 'lucide-react';

const Dashboard = ({ setAuth }) => {
    const [folders, setFolders] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [loading, setLoading] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchFolders();
        // Close dropdown when clicking outside
        const closeDropdown = () => setActiveDropdown(null);
        window.addEventListener('click', closeDropdown);
        return () => window.removeEventListener('click', closeDropdown);
    }, []);

    const fetchFolders = async () => {
        const response = await fetch('http://localhost:5000/api/folders');
        const data = await response.json();
        setFolders(data);
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        setLoading(true);

        try {
            const response = await fetch('http://localhost:5000/api/folders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_name: newFolderName })
            });
            if (response.ok) {
                setNewFolderName('');
                fetchFolders();
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
            const response = await fetch(`http://localhost:5000/api/folders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_name: newName })
            });
            if (response.ok) fetchFolders();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteFolder = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Are you sure you want to delete this folder and all its entries?')) return;

        try {
            await fetch(`http://localhost:5000/api/folders/${id}`, { method: 'DELETE' });
            fetchFolders();
        } catch (err) {
            console.error(err);
        }
    };

    const filteredFolders = folders.filter(folder => 
        folder.folder_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="dashboard-page">
            <header className="main-header">
                <div className="header-left">
                    <h1><LayoutDashboard size={24} style={{ marginBottom: -4, marginRight: 8 }} /> Dashboard</h1>
                </div>
                <button onClick={() => setAuth(false)} className="logout-btn">
                    <LogOut size={18} /> Logout
                </button>
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
                                placeholder="E.g., Wedding Collection, Temple Festival..."
                                required 
                            />
                        </div>
                        <button type="submit" disabled={loading} className="primary-btn">
                            {loading ? 'Creating...' : <><Plus size={18} /> Create Folder</>}
                        </button>
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

                <div className="section-title">
                    <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Active Collections</h2>
                </div>

                <section className="folders-grid">
                    {filteredFolders.length === 0 ? (
                        <div className="no-data-card" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
                            <p className="no-data" style={{ color: 'var(--text-muted)' }}>
                                {searchTerm ? 'No folders match your search.' : 'No folders created yet.'}
                            </p>
                        </div>
                    ) : (
                        filteredFolders.map(folder => (
                            <div 
                                key={folder.id} 
                                className="folder-card"
                                onClick={() => navigate(`/folder/${folder.id}`, { state: { folderName: folder.folder_name } })}
                            >
                                <div className="folder-info">
                                    <div className="folder-icon-wrapper">
                                        <Folder size={28} className="folder-icon" />
                                    </div>
                                    <h3>{folder.folder_name}</h3>
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


