/**
 * Core data types for Instalog
 * Keep minimal - momentum preservation means no extra fields
 */

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string for serialization
  text?: string | null;
  bucketId?: string | null;
  dateKey: string; // YYYY-MM-DD format
}

export interface Bucket {
  id: string;
  name: string;
}

/**
 * Helper to get today's dateKey
 */
export const getTodayDateKey = (): string => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

/**
 * Helper to format time for display
 */
export const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
