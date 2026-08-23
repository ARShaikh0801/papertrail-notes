import React, { useRef, useEffect } from 'react';
import '../styles/ChecklistBuilder.css';

const UncheckedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 25 23">
        <path d="m2.5.5h10c1.1045695 0 2 .8954305 2 2v10c0 1.1045695-.8954305 2-2 2h-10c-1.1045695 0-2-.8954305-2-2v-10c0-1.1045695.8954305-2 2-2z"
            fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" transform="translate(2 9)" />
    </svg>
);

const CheckedIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" width="20px" height="20px" viewBox="3 0 35 22">
        <defs><style>{`.cls-1{fill:none}`}</style></defs>
        <path d="M26,4H6A2,2,0,0,0,4,6V26a2,2,0,0,0,2,2H26a2,2,0,0,0,2-2V6A2,2,0,0,0,26,4ZM14,21.5,9,16.5427,10.5908,15,14,18.3456,21.4087,11l1.5918,1.5772Z" />
        <path className="cls-1" d="M14,21.5,9,16.5427,10.5908,15,14,18.3456,21.4087,11l1.5918,1.5772Z" />
        <rect className="cls-1" width="20px" height="20" />
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
        if (focusIndexRef.current !== null) {
            const el = inputRefs.current[focusIndexRef.current];
            if (el) {
                el.focus();
            }
            focusIndexRef.current = null;
        }
    }, [items]);

    const handleKeyDown = (i, e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            onAddAtIndex(i + 1, '');
            focusIndexRef.current = i + 1;
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
                            <input
                                ref={el => { inputRefs.current[i] = el; }}
                                type="text"
                                className="checklist-inline-input"
                                placeholder="List item"
                                value={item.text}
                                onChange={(e) => onTextChange(i, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(i, e)}
                                style={{
                                    textDecoration: item.checked ? 'line-through' : 'none',
                                    opacity: item.checked ? 0.6 : 1
                                }}
                            />
                            <button 
                                className="remove-item-btn" 
                                onClick={(e) => { e.stopPropagation(); onRemove(i); }}
                                tabIndex="-1"
                            >
                                &times;
                            </button>
                        </li>
                        <hr className="item-seperator" />
                    </React.Fragment>
                ))}
                <div 
                    className="add-item-row" 
                    onClick={() => { 
                        onAddAtIndex(items.length, ''); 
                        focusIndexRef.current = items.length; 
                    }}
                >
                    <span className="add-item-icon">+</span>
                    <span style={{ fontSize: '0.9rem' }}>Add item</span>
                </div>
                <div ref={bottomRef} />
            </ul>
        </div>
    );
}

export default ChecklistBuilder;