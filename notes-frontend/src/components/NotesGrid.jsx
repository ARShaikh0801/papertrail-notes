import React from "react";
import NoteCard from "./NoteCard";

function NotesGrid({
    filteredNotes,
    displayedNotes,
    searchQuery,
    viewMode,
    isGuest,
    onEdit,
    onPin,
    pinLoading,
    onDelete,
    delLoading,
    onLockToggle,
    onRestore,
    restoreLoading,
    onPermanentDelete,
    permDelLoading
}) {
    if (filteredNotes.length === 0) {
        if (searchQuery.trim() && displayedNotes.length !== 0) {
            return (
                <p className="empty-state">
                    No notes match "<strong>{searchQuery}</strong>" - try a different word.
                </p>
            );
        }

        if (viewMode === 'trash') {
            return (
                <p className="empty-state">
                    Trash is empty - deleted notes will appear here for {isGuest ? '7 days' : '30 days'} before permanent removal.
                </p>
            );
        }

        if (viewMode === 'pinned') {
            return (
                <p className="empty-state">
                    No pinned notes yet - click <strong>Pin</strong> on any note to keep it at the top.
                </p>
            );
        }

        return (
            <p className="empty-state">
                Your notebook is empty - press <strong>+</strong> to write your first thought.
            </p>
        );
    }

    return (
        <div className="notes-grid">
            {filteredNotes.map((note, i) => (
                <NoteCard
                    key={note.id}
                    note={note}
                    index={i}
                    onEdit={onEdit}
                    onPin={onPin}
                    pinLoading={pinLoading === note.id}
                    onDelete={onDelete}
                    delLoading={delLoading === note.id}
                    onLockToggle={onLockToggle}
                    isTrash={viewMode === 'trash'}
                    onRestore={onRestore}
                    restoreLoading={restoreLoading === note.id}
                    onPermanentDelete={onPermanentDelete}
                    permDelLoading={permDelLoading === note.id}
                    isGuest={isGuest}
                />
            ))}
        </div>
    );
}

export default React.memo(NotesGrid);
