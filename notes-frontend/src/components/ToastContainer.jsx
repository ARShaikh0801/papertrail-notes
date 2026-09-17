import React from "react";

function ToastContainer({ toasts }) {
    if (!toasts || toasts.length === 0) return null;

    return (
        <div className="toasts-container">
            {toasts.map(t => (
                <div key={t.id} className={`toast-item toast-${t.type}`}>
                    {t.type === 'success' ? '✓ ' : '⚠️ '}
                    {t.message}
                </div>
            ))}
        </div>
    );
}

export default React.memo(ToastContainer);
