/**
 * Haptic Feedback Utilities
 * Provides different haptic patterns for various app actions
 * Using built-in Vibration API for simplicity
 */

import {Vibration} from 'react-native';

export const Haptics = {
  /**
   * Light tap - for button presses, selections
   */
  light: () => {
    Vibration.vibrate(10);
  },

  /**
   * Medium tap - for log creation, confirmations
   */
  medium: () => {
    Vibration.vibrate(30);
  },

  /**
   * Heavy tap - for deletions, important actions
   */
  heavy: () => {
    Vibration.vibrate(50);
  },

  /**
   * Success - for completed actions (double tap pattern)
   */
  success: () => {
    Vibration.vibrate([0, 40, 60, 40]);
  },

  /**
   * Warning - for destructive or cautionary actions
   */
  warning: () => {
    Vibration.vibrate([0, 30, 80, 30]);
  },

  /**
   * Selection - for picker/selector interactions
   */
  selection: () => {
    Vibration.vibrate(5);
  },
};
