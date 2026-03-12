/**
 * Core data types for Instalog
 * Capture → Process → Act → Reflect
 */

// What kind of item this is (set during Inbox processing)
export type LogItemType = 'task' | 'note' | 'idea' | 'thought' | 'mood' | null;

// Lifecycle state
export type LogStatus = 'unprocessed' | 'processed' | 'archived';

export interface LogEntry {
  id: string;
  timestamp: string; // ISO string for serialization
  text?: string | null;
  bucketId?: string | null;
  dateKey: string; // YYYY-MM-DD format

  // Processing fields (added in v2 — may be absent on legacy entries)
  status?: LogStatus;          // defaults to 'unprocessed'
  suggestedType?: LogItemType; // auto-classified on capture (never null after v3)
  type?: LogItemType;          // finalType — confirmed by user in Inbox
  source?: 'manual' | 'widget'; // how it was captured
  archived?: boolean;          // soft-delete
  updatedAt?: string;          // ISO string when last processed
}

export interface Bucket {
  id: string;
  name: string;
}

// ─── Brain Mood ───────────────────────────────────────────────────────────────

export type BrainMood = 'calm' | 'neutral' | 'tired' | 'overwhelmed' | 'motivated';

export interface DailyMoodEntry {
  id: string;
  date: string;      // YYYY-MM-DD
  mood: BrainMood;
  createdAt: string; // ISO string
  updatedAt?: string;
}

export type RecurrenceType = 'daily' | 'weekdays' | 'weekends';

export interface Task {
  id: string;
  text: string;
  createdAt: string; // ISO string
  dateKey: string; // YYYY-MM-DD
  dueTime?: string | null; // ISO string for reminder time
  durationMinutes?: number | null;
  completedAt?: string | null; // ISO string when completed
  snoozedUntil?: string | null; // ISO string
  notificationId?: string | null; // for cancelling scheduled notifications
  // Recurrence
  recurrence?: RecurrenceType | null; // null = one-off
  isRecurringTemplate?: boolean; // true = the master template, never shown in task list
  recurringTemplateId?: string | null; // links a spawned task back to its template
}

/**
 * Helper to get today's dateKey (local timezone)
 */
export const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ─── Widget Types ─────────────────────────────────────────────────────────────

export type WidgetActionType = 'thought' | 'task' | 'idea' | 'mood' | 'brainDump';

export interface WidgetActionConfig {
  id: string;
  type: WidgetActionType;
  label: string;
  icon: string;           // SF Symbol name passed to iOS widget
  defaultBucketId: string | null;
  saveInstantly: boolean; // true = fires AppIntent; false = deep link
  openAppAfterTap: boolean;
}

export interface WidgetConfigState {
  layout: 'single' | 'multi';
  actions: WidgetActionConfig[];
  sendToInboxByDefault: boolean;
  showUnprocessedCount: boolean;
  showTodayMood: boolean;
}

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
