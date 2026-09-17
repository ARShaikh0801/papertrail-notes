import React from "react";

function TrashBanner({ isGuest, trashCount, onEmptyTrash, emptyTrashLoading }) {
    return (
        <div className="trash-banner">
            <div className="trash-banner-info">
                <span className="trash-icon-emoji">🗑️</span>
                <span>
                    Notes in Trash will be automatically permanently deleted after <strong>{isGuest ? '7 days' : '30 days'}</strong>.
                </span>
            </div>
            {trashCount > 0 && (
                <button className="empty-trash-btn" onClick={onEmptyTrash} disabled={emptyTrashLoading}>
                    {emptyTrashLoading ? "Emptying..." : "Empty Trash"}
                </button>
            )}
        </div>
    );
}

export default React.memo(TrashBanner);
