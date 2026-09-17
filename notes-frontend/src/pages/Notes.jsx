import React, { useState, useEffect } from "react";
import { NoteProvider, useNoteContext } from "../context/NoteContext";

import NotesNav from "../components/NotesNav";
import Sidebar from "../components/Sidebar";
import QuickCreateForm from "../components/QuickCreateForm";
import CreateNoteModal from "../components/CreateNoteModal";
import EditNoteModal from "../components/EditNoteModal";
import LoginLoader from "../components/LoginLoader";
import PasswordModal from "../components/PasswordModal";
import ConfirmModal from "../components/ConfirmModal";
import GuestBanner from "../components/GuestBanner";
import TrashBanner from "../components/TrashBanner";
import NotesGrid from "../components/NotesGrid";
import ToastContainer from "../components/ToastContainer";

import "./notes.css";

const pageMessages = [
    "Opening your notebook…",
    "Gathering your thoughts…",
    "Dusting off the pages…",
    "Sorting the pinned ones first…",
    "Here are your thoughts…",
    "Almost ready…",
];

function NotesContent() {
    const {
        username, isGuest, isOnline, logOutLoading, handleLogout,
        notes, trashNotes, pageLoading, pinLoading, delLoading, restoreLoading, permDelLoading, emptyTrashLoading,
        sidebarOpen, setSidebarOpen, viewMode, setViewMode, searchQuery, handleSearch, handleClearSearch,
        pinnedNotesCount, displayedNotes, filteredNotes,
        createOpen, setCreateOpen, editNote, setEditNote, passwordModal, setPasswordModal, confirmModal, setConfirmModal,
        fetchNotes, handlePin, handleDelete, handleRestore, handlePermanentDelete, handleEmptyTrash,
        handleLockToggle, handleEditClick, handlePasswordSubmit, apiPost, apiPatch, toasts
    } = useNoteContext();

    const [showScrollTop, setShowScrollTop] = useState(false);

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

    if (pageLoading) {
        return <LoginLoader messages={pageMessages} />;
    }

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
                onClear={handleClearSearch}
                onLogout={handleLogout}
                logOutLoading={logOutLoading}
                isOnline={isOnline}
                viewMode={viewMode}
                onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            />

            {isGuest && <GuestBanner />}

            {viewMode === 'trash' && (
                <TrashBanner
                    isGuest={isGuest}
                    trashCount={trashNotes.length}
                    onEmptyTrash={handleEmptyTrash}
                    emptyTrashLoading={emptyTrashLoading}
                />
            )}

            {viewMode === 'all' && (
                <QuickCreateForm
                    onCreated={fetchNotes}
                    apiPost={apiPost}
                />
            )}

            <NotesGrid
                filteredNotes={filteredNotes}
                displayedNotes={displayedNotes}
                searchQuery={searchQuery}
                viewMode={viewMode}
                isGuest={isGuest}
                onEdit={handleEditClick}
                onPin={handlePin}
                pinLoading={pinLoading}
                onDelete={handleDelete}
                delLoading={delLoading}
                onLockToggle={handleLockToggle}
                onRestore={handleRestore}
                restoreLoading={restoreLoading}
                onPermanentDelete={handlePermanentDelete}
                permDelLoading={permDelLoading}
            />

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

            {showScrollTop && (
                <button className="scroll-to-top-btn" onClick={scrollToTop} aria-label="Scroll to top">
                    ↑
                </button>
            )}

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

            <ToastContainer toasts={toasts} />
        </div>
    );
}

function Notes() {
    return (
        <NoteProvider>
            <NotesContent />
        </NoteProvider>
    );
}

export default Notes;