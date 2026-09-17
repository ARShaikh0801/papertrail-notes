import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { useToast } from "../hooks/useToast";
import { useOfflineSync } from "../hooks/useOfflineSync";
import { useNotes } from "../hooks/useNotes";
import { useTrash } from "../hooks/useTrash";

export const NoteContext = createContext(null);

export function NoteProvider({ children }) {
    const navigate = useNavigate();
    const username = localStorage.getItem('username') || 'Guest';
    const isGuest = !localStorage.getItem('token');

    // UI View states
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [viewMode, setViewMode] = useState('all'); // 'all' | 'pinned' | 'trash'
    const [searchQuery, setSearchQuery] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    const [editNote, setEditNote] = useState(null);
    const [logOutLoading, setLogOutLoading] = useState(false);

    // Custom hooks
    const { toasts, showToast } = useToast();
    const notesState = useNotes(isGuest, navigate);
    const trashState = useTrash(isGuest);

    const {
        notes, setNotes, pageLoading, pinLoading, passwordModal, setPasswordModal,
        fetchNotes: baseFetchNotes, handlePin: baseHandlePin, apiPost: baseApiPost,
        apiPatch: baseApiPatch, handleLockToggle: baseHandleLockToggle,
        handleEditClick: baseHandleEditClick, handlePasswordSubmit: baseHandlePasswordSubmit
    } = notesState;

    const {
        trashNotes, setTrashNotes, delLoading, restoreLoading, permDelLoading,
        emptyTrashLoading, confirmModal, setConfirmModal, purgeGuestTrash,
        handleDelete: baseHandleDelete, handleRestore: baseHandleRestore,
        handlePermanentDelete: baseHandlePermanentDelete, handleEmptyTrash: baseHandleEmptyTrash
    } = trashState;

    // Ref wrapper for fetchNotes so offlineSync hook always calls latest version without trigger loops
    const fetchNotesRef = useRef(null);

    const fetchNotes = useCallback(() => {
        return baseFetchNotes(setTrashNotes, purgeGuestTrash);
    }, [baseFetchNotes, setTrashNotes, purgeGuestTrash]);

    useEffect(() => {
        fetchNotesRef.current = fetchNotes;
    }, [fetchNotes]);

    // Initial fetch on mount
    useEffect(() => {
        fetchNotes();
    }, [fetchNotes]);

    // Offline sync hook
    const { isOnline } = useOfflineSync(api, fetchNotesRef, showToast);

    // Context Action wrappers
    const handlePin = useCallback((e, note) => {
        return baseHandlePin(e, note, showToast, fetchNotes);
    }, [baseHandlePin, showToast, fetchNotes]);

    const handleDelete = useCallback((e, id) => {
        return baseHandleDelete(e, id, notes, setNotes, showToast, fetchNotes);
    }, [baseHandleDelete, notes, setNotes, showToast, fetchNotes]);

    const handleRestore = useCallback((e, id) => {
        return baseHandleRestore(e, id, notes, setNotes, showToast, fetchNotes);
    }, [baseHandleRestore, notes, setNotes, showToast, fetchNotes]);

    const handlePermanentDelete = useCallback((e, id) => {
        return baseHandlePermanentDelete(e, id, showToast, fetchNotes);
    }, [baseHandlePermanentDelete, showToast, fetchNotes]);

    const handleEmptyTrash = useCallback(() => {
        return baseHandleEmptyTrash(showToast, fetchNotes);
    }, [baseHandleEmptyTrash, showToast, fetchNotes]);

    const handleLockToggle = useCallback((e, note) => {
        return baseHandleLockToggle(e, note, showToast);
    }, [baseHandleLockToggle, showToast]);

    const handleEditClick = useCallback((note) => {
        return baseHandleEditClick(note, setEditNote);
    }, [baseHandleEditClick]);

    const handlePasswordSubmit = useCallback((password) => {
        return baseHandlePasswordSubmit(password, setEditNote, showToast, fetchNotes);
    }, [baseHandlePasswordSubmit, showToast, fetchNotes]);

    const apiPost = useCallback((payload) => {
        return baseApiPost(payload, showToast);
    }, [baseApiPost, showToast]);

    const apiPatch = useCallback((id, payload) => {
        return baseApiPatch(id, payload, showToast);
    }, [baseApiPatch, showToast]);

    const handleLogout = useCallback(() => {
        setLogOutLoading(true);
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setLogOutLoading(false);
        navigate('/');
    }, [navigate]);

    const handleSearch = useCallback((e) => setSearchQuery(e.target.value), []);
    const handleClearSearch = useCallback(() => setSearchQuery(''), []);

    // Derived states
    const pinnedNotesCount = useMemo(() => notes.filter(n => n.is_pinned).length, [notes]);

    const displayedNotes = useMemo(() => {
        if (viewMode === 'trash') return trashNotes;
        if (viewMode === 'pinned') return notes.filter(n => n.is_pinned);
        return notes;
    }, [viewMode, trashNotes, notes]);

    const filteredNotes = useMemo(() => {
        const query = searchQuery.toLowerCase();
        if (!query) return displayedNotes;
        return displayedNotes.filter(note =>
            (note.title && note.title.toLowerCase().includes(query)) ||
            (note.content && note.content.toLowerCase().includes(query)) ||
            (note.items && note.items.some(item => item.text && item.text.toLowerCase().includes(query)))
        );
    }, [displayedNotes, searchQuery]);

    const value = {
        // Auth & network
        username,
        isGuest,
        isOnline,
        logOutLoading,
        handleLogout,

        // Data lists & loading
        notes,
        trashNotes,
        pageLoading,
        pinLoading,
        delLoading,
        restoreLoading,
        permDelLoading,
        emptyTrashLoading,

        // View & Search
        sidebarOpen,
        setSidebarOpen,
        viewMode,
        setViewMode,
        searchQuery,
        handleSearch,
        handleClearSearch,
        pinnedNotesCount,
        displayedNotes,
        filteredNotes,

        // Modals state
        createOpen,
        setCreateOpen,
        editNote,
        setEditNote,
        passwordModal,
        setPasswordModal,
        confirmModal,
        setConfirmModal,

        // Operations
        fetchNotes,
        handlePin,
        handleDelete,
        handleRestore,
        handlePermanentDelete,
        handleEmptyTrash,
        handleLockToggle,
        handleEditClick,
        handlePasswordSubmit,
        apiPost,
        apiPatch,

        // Toasts
        toasts,
        showToast
    };

    return (
        <NoteContext.Provider value={value}>
            {children}
        </NoteContext.Provider>
    );
}

export function useNoteContext() {
    const context = useContext(NoteContext);
    if (!context) {
        throw new Error("useNoteContext must be used within a NoteProvider");
    }
    return context;
}

export default NoteProvider;
