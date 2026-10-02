// ─────────────────────────────────────────────────────────────────────────────
// useOfflineSync.ts
// React hook for tracking online/offline state and syncing pending answers
// to the Preplyx backend when connectivity is restored.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import {
  getUnsyncedAnswers,
  getUnsyncedCount,
  markAnswersSynced,
  PendingAnswer,
} from '../lib/offlineDB';

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseOfflineSyncResult {
  /** Whether the browser currently has network connectivity */
  isOnline: boolean;
  /** Number of answers saved locally but not yet sent to the server */
  unsyncedCount: number;
  /** Manually trigger a sync attempt */
  syncNow: () => Promise<void>;
  /** True while a sync request is in-flight */
  isSyncing: boolean;
}

// ── useOfflineSync ────────────────────────────────────────────────────────────

export function useOfflineSync(): UseOfflineSyncResult {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [unsyncedCount, setUnsyncedCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Track previous online state so we only auto-sync on the false→true edge
  const wasOnlineRef = useRef<boolean>(isOnline);

  // ── Refresh unsynced count from IndexedDB ───────────────────────────────────
  const refreshUnsyncedCount = useCallback(async () => {
    try {
      const count = await getUnsyncedCount();
      setUnsyncedCount(count);
    } catch (err) {
      console.warn('[useOfflineSync] Could not read unsyncedCount:', err);
    }
  }, []);

  // ── syncNow ─────────────────────────────────────────────────────────────────
  const syncNow = useCallback(async (): Promise<void> => {
    if (isSyncing) return; // prevent concurrent syncs

    let answers: PendingAnswer[] = [];
    try {
      answers = await getUnsyncedAnswers();
    } catch (err) {
      console.warn('[useOfflineSync] Failed to read pending answers:', err);
      return;
    }

    if (answers.length === 0) {
      await refreshUnsyncedCount();
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch(`${API_BASE_URL}/exam-sessions/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(answers),
      });

      if (response.ok) {
        // Extract the auto-increment IDs from the records we just synced
        const syncedIds = answers
          .map((a) => a.answerId)
          .filter((id): id is number => typeof id === 'number');

        await markAnswersSynced(syncedIds);
        console.info(
          `[useOfflineSync] Synced ${syncedIds.length} answer(s) successfully.`
        );
      } else if (response.status === 404) {
        console.warn(
          '[useOfflineSync] Sync endpoint not found (404). Answers retained locally.'
        );
      } else {
        console.warn(
          `[useOfflineSync] Sync failed with status ${response.status}. Answers retained locally.`
        );
      }
    } catch (err) {
      // Network error — keep answers for the next sync attempt
      console.warn(
        '[useOfflineSync] Network error during sync. Answers retained locally:',
        err
      );
    } finally {
      setIsSyncing(false);
      await refreshUnsyncedCount();
    }
  }, [isSyncing, refreshUnsyncedCount]);

  // ── Online / offline event listeners ────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ── Auto-sync on false → true transition ────────────────────────────────────
  useEffect(() => {
    const wasOffline = !wasOnlineRef.current;
    wasOnlineRef.current = isOnline;

    if (isOnline && wasOffline) {
      // Connectivity just restored — kick off a sync
      syncNow();
    }
  }, [isOnline, syncNow]);

  // ── Load unsynced count on mount ────────────────────────────────────────────
  useEffect(() => {
    refreshUnsyncedCount();
  }, [refreshUnsyncedCount]);

  return { isOnline, unsyncedCount, syncNow, isSyncing };
}
