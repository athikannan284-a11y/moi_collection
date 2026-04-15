import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const icons = {
        success: <CheckCircle size={20} color="#10b981" />,
        error: <AlertCircle size={20} color="#ef4444" />,
        info: <AlertCircle size={20} color="#3b82f6" />
    };

    const bgColor = {
        success: 'rgba(16, 185, 129, 0.1)',
        error: 'rgba(239, 68, 68, 0.1)',
        info: 'rgba(59, 130, 246, 0.1)'
    };

    const borderColor = {
        success: '#10b981',
        error: '#ef4444',
        info: '#3b82f6'
    };

    return (
        <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${borderColor[type]}`,
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
            animation: 'slideIn 0.3s ease-out forwards',
            minWidth: '280px'
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: bgColor[type]
            }}>
                {icons[type]}
            </div>
            <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text)' }}>
                    {message}
                </p>
            </div>
            <button onClick={onClose} style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
            }}>
                <X size={16} />
            </button>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>
        </div>
    );
};

export default Toast;
