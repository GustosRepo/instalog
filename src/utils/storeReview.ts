/**
 * App Store review prompt
 * Calm, non-intrusive — only asks at meaningful moments
 * Enforces a 30-day cooldown so users are never pestered
 */

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LAST_REVIEW_KEY = '@instalog/last_review_prompt';
const COOLDOWN_DAYS = 30;

/**
 * Request an App Store review if conditions are met:
 * - StoreReview is available on this device
 * - At least 30 days since the last prompt (or never prompted)
 */
export const maybeRequestReview = async (): Promise<void> => {
  try {
    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) return;

    const lastPromptStr = await AsyncStorage.getItem(LAST_REVIEW_KEY);
    if (lastPromptStr) {
      const daysSince = (Date.now() - parseInt(lastPromptStr, 10)) / (1000 * 60 * 60 * 24);
      if (daysSince < COOLDOWN_DAYS) return;
    }

    await StoreReview.requestReview();
    await AsyncStorage.setItem(LAST_REVIEW_KEY, Date.now().toString());
  } catch {
    // Review prompts are best-effort — never crash over this
  }
};
