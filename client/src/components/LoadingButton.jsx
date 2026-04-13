import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * LoadingButton - A professional, stable button component that handles loading states 
 * without shifting layout or "shaking".
 */
const LoadingButton = ({ 
    loading = false, 
    children, 
    className = "", 
    disabled = false,
    ...props 
}) => {
    return (
        <button 
            {...props} 
            disabled={loading || disabled}
            className={`primary-btn stable-loading-btn ${loading ? 'is-loading' : ''} ${className}`}
        >
            <span className="btn-stack-wrapper">
                <span className="btn-text-layer">
                    {children}
                </span>
                {loading && (
                    <span className="btn-loader-layer">
                        <Loader2 size={18} className="animate-spin" />
                    </span>
                )}
            </span>
        </button>
    );
};

export default LoadingButton;
