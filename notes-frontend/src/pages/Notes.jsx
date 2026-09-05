import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import {
    getCachedNotes,
    saveCachedNotes,
    addToOfflineQueue,
    syncOfflineQueue,
    getOfflineQueue
} from "../utils/offlineSync";

import NotesNav from "../components/NotesNav";
import QuickCreateForm from "../components/QuickCreateForm";
import NoteCard from "../components/NoteCard";
import CreateNoteModal from "../components/CreateNoteModal";
import EditNoteModal from "../components/EditNoteModal";
import LoginLoader from "../components/LoginLoader";
import PasswordModal from "../components/PasswordModal";

import "./notes.css";

const pageMessages = [
    "Opening your notebook…",
    "Gathering your thoughts…",
    "Dusting off the pages…",
    "Sorting the pinned ones first…",
    "Here are your thoughts…",
    "Almost ready…",
];

const sortNotes = (notesList) => {
    return [...notesList].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
};

function Notes() {
    const [pageLoading, setPageLoading] = useState(true);
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'Guest';
    const isGuest = !localStorage.getItem('token');
    const bottomRef = useRef(null);

    const [notes, setNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editNote, setEditNote] = useState(null);   // null = closed
    const [pinLoading, setPinLoading]           = useState(null);
    const [delLoading, setDelLoading]           = useState(null);
    const [logOutLoading,setLogOutLoading] = useState(false);
    const [showScrollTop, setShowScrollTop]     = useState(false);

    // Toast state and helper
    const [toasts, setToasts] = useState([]);
    const showToast = (message, type = 'warning') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            const queue = getOfflineQueue();
            if (queue && queue.length > 0) {
                showToast("You are back online. Syncing changes...", "success");
            }
            try {
                const result = await syncOfflineQueue(api);
                if (result && result.count > 0) {
                    showToast(`Synced ${result.count} offline changes!`, "success");
                }
                fetchNotes();
            } catch (err) {
                showToast("Failed to sync some offline changes.", "warning");
                console.error(err);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            showToast("Connection lost. Working offline.", "warning");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check if there are pending sync actions on initial mount
        if (navigator.onLine) {
            handleOnline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Password Modal state
    const [passwordModal, setPasswordModal] = useState({ 
        isOpen: false, 
        note: null, 
        action: null, 
        error: '', 
        loading: false 
    });

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowScrollTop(true);
            } else {
                setShowScrollTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── Scroll to bottom when notes list updates ───────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [notes]);

    

    // ── Initial fetch ──────────────────────────────────
    useEffect(() => { fetchNotes(); }, []);

    const fetchNotes = async () => {
        if (isGuest) {
            try {
                const localNotes = localStorage.getItem('guest_notes');
                const parsed = localNotes ? JSON.parse(localNotes) : [];
                setNotes(sortNotes(parsed));
            } catch (err) {
                console.error(err);
                setNotes([]);
            } finally {
                setPageLoading(false);
            }
            return;
        }

        if (!navigator.onLine) {
            const cached = getCachedNotes();
            setNotes(sortNotes(cached));
            setPageLoading(false);
            return;
        }

        try {
            const { data } = await api.get('/notes/');
            setNotes(data);
            saveCachedNotes(data);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login');
            } else {
                const cached = getCachedNotes();
                setNotes(sortNotes(cached));
            }
        } finally{
            setPageLoading(false);
        }
    };

    if (pageLoading) {
        return <LoginLoader messages={pageMessages} />;
    }

    // ── Pin / Delete ───────────────────────────────────
    const handlePin = async (e, note) => {
        e.stopPropagation();
        setPinLoading(note.id);
        if (isGuest) {
            const updated = notes.map(n => n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n);
            setNotes(sortNotes(updated));
            localStorage.setItem('guest_notes', JSON.stringify(updated));
            setPinLoading(null);
            return;
        }

        if (!navigator.onLine) {
            const updated = notes.map(n => n.id === note.id ? { ...n, is_pinned: !n.is_pinned } : n);
            setNotes(sortNotes(updated));
            saveCachedNotes(updated);
            addToOfflineQueue('UPDATE', note.id, { is_pinned: !note.is_pinned });
            setPinLoading(null);
            showToast("Pin toggled offline. Will sync when online.", "success");
            return;
        }

        try {
            await api.patch(`/notes/${note.id}/`, { is_pinned: !note.is_pinned });
            fetchNotes();
        } catch (_) { }
        finally{
            setPinLoading(null);
        }
    };

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        setDelLoading(id);
        if (isGuest) {
            const updated = notes.filter(n => n.id !== id);
            setNotes(sortNotes(updated));
            localStorage.setItem('guest_notes', JSON.stringify(updated));
            setDelLoading(null);
            return;
        }

        if (!navigator.onLine) {
            const updated = notes.filter(n => n.id !== id);
            setNotes(sortNotes(updated));
            saveCachedNotes(updated);
            addToOfflineQueue('DELETE', id);
            setDelLoading(null);
            showToast("Note deleted offline. Will sync when online.", "success");
            return;
        }

        try {
            await api.delete(`/notes/${id}/`);
            fetchNotes();
        } catch (_) { }
        finally{
            setDelLoading(null);
        }
    };

    const handleLockToggle = (e, note) => {
        e.stopPropagation();
        if (isGuest) {
            showToast("You need to login to lock notes.", "warning");
            return;
        }

        if (note.is_locked) {
            setPasswordModal({
                isOpen: true,
                note,
                action: 'remove-lock',
                error: '',
                loading: false
            });
        } else {
            setPasswordModal({
                isOpen: true,
                note,
                action: 'lock',
                error: '',
                loading: false
            });
        }
    };

    const handleEditClick = (note) => {
        if (note.is_locked) {
            setPasswordModal({
                isOpen: true,
                note,
                action: 'unlock',
                error: '',
                loading: false
            });
        } else {
            setEditNote(note);
        }
    };

    const handlePasswordSubmit = async (password) => {
        setPasswordModal(prev => ({ ...prev, loading: true, error: '' }));
        const { note, action } = passwordModal;
        try {
            if (action === 'lock') {
                await api.post(`/notes/${note.id}/lock/`, { password });
                fetchNotes();
                setPasswordModal({ isOpen: false, note: null, action: null, error: '', loading: false });
                showToast("Note locked successfully!", "success");
            } else if (action === 'remove-lock') {
                await api.post(`/notes/${note.id}/remove-lock/`, { password });
                fetchNotes();
                setPasswordModal({ isOpen: false, note: null, action: null, error: '', loading: false });
                showToast("Note unlocked permanently!", "success");
            } else if (action === 'unlock') {
                const { data } = await api.post(`/notes/${note.id}/unlock/`, { password });
                setEditNote(data);
                setPasswordModal({ isOpen: false, note: null, action: null, error: '', loading: false });
            }
        } catch (err) {
            setPasswordModal(prev => ({ 
                ...prev, 
                loading: false, 
                error: err.response?.data?.error || "Incorrect password" 
            }));
        }
    };

    // ── Logout ─────────────────────────────────────────
    const handleLogout = () => {
        setLogOutLoading(true)
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setLogOutLoading(false)
        navigate('/');
    };

    // ── Search ─────────────────────────────────────────
    const handleSearch = (e) => setSearchQuery(e.target.value);
    const handleClear = () => setSearchQuery('');

    const filteredNotes = notes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (note.items && note.items.some(item =>
            item.text.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );

    // ── API helpers passed to modals ───────────────────
    const apiPost = (payload) => {
        if (isGuest) {
            const newNote = {
                id: 'guest-' + Date.now() + Math.floor(Math.random() * 1000),
                ...payload,
                is_pinned: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            setNotes(prev => {
                const filtered = prev.filter(n => n.id !== newNote.id);
                const updated = sortNotes([newNote, ...filtered]);
                localStorage.setItem('guest_notes', JSON.stringify(updated));
                return updated;
            });
            return Promise.resolve({ data: newNote });
        }

        if (!navigator.onLine) {
            const tempId = 'temp-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
            const newNote = {
                id: tempId,
                ...payload,
                is_pinned: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            const updated = [newNote, ...notes];
            setNotes(sortNotes(updated));
            saveCachedNotes(updated);
            addToOfflineQueue('CREATE', tempId, payload, tempId);
            showToast("Note created offline. Will sync when online.", "success");
            return Promise.resolve({ data: newNote });
        }

        return api.post('/notes/', payload);
    };

    const apiPatch = (id, payload) => {
        if (isGuest) {
            let updatedNote = null;
            setNotes(prev => {
                const updated = prev.map(n => {
                    if (n.id === id) {
                        updatedNote = { ...n, ...payload, updated_at: new Date().toISOString() };
                        return updatedNote;
                    }
                    return n;
                });
                if (!updatedNote) {
                    try {
                        const local = JSON.parse(localStorage.getItem('guest_notes') || '[]');
                        const localUpdated = local.map(n => {
                            if (n.id === id) {
                                updatedNote = { ...n, ...payload, updated_at: new Date().toISOString() };
                                return updatedNote;
                            }
                            return n;
                        });
                        if (updatedNote) {
                            const sorted = sortNotes(localUpdated);
                            localStorage.setItem('guest_notes', JSON.stringify(sorted));
                            return sorted;
                        }
                    } catch (_) {}
                } else {
                    const sorted = sortNotes(updated);
                    localStorage.setItem('guest_notes', JSON.stringify(sorted));
                    return sorted;
                }
                return prev;
            });
            return Promise.resolve({ data: updatedNote });
        }

        if (!navigator.onLine) {
            const updated = notes.map(n => n.id === id ? { ...n, ...payload, updated_at: new Date().toISOString() } : n);
            setNotes(sortNotes(updated));
            saveCachedNotes(updated);
            addToOfflineQueue('UPDATE', id, payload);
            showToast("Note updated offline. Will sync when online.", "success");
            return Promise.resolve({ data: updated.find(n => n.id === id) });
        }

        return api.patch(`/notes/${id}/`, payload);
    };

    // ═══════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════
    return (
        <div className="notes-container">

            <NotesNav
                username={username}
                searchQuery={searchQuery}
                onSearch={handleSearch}
                onClear={handleClear}
                onLogout={handleLogout}
                logOutLoading={logOutLoading}
                isOnline={isOnline}
            />

            {isGuest && (
                <div className="guest-banner">
                    <span className="guest-banner-text">
                        ⚠️ You are using <strong>Guest Mode</strong>. Your notes are saved locally. 
                        <Link to="/register" className="banner-link">Sign Up</Link> or <Link to="/login" className="banner-link">Log In</Link> to sync them to the cloud.
                    </span>
                </div>
            )}

            <QuickCreateForm 
                    onCreated={fetchNotes}
                    apiPost={apiPost}
            />

            {/* Notes grid */}
            {filteredNotes.length === 0 ? (
                (searchQuery.trim() && notes.length !== 0) ? (
                    <p className="empty-state">
                        No notes match "<strong>{searchQuery}</strong>" - try a different word.
                    </p>
                ) : (
                    <p className="empty-state">
                        Your notebook is empty - press <strong>+</strong> to write your first thought.
                    </p>
                )
            ) : (
                <div className="notes-grid">
                    {filteredNotes.map((note, i) => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            index={i}
                            onEdit={handleEditClick}
                            onPin={handlePin}
                            pinLoading={pinLoading === note.id}
                            onDelete={handleDelete}
                            delLoading={delLoading === note.id}
                            onLockToggle={handleLockToggle}
                        />
                    ))}
                    
                </div>
            )}

            {/* Floating add button */}
            <button className="add-note-model-btn" onClick={() => setCreateOpen(true)}>+</button>

            {/* Scroll to Top button */}
            {showScrollTop && (
                <button className="scroll-to-top-btn" onClick={scrollToTop} aria-label="Scroll to top">
                    ↑
                </button>
            )}

            {/* Modals */}
            {createOpen && (
                <CreateNoteModal
                    onClose={() => setCreateOpen(false)}
                    onCreated={fetchNotes}
                    apiPost={apiPost}
                    apiPatch={apiPatch}
                />
            )}

            {editNote && (
                <EditNoteModal
                    note={editNote}
                    onClose={() => setEditNote(null)}
                    onSaved={fetchNotes}
                    apiPatch={apiPatch}
                />
            )}

            {passwordModal.isOpen && (
                <PasswordModal
                    title={
                        passwordModal.action === 'lock' ? "Lock Note" : 
                        passwordModal.action === 'remove-lock' ? "Permanently Unlock Note" : "Unlock & Read Note"
                    }
                    onSubmit={handlePasswordSubmit}
                    onClose={() => setPasswordModal({ isOpen: false, note: null, action: null, error: '', loading: false })}
                    error={passwordModal.error}
                    loading={passwordModal.loading}
                />
            )}

            <div className="toasts-container">
                {toasts.map(t => (
                    <div key={t.id} className={`toast-item toast-${t.type}`}>
                        {t.type === 'success' ? '✓ ' : '⚠️ '}
                        {t.message}
                    </div>
                ))}
            </div>

        </div>
    );
}

export default Notes;