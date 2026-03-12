/**
 * Instalog - Momentum preservation through instant logging
 * Dark-first design with NativeWind
 *
 * @format
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StatusBar, View, Text, Linking, Platform, AppState, NativeModules} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {CommonActions} from '@react-navigation/native';
import AppNavigator, {navigationRef} from './src/navigation/AppNavigator';
import {storage} from './src/storage/mmkv';
import {useLogStore} from './src/stores/useLogStore';
import {useSubscriptionStore} from './src/stores/useSubscriptionStore';
import {useHintsStore} from './src/stores/useHintsStore';
import {useTaskStore} from './src/stores/useTaskStore';
import {useLanguageStore} from './src/stores/useLanguageStore';
import './src/i18n'; // initialize i18n

const {StoreKitModule} = NativeModules;

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const instalog = useLogStore(state => state.instalog);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const loadSavedLanguage = useLanguageStore(state => state.loadSavedLanguage);
  const refreshBuckets = useLogStore(state => state.refreshBuckets);
  const refreshSubscription = useSubscriptionStore(state => state.refreshSubscription);
  const isPro = useSubscriptionStore(state => state.isPro);
  const loadHints = useHintsStore(state => state.loadHints);
  const spawnRecurringTasks = useTaskStore(state => state.spawnRecurringTasks);
  const refreshTasks = useTaskStore(state => state.refreshTasks);

  const navigateToTab = (tab: string) => {
    navigationRef.dispatch(CommonActions.navigate({name: 'Main', params: {screen: tab}}));
  };

  const handleURL = useCallback((event: {url: string}) => {
    const url = event.url;
    if (!navigationRef.isReady()) return;

    if (url.includes('instalog://tasks')) {
      navigateToTab('Tasks');
    } else if (url.includes('instalog://thoughts') || url.includes('instalog://capture?type=thought')) {
      if (isPro) {
        navigateToTab('Library');
        setTimeout(() => navigationRef.dispatch(CommonActions.navigate({name: 'Thoughts'})), 100);
      } else {
        navigateToTab('Instalog');
      }
    } else if (url.includes('instalog://ideas') || url.includes('instalog://capture?type=idea')) {
      if (isPro) {
        navigateToTab('Library');
        setTimeout(() => navigationRef.dispatch(CommonActions.navigate({name: 'Ideas'})), 100);
      } else {
        navigateToTab('Instalog');
      }
    } else if (url.includes('instalog://notes') || url.includes('instalog://capture?type=note')) {
      if (isPro) {
        navigateToTab('Library');
        setTimeout(() => navigationRef.dispatch(CommonActions.navigate({name: 'Notes'})), 100);
      } else {
        navigateToTab('Instalog');
      }
    } else if (
      url.includes('instalog://capture') ||
      url.includes('instalog://braindump') ||
      url.includes('instalog://mood')
    ) {
      navigateToTab('Instalog');
    } else if (url.includes('instalog://log')) {
      instalog({text: null});
    } else if (url.includes('instalog://paywall')) {
      navigationRef.navigate('Paywall' as never);
    }
  }, [instalog, isPro]);

  // After storage + nav are both ready, process the cold-launch URL.
  // Retries until navigationRef is ready (NavigationContainer mounts after isReady → true).
  useEffect(() => {
    if (!isReady) return;
    Linking.getInitialURL().then((url) => {
      if (!url) return;
      const tryNavigate = (attempts = 0) => {
        if (navigationRef.isReady()) {
          handleURL({url});
        } else if (attempts < 20) {
          setTimeout(() => tryNavigate(attempts + 1), 50);
        }
      };
      tryNavigate();
    });
  }, [isReady, handleURL]);

  useEffect(() => {
    // Initialize storage
    storage.init().then(() => {
      loadSavedLanguage();
      refreshLogs();
      refreshBuckets();
      refreshSubscription();
      loadHints();
      spawnRecurringTasks();
      setIsReady(true);
    });
    
    // TODO: Start StoreKit transaction listener once native module is properly configured
    // if (Platform.OS === 'ios' && StoreKitModule?.startTransactionListener) {
    //   StoreKitModule.startTransactionListener()
    //     .then(() => console.log('StoreKit transaction listener started'))
    //     .catch((error: Error) => console.warn('Failed to start StoreKit listener:', error));
    // }

    // Reload logs when app comes to foreground (widget may have added logs)
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        // Reload from App Group when app becomes active
        // Widget may have added logs or completed tasks while app was backgrounded
        await storage.reloadFromAppGroup();
        refreshLogs();
        refreshBuckets();
        refreshSubscription();
        refreshTasks();
        spawnRecurringTasks();
      }
    });

    // Listen for URL events while app is running (background → foreground)
    const subscription = Linking.addEventListener('url', handleURL);

    return () => {
      appStateSubscription.remove();
      subscription.remove();
    };
  }, [handleURL, refreshLogs, refreshBuckets, refreshTasks, spawnRecurringTasks]);

  if (!isReady) {
    return (
      <View className="flex-1 justify-center items-center bg-dark-bg">
        <Text className="text-text-primary text-2xl font-semibold">Instalog</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0B0D10" />
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
