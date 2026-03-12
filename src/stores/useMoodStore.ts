/**
 * Zustand store for daily brain mood.
 *
 * One mood per day. Optional, fast, no pressure.
 */

import {create} from 'zustand';
import {BrainMood, DailyMoodEntry} from '../models/types';
import {storage, STORAGE_KEYS} from '../storage/mmkv';
import {getTodayDateKey} from '../models/types';

interface MoodState {
  entries: DailyMoodEntry[];

  /** Set (or update) today's mood. */
  setTodayMood: (mood: BrainMood) => void;

  /** Clear today's mood (deselect). */
  clearTodayMood: () => void;

  /** Return today's mood, or null if not set. */
  getTodayMood: () => BrainMood | null;

  /** Return all entries, newest first. */
  getHistory: () => DailyMoodEntry[];
}

const loadEntries = (): DailyMoodEntry[] =>
  storage.getObject<DailyMoodEntry[]>(STORAGE_KEYS.MOOD_ENTRIES) ?? [];

const saveEntries = (entries: DailyMoodEntry[]) =>
  storage.setObject(STORAGE_KEYS.MOOD_ENTRIES, entries);

export const useMoodStore = create<MoodState>((set, get) => ({
  entries: loadEntries(),

  setTodayMood: (mood) => {
    const today = getTodayDateKey();
    const existing = get().entries;
    const idx = existing.findIndex(e => e.date === today);
    let updated: DailyMoodEntry[];

    if (idx !== -1) {
      updated = existing.map((e, i) =>
        i === idx ? {...e, mood, updatedAt: new Date().toISOString()} : e,
      );
    } else {
      const newEntry: DailyMoodEntry = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        date: today,
        mood,
        createdAt: new Date().toISOString(),
      };
      updated = [...existing, newEntry];
    }

    saveEntries(updated);
    set({entries: updated});
  },

  clearTodayMood: () => {
    const today = getTodayDateKey();
    const updated = get().entries.filter(e => e.date !== today);
    saveEntries(updated);
    set({entries: updated});
  },

  getTodayMood: () => {
    const today = getTodayDateKey();
    return get().entries.find(e => e.date === today)?.mood ?? null;
  },

  getHistory: () =>
    [...get().entries].sort((a, b) => b.date.localeCompare(a.date)),
}));
