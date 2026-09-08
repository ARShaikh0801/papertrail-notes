import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../styles/NotesNav.css'
import Spinner from './Spinner.jsx'
import ThemeToggle from './ThemeToggle.jsx'

/**
 * NotesNav
 *
 * Props:
 *  username      - string
 *  searchQuery   - string
 *  onSearch      - (e) => void
 *  onClear       - () => void
 *  onLogout      - () => void
 */
function NotesNav({ username, searchQuery, onSearch, onClear, onLogout, logOutLoading, isOnline, viewMode = 'all', onToggleSidebar }) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <nav className="notes-nav">

            {/* Brand + Menu Toggle */}
            <div className="nav-brand-group">
                <button 
                    className="menu-toggle-btn" 
                    onClick={onToggleSidebar}
                    aria-label="Toggle Navigation Menu"
                    title="Toggle Menu"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>

                <h2 className="nav-title">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20px" height="20px" viewBox="0 0 24 24" fill="none">
                        <path d="M8 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M16 2V5" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                        <path opacity="0.4" d="M8 11H16" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                        <path opacity="0.4" d="M8 16H12" stroke="currentColor" strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Paper<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="logo-pen-icon">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>trail
                </h2>
            </div>

            {/* Search */}
            <div className="search-area">
                <div className="search-input-wrap">
                    <input
                        type="text"
                        className="search-bar"
                        placeholder={viewMode === 'trash' ? "Find in Trash..." : "Find Note..."}
                        value={searchQuery}
                        onChange={onSearch}
                    />
                    <button className="clear-search" onClick={onClear}>&times;</button>
                </div>
            </div>

            {/* Theme + Logout Dropdown */}
            <div className="nav-actions">
                <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} title={isOnline ? 'Online' : 'Offline'}></span>
                <ThemeToggle />
                {username === 'Guest' ? (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <Link to="/login" className="dropdown-trigger" style={{ textDecoration: 'none' }}>Log In</Link>
                        <Link to="/register" className="dropdown-trigger" style={{ textDecoration: 'none', background: 'var(--rust)', color: 'var(--warm-white)' }}>Sign Up</Link>
                    </div>
                ) : (
                    <div className="user-dropdown-container" ref={dropdownRef}>
                        <button 
                            className="dropdown-trigger" 
                            onClick={() => setDropdownOpen(!dropdownOpen)}
                            aria-expanded={dropdownOpen}
                        >
                            <span>Welcome, {username}</span>
                            <svg className={`chevron-icon ${dropdownOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </button>
                        {dropdownOpen && (
                            <div className="dropdown-menu">
                                <button className="dropdown-item logout-btn" onClick={onLogout} disabled={logOutLoading}>
                                    {logOutLoading ? <><Spinner />&nbsp;Logging Out…</> : 'Logout'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

        </nav>
    );
}

export default NotesNav;