/**
 * Subscription Store
 * Manages Pro subscription state and log limits
 */

import {create} from 'zustand';
import {NativeModules, Platform} from 'react-native';
import {storage, STORAGE_KEYS} from '../storage/mmkv';

const {StoreKitModule} = NativeModules;

// Constants
export const FREE_LOG_LIMIT = 25;
export const FREE_BUCKET_LIMIT = 3;
export const FREE_WIDGET_PRESET_LIMIT = 1;
export const SOFT_PROMPT_THRESHOLD = 10; // 40% through free tier
export const BADGE_THRESHOLD = 18; // 72% through free tier

export type SubscriptionTier = 'free' | 'pro';

export interface Product {
  id: string;
  displayName: string;
  description: string;
  price: string;
  displayPrice: string;
  type: string;
}

interface SubscriptionState {
  tier: SubscriptionTier;
  isPro: boolean;
  products: Product[];
  isLoadingProducts: boolean;
  
  // Tracking
  totalLogCount: number;
  hasSeenSoftPrompt: boolean;
  hasSeenPaywall: boolean;
  
  // Computed
  canCreateLog: boolean;
  shouldShowSoftPrompt: boolean;
  shouldShowBadge: boolean;
  logsRemaining: number;
  
  // Actions
  refreshSubscription: () => Promise<void>;
  loadProducts: () => Promise<void>;
  purchase: (productId: string) => Promise<boolean>;
  incrementLogCount: () => void;
  markSoftPromptSeen: () => void;
  markPaywallSeen: () => void;
  setPro: (isPro: boolean) => void;
  restorePurchases: () => Promise<boolean>;
}

// Storage keys for subscription data
const SUB_KEYS = {
  TIER: '@instalog/subscription_tier',
  SOFT_PROMPT_SEEN: '@instalog/soft_prompt_seen',
  PAYWALL_SEEN: '@instalog/paywall_seen',
} as const;

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'free',
  isPro: false,
  products: [],
  isLoadingProducts: false,
  totalLogCount: 0,
  hasSeenSoftPrompt: false,
  hasSeenPaywall: false,
  
  // Computed getters
  get canCreateLog() {
    const state = get();
    return state.isPro || state.totalLogCount < FREE_LOG_LIMIT;
  },
  
  get shouldShowSoftPrompt() {
    const state = get();
    return !state.isPro && 
           !state.hasSeenSoftPrompt && 
           state.totalLogCount >= SOFT_PROMPT_THRESHOLD;
  },
  
  get shouldShowBadge() {
    const state = get();
    return !state.isPro && state.totalLogCount >= BADGE_THRESHOLD;
  },
  
  get logsRemaining() {
    const state = get();
    if (state.isPro) return Infinity;
    return Math.max(0, FREE_LOG_LIMIT - state.totalLogCount);
  },
  
  refreshSubscription: async () => {
    // Load saved tier
    const savedTier = storage.getString(SUB_KEYS.TIER) as SubscriptionTier | undefined;
    const softPromptSeen = storage.getString(SUB_KEYS.SOFT_PROMPT_SEEN) === 'true';
    const paywallSeen = storage.getString(SUB_KEYS.PAYWALL_SEEN) === 'true';
    
    // Count total logs
    const logs = storage.getObject<any[]>(STORAGE_KEYS.LOGS) ?? [];
    const totalLogCount = logs.length;
    
    let isPro = savedTier === 'pro';
    
    // Check with StoreKit for actual subscription status (iOS only)
    if (Platform.OS === 'ios' && StoreKitModule) {
      try {
        const status = await StoreKitModule.checkSubscriptionStatus();
        isPro = status.isPro;
        if (isPro) {
          storage.setString(SUB_KEYS.TIER, 'pro');
        }
      } catch (error) {
        console.warn('Failed to check subscription status:', error);
      }
    }
    
    set({
      tier: isPro ? 'pro' : 'free',
      isPro,
      totalLogCount,
      hasSeenSoftPrompt: softPromptSeen,
      hasSeenPaywall: paywallSeen,
      canCreateLog: isPro || totalLogCount < FREE_LOG_LIMIT,
      shouldShowSoftPrompt: !isPro && !softPromptSeen && totalLogCount >= SOFT_PROMPT_THRESHOLD,
      shouldShowBadge: !isPro && totalLogCount >= BADGE_THRESHOLD,
      logsRemaining: isPro ? Infinity : Math.max(0, FREE_LOG_LIMIT - totalLogCount),
    });
  },
  
  loadProducts: async () => {
    if (Platform.OS !== 'ios' || !StoreKitModule) {
      return;
    }
    
    set({isLoadingProducts: true});
    
    try {
      const products = await StoreKitModule.loadProducts();
      set({products, isLoadingProducts: false});
    } catch (error) {
      console.warn('Failed to load products:', error);
      set({isLoadingProducts: false});
    }
  },
  
  purchase: async (productId: string) => {
    if (Platform.OS !== 'ios' || !StoreKitModule) {
      return false;
    }
    
    try {
      const result = await StoreKitModule.purchase(productId);
      
      if (result.success) {
        get().setPro(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Purchase failed:', error);
      return false;
    }
  },
  
  incrementLogCount: () => {
    const state = get();
    const newCount = state.totalLogCount + 1;
    const isPro = state.isPro;
    
    set({
      totalLogCount: newCount,
      canCreateLog: isPro || newCount < FREE_LOG_LIMIT,
      shouldShowSoftPrompt: !isPro && !state.hasSeenSoftPrompt && newCount >= SOFT_PROMPT_THRESHOLD,
      shouldShowBadge: !isPro && newCount >= BADGE_THRESHOLD,
      logsRemaining: isPro ? Infinity : Math.max(0, FREE_LOG_LIMIT - newCount),
    });
  },
  
  markSoftPromptSeen: () => {
    storage.setString(SUB_KEYS.SOFT_PROMPT_SEEN, 'true');
    set({hasSeenSoftPrompt: true, shouldShowSoftPrompt: false});
  },
  
  markPaywallSeen: () => {
    storage.setString(SUB_KEYS.PAYWALL_SEEN, 'true');
    set({hasSeenPaywall: true});
  },
  
  setPro: (isPro: boolean) => {
    const tier = isPro ? 'pro' : 'free';
    storage.setString(SUB_KEYS.TIER, tier);
    
    const state = get();
    set({
      tier,
      isPro,
      canCreateLog: true,
      shouldShowSoftPrompt: false,
      shouldShowBadge: false,
      logsRemaining: isPro ? Infinity : Math.max(0, FREE_LOG_LIMIT - state.totalLogCount),
    });
  },
  
  restorePurchases: async () => {
    if (Platform.OS !== 'ios' || !StoreKitModule) {
      return false;
    }
    
    try {
      const result = await StoreKitModule.restorePurchases();
      
      if (result.restored) {
        get().setPro(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.warn('Failed to restore purchases:', error);
      return false;
    }
  },
}));
