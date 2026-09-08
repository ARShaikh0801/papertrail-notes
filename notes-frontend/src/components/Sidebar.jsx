import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../styles/Sidebar.css';
import ThemeToggle from './ThemeToggle';
import Spinner from './Spinner';

/**
 * Sidebar Component
 * 
 * Renders left navigation drawer for desktop and mobile screens.
 */
function Sidebar({
    isOpen,
    onClose,
    viewMode,
    onViewModeChange,
    notesCount = 0,
    trashCount = 0,
    pinnedCount = 0,
    username = 'Guest',
    isGuest = true,
    isOnline = true,
    onLogout,
    logOutLoading = false
}) {
    // Close sidebar on pressing Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSelectView = (mode) => {
        onViewModeChange(mode);
        // Auto close drawer on mobile screens when a view is selected
        if (window.innerWidth < 992) {
            onClose();
        }
    };

    return (
        <>
            {/* Backdrop overlay for mobile drawer */}
            <div 
                className={`sidebar-overlay ${isOpen ? 'show' : ''}`} 
                onClick={onClose} 
                aria-hidden="true"
            />

            <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
                
                {/* Sidebar Header */}
                <div className="sidebar-header">
                    <h2 className="sidebar-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none">
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
                    <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu" title="Close menu">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Navigation Sections */}
                <div className="sidebar-content">

                    <div className="sidebar-section-title">Views</div>
                    
                    <nav className="sidebar-nav">
                        <button
                            className={`sidebar-nav-item ${viewMode === 'all' ? 'active' : ''}`}
                            onClick={() => handleSelectView('all')}
                        >
                            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                            </svg>
                            <span className="nav-label">All Notes</span>
                            <span className="sidebar-badge">{notesCount}</span>
                        </button>

                        <button
                            className={`sidebar-nav-item ${viewMode === 'pinned' ? 'active' : ''}`}
                            onClick={() => handleSelectView('pinned')}
                        >
                            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="17" x2="12" y2="22"></line>
                                <path d="M5 17h14l-1.5-7H6.5L5 17z"></path>
                                <path d="M9 10V4a3 3 0 0 1 6 0v6"></path>
                            </svg>
                            <span className="nav-label">Pinned Notes</span>
                            {pinnedCount > 0 && <span className="sidebar-badge badge-pinned">{pinnedCount}</span>}
                        </button>

                        <button
                            className={`sidebar-nav-item ${viewMode === 'trash' ? 'active' : ''}`}
                            onClick={() => handleSelectView('trash')}
                        >
                            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span className="nav-label">Trash</span>
                            {trashCount > 0 && <span className="sidebar-badge badge-trash">{trashCount}</span>}
                        </button>
                    </nav>

                    <div className="sidebar-section-title">Coming Soon</div>
                    <div className="sidebar-nav disabled-nav">
                        <div className="sidebar-nav-item disabled">
                            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            <span className="nav-label">Events</span>
                        </div>
                    </div>

                </div>

                {/* Sidebar Footer */}
                <div className="sidebar-footer">
                    <div className="sidebar-footer-row">
                        <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
                        <span className="status-label">{isOnline ? 'Online' : 'Offline'}</span>
                        <ThemeToggle />
                    </div>

                    <div className="sidebar-user-row">
                        {isGuest ? (
                            <div className="guest-actions">
                                <span className="user-name">Guest Mode</span>
                                <div className="guest-btn-group">
                                    <Link to="/login" className="sidebar-link-btn">Log In</Link>
                                    <Link to="/register" className="sidebar-link-btn primary">Sign Up</Link>
                                </div>
                            </div>
                        ) : (
                            <div className="logged-user-actions">
                                <span className="user-name">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="user-avatar-icon">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    {username}
                                </span>
                                <button className="sidebar-logout-btn" onClick={onLogout} disabled={logOutLoading}>
                                    {logOutLoading ? <Spinner /> : 'Logout'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </aside>
        </>
    );
}

export default Sidebar;
