import { useState, useCallback } from "react";
import api from "../api/axios";
import { saveCachedNotes, saveCachedTrash, addToOfflineQueue } from "../utils/offlineSync";
import { sortNotes } from "./useNotes";

export function useTrash(isGuest) {
    const [trashNotes, setTrashNotes] = useState([]);
    const [delLoading, setDelLoading] = useState(null);
    const [restoreLoading, setRestoreLoading] = useState(null);
    const [permDelLoading, setPermDelLoading] = useState(null);
    const [emptyTrashLoading, setEmptyTrashLoading] = useState(false);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: '',
        message: '',
        confirmText: 'Delete',
        isDanger: true,
        loading: false,
        onConfirm: null
    });

    const purgeGuestTrash = useCallback((trashArray) => {
        const cutoffMs = 7 * 24 * 60 * 60 * 1000; // 7 days retention for guest mode
        const now = new Date().getTime();
        return trashArray.filter(item => {
            if (!item.deleted_at) return true;
            const delTime = new Date(item.deleted_at).getTime();
            return (now - delTime) < cutoffMs;
        });
    }, []);

    const handleDelete = useCallback(async (e, id, notes, setNotes, showToast, refreshNotes) => {
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
            await saveCachedNotes(updatedNotes);
            await saveCachedTrash(updatedTrash);
            await addToOfflineQueue('DELETE', id);
            setDelLoading(null);
            showToast("Note moved to Trash offline. Will sync when online.", "warning");
            return;
        }

        try {
            await api.delete(`/notes/${id}/`);
            showToast("Note moved to Trash", "warning");
            if (refreshNotes) refreshNotes();
        } catch (_) { }
        finally {
            setDelLoading(null);
        }
    }, [isGuest, trashNotes]);

    const handleRestore = useCallback(async (e, id, notes, setNotes, showToast, refreshNotes) => {
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
                await saveCachedNotes(updatedNotes);
                await saveCachedTrash(updatedTrash);
                await addToOfflineQueue('RESTORE', id);
                showToast("Note restored offline. Will sync when online.", "success");
            }
            setRestoreLoading(null);
            return;
        }

        try {
            await api.post(`/notes/${id}/restore/`);
            showToast("Note restored successfully!", "success");
            if (refreshNotes) refreshNotes();
        } catch (_) { }
        finally {
            setRestoreLoading(null);
        }
    }, [isGuest, trashNotes]);

    const handlePermanentDelete = useCallback((e, id, showToast, refreshNotes) => {
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
                await saveCachedTrash(updatedTrash);
                await addToOfflineQueue('PERMANENT_DELETE', id);
                setPermDelLoading(null);
                setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Delete', isDanger: true, loading: false, onConfirm: null });
                showToast("Note deleted permanently offline. Will sync when online.", "warning");
                return;
            }

            try {
                await api.delete(`/notes/${id}/permanent/`);
                showToast("Note deleted permanently", "warning");
                if (refreshNotes) refreshNotes();
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
    }, [isGuest, trashNotes]);

    const handleEmptyTrash = useCallback((showToast, refreshNotes) => {
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
                await saveCachedTrash([]);
                await addToOfflineQueue('EMPTY_TRASH');
                setEmptyTrashLoading(false);
                setConfirmModal({ isOpen: false, title: '', message: '', confirmText: 'Delete', isDanger: true, loading: false, onConfirm: null });
                showToast("Trash emptied offline. Will sync when online.", "warning");
                return;
            }

            try {
                await api.delete('/notes/trash/');
                showToast("Trash emptied!", "success");
                if (refreshNotes) refreshNotes();
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
    }, [isGuest, trashNotes]);

    return {
        trashNotes,
        setTrashNotes,
        delLoading,
        restoreLoading,
        permDelLoading,
        emptyTrashLoading,
        confirmModal,
        setConfirmModal,
        purgeGuestTrash,
        handleDelete,
        handleRestore,
        handlePermanentDelete,
        handleEmptyTrash
    };
}

export default useTrash;
