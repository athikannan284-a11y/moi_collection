import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Smartphone, ShieldCheck, Key, ArrowLeft, Loader2, CheckCircle2, Lock, Eye, EyeOff } from 'lucide-react';
import { apiFetch } from '../api';

const ForgotPassword = () => {
    const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password, 4: Success
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await apiFetch('/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ identifier })
            });
            const data = await response.json();
            if (data.success) {
                setStep(2);
            } else {
                setError(data.message || 'Verification failed');
            }
        } catch (err) {
            setError('Server error. Try again later.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await apiFetch('/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ identifier, otp })
            });
            const data = await response.json();
            if (data.success) {
                setStep(3);
            } else {
                setError(data.message || 'Invalid OTP');
            }
        } catch (err) {
            setError('Verification failed');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await apiFetch('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({ identifier, otp, newPassword })
            });
            const data = await response.json();
            if (data.success) {
                setStep(4);
            } else {
                setError(data.message || 'Reset failed');
            }
        } catch (err) {
            setError('Server error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: '400px' }}>
                <div className="brand" style={{ marginBottom: '2rem' }}>
                    <div className="logo-icon" style={{ width: '60px', height: '60px' }}>
                        <ShieldCheck size={30} />
                    </div>
                    <h1 style={{ fontSize: '1.5rem' }}>Account Recovery</h1>
                    <p style={{ fontSize: '0.9rem' }}>Securely reset your password</p>
                </div>

                {step === 1 && (
                    <form onSubmit={handleSendOTP}>
                        <div className="form-group">
                            <label><Mail size={16} /> Enter Email or Mobile</label>
                            <input 
                                type="text" 
                                value={identifier} 
                                onChange={(e) => setIdentifier(e.target.value)} 
                                placeholder="Registered Email/Mobile"
                                required 
                            />
                        </div>
                        {error && <p className="error-msg">{error}</p>}
                        <button type="submit" className="primary-btn" style={{ width: '100%' }} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Send OTP Code'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOTP}>
                        <div className="form-group">
                            <label><Key size={16} /> Enter 6-Digit OTP</label>
                            <input 
                                type="text" 
                                value={otp} 
                                onChange={(e) => setOtp(e.target.value)} 
                                placeholder="000000"
                                maxLength={6}
                                required 
                            />
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                                Code sent to {identifier}
                            </p>
                        </div>
                        {error && <p className="error-msg">{error}</p>}
                        <button type="submit" className="primary-btn" style={{ width: '100%' }} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Verify Code'}
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <div className="form-group">
                            <label><Key size={16} /> Set New Password</label>
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={newPassword} 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    placeholder="At least 8 characters"
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
                        <button type="submit" className="primary-btn" style={{ width: '100%' }} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin" /> : 'Reset Password'}
                        </button>
                    </form>
                )}

                {step === 4 && (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                        <CheckCircle2 size={48} color="var(--success)" style={{ margin: '0 auto 1.5rem' }} />
                        <h2 style={{ marginBottom: '1rem' }}>Success!</h2>
                        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
                            Your password has been updated securely.
                        </p>
                        <button onClick={() => navigate('/login')} className="primary-btn" style={{ width: '100%' }}>
                            Go to Login
                        </button>
                    </div>
                )}

                {step !== 4 && (
                    <Link to="/login" className="back-link" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', textDecoration: 'none', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                )}
            </div>
        </div>
    );
};

export default ForgotPassword;
