import React, { useState, useRef, useEffect } from 'react';
import ChecklistBuilder from './ChecklistBuilder';
import Spinner from './Spinner.jsx';
import '../styles/Create&EditNoteModal.css';

/**
 * CreateNoteModal
 */
function CreateNoteModal({ onClose, onCreated, apiPost, apiPatch }) {
    const [title, setTitle]             = useState('');
    const [content, setContent]         = useState('');
    const [isChecklist, setIsChecklist] = useState(false);
    const [items, setItems]             = useState([{ text: '', checked: false }]);
    const [error, setError]             = useState('');
    const [saveStatus, setSaveStatus]   = useState(''); // '', 'Saving...', 'Saved', 'Failed'

    const noteIdRef = useRef(null);
    const saveTimeoutRef = useRef(null);
    const bottomRef = useRef(null);
    const prevItemsLengthRef = useRef(0);
    
    // Undo stack
    const [history, setHistory] = useState([]);
    const isUndoingRef = useRef(false);
    const prevStateRef = useRef({ title: '', content: '', items: [{ text: '', checked: false }], isChecklist: false });

    useEffect(() => {
        if (items.length > prevItemsLengthRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
        prevItemsLengthRef.current = items.length;
    }, [items]);

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
                last.isChecklist === state.isChecklist &&
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
        setIsChecklist(previousState.isChecklist);
        setItems(previousState.items);

        triggerSaveImmediate(previousState);
    };

    const performSave = async (stateToSave) => {
        try {
            if (!noteIdRef.current) {
                // If there's absolutely no content/title, don't perform empty save yet
                if (!stateToSave.title.trim() && !stateToSave.content.trim() && stateToSave.items.length === 0) {
                    return;
                }
                const res = await apiPost({
                    title: stateToSave.title.trim() ? stateToSave.title : "Untitled",
                    content: stateToSave.isChecklist ? '' : stateToSave.content,
                    is_checklist: stateToSave.isChecklist,
                    items: stateToSave.isChecklist ? stateToSave.items : [],
                });
                noteIdRef.current = res.data.id;
            } else {
                await apiPatch(noteIdRef.current, {
                    title: stateToSave.title.trim() ? stateToSave.title : "Untitled",
                    content: stateToSave.isChecklist ? '' : stateToSave.content,
                    items: stateToSave.isChecklist ? stateToSave.items : [],
                });
            }
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
            const prevState = prevStateRef.current;
            if (prevState.title || prevState.content || prevState.items.length > 0) {
                pushToHistory(prevState);
            }
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

    // Listen for state changes to trigger autosave
    useEffect(() => {
        const currentState = { title, content, items, isChecklist };
        const prevState = prevStateRef.current;

        const hasChanged =
            prevState.title !== title ||
            prevState.content !== content ||
            prevState.isChecklist !== isChecklist ||
            JSON.stringify(prevState.items) !== JSON.stringify(items);

        if (hasChanged) {
            if (isUndoingRef.current) {
                isUndoingRef.current = false;
            } else {
                triggerAutosave(currentState);
            }
            prevStateRef.current = currentState;
        }
    }, [title, content, items, isChecklist]);

    // Save on close
    const handleClose = async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }
        // Save whatever we have
        await performSave({ title, content, items, isChecklist });
        if (noteIdRef.current) {
            onCreated();
        }
        onClose();
    };

    return (
        <div className="modal-overlay">
            <div className="note-form" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="note-form-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3><span>·</span> New Note</h3>
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
                    placeholder="Untitled"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                />

                {/* Checklist toggle */}
                <label className="checklist-toggle">
                    <input
                        type="checkbox"
                        checked={isChecklist}
                        onChange={e => setIsChecklist(e.target.checked)}
                    />
                    <span>Checklist mode</span>
                </label>

                {/* Body */}
                {isChecklist ? (
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

export default CreateNoteModal;