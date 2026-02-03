/**
 * Instalog - Momentum preservation through instant logging
 * Dark-first design with NativeWind
 *
 * @format
 */

import React, {useEffect, useState} from 'react';
import {StatusBar, View, Text, Linking, Platform, AppState, NativeModules} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {storage} from './src/storage/mmkv';
import {useLogStore} from './src/stores/useLogStore';
import {useSubscriptionStore} from './src/stores/useSubscriptionStore';
import {useHintsStore} from './src/stores/useHintsStore';

const {StoreKitModule} = NativeModules;

function App(): React.JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const instalog = useLogStore(state => state.instalog);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const refreshBuckets = useLogStore(state => state.refreshBuckets);
  const refreshSubscription = useSubscriptionStore(state => state.refreshSubscription);
  const loadHints = useHintsStore(state => state.loadHints);

  useEffect(() => {
    // Initialize storage
    storage.init().then(() => {
      // Refresh store data after storage is ready
      refreshLogs();
      refreshBuckets();
      refreshSubscription();
      loadHints();
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
        await storage.reloadFromAppGroup();
        refreshLogs();
        refreshBuckets();
        refreshSubscription();
      }
    });

    // Handle deep links (iOS Widget, Siri Shortcuts)
    const handleURL = (event: {url: string}) => {
      const url = event.url;
      
      // instalog://log - Quick log from widget or Siri
      if (url.includes('instalog://log')) {
        instalog({text: null});
      }
    };

    // Listen for URL events
    const subscription = Linking.addEventListener('url', handleURL);

    // Check if app was opened with a URL
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleURL({url});
      }
    });

    return () => {
      appStateSubscription.remove();
      subscription.remove();
    };
  }, [instalog, refreshLogs, refreshBuckets]);

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
