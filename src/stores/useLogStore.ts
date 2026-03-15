/**
 * Zustand store for log state management.
 * Capture → Process → Act → Reflect
 */

import {create} from 'zustand';
import {LogEntry, LogItemType, Bucket, getTodayDateKey} from '../models/types';
import {
  instalog as coreInstalog,
  getAllLogs,
  updateLog,
  deleteLog,
  InstalogOptions,
} from '../utils/instalog';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {classifyWithNL, isConfidentClassification, recordCorrection} from '../utils/categorize';

// Return shape for today's capture statistics
export interface CaptureStats {
  totalCaptured: number;
  totalProcessed: number;
  totalUnprocessed: number;
  totalArchived: number;
  totalTasks: number;
  totalNotes: number;
}

interface LogState {
  logs: LogEntry[];
  buckets: Bucket[];

  // Core capture
  instalog: (options?: InstalogOptions) => LogEntry;
  quickCapture: (text: string, type: LogItemType) => LogEntry;
  refreshLogs: () => void;
  refreshBuckets: () => void;

  // Legacy bucket assignment (WrapUp still uses this)
  assignBucket: (logId: string, bucketId: string | null) => void;

  // Processing actions (Inbox)
  processItem: (logId: string, type: LogItemType) => void;
  archiveItem: (logId: string) => void;
  removeLog: (logId: string) => void;

  // Bucket management
  addBucket: (name: string) => Bucket;
  removeBucket: (bucketId: string) => void;

  // Selectors
  getTodayLogs: () => LogEntry[];
  getUnprocessedItems: () => LogEntry[];
  getProcessedItems: () => LogEntry[];
  getTasks: () => LogEntry[];
  getTodayCaptureStats: () => CaptureStats;
  /** @deprecated use getUnprocessedItems */
  getUnsortedLogs: () => LogEntry[];
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: getAllLogs(),
  buckets: (() =>
    storage.getObject<Bucket[]>(STORAGE_KEYS.BUCKETS) ?? [])(),

  instalog: (options?: InstalogOptions) => {
    const entry = coreInstalog(options);
    set(state => ({logs: [...state.logs, entry]}));

    // Fire NL classification async — only used when the synchronous scoring
    // classifier fell through to 'thought' (no keyword/structural match).
    // If the sync engine produced a confident result we keep it.
    if (entry.text && entry.suggestedType === 'thought' && !isConfidentClassification(entry.text)) {
      classifyWithNL(entry.text).then(nlType => {
        if (nlType !== entry.suggestedType) {
          const updated = updateLog(entry.id, {suggestedType: nlType});
          if (updated) {
            set(state => ({
              logs: state.logs.map(l => (l.id === entry.id ? updated : l)),
            }));
          }
        }
      }).catch(() => {}); // silent — sync result already applied
    }

    return entry;
  },

  // Create a pre-processed entry (skips inbox, goes straight to Library/Review)
  quickCapture: (text: string, type: LogItemType) => {
    const entry = coreInstalog({text});
    const processed = updateLog(entry.id, {
      status: 'processed',
      type,
      suggestedType: type,
    });
    const final = processed ?? entry;
    set(state => ({logs: [...state.logs, final]}));
    return final;
  },

  refreshLogs: () => set({logs: getAllLogs()}),

  refreshBuckets: () => {
    const buckets = storage.getObject<Bucket[]>(STORAGE_KEYS.BUCKETS) ?? [];
    set({buckets});
  },

  assignBucket: (logId, bucketId) => {
    const updated = updateLog(logId, {
      bucketId,
      status: 'processed',
      type: 'note',
    });
    if (updated) {
      set(state => ({
        logs: state.logs.map(l => (l.id === logId ? updated : l)),
      }));
    }
  },

  processItem: (logId, type) => {
    const entry = get().logs.find(l => l.id === logId);
    // Record correction so the scorer learns from overrides
    if (entry?.text && entry.suggestedType && type && type !== entry.suggestedType) {
      recordCorrection(entry.text, entry.suggestedType, type);
    }
    const updated = updateLog(logId, {
      status: 'processed',
      type,
    });
    if (updated) {
      set(state => ({
        logs: state.logs.map(l => (l.id === logId ? updated : l)),
      }));
    }
  },

  archiveItem: (logId) => {
    const updated = updateLog(logId, {
      status: 'archived',
      archived: true,
    });
    if (updated) {
      set(state => ({
        logs: state.logs.map(l => (l.id === logId ? updated : l)),
      }));
    }
  },

  removeLog: (logId) => {
    const success = deleteLog(logId);
    if (success) {
      set(state => ({logs: state.logs.filter(l => l.id !== logId)}));
    }
  },

  addBucket: (name) => {
    const bucket: Bucket = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
    };
    const updated = [...get().buckets, bucket];
    storage.setObject(STORAGE_KEYS.BUCKETS, updated);
    set({buckets: updated});
    return bucket;
  },

  removeBucket: (bucketId) => {
    const updated = get().buckets.filter(b => b.id !== bucketId);
    storage.setObject(STORAGE_KEYS.BUCKETS, updated);
    set({buckets: updated});
  },

  getTodayLogs: () => {
    const today = getTodayDateKey();
    return get().logs.filter(l => l.dateKey === today);
  },

  getUnprocessedItems: () => {
    const today = getTodayDateKey();
    return get().logs.filter(
      l => l.dateKey === today && (l.status ?? 'unprocessed') === 'unprocessed' && !l.archived,
    );
  },

  getProcessedItems: () => {
    return get().logs.filter(
      l => (l.status ?? 'unprocessed') === 'processed' && !l.archived,
    );
  },

  getTasks: () => {
    return get().logs.filter(l => l.type === 'task' && !l.archived);
  },

  getTodayCaptureStats: () => {
    const today = getTodayDateKey();
    const todayLogs = get().logs.filter(l => l.dateKey === today);
    const processed = todayLogs.filter(l => (l.status ?? 'unprocessed') === 'processed');
    const unprocessed = todayLogs.filter(l => (l.status ?? 'unprocessed') === 'unprocessed' && !l.archived);
    const archived = todayLogs.filter(l => l.archived);
    return {
      totalCaptured: todayLogs.length,
      totalProcessed: processed.length,
      totalUnprocessed: unprocessed.length,
      totalArchived: archived.length,
      totalTasks: processed.filter(l => l.type === 'task').length,
      totalNotes: processed.filter(l => l.type !== 'task').length,
    };
  },

  // Backward compat
  getUnsortedLogs: () => {
    const today = getTodayDateKey();
    return get().logs.filter(
      l => l.dateKey === today && !l.bucketId && (l.status ?? 'unprocessed') === 'unprocessed',
    );
  },
}));

