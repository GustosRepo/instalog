/**
 * Zustand store for log state management
 * Keeps UI in sync with MMKV storage
 */

import {create} from 'zustand';
import {LogEntry, Bucket, getTodayDateKey} from '../models/types';
import {
  instalog as coreInstalog,
  getAllLogs,
  updateLog,
  deleteLog,
  InstalogOptions,
} from '../utils/instalog';
import {storage, STORAGE_KEYS} from '../storage/mmkv';

interface LogState {
  logs: LogEntry[];
  buckets: Bucket[];

  // Actions
  instalog: (options?: InstalogOptions) => LogEntry;
  refreshLogs: () => void;
  refreshBuckets: () => void;
  assignBucket: (logId: string, bucketId: string | null) => void;
  removeLog: (logId: string) => void;

  // Bucket actions
  addBucket: (name: string) => Bucket;
  removeBucket: (bucketId: string) => void;

  // Selectors
  getTodayLogs: () => LogEntry[];
  getUnsortedLogs: () => LogEntry[];
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: getAllLogs(),
  buckets: storage.getObject<Bucket[]>(STORAGE_KEYS.BUCKETS) ?? [],

  instalog: (options?: InstalogOptions) => {
    const entry = coreInstalog(options);
    set(state => ({logs: [...state.logs, entry]}));
    return entry;
  },

  refreshLogs: () => {
    set({logs: getAllLogs()});
  },

  refreshBuckets: () => {
    set({buckets: storage.getObject<Bucket[]>(STORAGE_KEYS.BUCKETS) ?? []});
  },

  assignBucket: (logId: string, bucketId: string | null) => {
    const updated = updateLog(logId, {bucketId});
    if (updated) {
      set(state => ({
        logs: state.logs.map(log => (log.id === logId ? updated : log)),
      }));
    }
  },

  removeLog: (logId: string) => {
    const success = deleteLog(logId);
    if (success) {
      set(state => ({
        logs: state.logs.filter(log => log.id !== logId),
      }));
    }
  },

  addBucket: (name: string) => {
    const bucket: Bucket = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
    };
    const updatedBuckets = [...get().buckets, bucket];
    storage.setObject(STORAGE_KEYS.BUCKETS, updatedBuckets);
    set({buckets: updatedBuckets});
    return bucket;
  },

  removeBucket: (bucketId: string) => {
    const updatedBuckets = get().buckets.filter(b => b.id !== bucketId);
    storage.setObject(STORAGE_KEYS.BUCKETS, updatedBuckets);
    set({buckets: updatedBuckets});
  },

  getTodayLogs: () => {
    const todayKey = getTodayDateKey();
    return get().logs.filter(log => log.dateKey === todayKey);
  },

  getUnsortedLogs: () => {
    const todayKey = getTodayDateKey();
    // Only show logs from today that haven't been archived or sorted into buckets
    // bucketId is null/undefined = needs to be processed
    return get()
      .logs.filter(log => log.dateKey === todayKey && !log.bucketId);
  },
}));
