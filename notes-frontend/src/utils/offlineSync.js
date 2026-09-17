import { idbGet, idbSet, idbDel } from './indexedDB';

const QUEUE_KEY = 'offline_sync_queue';
const CACHE_KEY = 'cached_notes_logged_in';
const TRASH_CACHE_KEY = 'cached_trash_notes_logged_in';

// Migration flag to ensure one-time migration from localStorage to IndexedDB
let migrationAttempted = false;

async function ensureMigration() {
    if (migrationAttempted) return;
    migrationAttempted = true;
    try {
        const oldQueue = localStorage.getItem(QUEUE_KEY);
        if (oldQueue) {
            const parsed = JSON.parse(oldQueue);
            if (Array.isArray(parsed) && parsed.length > 0) {
                const currentIdbQueue = (await idbGet(QUEUE_KEY)) || [];
                await idbSet(QUEUE_KEY, [...currentIdbQueue, ...parsed]);
            }
            localStorage.removeItem(QUEUE_KEY);
        }

        const oldNotes = localStorage.getItem(CACHE_KEY);
        if (oldNotes) {
            const parsed = JSON.parse(oldNotes);
            if (Array.isArray(parsed) && parsed.length > 0) {
                await idbSet(CACHE_KEY, parsed);
            }
            localStorage.removeItem(CACHE_KEY);
        }

        const oldTrash = localStorage.getItem(TRASH_CACHE_KEY);
        if (oldTrash) {
            const parsed = JSON.parse(oldTrash);
            if (Array.isArray(parsed) && parsed.length > 0) {
                await idbSet(TRASH_CACHE_KEY, parsed);
            }
            localStorage.removeItem(TRASH_CACHE_KEY);
        }
    } catch (e) {
        console.warn('LocalStorage migration to IndexedDB encountered non-critical error:', e);
    }
}

export const getOfflineQueue = async () => {
    await ensureMigration();
    try {
        const queue = await idbGet(QUEUE_KEY);
        return Array.isArray(queue) ? queue : [];
    } catch (e) {
        console.error('Error reading offline queue from IndexedDB:', e);
        return [];
    }
};

export const saveOfflineQueue = async (queue) => {
    try {
        await idbSet(QUEUE_KEY, queue);
    } catch (e) {
        console.error('Error saving offline queue to IndexedDB:', e);
    }
};

export const clearOfflineQueue = async () => {
    try {
        await idbDel(QUEUE_KEY);
    } catch (e) {
        console.error('Error clearing offline queue in IndexedDB:', e);
    }
};

export const addToOfflineQueue = async (type, noteId, payload = {}, tempId = null) => {
    const queue = await getOfflineQueue();
    
    // Optimization 1: If deleting a note that was created offline and not synced yet (tempId),
    // remove the CREATE action and don't add a DELETE action.
    if (type === 'DELETE' && noteId && String(noteId).startsWith('temp-')) {
        const filtered = queue.filter(item => !(item.type === 'CREATE' && item.tempId === noteId) && item.noteId !== noteId);
        await saveOfflineQueue(filtered);
        return;
    }

    // Optimization 2: Merge UPDATE payloads if note is already queued for update.
    if (type === 'UPDATE') {
        const existingUpdateIndex = queue.findIndex(item => item.type === 'UPDATE' && item.noteId === noteId);
        if (existingUpdateIndex !== -1) {
            queue[existingUpdateIndex].payload = {
                ...queue[existingUpdateIndex].payload,
                ...payload
            };
            await saveOfflineQueue(queue);
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
    await saveOfflineQueue(queue);
};

export const getCachedNotes = async () => {
    await ensureMigration();
    try {
        const notes = await idbGet(CACHE_KEY);
        return Array.isArray(notes) ? notes : [];
    } catch (e) {
        console.error('Error reading cached notes from IndexedDB:', e);
        return [];
    }
};

export const saveCachedNotes = async (notes) => {
    try {
        await idbSet(CACHE_KEY, notes);
    } catch (e) {
        console.error('Error saving cached notes to IndexedDB:', e);
    }
};

export const getCachedTrash = async () => {
    await ensureMigration();
    try {
        const notes = await idbGet(TRASH_CACHE_KEY);
        return Array.isArray(notes) ? notes : [];
    } catch (e) {
        console.error('Error reading cached trash from IndexedDB:', e);
        return [];
    }
};

export const saveCachedTrash = async (notes) => {
    try {
        await idbSet(TRASH_CACHE_KEY, notes);
    } catch (e) {
        console.error('Error saving cached trash to IndexedDB:', e);
    }
};

export const syncOfflineQueue = async (api) => {
    let queue = await getOfflineQueue();
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
            } else if (action.type === 'RESTORE') {
                await api.post(`/notes/${targetId}/restore/`);
            } else if (action.type === 'PERMANENT_DELETE') {
                await api.delete(`/notes/${targetId}/permanent/`);
            } else if (action.type === 'EMPTY_TRASH') {
                await api.delete('/notes/trash/');
            }
        } catch (error) {
            console.error('Failed to sync offline action:', action, error);
            if (error.response?.status === 404) {
                continue;
            }
            const failedIndex = queue.indexOf(action);
            if (failedIndex !== -1) {
                const remaining = queue.slice(failedIndex).map(item => {
                    if (item.noteId && tempIdMap[item.noteId]) {
                        return { ...item, noteId: tempIdMap[item.noteId] };
                    }
                    return item;
                });
                await saveOfflineQueue(remaining);
            }
            throw error;
        }
    }

    await clearOfflineQueue();
    return { success: true, count: queue.length };
};
