import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Lock, Mail, Eye, EyeOff, Calendar, Folder } from 'lucide-react';
import { apiFetch } from '../api';
import LoadingButton from '../components/LoadingButton';

const Login = ({ setAuth, setClientAuth }) => {
    const [view, setView] = useState('client'); // 'client' or 'admin'
    
    // Admin State
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    // Client State
    const [folderName, setFolderName] = useState('');
    const [folderDate, setFolderDate] = useState('');
    
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleAdminSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await apiFetch('/login', {
                method: 'POST',
                body: JSON.stringify({ identifier, password })
            });

            const data = await response.json();
            if (data.success) {
                setAuth(true);
                navigate('/');
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('Server connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleClientSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await apiFetch('/client-login', {
                method: 'POST',
                body: JSON.stringify({ folderName, date: folderDate })
            });

            const data = await response.json();
            if (data.success && data.folderId) {
                if (setClientAuth) {
                    setClientAuth(data.folderId);
                }
                // Send them directly to their folder, with a state flag restricting them
                navigate(`/folder/${data.folderId}`, { 
                    state: { 
                        folderName: data.folderName, 
                        serverId: data.folderId,
                        isClient: true 
                    } 
                });
            } else {
                setError(data.message || 'Collection not found or incorrect date');
            }
        } catch (err) {
            setError('Server connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="brand" style={{ position: 'relative' }}>
                    {/* The Logo Toggle: Top Left Corner */}
                    <div 
                        onClick={() => setView(view === 'client' ? 'admin' : 'client')}
                        style={{ 
                            position: 'absolute', 
                            top: '-10px', 
                            left: '-10px', 
                            cursor: 'pointer',
                            opacity: view === 'admin' ? 1 : 0.6,
                            transition: 'opacity 0.3s'
                        }}
                        title={view === 'client' ? "Admin Login" : "Client Portal"}
                    >
                        <img src="/logo.png" alt="Toggle Login" style={{ width: '40px', height: '40px' }} />
                    </div>

                    <div className="logo-icon" style={{ marginTop: '20px', padding: '0', background: 'none', boxShadow: 'none' }}>
                        <img src="/logo.png" alt="Moi Master Logo" style={{ width: '80px', height: '80px', borderRadius: '20px' }} />
                    </div>
                    <h1>{view === 'admin' ? 'Admin Login' : 'Find Collection'}</h1>
                </div>

                {view === 'admin' ? (
                    <form onSubmit={handleAdminSubmit}>
                        <div className="form-group">
                            <label><Mail size={16} /> Email or Mobile</label>
                            <input 
                                type="text" 
                                value={identifier} 
                                onChange={(e) => setIdentifier(e.target.value)} 
                                placeholder="Admin email or mobile..."
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label><Lock size={16} /> Password</label>
                                <Link to="/forgot-password" style={{ fontSize: '0.8rem', color: 'var(--primary)', textDecoration: 'none' }}>
                                    Forgot?
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    placeholder="••••••••"
                                    required 
                                    style={{ width: '100%', paddingRight: '40px' }}
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        padding: '0',
                                        width: 'auto',
                                        marginTop: '0'
                                    }}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>
                        {error && <p className="error-msg">{error}</p>}
                        <LoadingButton type="submit" loading={loading}>
                            <LogIn size={18} /> Login
                        </LoadingButton>
                    </form>
                ) : (
                    <form onSubmit={handleClientSubmit}>
                        <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                            Enter your Collection Name and the exactly matching Open Date to view your records.
                        </p>
                        <div className="form-group">
                            <label><Folder size={16} /> Collection Name</label>
                            <input 
                                type="text" 
                                value={folderName} 
                                onChange={(e) => setFolderName(e.target.value)} 
                                placeholder="E.g., Aathi Wedding"
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label><Calendar size={16} /> Date Opened</label>
                            <input 
                                type="date" 
                                value={folderDate} 
                                onChange={(e) => setFolderDate(e.target.value)} 
                                required 
                                style={{ width: '100%' }}
                            />
                        </div>
                        {error && <p className="error-msg">{error}</p>}
                        <LoadingButton type="submit" loading={loading}>
                            View Records
                        </LoadingButton>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Login;
