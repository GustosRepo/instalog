/**
 * Core instalog() function
 *
 * This is the heart of the app - instant log capture.
 * Designed to be callable from:
 * - React components
 * - iOS Widget (via native module)
 * - Siri Shortcut (via native module)
 *
 * Zero decisions at capture time - just log it.
 */

import {LogEntry, getTodayDateKey} from '../models/types';
import {storage, STORAGE_KEYS} from '../storage/mmkv';

export interface InstalogOptions {
  text?: string | null;
}

/**
 * Generate a unique ID without crypto dependencies
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Creates and saves a new log entry instantly
 * @param options - Optional text to include with the log
 * @returns The created LogEntry
 */
export const instalog = (options?: InstalogOptions): LogEntry => {
  const now = new Date();

  const entry: LogEntry = {
    id: generateId(),
    timestamp: now.toISOString(),
    text: options?.text ?? null,
    bucketId: null, // Never assigned at capture time
    dateKey: getTodayDateKey(),
  };

  // Get existing logs and append
  const existingLogs = storage.getObject<LogEntry[]>(STORAGE_KEYS.LOGS) ?? [];
  const updatedLogs = [...existingLogs, entry];

  // Persist immediately
  storage.setObject(STORAGE_KEYS.LOGS, updatedLogs);

  return entry;
};

/**
 * Get all logs from storage
 */
export const getAllLogs = (): LogEntry[] => {
  return storage.getObject<LogEntry[]>(STORAGE_KEYS.LOGS) ?? [];
};

/**
 * Get logs for a specific date
 */
export const getLogsByDate = (dateKey: string): LogEntry[] => {
  const allLogs = getAllLogs();
  return allLogs.filter(log => log.dateKey === dateKey);
};

/**
 * Get today's logs
 */
export const getTodayLogs = (): LogEntry[] => {
  return getLogsByDate(getTodayDateKey());
};

/**
 * Update a log entry (for bucket assignment)
 */
export const updateLog = (id: string, updates: Partial<LogEntry>): LogEntry | null => {
  const allLogs = getAllLogs();
  const index = allLogs.findIndex(log => log.id === id);

  if (index === -1) return null;

  const updatedLog = {...allLogs[index], ...updates};
  allLogs[index] = updatedLog;

  storage.setObject(STORAGE_KEYS.LOGS, allLogs);

  return updatedLog;
};

/**
 * Delete a log entry
 */
export const deleteLog = (id: string): boolean => {
  const allLogs = getAllLogs();
  const filtered = allLogs.filter(log => log.id !== id);

  if (filtered.length === allLogs.length) return false;

  storage.setObject(STORAGE_KEYS.LOGS, filtered);
  return true;
};
