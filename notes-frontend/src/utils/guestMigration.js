/**
 * Idempotently migrates guest notes to the authenticated user's account via the API.
 * Uses per-note error handling to ensure partial network failures retain only un-migrated notes
 * in localStorage, preventing data loss or duplicate notes on subsequent login attempts.
 */
export async function migrateGuestNotes(api) {
    const rawGuestNotes = localStorage.getItem('guest_notes');
    if (!rawGuestNotes) return { migratedCount: 0, failedCount: 0 };

    let notesArray;
    try {
        notesArray = JSON.parse(rawGuestNotes);
    } catch (e) {
        console.error("Invalid guest_notes format in localStorage:", e);
        localStorage.removeItem('guest_notes');
        return { migratedCount: 0, failedCount: 0 };
    }

    if (!Array.isArray(notesArray) || notesArray.length === 0) {
        localStorage.removeItem('guest_notes');
        return { migratedCount: 0, failedCount: 0 };
    }

    const remainingNotes = [];
    let migratedCount = 0;
    let failedCount = 0;

    for (const note of notesArray) {
        try {
            await api.post('/notes/', {
                title: note.title,
                content: note.content,
                is_checklist: note.is_checklist,
                is_pinned: note.is_pinned || false,
                items: note.items ? note.items.map(item => ({ text: item.text, checked: item.checked })) : []
            });
            migratedCount++;
        } catch (err) {
            console.error(`Failed to migrate note "${note.title || 'Untitled'}":`, err);
            failedCount++;
            remainingNotes.push(note);
        }
    }

    if (remainingNotes.length > 0) {
        localStorage.setItem('guest_notes', JSON.stringify(remainingNotes));
    } else {
        localStorage.removeItem('guest_notes');
        // Clean up guest trash when all active notes have been migrated
        localStorage.removeItem('guest_trash');
    }

    return { migratedCount, failedCount };
}

export default migrateGuestNotes;
