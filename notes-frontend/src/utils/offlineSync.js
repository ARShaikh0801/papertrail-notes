const QUEUE_KEY = 'offline_sync_queue';
const CACHE_KEY = 'cached_notes_logged_in';

export const getOfflineQueue = () => {
    try {
        const queue = localStorage.getItem(QUEUE_KEY);
        return queue ? JSON.parse(queue) : [];
    } catch (e) {
        console.error('Error reading offline queue:', e);
        return [];
    }
};

export const saveOfflineQueue = (queue) => {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch (e) {
        console.error('Error saving offline queue:', e);
    }
};

export const clearOfflineQueue = () => {
    localStorage.removeItem(QUEUE_KEY);
};

export const addToOfflineQueue = (type, noteId, payload = {}, tempId = null) => {
    const queue = getOfflineQueue();
    
    // Optimizations:
    // 1. If we are deleting a note that was created offline and not yet synced (has tempId),
    //    we can just remove the CREATE action and not add a DELETE action.
    if (type === 'DELETE' && noteId && String(noteId).startsWith('temp-')) {
        const filtered = queue.filter(item => !(item.type === 'CREATE' && item.tempId === noteId) && item.noteId !== noteId);
        saveOfflineQueue(filtered);
        return;
    }

    // 2. If we are updating a note that is already queued for update, merge the payloads.
    if (type === 'UPDATE') {
        const existingUpdateIndex = queue.findIndex(item => item.type === 'UPDATE' && item.noteId === noteId);
        if (existingUpdateIndex !== -1) {
            queue[existingUpdateIndex].payload = {
                ...queue[existingUpdateIndex].payload,
                ...payload
            };
            saveOfflineQueue(queue);
            return;
        }
    }

    queue.push({
        id: 'action-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        type,
        noteId,
        payload,
        tempId
    });
    saveOfflineQueue(queue);
};

export const getCachedNotes = () => {
    try {
        const notes = localStorage.getItem(CACHE_KEY);
        return notes ? JSON.parse(notes) : [];
    } catch (e) {
        console.error('Error reading cached notes:', e);
        return [];
    }
};

export const saveCachedNotes = (notes) => {
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(notes));
    } catch (e) {
        console.error('Error saving cached notes:', e);
    }
};

export const syncOfflineQueue = async (api) => {
    let queue = getOfflineQueue();
    if (queue.length === 0) return { success: true, count: 0 };

    const tempIdMap = {};

    for (const action of queue) {
        try {
            let targetId = action.noteId;
            // Map tempId to real ID if it was created offline
            if (targetId && tempIdMap[targetId]) {
                targetId = tempIdMap[targetId];
            }

            if (action.type === 'CREATE') {
                const response = await api.post('/notes/', action.payload);
                if (action.tempId && response.data?.id) {
                    tempIdMap[action.tempId] = response.data.id;
                }
            } else if (action.type === 'UPDATE') {
                await api.patch(`/notes/${targetId}/`, action.payload);
            } else if (action.type === 'DELETE') {
                await api.delete(`/notes/${targetId}/`);
            }
        } catch (error) {
            console.error('Failed to sync offline action:', action, error);
            // If the failure is 404 (note not found), we should skip and continue.
            // Otherwise, we stop syncing to prevent out-of-order execution issues.
            if (error.response?.status === 404) {
                continue;
            }
            // Save the remaining items in queue
            const failedIndex = queue.indexOf(action);
            if (failedIndex !== -1) {
                // Update remaining items with updated tempIdMap
                const remaining = queue.slice(failedIndex).map(item => {
                    if (item.noteId && tempIdMap[item.noteId]) {
                        return { ...item, noteId: tempIdMap[item.noteId] };
                    }
                    return item;
                });
                saveOfflineQueue(remaining);
            }
            throw error;
        }
    }

    clearOfflineQueue();
    return { success: true, count: queue.length };
};
