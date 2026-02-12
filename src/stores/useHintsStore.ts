/**
 * Hints Store
 * Tracks which onboarding micro-hints have been shown
 */

import {create} from 'zustand';
import {storage, STORAGE_KEYS} from '../storage/mmkv';

interface HintsState {
  hasSeenFirstTap: boolean;
  hasSeenWrapUpToast: boolean;
  hasSeenWrapUpOverlay: boolean;
  hasSeenWidgetHint: boolean;
  
  markFirstTapSeen: () => void;
  markWrapUpToastSeen: () => void;
  markWrapUpOverlaySeen: () => void;
  markWidgetHintSeen: () => void;
  loadHints: () => void;
}

export const useHintsStore = create<HintsState>((set) => ({
  hasSeenFirstTap: false,
  hasSeenWrapUpToast: false,
  hasSeenWrapUpOverlay: false,
  hasSeenWidgetHint: false,
  
  markFirstTapSeen: () => {
    const hints = storage.getObject<any>(STORAGE_KEYS.HINTS) ?? {};
    hints.hasSeenFirstTap = true;
    storage.setObject(STORAGE_KEYS.HINTS, hints);
    set({hasSeenFirstTap: true});
  },
  
  markWrapUpToastSeen: () => {
    const hints = storage.getObject<any>(STORAGE_KEYS.HINTS) ?? {};
    hints.hasSeenWrapUpToast = true;
    storage.setObject(STORAGE_KEYS.HINTS, hints);
    set({hasSeenWrapUpToast: true});
  },
  
  markWrapUpOverlaySeen: () => {
    const hints = storage.getObject<any>(STORAGE_KEYS.HINTS) ?? {};
    hints.hasSeenWrapUpOverlay = true;
    storage.setObject(STORAGE_KEYS.HINTS, hints);
    set({hasSeenWrapUpOverlay: true});
  },
  
  markWidgetHintSeen: () => {
    const hints = storage.getObject<any>(STORAGE_KEYS.HINTS) ?? {};
    hints.hasSeenWidgetHint = true;
    storage.setObject(STORAGE_KEYS.HINTS, hints);
    set({hasSeenWidgetHint: true});
  },
  
  loadHints: () => {
    const hints = storage.getObject<any>(STORAGE_KEYS.HINTS) ?? {};
    set({
      hasSeenFirstTap: hints.hasSeenFirstTap ?? false,
      hasSeenWrapUpToast: hints.hasSeenWrapUpToast ?? false,
      hasSeenWrapUpOverlay: hints.hasSeenWrapUpOverlay ?? false,
      hasSeenWidgetHint: hints.hasSeenWidgetHint ?? false,
    });
  },
}));
