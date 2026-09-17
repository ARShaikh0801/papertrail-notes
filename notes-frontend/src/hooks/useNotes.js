import { useState, useCallback } from "react";
import api from "../api/axios";
import {
    getCachedNotes,
    saveCachedNotes,
    getCachedTrash,
    saveCachedTrash,
    addToOfflineQueue
} from "../utils/offlineSync";

export const sortNotes = (notesList) => {
    return [...notesList].sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });
};

export function useNotes(isGuest, navigate) {
    const [notes, setNotes] = useState([]);
    const [pageLoading, setPageLoading] = useState(true);
    const [pinLoading, setPinLoading] = useState(null);

    const [passwordModal, setPasswordModal] = useState({
        isOpen: false,
        note: null,
        action: null,
        error: '',
        loading: false
    });

    const fetchNotes = useCallback(async (setTrashNotes, purgeGuestTrash) => {
        if (isGuest) {
            try {
                const localNotes = localStorage.getItem('guest_notes');
                const parsedNotes = localNotes ? JSON.parse(localNotes) : [];
                const localTrash = localStorage.getItem('guest_trash');
                let parsedTrash = localTrash ? JSON.parse(localTrash) : [];
                if (purgeGuestTrash) {
                    parsedTrash = purgeGuestTrash(parsedTrash);
                    localStorage.setItem('guest_trash', JSON.stringify(parsedTrash));
                }

                setNotes(sortNotes(parsedNotes));
                if (setTrashNotes) setTrashNotes(parsedTrash);
            } catch (err) {
                console.error(err);
                setNotes([]);
                if (setTrashNotes) setTrashNotes([]);
            } finally {
                setPageLoading(false);
            }
            return;
        }

        if (!navigator.onLine) {
            const cached = await getCachedNotes();
            const cachedTrash = await getCachedTrash();
            setNotes(sortNotes(cached));
            if (setTrashNotes) setTrashNotes(cachedTrash);
            setPageLoading(false);
            return;
        }

        try {
            const [{ data: activeData }, { data: trashData }] = await Promise.all([
                api.get('/notes/'),
                api.get('/notes/trash/')
            ]);
            const activeNotesList = Array.isArray(activeData) ? activeData : (activeData?.results || []);
            const trashNotesList = Array.isArray(trashData) ? trashData : (trashData?.results || []);
            setNotes(activeNotesList);
            if (setTrashNotes) setTrashNotes(trashNotesList);
            await saveCachedNotes(activeNotesList);
            await saveCachedTrash(trashNotesList);
        } catch (err) {
            if (err.response?.status === 401 && navigate) {
                navigate('/login');
            } else {
                const cached = await getCachedNotes();
                const cachedTrash = await getCachedTrash();
                setNotes(sortNotes(cached));
                if (setTrashNotes) setTrashNotes(cachedTrash);
            }
        } finally {
            setPageLoading(false);
        }
    }, [isGuest, navigate]);

    const handlePin = useCallback(async (e, note, showToast, refreshNotes) => {
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
            await saveCachedNotes(updated);
            await addToOfflineQueue('UPDATE', note.id, { is_pinned: !note.is_pinned });
            setPinLoading(null);
            showToast("Pin toggled offline. Will sync when online.", "success");
            return;
        }

        try {
            await api.patch(`/notes/${note.id}/`, { is_pinned: !note.is_pinned });
            if (refreshNotes) refreshNotes();
        } catch (_) { }
        finally {
            setPinLoading(null);
        }
    }, [isGuest, notes]);

    const apiPost = useCallback(async (payload, showToast) => {
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
            await saveCachedNotes(updated);
            await addToOfflineQueue('CREATE', tempId, payload, tempId);
            showToast("Note created offline. Will sync when online.", "success");
            return Promise.resolve({ data: newNote });
        }

        return api.post('/notes/', payload);
    }, [isGuest, notes]);

    const apiPatch = useCallback(async (id, payload, showToast) => {
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
            await saveCachedNotes(updated);
            await addToOfflineQueue('UPDATE', id, payload);
            showToast("Note updated offline. Will sync when online.", "success");
            return Promise.resolve({ data: updated.find(n => n.id === id) });
        }

        return api.patch(`/notes/${id}/`, payload);
    }, [isGuest, notes]);

    const handleLockToggle = useCallback((e, note, showToast) => {
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
    }, [isGuest]);

    const handleEditClick = useCallback((note, setEditNote) => {
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
    }, []);

    const handlePasswordSubmit = useCallback(async (password, setEditNote, showToast, refreshNotes) => {
        setPasswordModal(prev => ({ ...prev, loading: true, error: '' }));
        const { note, action } = passwordModal;
        try {
            if (action === 'lock') {
                await api.post(`/notes/${note.id}/lock/`, { password });
                if (refreshNotes) refreshNotes();
                setPasswordModal({ isOpen: false, note: null, action: null, error: '', loading: false });
                showToast("Note locked successfully!", "success");
            } else if (action === 'remove-lock') {
                await api.post(`/notes/${note.id}/remove-lock/`, { password });
                if (refreshNotes) refreshNotes();
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
    }, [passwordModal]);

    return {
        notes,
        setNotes,
        pageLoading,
        pinLoading,
        passwordModal,
        setPasswordModal,
        fetchNotes,
        handlePin,
        apiPost,
        apiPatch,
        handleLockToggle,
        handleEditClick,
        handlePasswordSubmit
    };
}

export default useNotes;
