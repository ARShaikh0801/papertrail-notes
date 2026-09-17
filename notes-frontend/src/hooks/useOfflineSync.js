import { useState, useEffect } from "react";
import { getOfflineQueue, syncOfflineQueue } from "../utils/offlineSync";

export function useOfflineSync(api, fetchNotesRef, showToast) {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = async () => {
            setIsOnline(true);
            const queue = await getOfflineQueue();
            if (queue && queue.length > 0) {
                showToast("You are back online. Syncing changes...", "success");
            }
            try {
                const result = await syncOfflineQueue(api);
                if (result && result.count > 0) {
                    showToast(`Synced ${result.count} offline changes!`, "success");
                }
                if (fetchNotesRef.current) {
                    fetchNotesRef.current();
                }
            } catch (err) {
                showToast("Failed to sync some offline changes.", "warning");
                console.error(err);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            showToast("Connection lost. Working offline.", "warning");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (navigator.onLine) {
            handleOnline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [api, fetchNotesRef, showToast]);

    return { isOnline };
}

export default useOfflineSync;
