import { formatToUserTimezone } from '../utils/dateFormatter';
import '../styles/NoteCard.css'
import Spinner from './Spinner.jsx';
import { marked } from 'marked';

const UncheckedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
);

const CheckedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
);

const PinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="none"
        style={{ marginRight: '0.35rem', verticalAlign: 'middle', display: 'inline-block' }}>
        <path d="M12 2 L17 7 L15 13 L12 14 L9 13 L7 7 Z"
            fill="#faecd6" stroke="#c8883a" strokeWidth="1.4" strokeLinejoin="round" />
        <line x1="12" y1="4" x2="12" y2="12.5"
            stroke="#a0522d" strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
        <line x1="12" y1="14" x2="12" y2="21"
            stroke="#a0522d" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="7" y1="7" x2="17" y2="7"
            stroke="#c8883a" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
);

const LockIcon = () => (
    <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <rect x="4.75" y="10" width="14.5" height="10.75" rx="2" stroke="currentColor" strokeWidth="1.5"/>
  <path d="M7.75 10V6.75a4.25 4.25 0 0 1 8.5 0V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  <circle cx="12" cy="14.75" r="1" fill="currentColor"/>
  <path d="M12 15.75V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
</svg>
);

const UnlockIcon = () => (
    <svg className="lock-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
  <rect x="4.75" y="10" width="14.5" height="10.75" rx="2" stroke="currentColor" strokeWidth="1.5"/>
  <path d="M16.25 10V6.75A4.25 4.25 0 0 0 8.5 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  <circle cx="12" cy="14.75" r="1" fill="currentColor"/>
  <path d="M12 15.75V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
</svg>
);

/**
 * NoteCard
 *
 * Props:
 *  note        — full note object
 *  index       — position in list (for animation delay)
 *  onEdit      — (note) => void
 *  onPin       — (e, note) => void
 *  onDelete    — (e, id) => void
 */
function NoteCard({ note, index, onEdit, onPin, pinLoading, onDelete, delLoading, onLockToggle }) {
    const stripHtml = (content) => {
        if (!content) return "";
        if (content === '****') return '****';
        // Parse markdown first (for old notes), then strip all HTML
        const html = marked.parse(content, { async: false });
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const plainTextContent = note.is_locked
        ? '****'
        : (note.is_checklist ? '' : stripHtml(note.content));

    const truncatedTitle = note.title.length > 27
        ? note.title.slice(0, 27) + '…'
        : note.title;

    return (
        <div
            onClick={() => onEdit(note)}
            className={`notes-cards ${note.is_pinned ? 'pinned-note' : 'not-pinned-note'} ${note.is_locked ? 'locked-note' : ''}`}
            style={{ animationDelay: `${index * 0.05}s` }}
        >
            {/* Header */}
            <div className="note-header">
                <h3>
                    {note.is_pinned && <PinIcon />}
                    {truncatedTitle}
                </h3>
                <div 
                    className={`note-lock-status ${note.is_locked ? 'locked' : 'unlocked'}`} 
                    onClick={(e) => onLockToggle(e, note)} 
                    style={{ cursor: 'pointer' }}
                    title={note.is_locked ? "Unlock this note" : "Lock this note"}
                >
                    {note.is_locked ? <LockIcon /> : <UnlockIcon />}
                </div>
            </div>

            {/* Body — checklist or plain text */}
            {!note.is_locked && note.is_checklist ? (
                <ul className="checklist-display">
                    {note.items && note.items.length > 0 && note.items.some(item => item.text && item.text.trim()) ? (
                        note.items.slice(0, 2).map((item, idx) => (
                            <li key={idx} className={item.checked ? 'checked-item' : ''}>
                                <span className="check-dot">
                                    {item.checked ? <CheckedIcon /> : <UncheckedIcon />}
                                </span>
                                <span className="checklist-item-text">
                                    {item.checked ? <s>{item.text || '[empty]'}</s> : (item.text || '[empty]')}
                                </span>
                            </li>
                        ))
                    ) : (
                        <li style={{ fontStyle: 'italic', color: 'var(--ink-faint)' }}>[empty]</li>
                    )}
                </ul>
            ) : (
                <p 
                    className="note-content" 
                    style={
                        note.is_locked 
                            ? { fontStyle: 'italic', letterSpacing: '0.15em', fontWeight: 'bold' } 
                            : (plainTextContent.trim() ? {} : { fontStyle: 'italic', color: 'var(--ink-faint)' })
                    }
                >
                    {note.is_locked ? '****' : (plainTextContent.trim() || '[empty]')}
                </p>
            )}

            {/* Timestamp */}
            <small className="note-timestamp">
                {formatToUserTimezone(note.created_at)}
                {note.updated_at !== note.created_at && <span> · edited</span>}
            </small>

            {/* Actions */}
            <div className="btn-div">
                
                <button onClick={(e) => onPin(e, note)} disabled={pinLoading}>
                    {note.is_pinned ? 
                        (pinLoading ? <><Spinner/>&nbsp;Unpining...</> : 'Unpin') : 
                        (pinLoading ? <><Spinner/>&nbsp;Pinning...</>  : 'Pin')
                    }
                </button>
                <button className="delete-btn" onClick={(e) => onDelete(e, note.id)} disabled={delLoading}>
                    {
                        delLoading ? <><Spinner/>&nbsp;Deleting...</> : 'Delete'
                    }
                </button>
            </div>
        </div>
    );
}

export default NoteCard;