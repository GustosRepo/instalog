/**
 * Hints Store
 * Tracks which onboarding micro-hints have been shown
 */

import {create} from 'zustand';
import {storage} from '../storage/mmkv';

const HINTS_KEY = 'hints';

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
    const hints = storage.getObject<any>(HINTS_KEY) ?? {};
    hints.hasSeenFirstTap = true;
    storage.setObject(HINTS_KEY, hints);
    set({hasSeenFirstTap: true});
  },
  
  markWrapUpToastSeen: () => {
    const hints = storage.getObject<any>(HINTS_KEY) ?? {};
    hints.hasSeenWrapUpToast = true;
    storage.setObject(HINTS_KEY, hints);
    set({hasSeenWrapUpToast: true});
  },
  
  markWrapUpOverlaySeen: () => {
    const hints = storage.getObject<any>(HINTS_KEY) ?? {};
    hints.hasSeenWrapUpOverlay = true;
    storage.setObject(HINTS_KEY, hints);
    set({hasSeenWrapUpOverlay: true});
  },
  
  markWidgetHintSeen: () => {
    const hints = storage.getObject<any>(HINTS_KEY) ?? {};
    hints.hasSeenWidgetHint = true;
    storage.setObject(HINTS_KEY, hints);
    set({hasSeenWidgetHint: true});
  },
  
  loadHints: () => {
    const hints = storage.getObject<any>(HINTS_KEY) ?? {};
    set({
      hasSeenFirstTap: hints.hasSeenFirstTap ?? false,
      hasSeenWrapUpToast: hints.hasSeenWrapUpToast ?? false,
      hasSeenWrapUpOverlay: hints.hasSeenWrapUpOverlay ?? false,
      hasSeenWidgetHint: hints.hasSeenWidgetHint ?? false,
    });
  },
}));
