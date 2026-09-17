import React, { useState, useEffect, useRef } from "react";
import ChecklistBuilder from "./ChecklistBuilder";
import '../styles/QuickCreateForm.css';
import Spinner from './Spinner.jsx';
import FormattingToolbar from './FormattingToolbar';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Underline } from '@tiptap/extension-underline';
import { FontSize } from './FontSizeExtension';
import DOMPurify from 'dompurify';

function QuickCreateForm({ onCreated, apiPost }) {

    const [shouldShow, setShouldShow] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isChecklist, setIsChecklist] = useState(false);
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    const checklistInputRef = useRef(null);

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
                placeholder: isMobile ? "Take a Note…" : "Take a Note… (Press '/' to focus)",
            },
        },
    });

    useEffect(() => {
        if (editor && editor.getHTML() !== content) {
            editor.commands.setContent(content, false);
        }
    }, [content, editor]);
    
    const formRef = useRef(null);

    // Expand form fields immediately on focus so layout height is established before scrolling
    const handleFocus = () => {
        setShouldShow(true);

        if (isMobile || window.innerWidth <= 768) {
            setTimeout(() => {
                formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    };

    // Keep form expanded if title, content, or checklist items are non-empty
    useEffect(() => {
        const hasTextContent = editor ? !editor.isEmpty : content.trim() !== '';
        const hasTitle = title.trim() !== '';
        const hasChecklistItems = isChecklist && items.length > 0 && items.some(item => item.text.trim() !== '');

        if (hasTextContent || hasTitle || hasChecklistItems) {
            setShouldShow(true);
        }
    }, [title, content, items, isChecklist, editor]);

    // Collapse form back to single line when clicking outside if all fields are empty
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (formRef.current && !formRef.current.contains(e.target)) {
                const hasTextContent = editor ? !editor.isEmpty : content.trim() !== '';
                const hasTitle = title.trim() !== '';
                const hasChecklistItems = isChecklist && items.length > 0 && items.some(item => item.text.trim() !== '');

                if (!hasTextContent && !hasTitle && !hasChecklistItems) {
                    setShouldShow(false);
                }
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        document.addEventListener('touchstart', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
            document.removeEventListener('touchstart', handleOutsideClick);
        };
    }, [title, content, items, isChecklist, editor]);

    useEffect(() => {
        const checkMobile = () => {
            const mobileCheck = window.matchMedia("(max-width: 768px)").matches || 
                                /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            setIsMobile(mobileCheck);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isChecklist && items.length === 0) {
            setItems([{ text: '', checked: false }]);
        }
    }, [isChecklist]);

    useEffect(() => {
        if (isMobile) return;

        const handleGlobalKeyDown = (e) => {
            const active = document.activeElement;
            const isTyping = active && (
                active.tagName === 'INPUT' ||
                active.tagName === 'TEXTAREA' ||
                active.isContentEditable
            );

            if (e.key === '/' && !isTyping) {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (isChecklist) {
                    checklistInputRef.current?.focus();
                } else {
                    editor?.commands.focus();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [isChecklist, isMobile, editor]);

    const addItemAtIndex = (index, text) => {
        setItems(prev => {
            if (prev.length >= 100) return prev;
            const newItems = [...prev];
            newItems.splice(index, 0, { text, checked: false });
            return newItems;
        });
    };

    const contentCount = editor ? editor.getText().length : (content ? content.length : 0);
    const setItemText = (index, text) => {
        setItems(prev => prev.map((item, idx) => idx === index ? { ...item, text } : item));
    };
    const removeItem = (i) => setItems(prev => {
        const remaining = prev.filter((_, idx) => idx !== i);
        return remaining.length > 0 ? remaining : [{ text: '', checked: false }];
    });

    const toggleItem = (i) => setItems(prev =>
        prev.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item)
    );

    const handleCreate = async () => {
        const hasContent = isChecklist ? items.length > 0 : (editor && !editor.isEmpty);
        if (!isChecklist && !hasContent) { setError('Content is required'); return; }
        if (isChecklist && items.length === 0) { setError('Add at least one item'); return; }

        setLoading(true);
        setError('');
        try {
            await apiPost({
                title: title.trim() ? title : "Untitled",
                content: isChecklist ? '' : DOMPurify.sanitize(content),
                is_checklist: isChecklist,
                items: isChecklist ? items : [],
            });
            onCreated();
        } catch (err) {
            setError('Failed to create note');
        } finally {
            setLoading(false);
            setTitle('');
            setContent('');
            if (editor) editor.commands.setContent('', false);
            setItems([]);
            setIsChecklist(false);
            setShouldShow(false);
        }
    };

    return (
        <div 
            ref={formRef} 
            className="quick-form-container" 
            onFocus={handleFocus}
            onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}
        >

            <div className={`needed-focus ${shouldShow ? '' : 'hidden-quick-field'}`}>
                {error && <p className="error-line">{error}</p>}

                <input
                    type="text"
                    placeholder="Untitled"
                    value={title}
                    maxLength={200}
                    onChange={e => setTitle(e.target.value)}
                    autoFocus
                />
            </div>

            <label className="checklist-toggle">
                <input
                    type="checkbox"
                    checked={isChecklist}
                    onChange={e => setIsChecklist(e.target.checked)}
                />
                <span>Checklist mode</span>
            </label>

            {isChecklist ? (
                <div className="quick-form-scrollable-body">
                    <ChecklistBuilder
                        items={items}
                        onAddAtIndex={addItemAtIndex}
                        onRemove={removeItem}
                        onToggle={toggleItem}
                        onTextChange={setItemText}
                        bottomRef={null}
                        inputRef={checklistInputRef}
                    />
                </div>
            ) : (
                <div className="quick-form-editor-container">
                    <EditorContent editor={editor} className="quick-form-tiptap-wrapper" />
                    <FormattingToolbar editor={editor} />
                </div>
            )}

            <div className={`needed-focus ${shouldShow ? '' : 'hidden-quick-field'}`} >
                <div className="quick-form-footer-row">
                    <div className="quick-form-limits-bar">
                        <span className={`limit-tag ${title.length > 180 ? 'limit-warning' : ''}`} title="Title character limit (200 max)">
                            Title: {title.length}/200
                        </span>
                        {isChecklist ? (
                            <span className={`limit-tag ${items.length >= 90 ? 'limit-warning' : ''}`} title="Checklist items limit (100 max)">
                                {items.length} / 100 items
                            </span>
                        ) : (
                            <span className={`limit-tag ${contentCount > 45000 ? 'limit-warning' : ''}`} title="Content character limit (50,000 max)">
                                Content: {contentCount} / 50000
                            </span>
                        )}
                    </div>
                    <button
                        className="submit-btn"
                        onClick={handleCreate}
                        disabled={loading}
                    >
                        {loading ? <><Spinner/>&nbsp;Writing…</> : 'Add Note'}
                    </button>
                </div>
            </div>

        </div>
    );
}

export default QuickCreateForm;