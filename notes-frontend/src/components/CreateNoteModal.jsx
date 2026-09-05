import React, { useState, useRef, useEffect } from 'react';
import ChecklistBuilder from './ChecklistBuilder';
import Spinner from './Spinner.jsx';
import '../styles/Create&EditNoteModal.css';
import FormattingToolbar from './FormattingToolbar';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Underline } from '@tiptap/extension-underline';
import { FontSize } from './FontSizeExtension';
import DOMPurify from 'dompurify';

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
    
    const editor = useEditor({
        extensions: [
            StarterKit,
            TextStyle,
            Color,
            Underline,
            FontSize,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor-content',
                placeholder: 'Write something…',
            },
        },
    });

    useEffect(() => {
        if (editor && editor.getHTML() !== content) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);

    // Lock body scroll & adapt to mobile visualViewport (e.g. software keyboard)
    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        const originalHtmlOverflow = document.documentElement.style.overflow;
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';

        const handleViewportChange = () => {
            if (window.visualViewport) {
                document.documentElement.style.setProperty('--vv-height', `${window.visualViewport.height}px`);
            }
        };

        handleViewportChange();

        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleViewportChange);
            window.visualViewport.addEventListener('scroll', handleViewportChange);
        }

        return () => {
            document.body.style.overflow = originalOverflow;
            document.documentElement.style.overflow = originalHtmlOverflow;
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleViewportChange);
                window.visualViewport.removeEventListener('scroll', handleViewportChange);
            }
            document.documentElement.style.removeProperty('--vv-height');
        };
    }, []);

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
                if (!stateToSave.title.trim() && !stateToSave.content.trim() && stateToSave.items.length === 0) {
                    return;
                }
                const res = await apiPost({
                    title: stateToSave.title.trim() ? stateToSave.title : "Untitled",
                    content: stateToSave.isChecklist ? '' : DOMPurify.sanitize(stateToSave.content),
                    is_checklist: stateToSave.isChecklist,
                    items: stateToSave.isChecklist ? stateToSave.items : [],
                });
                noteIdRef.current = res.data.id;
            } else {
                await apiPatch(noteIdRef.current, {
                    title: stateToSave.title.trim() ? stateToSave.title : "Untitled",
                    content: stateToSave.isChecklist ? '' : DOMPurify.sanitize(stateToSave.content),
                    is_checklist: stateToSave.isChecklist,
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
                    <div className="note-form-header-left">
                        <h3><span>·</span> New Note</h3>
                        <span className="save-status-text">
                            {saveStatus}
                        </span>
                    </div>
                    <div className="note-form-header-right">
                        {history.length > 0 && (
                            <button 
                                onClick={handleUndo}
                                className="undo-btn"
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
                    <div className="markdown-editor-container">
                        <EditorContent editor={editor} className="tiptap-wrapper" />
                        <FormattingToolbar editor={editor} />
                    </div>
                )}
            </div>
        </div>
    );
}

export default CreateNoteModal;