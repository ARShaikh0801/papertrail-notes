import { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/Footer.css';

function Footer() {
    const [stats, setStats] = useState({ visitors: null, users: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        
        // Initialize from cache if available
        const cached = localStorage.getItem('cached_stats');
        if (cached) {
            try {
                setStats(JSON.parse(cached));
                setLoading(false);
            } catch (e) {
                console.error('Error parsing cached stats', e);
            }
        }

        const hasVisited = sessionStorage.getItem('visited');
        let url = '/stats/';
        if (!hasVisited) {
            sessionStorage.setItem('visited', 'true');
            url += '?inc=true';
        }

        api.get(url)
            .then(res => {
                if (isMounted) {
                    setStats(res.data);
                    localStorage.setItem('cached_stats', JSON.stringify(res.data));
                    setLoading(false);
                }
            })
            .catch(err => {
                console.error("Error fetching stats:", err);
                if (isMounted) {
                    setLoading(false);
                }
            });
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <footer className="app-footer">
            <div className="footer-content">
                {/* Brand & Repo */}
                <div className="footer-brand">
                    <span className="footer-logo">
                        Paper<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="footer-pen-icon">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>trail
                    </span>
                    <p className="footer-description">A beautiful space for your thoughts, logs, and checklists.</p>
                </div>

                {/* Quick Link to Repo */}
                <div className="footer-links">
                    <a 
                        href="https://github.com/ARShaikh0801/papertrail-notes" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="github-link"
                    >
                        <svg className="github-icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        <span>GitHub Repository</span>
                    </a>
                </div>

                {/* Stats */}
                <div className="footer-stats">
                    <div className="stat-card">
                        <span className="stat-value">{loading ? '…' : stats.visitors ?? '0'}</span>
                        <span className="stat-label">Visits</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{loading ? '…' : stats.users ?? '0'}</span>
                        <span className="stat-label">Registered Users</span>
                    </div>
                </div>
            </div>
            <div className="footer-bottom">
                &copy; {new Date().getFullYear()} Papertrail. Made with ❤️ for structured writing.
            </div>
        </footer>
    );
}

export default Footer;
