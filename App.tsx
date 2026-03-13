/**
 * Instalog - Momentum preservation through instant logging
 * Dark-first design with NativeWind
 *
 * @format
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StatusBar, View, Text, Linking, Platform, AppState, NativeModules, Modal, TouchableOpacity, ScrollView} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {CommonActions} from '@react-navigation/native';
import AppNavigator, {navigationRef} from './src/navigation/AppNavigator';
import {storage, STORAGE_KEYS} from './src/storage/mmkv';
import {useLogStore} from './src/stores/useLogStore';
import {useSubscriptionStore} from './src/stores/useSubscriptionStore';
import {useHintsStore} from './src/stores/useHintsStore';
import {useTaskStore} from './src/stores/useTaskStore';
import {useLanguageStore} from './src/stores/useLanguageStore';
import {useTranslation} from 'react-i18next';
import './src/i18n'; // initialize i18n

const APP_VERSION = '1.0.3'; // bump this with every release

const {StoreKitModule} = NativeModules;

function App(): React.JSX.Element {
  const {t} = useTranslation();
  const [isReady, setIsReady] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
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

      // Show What's New if user hasn't seen this version yet
      const seenVersion = storage.getString(STORAGE_KEYS.SEEN_VERSION);
      if (seenVersion !== APP_VERSION) {
        setShowWhatsNew(true);
      }

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

  const dismissWhatsNew = () => {
    storage.setString(STORAGE_KEYS.SEEN_VERSION, APP_VERSION);
    setShowWhatsNew(false);
  };

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

        {/* What's New Modal */}
        <Modal
          visible={showWhatsNew}
          transparent
          animationType="slide"
          onRequestClose={dismissWhatsNew}>
          <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)'}}>
            <View style={{
              backgroundColor: '#141821',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingHorizontal: 28,
              paddingTop: 28,
              paddingBottom: 48,
            }}>
              {/* Handle bar */}
              <View style={{width: 40, height: 4, borderRadius: 2, backgroundColor: '#3A3F47', alignSelf: 'center', marginBottom: 24}} />

              <Text style={{color: '#EDEEF0', fontSize: 26, fontWeight: '700', marginBottom: 4}}>
                {t('whatsNew.title')}
              </Text>
              <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 28}}>
                {t('whatsNew.version', {version: APP_VERSION})}
              </Text>

              {[
                {title: t('whatsNew.feature1Title'), body: t('whatsNew.feature1Body')},
                {title: t('whatsNew.feature2Title'), body: t('whatsNew.feature2Body')},
                {title: t('whatsNew.feature3Title'), body: t('whatsNew.feature3Body')},
              ].map((item, i) => (
                <View key={i} style={{marginBottom: 20}}>
                  <Text style={{color: '#EDEEF0', fontSize: 16, fontWeight: '600', marginBottom: 4}}>
                    {item.title}
                  </Text>
                  <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 21}}>
                    {item.body}
                  </Text>
                </View>
              ))}

              <TouchableOpacity
                onPress={dismissWhatsNew}
                activeOpacity={0.8}
                style={{
                  backgroundColor: '#6E6AF2',
                  paddingVertical: 16,
                  borderRadius: 14,
                  alignItems: 'center',
                  marginTop: 8,
                }}>
                <Text style={{color: '#FFFFFF', fontSize: 17, fontWeight: '600'}}>
                  {t('whatsNew.dismissButton')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
