import React, { useEffect, useRef } from "react";
import NoteCard from "./NoteCard";
import Spinner from "./Spinner";

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
    permDelLoading,
    hasMore = false,
    loadingMore = false,
    onLoadMore
}) {
    const sentinelRef = useRef(null);

    // Auto-load next page when the sentinel scrolls into view (only for 'all' view, non-search)
    useEffect(() => {
        if (viewMode !== 'all' || searchQuery.trim() || !hasMore || !onLoadMore) return;

        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loadingMore) {
                    onLoadMore();
                }
            },
            { rootMargin: '200px' }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [viewMode, searchQuery, hasMore, loadingMore, onLoadMore]);

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
        <>
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

            {/* Load More section - only for 'all' view, non-search, non-guest cursor pagination */}
            {viewMode === 'all' && !searchQuery.trim() && hasMore && (
                <div className="load-more-section">
                    {loadingMore ? (
                        <div className="load-more-spinner">
                            <Spinner size={22} />
                            <span>Loading more notes…</span>
                        </div>
                    ) : (
                        <button
                            className="load-more-btn"
                            onClick={onLoadMore}
                            aria-label="Load more notes"
                        >
                            Load More
                        </button>
                    )}
                    {/* Invisible sentinel for IntersectionObserver auto-loading */}
                    <div ref={sentinelRef} className="load-more-sentinel" aria-hidden="true" />
                </div>
            )}

            {/* Loading indicator when scrolling loads more (sentinel-triggered) */}
            {viewMode === 'all' && !searchQuery.trim() && !hasMore && filteredNotes.length > 0 && (
                <div className="all-loaded-hint">
                    All notes loaded
                </div>
            )}
        </>
    );
}

export default React.memo(NotesGrid);

