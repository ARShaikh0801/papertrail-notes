import { useState } from 'react';
import Spinner from './Spinner.jsx';
import '../styles/Create&EditNoteModal.css';

function PasswordModal({ title, onSubmit, onClose, error, loading }) {
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(password);
    };

    return (
        <div className="modal-overlay password-modal-overlay" onClick={onClose}>
            <div className="note-form password-note-form" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                <div className="note-form-header">
                    <h3>{title}</h3>
                    <button className="model-close-btn" onClick={onClose}>&times;</button>
                </div>
                {error && <p className="error-line" style={{ color: 'var(--delete-color)', marginBottom: '1rem' }}>{error}</p>}
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Enter account password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                        autoFocus
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            borderRadius: '4px',
                            border: '1px solid var(--input-border)',
                            background: 'var(--focus-bg)',
                            color: 'var(--ink)',
                            fontSize: '1rem',
                            outline: 'none'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                            type="button"
                            className="modal-btn modal-btn-secondary"
                            onClick={onClose}
                            style={{ flex: 1 }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="modal-btn modal-btn-primary"
                            disabled={loading}
                            style={{ flex: 1 }}
                        >
                            {loading ? <Spinner /> : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PasswordModal;
