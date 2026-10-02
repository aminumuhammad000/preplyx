// ─────────────────────────────────────────────────────────────────────────────
// offlineDB.ts
// IndexedDB abstraction for Preplyx offline support.
// Uses the native browser IDBDatabase API — no external libraries.
// ─────────────────────────────────────────────────────────────────────────────

const DB_NAME = 'preplyx-offline';
const DB_VERSION = 1;

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface OfflineQuestionSet {
  setId: string;           // e.g. 'JAMB_Mathematics_2019'
  exam: string;
  subject: string;
  year: string;
  downloadedAt: number;    // Date.now()
  questions: Array<{
    id: string;
    text: string;
    options: string[];     // [optA, optB, optC, optD]
    correctAnswer: string;
    explanation?: string;
  }>;
}

export interface PendingAnswer {
  answerId?: number;       // auto-increment
  setId: string;
  questionId: string;
  selectedAnswer: string;
  answeredAt: number;
  synced: boolean;
  exam: string;
  subject: string;
  year?: string;
}

// ── Singleton DB promise ──────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // ── questionSets store ────────────────────────────────────────────────
      if (!db.objectStoreNames.contains('questionSets')) {
        const questionSetsStore = db.createObjectStore('questionSets', {
          keyPath: 'setId',
        });
        // Compound index for browsing by subject + exam
        questionSetsStore.createIndex('subject+exam', ['subject', 'exam'], {
          unique: false,
        });
      }

      // ── pendingAnswers store ──────────────────────────────────────────────
      if (!db.objectStoreNames.contains('pendingAnswers')) {
        const pendingAnswersStore = db.createObjectStore('pendingAnswers', {
          keyPath: 'answerId',
          autoIncrement: true,
        });
        pendingAnswersStore.createIndex('synced', 'synced', { unique: false });
      }
    };

    request.onsuccess = (event: Event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event: Event) => {
      const error = (event.target as IDBOpenDBRequest).error;
      console.error('[offlineDB] Failed to open IndexedDB:', error);
      dbPromise = null; // allow retry on next call
      reject(error);
    };
  });

  return dbPromise;
}

// ── Helper: wrap an IDBRequest in a Promise ───────────────────────────────────

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ── questionSets API ──────────────────────────────────────────────────────────

/**
 * Save a downloaded question set for offline use.
 * Overwrites any existing set with the same setId.
 */
export async function saveQuestionSet(set: OfflineQuestionSet): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('questionSets', 'readwrite');
  const store = tx.objectStore('questionSets');
  await promisifyRequest(store.put(set));
}

/**
 * Load a question set by its setId (e.g. 'JAMB_Mathematics_2019').
 * Returns null if not found.
 */
export async function getQuestionSet(
  setId: string
): Promise<OfflineQuestionSet | null> {
  const db = await openDB();
  const tx = db.transaction('questionSets', 'readonly');
  const store = tx.objectStore('questionSets');
  const result = await promisifyRequest<OfflineQuestionSet | undefined>(
    store.get(setId)
  );
  return result ?? null;
}

/**
 * List all saved question sets (for offline browsing).
 */
export async function listQuestionSets(): Promise<OfflineQuestionSet[]> {
  const db = await openDB();
  const tx = db.transaction('questionSets', 'readonly');
  const store = tx.objectStore('questionSets');
  return promisifyRequest<OfflineQuestionSet[]>(store.getAll());
}

/**
 * Delete a question set by setId.
 */
export async function deleteQuestionSet(setId: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('questionSets', 'readwrite');
  const store = tx.objectStore('questionSets');
  await promisifyRequest(store.delete(setId));
}

// ── pendingAnswers API ────────────────────────────────────────────────────────

/**
 * Save a user answer immediately with synced=false.
 * answerId, synced, and answeredAt are managed automatically.
 */
export async function savePendingAnswer(
  answer: Omit<PendingAnswer, 'answerId' | 'synced' | 'answeredAt'>
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('pendingAnswers', 'readwrite');
  const store = tx.objectStore('pendingAnswers');
  const record: Omit<PendingAnswer, 'answerId'> = {
    ...answer,
    answeredAt: Date.now(),
    synced: false,
  };
  await promisifyRequest(store.add(record));
}

/**
 * Get all answers that have not yet been synced to the server.
 */
export async function getUnsyncedAnswers(): Promise<PendingAnswer[]> {
  const db = await openDB();
  const tx = db.transaction('pendingAnswers', 'readonly');
  const store = tx.objectStore('pendingAnswers');
  const index = store.index('synced');
  // IDBKeyRange.only(false) matches records where synced === false
  return promisifyRequest<PendingAnswer[]>(
    index.getAll(IDBKeyRange.only(0)) // IndexedDB stores booleans as 0/1
  ).then(async (results) => {
    // Fallback: if the store uses native booleans, also query with false
    if (results.length === 0) {
      return promisifyRequest<PendingAnswer[]>(
        index.getAll(IDBKeyRange.only(false))
      );
    }
    return results;
  });
}

/**
 * Mark a batch of answers as synced by their auto-increment answerIds.
 */
export async function markAnswersSynced(answerIds: number[]): Promise<void> {
  if (answerIds.length === 0) return;

  const db = await openDB();
  const tx = db.transaction('pendingAnswers', 'readwrite');
  const store = tx.objectStore('pendingAnswers');

  await Promise.all(
    answerIds.map(async (id) => {
      const record = await promisifyRequest<PendingAnswer | undefined>(
        store.get(id)
      );
      if (record) {
        record.synced = true;
        await promisifyRequest(store.put(record));
      }
    })
  );
}

/**
 * Get the total count of answers not yet synced to the server.
 */
export async function getUnsyncedCount(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction('pendingAnswers', 'readonly');
  const store = tx.objectStore('pendingAnswers');
  const index = store.index('synced');

  // Try numeric 0 first (IndexedDB may coerce booleans)
  const countByZero = await promisifyRequest<number>(
    index.count(IDBKeyRange.only(0))
  );
  if (countByZero > 0) return countByZero;

  return promisifyRequest<number>(index.count(IDBKeyRange.only(false)));
}
