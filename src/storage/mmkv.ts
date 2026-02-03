/**
 * AsyncStorage setup for Instalog with App Group sync
 * Syncs logs with iOS Widget via App Group UserDefaults
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';

const {WidgetPresetsModule} = NativeModules;

// Storage keys
export const STORAGE_KEYS = {
  LOGS: '@instalog/logs',
  BUCKETS: '@instalog/buckets',
} as const;

// Check if we can use App Group storage (iOS with native module)
const canUseAppGroup = Platform.OS === 'ios' && !!WidgetPresetsModule;

/**
 * Storage wrapper with synchronous-like API
 * Uses in-memory cache for instant reads
 */
class Storage {
  private cache: Map<string, string> = new Map();
  private initialized = false;

  async init(): Promise<void> {
    if (this.initialized) return;

    // Load from App Group first if available (iOS widget may have added logs)
    if (canUseAppGroup) {
      try {
        const logsJson = await WidgetPresetsModule.loadLogs();
        if (logsJson && logsJson !== '[]') {
          this.cache.set(STORAGE_KEYS.LOGS, logsJson);
          // Also save to AsyncStorage as backup
          await AsyncStorage.setItem(STORAGE_KEYS.LOGS, logsJson);
        }
      } catch (error) {
        console.warn('Failed to load from App Group on init', error);
      }
    }

    const keys = Object.values(STORAGE_KEYS);
    const pairs = await AsyncStorage.multiGet(keys);
    pairs.forEach(([key, value]) => {
      if (value && !this.cache.has(key)) {
        this.cache.set(key, value);
      }
    });
    this.initialized = true;
  }

  getString(key: string): string | undefined {
    return this.cache.get(key);
  }

  setString(key: string, value: string): void {
    this.cache.set(key, value);
    AsyncStorage.setItem(key, value);
    
    // Also save logs to App Group for widget access
    if (canUseAppGroup && key === STORAGE_KEYS.LOGS) {
      WidgetPresetsModule.saveLogs(value).catch((error: Error) => {
        console.warn('Failed to save logs to App Group', error);
      });
    }
  }

  getObject<T>(key: string): T | null {
    const value = this.cache.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  setObject<T>(key: string, value: T): void {
    const json = JSON.stringify(value);
    this.cache.set(key, json);
    AsyncStorage.setItem(key, json);
    
    // Also save logs to App Group for widget access
    if (canUseAppGroup && key === STORAGE_KEYS.LOGS) {
      WidgetPresetsModule.saveLogs(json).catch((error: Error) => {
        console.warn('Failed to save logs to App Group', error);
      });
    }
  }

  delete(key: string): void {
    this.cache.delete(key);
    AsyncStorage.removeItem(key);
  }

  clearAll(): void {
    this.cache.clear();
    AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    
    // Also clear App Group data (widget data)
    if (canUseAppGroup) {
      WidgetPresetsModule.saveLogs('[]').catch((error: Error) => {
        console.warn('Failed to clear logs from App Group', error);
      });
      WidgetPresetsModule.setWidgetPresets('[]').catch((error: Error) => {
        console.warn('Failed to clear presets from App Group', error);
      });
    }
  }

  /**
   * Reload logs from App Group (called when app becomes active)
   * Widget may have added logs while app was in background
   */
  async reloadFromAppGroup(): Promise<void> {
    if (!canUseAppGroup) return;
    
    try {
      const logsJson = await WidgetPresetsModule.loadLogs();
      console.log('[AppGroup] Loaded logs:', logsJson?.substring(0, 200));
      if (logsJson && logsJson !== '[]') {
        this.cache.set(STORAGE_KEYS.LOGS, logsJson);
        await AsyncStorage.setItem(STORAGE_KEYS.LOGS, logsJson);
      }
    } catch (error) {
      console.warn('Failed to reload from App Group', error);
    }
  }
}

export const storage = new Storage();

// Alias for compatibility
export const mmkvStorage = storage;
