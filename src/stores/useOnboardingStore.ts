/**
 * Onboarding Store
 * Tracks whether user has completed onboarding
 */

import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY = '@instalog/hasSeenOnboarding';

interface OnboardingState {
  hasSeenOnboarding: boolean;
  isLoading: boolean;
  loadOnboardingState: () => Promise<void>;
  completeOnboarding: () => void;
  resetOnboarding: () => void; // For testing
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  hasSeenOnboarding: false,
  isLoading: true,

  loadOnboardingState: async () => {
    try {
      const value = await AsyncStorage.getItem(ONBOARDING_KEY);
      set({
        hasSeenOnboarding: value === 'true',
        isLoading: false,
      });
    } catch (error) {
      console.error('Error loading onboarding state:', error);
      set({isLoading: false});
    }
  },

  completeOnboarding: () => {
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(console.error);
    set({hasSeenOnboarding: true});
  },

  resetOnboarding: () => {
    AsyncStorage.removeItem(ONBOARDING_KEY).catch(console.error);
    set({hasSeenOnboarding: false});
  },
}));
