import React, { useState, useEffect, useRef } from "react";
import ChecklistBuilder from "./ChecklistBuilder";
import '../styles/QuickCreateForm.css'
import Spinner from './Spinner.jsx'

function QuickCreateForm({ onCreated, apiPost }) {

    const [shouldShow, setShouldShow] = useState(false);

    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isChecklist, setIsChecklist] = useState(false);
    const [items, setItems] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    const textareaRef = useRef(null);
    const checklistInputRef = useRef(null);
    
    const setVisibility = () => {
        if((!isChecklist && content.trim() !== '') || (isChecklist && items.length > 0 && items.some(item => item.text.trim() !== ''))){
            setShouldShow(true);
        }
        else{
            setShouldShow(false);
        }
    }

    useEffect(setVisibility,[items,content]);

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
                    textareaRef.current?.focus();
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            window.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [isChecklist, isMobile]);

    


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
    const removeItem = (i) => setItems(prev => {
        const remaining = prev.filter((_, idx) => idx !== i);
        return remaining.length > 0 ? remaining : [{ text: '', checked: false }];
    });

    const toggleItem = (i) => setItems(prev =>
        prev.map((item, idx) => idx === i ? { ...item, checked: !item.checked } : item)
    );


    const handleCreate = async () => {
        if (!isChecklist && !content.trim()) { setError('Content is required'); return; }
        if (isChecklist && items.length === 0) { setError('Add at least one item'); return; }

        setLoading(true);
        setError('');
        try {
            await apiPost({
                title: title.trim() ? title : "Untitled",
                content: isChecklist ? '' : content,
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
            setItems([]);
            setIsChecklist(false);
            setShouldShow(false);
        }
    };



    return (<>
        <div className="quick-form-container" onKeyDown={e => { if (e.key === 'Enter') e.stopPropagation(); }}>

            <div className={`needed-focus ${shouldShow ? '' : 'hidden-quick-field'}`}>
                {error && <p className="error-line">{error}</p>}

                <input
                    type="text"
                    placeholder="Untitled"
                    value={title}
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
                <textarea
                    ref={textareaRef}
                    placeholder={isMobile ? "Take a Note…" : "Take a Note… (Press '/' to focus)"}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    rows={2}
                    autoFocus
                />
            )}

            <div className={`needed-focus ${shouldShow ? '' : 'hidden-quick-field'}`} >
                <button
                    className="submit-btn"
                    onClick={handleCreate}
                    disabled={loading}
                >
                    {loading ? <><Spinner/>&nbsp;Writing…</> : 'Add Note'}
                </button>
            </div>


        </div>
    </>);
}

export default QuickCreateForm;