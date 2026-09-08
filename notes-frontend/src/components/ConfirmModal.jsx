import { useEffect } from 'react';
import Spinner from './Spinner.jsx';
import '../styles/ConfirmModal.css';

/**
 * Reusable Confirmation Modal
 */
function ConfirmModal({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDanger = true,
    loading = false,
    onConfirm,
    onClose
}) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, loading, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay confirm-modal-overlay" onClick={() => !loading && onClose()}>
            <div className="confirm-modal-card" onClick={e => e.stopPropagation()}>
                <button className="confirm-modal-close" onClick={onClose} disabled={loading} aria-label="Close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>

                <div className="confirm-modal-header">
                    <div className={`confirm-icon-wrapper ${isDanger ? 'danger' : 'warning'}`}>
                        {isDanger ? (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        ) : (
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                        )}
                    </div>
                    <h3>{title}</h3>
                </div>

                <div className="confirm-modal-body">
                    <p>{message}</p>
                </div>

                <div className="confirm-modal-actions">
                    <button
                        type="button"
                        className="confirm-btn confirm-btn-cancel"
                        onClick={onClose}
                        disabled={loading}
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        className={`confirm-btn ${isDanger ? 'confirm-btn-danger' : 'confirm-btn-primary'}`}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? <><Spinner />&nbsp;Processing...</> : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ConfirmModal;
