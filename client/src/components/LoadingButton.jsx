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
            <div className="btn-stack-wrapper">
                <div className="btn-text-layer">
                    {children}
                </div>
                {loading && (
                    <div className="btn-loader-layer">
                        <Loader2 size={18} className="animate-spin" />
                    </div>
                )}
            </div>
        </button>
    );
};

export default LoadingButton;
