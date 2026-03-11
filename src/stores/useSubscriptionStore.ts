/**
 * Subscription Store
 * Manages Pro subscription state and log limits
 */

import {create} from 'zustand';
import {NativeModules, Platform} from 'react-native';
import {storage, STORAGE_KEYS} from '../storage/mmkv';

const {StoreKitModule} = NativeModules;

// Constants - Logs are unlimited for free users; Pro gates power features
export const FREE_BUCKET_LIMIT = 3;
export const FREE_WIDGET_PRESET_LIMIT = 1;

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
  hasSeenPaywall: boolean;
  
  // Actions
  refreshSubscription: () => Promise<void>;
  loadProducts: () => Promise<void>;
  purchase: (productId: string) => Promise<boolean>;
  incrementLogCount: () => void;
  markPaywallSeen: () => void;
  setPro: (isPro: boolean) => void;
  restorePurchases: () => Promise<boolean>;
}

// Storage keys for subscription data
const SUB_KEYS = {
  TIER: '@instalog/subscription_tier',
  PAYWALL_SEEN: '@instalog/paywall_seen',
} as const;

const {WidgetPresetsModule} = NativeModules;

// Sync subscription status to widget (for paywall enforcement)
const syncToWidget = async (isPro: boolean, totalLogCount: number) => {
  if (Platform.OS === 'ios' && WidgetPresetsModule?.syncSubscriptionStatus) {
    try {
      await WidgetPresetsModule.syncSubscriptionStatus(isPro, totalLogCount, 0);
    } catch (error) {
      console.warn('Failed to sync subscription to widget:', error);
    }
  }
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  tier: 'free',
  isPro: false,
  products: [],
  isLoadingProducts: false,
  totalLogCount: 0,
  hasSeenPaywall: false,
  
  refreshSubscription: async () => {
    // Load saved tier
    const savedTier = storage.getString(SUB_KEYS.TIER) as SubscriptionTier | undefined;
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
      hasSeenPaywall: paywallSeen,
    });
    
    // Sync to widget
    syncToWidget(isPro, totalLogCount);
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
    
    set({ totalLogCount: newCount });
    
    // Sync to widget
    syncToWidget(state.isPro, newCount);
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
    });
    
    // Sync to widget for paywall enforcement
    syncToWidget(isPro, state.totalLogCount);
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
