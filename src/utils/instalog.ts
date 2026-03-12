/**
 * Core instalog() function
 *
 * This is the heart of the app - instant log capture.
 * Zero decisions at capture time - just dump it.
 *
 * Callable from: React components, iOS Widget, Siri Shortcut.
 */

import {LogEntry, getTodayDateKey} from '../models/types';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {categorizeLog} from './categorize';

export interface InstalogOptions {
  text?: string | null;
  source?: 'manual' | 'widget';
}

const generateId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Migrate a legacy log entry to the v2 schema.
 * Legacy entries don't have status/type/source — infer sensible defaults.
 */
export const migrateEntry = (entry: any): LogEntry => ({
  ...entry,
  status: entry.status ?? (entry.bucketId ? 'processed' : 'unprocessed'),
  suggestedType: entry.suggestedType ?? entry.type ?? null,
  type: entry.type ?? null,
  source: entry.source ?? 'manual',
  archived: entry.archived ?? false,
});

/**
 * Creates and saves a new log entry instantly.
 */
export const instalog = (options?: InstalogOptions): LogEntry => {
  const now = new Date();

  const entry: LogEntry = {
    id: generateId(),
    timestamp: now.toISOString(),
    text: options?.text ?? null,
    bucketId: null,
    dateKey: getTodayDateKey(),
    status: 'unprocessed',
    suggestedType: options?.text ? categorizeLog(options.text) : 'thought',
    type: null,
    source: options?.source ?? 'manual',
    archived: false,
  };

  const existing = storage.getObject<LogEntry[]>(STORAGE_KEYS.LOGS) ?? [];
  storage.setObject(STORAGE_KEYS.LOGS, [...existing, entry]);

  return entry;
};

/**
 * Get all logs from storage, migrating legacy entries on the fly.
 */
export const getAllLogs = (): LogEntry[] => {
  const raw = storage.getObject<any[]>(STORAGE_KEYS.LOGS) ?? [];
  return raw.map(migrateEntry);
};

export const getLogsByDate = (dateKey: string): LogEntry[] =>
  getAllLogs().filter(l => l.dateKey === dateKey);

export const getTodayLogs = (): LogEntry[] =>
  getLogsByDate(getTodayDateKey());

/**
 * Update a log entry.
 */
export const updateLog = (id: string, updates: Partial<LogEntry>): LogEntry | null => {
  const all = getAllLogs();
  const idx = all.findIndex(l => l.id === id);
  if (idx === -1) return null;

  const updated = {...all[idx], ...updates, updatedAt: new Date().toISOString()};
  all[idx] = updated;
  storage.setObject(STORAGE_KEYS.LOGS, all);
  return updated;
};

/**
 * Delete a log entry permanently.
 */
export const deleteLog = (id: string): boolean => {
  const all = getAllLogs();
  const filtered = all.filter(l => l.id !== id);
  if (filtered.length === all.length) return false;
  storage.setObject(STORAGE_KEYS.LOGS, filtered);
  return true;
};

