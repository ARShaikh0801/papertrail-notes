import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import {
    getCachedNotes,
    saveCachedNotes,
    getCachedTrash,
    saveCachedTrash,
    addToOfflineQueue,
    syncOfflineQueue,
    getOfflineQueue
} from "../utils/offlineSync";

import NotesNav from "../components/NotesNav";
import Sidebar from "../components/Sidebar";
import QuickCreateForm from "../components/QuickCreateForm";
import NoteCard from "../components/NoteCard";
import CreateNoteModal from "../components/CreateNoteModal";
import EditNoteModal from "../components/EditNoteModal";
import LoginLoader from "../components/LoginLoader";
import PasswordModal from "../components/PasswordModal";
import ConfirmModal from "../components/ConfirmModal";

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

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState('all'); // 'all' | 'pinned' | 'trash'
    const [notes, setNotes] = useState([]);
    const [trashNotes, setTrashNotes] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editNote, setEditNote] = useState(null);   // null = closed
    const [pinLoading, setPinLoading]           = useState(null);
    const [delLoading, setDelLoading]           = useState(null);
    const [restoreLoading, setRestoreLoading]   = useState(null);
    const [permDelLoading, setPermDelLoading]   = useState(null);
    const [emptyTrashLoading, setEmptyTrashLoading] = useState(false);
    const [logOutLoading, setLogOutLoading]     = useState(false);
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

    // Confirm Modal state
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Delete',
        isDanger: true,
        loading: false,
        onConfirm: null
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

    // Scroll to bottom when notes list updates
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [notes, trashNotes]);

    // Initial fetch
    useEffect(() => { fetchNotes(); }, []);

    const purgeGuestTrash = (trashArray) => {
        const cutoffMs = 7 * 24 * 60 * 60 * 1000; // 7 days retention for guest mode
        const now = new Date().getTime();
        return trashArray.filter(item => {
            if (!item.deleted_at) return true;
            const delTime = new Date(item.deleted_at).getTime();
            return (now - delTime) < cutoffMs;
        });
    };

    const fetchNotes = async () => {
        if (isGuest) {
            try {
                const localNotes = localStorage.getItem('guest_notes');
                const parsedNotes = localNotes ? JSON.parse(localNotes) : [];
                const localTrash = localStorage.getItem('guest_trash');
                let parsedTrash = localTrash ? JSON.parse(localTrash) : [];
                parsedTrash = purgeGuestTrash(parsedTrash);
                localStorage.setItem('guest_trash', JSON.stringify(parsedTrash));

                setNotes(sortNotes(parsedNotes));
                setTrashNotes(parsedTrash);
            } catch (err) {
                console.error(err);
                setNotes([]);
                setTrashNotes([]);
            } finally {
                setPageLoading(false);
            }
            return;
        }

        if (!navigator.onLine) {
            const cached = getCachedNotes();
            const cachedTrash = getCachedTrash();
            setNotes(sortNotes(cached));
            setTrashNotes(cachedTrash);
            setPageLoading(false);
            return;
        }

        try {
            const [{ data: activeData }, { data: trashData }] = await Promise.all([
                api.get('/notes/'),
                api.get('/notes/trash/')
            ]);
            setNotes(activeData);
            setTrashNotes(trashData);
            saveCachedNotes(activeData);
            saveCachedTrash(trashData);
        } catch (err) {
            if (err.response?.status === 401) {
                navigate('/login');
            } else {
                const cached = getCachedNotes();
                const cachedTrash = getCachedTrash();
                setNotes(sortNotes(cached));
                setTrashNotes(cachedTrash);
            }
        } finally {
            setPageLoading(false);
        }
    };

    if (pageLoading) {
        return <LoginLoader messages={pageMessages} />;
    }

    // ── Pin / Soft Delete / Restore / Permanent Delete ─
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
        const targetNote = notes.find(n => n.id === id);
        if (!targetNote) {
            setDelLoading(null);
            return;
        }

        const trashedNote = {
            ...targetNote,
            is_deleted: true,
            deleted_at: new Date().toISOString()
        };

        if (isGuest) {
            const updatedNotes = notes.filter(n => n.id !== id);
            const updatedTrash = [trashedNote, ...trashNotes];
            setNotes(sortNotes(updatedNotes));
            setTrashNotes(updatedTrash);
            localStorage.setItem('guest_notes', JSON.stringify(updatedNotes));
            localStorage.setItem('guest_trash', JSON.stringify(updatedTrash));
            setDelLoading(null);
            showToast("Note moved to Trash (7-day storage)", "warning");
            return;
        }

        if (!navigator.onLine) {
            const updatedNotes = notes.filter(n => n.id !== id);
            const updatedTrash = [trashedNote, ...trashNotes];
            setNotes(sortNotes(updatedNotes));
            setTrashNotes(updatedTrash);
            saveCachedNotes(updatedNotes);
            saveCachedTrash(updatedTrash);
            addToOfflineQueue('DELETE', id);
            setDelLoading(null);
            showToast("Note moved to Trash offline. Will sync when online.", "warning");
            return;
        }

        try {
            await api.delete(`/notes/${id}/`);
            showToast("Note moved to Trash", "warning");
            fetchNotes();
        } catch (_) { }
        finally{
            setDelLoading(null);
        }
    };

    const handleRestore = async (e, id) => {
        e.stopPropagation();
        setRestoreLoading(id);
        const targetNote = trashNotes.find(n => n.id === id);

        if (isGuest) {
            if (targetNote) {
                const restoredNote = { ...targetNote, is_deleted: false, deleted_at: null };
                const updatedTrash = trashNotes.filter(n => n.id !== id);
                const updatedNotes = sortNotes([restoredNote, ...notes]);
                setTrashNotes(updatedTrash);
                setNotes(updatedNotes);
                localStorage.setItem('guest_trash', JSON.stringify(updatedTrash));
                localStorage.setItem('guest_notes', JSON.stringify(updatedNotes));
                showToast("Note restored successfully!", "success");
            }
            setRestoreLoading(null);
            return;
        }

        if (!navigator.onLine) {
            if (targetNote) {
                const restoredNote = { ...targetNote, is_deleted: false, deleted_at: null };
                const updatedTrash = trashNotes.filter(n => n.id !== id);
                const updatedNotes = sortNotes([restoredNote, ...notes]);
                setTrashNotes(updatedTrash);
                setNotes(updatedNotes);
                saveCachedNotes(updatedNotes);
                saveCachedTrash(updatedTrash);
                addToOfflineQueue('RESTORE', id);
                showToast("Note restored offline. Will sync when online.", "success");
            }
            setRestoreLoading(null);
            return;
        }

        try {
            await api.post(`/notes/${id}/restore/`);
            showToast("Note restored successfully!", "success");
            fetchNotes();
        } catch (_) { }
        finally {
            setRestoreLoading(null);
        }
    };

    const handlePermanentDelete = (e, id) => {
        e.stopPropagation();
        const executePermanentDelete = async () => {
            setConfirmModal(prev => ({ ...prev, loading: true }));
            setPermDelLoading(id);

            if (isGuest) {
                const updatedTrash = trashNotes.filter(n => n.id !== id);
                setTrashNotes(updatedTrash);
                localStorage.setItem('guest_trash', JSON.stringify(updatedTrash));
                setPermDelLoading(null);
                setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Delete', isDanger: true, loading: false, onConfirm: null });
                showToast("Note deleted permanently", "warning");
                return;
            }

            if (!navigator.onLine) {
                const updatedTrash = trashNotes.filter(n => n.id !== id);
                setTrashNotes(updatedTrash);
                saveCachedTrash(updatedTrash);
                addToOfflineQueue('PERMANENT_DELETE', id);
                setPermDelLoading(null);
                setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Delete', isDanger: true, loading: false, onConfirm: null });
                showToast("Note deleted permanently offline. Will sync when online.", "warning");
                return;
            }

            try {
                await api.delete(`/notes/${id}/permanent/`);
                showToast("Note deleted permanently", "warning");
                fetchNotes();
            } catch (_) { }
            finally {
                setPermDelLoading(null);
                setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Delete', isDanger: true, loading: false, onConfirm: null });
            }
        };

        setConfirmModal({
            isOpen: true,
            title: 'Delete Note Permanently?',
            message: 'Are you sure you want to permanently delete this note? This action cannot be undone.',
            confirmText: 'Delete Forever',
            isDanger: true,
            loading: false,
            onConfirm: executePermanentDelete
        });
    };

    const handleEmptyTrash = () => {
        if (trashNotes.length === 0) return;

        const executeEmptyTrash = async () => {
            setConfirmModal(prev => ({ ...prev, loading: true }));
            setEmptyTrashLoading(true);

            if (isGuest) {
                setTrashNotes([]);
                localStorage.setItem('guest_trash', JSON.stringify([]));
                setEmptyTrashLoading(false);
                setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Delete', isDanger: true, loading: false, onConfirm: null });
                showToast("Trash emptied!", "success");
                return;
            }

            if (!navigator.onLine) {
                setTrashNotes([]);
                saveCachedTrash([]);
                addToOfflineQueue('EMPTY_TRASH');
                setEmptyTrashLoading(false);
                setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Delete', isDanger: true, loading: false, onConfirm: null });
                showToast("Trash emptied offline. Will sync when online.", "success");
                return;
            }

            try {
                await api.delete('/notes/trash/');
                showToast("Trash emptied!", "success");
                fetchNotes();
            } catch (_) { }
            finally {
                setEmptyTrashLoading(false);
                setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Delete', isDanger: true, loading: false, onConfirm: null });
            }
        };

        setConfirmModal({
            isOpen: true,
            title: 'Empty Trash?',
            message: 'All notes in the trash will be permanently deleted. This action cannot be undone.',
            confirmText: 'Empty Trash',
            isDanger: true,
            loading: false,
            onConfirm: executeEmptyTrash
        });
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

    // Logout
    const handleLogout = () => {
        setLogOutLoading(true);
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setLogOutLoading(false);
        navigate('/');
    };

    // Search & Filter
    const handleSearch = (e) => setSearchQuery(e.target.value);
    const handleClear = () => setSearchQuery('');

    // API helpers passed to modals
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

    const pinnedNotesCount = notes.filter(n => n.is_pinned).length;

    const getDisplayedNotes = () => {
        if (viewMode === 'trash') return trashNotes;
        if (viewMode === 'pinned') return notes.filter(n => n.is_pinned);
        return notes;
    };

    const displayedNotes = getDisplayedNotes();

    const filteredNotes = displayedNotes.filter(note =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (note.content && note.content.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (note.items && note.items.some(item =>
            item.text.toLowerCase().includes(searchQuery.toLowerCase())
        ))
    );

    // ═══════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════
    return (
        <div className="notes-container">

            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                notesCount={notes.length}
                trashCount={trashNotes.length}
                pinnedCount={pinnedNotesCount}
                username={username}
                isGuest={isGuest}
                isOnline={isOnline}
                onLogout={handleLogout}
                logOutLoading={logOutLoading}
            />

            <NotesNav
                username={username}
                searchQuery={searchQuery}
                onSearch={handleSearch}
                onClear={handleClear}
                onLogout={handleLogout}
                logOutLoading={logOutLoading}
                isOnline={isOnline}
                viewMode={viewMode}
                onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            />

            {isGuest && (
                <div className="guest-banner">
                    <span className="guest-banner-text">
                        ⚠️ You are using <strong>Guest Mode</strong>. Your notes are saved locally (Trash kept for 7 days). 
                        <Link to="/register" className="banner-link">Sign Up</Link> or <Link to="/login" className="banner-link">Log In</Link> to sync them to the cloud.
                    </span>
                </div>
            )}

            {/* Trash Header Banner */}
            {viewMode === 'trash' && (
                <div className="trash-banner">
                    <div className="trash-banner-info">
                        <span className="trash-icon-emoji">🗑️</span>
                        <span>
                            Notes in Trash will be automatically permanently deleted after <strong>{isGuest ? '7 days' : '30 days'}</strong>.
                        </span>
                    </div>
                    {trashNotes.length > 0 && (
                        <button className="empty-trash-btn" onClick={handleEmptyTrash} disabled={emptyTrashLoading}>
                            {emptyTrashLoading ? "Emptying..." : "Empty Trash"}
                        </button>
                    )}
                </div>
            )}

            {viewMode === 'all' && (
                <QuickCreateForm 
                    onCreated={fetchNotes}
                    apiPost={apiPost}
                />
            )}

            {/* Notes grid */}
            {filteredNotes.length === 0 ? (
                (searchQuery.trim() && displayedNotes.length !== 0) ? (
                    <p className="empty-state">
                        No notes match "<strong>{searchQuery}</strong>" - try a different word.
                    </p>
                ) : (
                    viewMode === 'trash' ? (
                        <p className="empty-state">
                            Trash is empty - deleted notes will appear here for {isGuest ? '7 days' : '30 days'} before permanent removal.
                        </p>
                    ) : viewMode === 'pinned' ? (
                        <p className="empty-state">
                            No pinned notes yet - click <strong>Pin</strong> on any note to keep it at the top.
                        </p>
                    ) : (
                        <p className="empty-state">
                            Your notebook is empty - press <strong>+</strong> to write your first thought.
                        </p>
                    )
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
                            isTrash={viewMode === 'trash'}
                            onRestore={handleRestore}
                            restoreLoading={restoreLoading === note.id}
                            onPermanentDelete={handlePermanentDelete}
                            permDelLoading={permDelLoading === note.id}
                            isGuest={isGuest}
                        />
                    ))}
                </div>
            )}

            {/* Floating add button (only in active notes view) */}
            {viewMode === 'all' && (
                <button 
                    className="add-note-model-btn" 
                    onClick={() => setCreateOpen(true)}
                    aria-label="Create new note"
                    title="Create new note"
                >
                    <svg 
                        className="add-note-icon" 
                        viewBox="0 0 24 24" 
                        width="26" 
                        height="26" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2.4" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    >
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span className="add-note-tooltip">Create Note</span>
                </button>
            )}

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

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText={confirmModal.confirmText}
                isDanger={confirmModal.isDanger}
                loading={confirmModal.loading}
                onConfirm={confirmModal.onConfirm}
                onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
            />

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