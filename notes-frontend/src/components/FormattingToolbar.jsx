import React, { useState, useEffect } from 'react';
import '../styles/FormattingToolbar.css';

const BoldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
  </svg>
);

const ItalicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="4" x2="10" y2="4"></line>
    <line x1="14" y1="20" x2="5" y2="20"></line>
    <line x1="15" y1="4" x2="9" y2="20"></line>
  </svg>
);

const UnderlineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
    <line x1="4" y1="21" x2="20" y2="21"></line>
  </svg>
);

const HeadingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 12h8"></path>
    <path d="M4 18V6"></path>
    <path d="M12 18V6"></path>
    <path d="M21 18v-8l-2 2"></path>
  </svg>
);

const ColorIcon = ({ color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M5 17L12 3L19 17" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7.5 13H16.5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    <line x1="4" y1="21" x2="20" y2="21" stroke={color || 'var(--amber)'} strokeWidth="3" strokeLinecap="round" />
  </svg>
);

function FormattingToolbar({ editor }) {
    const [, setTick] = useState(0);

    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            setTick(t => t + 1);
        };

        editor.on('transaction', handleUpdate);
        editor.on('selectionUpdate', handleUpdate);

        return () => {
            editor.off('transaction', handleUpdate);
            editor.off('selectionUpdate', handleUpdate);
        };
    }, [editor]);

    if (!editor) {
        return null;
    }

    return (
        <div className="formatting-toolbar">
            <button 
                type="button" 
                onClick={() => editor.chain().focus().toggleBold().run()} 
                className={editor.isActive('bold') ? 'is-active' : ''}
                title="Bold"
            >
                <BoldIcon />
            </button>
            <button 
                type="button" 
                onClick={() => editor.chain().focus().toggleItalic().run()} 
                className={editor.isActive('italic') ? 'is-active' : ''}
                title="Italic"
            >
                <ItalicIcon />
            </button>
            <button 
                type="button" 
                onClick={() => editor.chain().focus().toggleUnderline().run()} 
                className={editor.isActive('underline') ? 'is-active' : ''}
                title="Underline"
            >
                <UnderlineIcon />
            </button>
            <div className="toolbar-separator"></div>
            <button 
                type="button" 
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} 
                className={editor.isActive('heading', { level: 3 }) ? 'is-active' : ''}
                title="Heading 3"
            >
                <HeadingIcon />
            </button>
            <div className="toolbar-separator"></div>
            
            <div className="color-picker-wrapper" title="Text Color">
                <ColorIcon color={editor.getAttributes('textStyle').color} />
                <input 
                    type="color" 
                    id="textColor" 
                    onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                    value={editor.getAttributes('textStyle').color || '#000000'}
                />
            </div>
            
            <select 
                className="font-size-selector" 
                onChange={(e) => {
                    if (e.target.value) {
                        editor.chain().focus().setFontSize(e.target.value).run();
                    }
                }}
                value={editor.getAttributes('textStyle').fontSize || ''}
                title="Font Size"
            >
                <option value="" disabled>Size</option>
                <option value="0.8rem">Small</option>
                <option value="1rem">Normal</option>
                <option value="1.25rem">Large</option>
                <option value="1.5rem">Huge</option>
            </select>
        </div>
    );
}

export default FormattingToolbar;
