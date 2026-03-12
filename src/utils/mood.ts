/**
 * Mood utilities for Instalog.
 *
 * Lightweight helpers for the daily brain mood feature.
 * Fast, optional, zero-pressure.
 */

import {ImageSourcePropType} from 'react-native';
import {BrainMood, DailyMoodEntry} from '../models/types';
import {MOODS} from './moods';

// ─── Metadata ─────────────────────────────────────────────────────────────────

interface MoodMeta {
  mascot: ImageSourcePropType;
  label: string;
  color: string;
}

export const MOOD_META: Record<BrainMood, MoodMeta> = {
  calm:       {mascot: MOODS.chill,    label: 'Calm',        color: '#6EF2A8'},
  neutral:    {mascot: MOODS.cheerful, label: 'Neutral',     color: '#9AA0A6'},
  tired:      {mascot: MOODS.sad,      label: 'Tired',       color: '#6EE0F2'},
  overwhelmed:{mascot: MOODS.shocked,  label: 'Overwhelmed', color: '#F29B6E'},
  motivated:  {mascot: MOODS.happy,    label: 'Motivated',   color: '#6E6AF2'},
};

export const MOOD_ORDER: BrainMood[] = ['calm', 'neutral', 'tired', 'overwhelmed', 'motivated'];

export const getMoodLabel = (mood: BrainMood): string => MOOD_META[mood].label;
export const getMoodColor = (mood: BrainMood): string => MOOD_META[mood].color;

// ─── Stats ────────────────────────────────────────────────────────────────────

export interface MoodStats {
  mood: BrainMood;
  mascot: ImageSourcePropType;
  label: string;
  color: string;
  count: number;
}

/**
 * Count occurrences of each mood within the last `days` days.
 */
export const getMoodStats = (entries: DailyMoodEntry[], days: number): MoodStats[] => {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days + 1);
  const cutoffKey = cutoff.toISOString().split('T')[0];

  const counts: Record<BrainMood, number> = {
    calm: 0, neutral: 0, tired: 0, overwhelmed: 0, motivated: 0,
  };

  for (const entry of entries) {
    if (entry.date >= cutoffKey) {
      counts[entry.mood] = (counts[entry.mood] || 0) + 1;
    }
  }

  return MOOD_ORDER.map(mood => ({
    mood,
    mascot: MOOD_META[mood].mascot,
    label: MOOD_META[mood].label,
    color: MOOD_META[mood].color,
    count: counts[mood],
  }));
};

/**
 * Get the most recent N mood entries sorted newest first.
 */
export const getMoodHistory = (entries: DailyMoodEntry[], limit = 7): DailyMoodEntry[] =>
  [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
