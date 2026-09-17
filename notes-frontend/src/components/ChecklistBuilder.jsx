import React, { useRef, useEffect } from 'react';
import '../styles/ChecklistBuilder.css';

const UncheckedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
    </svg>
);

const CheckedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
);

/**
 * ChecklistBuilder
 *
 * Props:
 *  items        — [{ text, checked }]
 *  onAddAtIndex — (index, text) => void
 *  onRemove     — (index) => void
 *  onToggle     — (index) => void
 *  onTextChange — (index, text) => void
 *  bottomRef    — ref for auto-scroll anchor
 */
function ChecklistBuilder({ items, onAddAtIndex, onRemove, onToggle, onTextChange, bottomRef }) {
    const listRef = useRef(null);
    const inputRefs = useRef([]);
    const focusIndexRef = useRef(null);

    useEffect(() => {
        inputRefs.current.forEach(el => {
            if (el) {
                el.style.height = '28px';
                if (el.scrollHeight > 28) {
                    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
                }
            }
        });

        if (focusIndexRef.current !== null) {
            const el = inputRefs.current[focusIndexRef.current];
            if (el) {
                el.focus();
            }
            focusIndexRef.current = null;
        }
    }, [items]);

    const handleInput = (e) => {
        e.target.style.height = '28px';
        if (e.target.scrollHeight > 28) {
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
        }
    };

    const handleKeyDown = (i, e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            if (items.length < 100) {
                onAddAtIndex(i + 1, '');
                focusIndexRef.current = i + 1;
            }
        } else if (e.key === 'Backspace' && items[i].text === '') {
            e.preventDefault();
            e.stopPropagation();
            if (items.length > 1) {
                onRemove(i);
                focusIndexRef.current = i - 1 >= 0 ? i - 1 : 0;
            }
        }
    };

    return (
        <div className="checklist-builder">
            <ul className="items-preview" ref={listRef}>
                {items.map((item, i) => (
                    <React.Fragment key={i}>
                        <li className={item.checked ? 'checked-item' : ''}>
                            <span 
                                className={`check-dot ${onToggle ? 'clickable' : ''}`}
                                onClick={() => onToggle?.(i)}
                            >
                                {item.checked ? <CheckedIcon /> : <UncheckedIcon />}
                            </span>
                            <textarea
                                ref={el => { inputRefs.current[i] = el; }}
                                className="checklist-inline-input"
                                placeholder="List item"
                                value={item.text}
                                maxLength={500}
                                rows={1}
                                onChange={(e) => {
                                    onTextChange(i, e.target.value);
                                    handleInput(e);
                                }}
                                onInput={handleInput}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                style={{
                                    textDecoration: item.checked ? 'line-through' : 'none',
                                    opacity: item.checked ? 0.6 : 1
                                }}
                            />
                            <button 
                                type="button"
                                className="remove-item-btn" 
                                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                                tabIndex="-1"
                                title="Remove item"
                            >
                                &times;
                            </button>
                        </li>
                        <hr className="item-seperator" />
                    </React.Fragment>
                ))}
                <div 
                    className={`add-item-row ${items.length >= 100 ? 'disabled' : ''}`} 
                    onClick={() => { 
                        if (items.length < 100) {
                            onAddAtIndex(items.length, ''); 
                            focusIndexRef.current = items.length; 
                        }
                    }}
                >
                    <span className="add-item-icon">{items.length >= 100 ? '•' : '+'}</span>
                    <span style={{ fontSize: '0.9rem' }}>
                        {items.length >= 100 ? 'Maximum 100 items reached' : 'Add item'}
                    </span>
                </div>
                <div ref={bottomRef} />
            </ul>
        </div>
    );
}

export default ChecklistBuilder;