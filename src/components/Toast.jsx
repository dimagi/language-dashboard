import React, { useEffect } from 'react';
import { CheckCircle, XCircle, X } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const Icon = type === 'success' ? CheckCircle : XCircle;
    const color = type === 'success' ? 'var(--color-success)' : '#ef4444';

    return (
        <div className={`toast toast-${type}`}>
            <Icon size={20} style={{ color }} />
            <div style={{ flexGrow: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                {message}
            </div>
            <button
                onClick={onClose}
                className="btn btn-icon"
                style={{ padding: '0.25rem', opacity: 0.6 }}
            >
                <X size={16} />
            </button>
        </div>
    );
};

export const ToastContainer = ({ toasts, removeToast }) => {
    return (
        <div className="toast-container">
            {toasts.map(toast => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
};

export default Toast;
