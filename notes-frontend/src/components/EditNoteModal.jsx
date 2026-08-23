import { useState, useRef, useEffect } from 'react';
import ChecklistBuilder from './ChecklistBuilder';
import '../styles/Create&EditNoteModal.css';
import Spinner from './Spinner.jsx';

/**
 * EditNoteModal
 */
function EditNoteModal({ note, onClose, onSaved, apiPatch }) {
    const [title, setTitle]         = useState(note.title);
    const [content, setContent]     = useState(note.content || '');
    const [items, setItems]         = useState(note.items && note.items.length > 0 ? note.items.map(i => ({ ...i })) : [{ text: '', checked: false }]);
    const [error, setError]         = useState('');
    const [saveStatus, setSaveStatus] = useState('Saved'); // 'Saved', 'Saving...', 'Failed'

    const bottomRef = useRef(null);
    const prevEditItemsLengthRef = useRef(0);
    const saveTimeoutRef = useRef(null);

    // Undo History Stack
    const [history, setHistory] = useState([]);
    const isUndoingRef = useRef(false);
    const prevStateRef = useRef({ title: note.title, content: note.content || '', items: note.items ? note.items.map(i => ({ ...i })) : [] });

    useEffect(() => {
        if (items.length > prevEditItemsLengthRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevEditItemsLengthRef.current = items.length;
    }, [items]);

    // Reinitialise if a different note is passed in
    useEffect(() => {
        setTitle(note.title);
        setContent(note.content || '');
        setItems(note.items && note.items.length > 0 ? note.items.map(i => ({ ...i })) : [{ text: '', checked: false }]);
        setHistory([]);
        setError('');
        setSaveStatus('Saved');
        prevStateRef.current = {
            title: note.title,
            content: note.content || '',
            items: note.items && note.items.length > 0 ? note.items.map(i => ({ ...i })) : [{ text: '', checked: false }]
        };
    }, [note.id]);

    const addItemAtIndex = (index, text) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems.splice(index, 0, { text, checked: false });
            return newItems;
        });
    };
    const setItemText = (index, text) => {
        setItems(prev => prev.map((item, idx) => idx === index ? { ...item, text } : item));
    };
    const removeItem = (i)    => setItems(prev => {
        const remaining = prev.filter((_, idx) => idx !== i);
        return remaining.length > 0 ? remaining : [{ text: '', checked: false }];
    });

    const toggleItem = (i)    => setItems(prev =>
        prev.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item)
    );

    const pushToHistory = (state) => {
        setHistory(prev => {
            const last = prev[prev.length - 1];
            if (
                last &&
                last.title === state.title &&
                last.content === state.content &&
                JSON.stringify(last.items) === JSON.stringify(state.items)
            ) {
                return prev;
            }
            return [...prev, state].slice(-50);
        });
    };

    const handleUndo = () => {
        if (history.length === 0) return;
        const previousState = history[history.length - 1];
        setHistory(prev => prev.slice(0, -1));

        isUndoingRef.current = true;
        setTitle(previousState.title);
        setContent(previousState.content);
        setItems(previousState.items);

        triggerSaveImmediate(previousState);
    };

    const performSave = async (stateToSave) => {
        try {
            await apiPatch(note.id, {
                title: stateToSave.title.trim() ? stateToSave.title : "Untitled",
                content: note.is_checklist ? '' : stateToSave.content,
                items: note.is_checklist ? stateToSave.items : [],
            });
            setSaveStatus('Saved');
        } catch (err) {
            setSaveStatus('Failed to save');
        }
    };

    const triggerAutosave = (stateToSave) => {
        setSaveStatus('Saving...');

        // Group typing bursts: only push previous stable state to history
        // when starting a new typing session (no active timeout).
        if (!saveTimeoutRef.current) {
            pushToHistory(prevStateRef.current);
        }

        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
            saveTimeoutRef.current = null;
            performSave(stateToSave);
        }, 1000);
    };

    const triggerSaveImmediate = async (stateToSave) => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        await performSave(stateToSave);
    };

    // Watch for modifications to trigger autosave
    useEffect(() => {
        const currentState = { title, content, items };
        const prevState = prevStateRef.current;

        const hasChanged =
            prevState.title !== title ||
            prevState.content !== content ||
            JSON.stringify(prevState.items) !== JSON.stringify(items);

        if (hasChanged) {
            if (isUndoingRef.current) {
                isUndoingRef.current = false;
            } else {
                triggerAutosave(currentState);
            }
            prevStateRef.current = currentState;
        }
    }, [title, content, items]);

    const handleClose = async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        await performSave({ title, content, items });
        onSaved();
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="note-form" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="note-form-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3>{title || 'Edit Note'}</h3>
                        <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)', fontStyle: 'italic' }}>
                            {saveStatus}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {history.length > 0 && (
                            <button 
                                onClick={handleUndo}
                                style={{
                                    height: '30px',
                                    padding: '0 0.8rem',
                                    background: 'rgba(200, 136, 58, 0.1)',
                                    color: 'var(--amber)',
                                    border: 'none',
                                    borderRadius: '3px',
                                    fontSize: '0.85rem',
                                    fontWeight: '500',
                                    cursor: 'pointer'
                                }}
                            >
                                Undo
                            </button>
                        )}
                        <button className="modal-close-btn-header" onClick={handleClose}>&times;</button>
                    </div>
                </div>

                {error && <p className="error-line">{error}</p>}

                {/* Title */}
                <input
                    type="text"
                    placeholder="Title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />

                {/* Body */}
                {note.is_checklist ? (
                    <ChecklistBuilder
                        items={items}
                        onAddAtIndex={addItemAtIndex}
                        onRemove={removeItem}
                        onToggle={toggleItem}
                        onTextChange={setItemText}
                        bottomRef={bottomRef}
                    />
                ) : (
                    <textarea
                        placeholder="Write something…"
                        value={content}
                        onChange={e => setContent(e.target.value)}
                        rows={5}
                    />
                )}
            </div>
        </div>
    );
}

export default EditNoteModal;