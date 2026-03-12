/**
 * Settings Screen
 * App info, data management, export functionality, subscription
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Platform,
  Image,
  ImageBackground,
  Linking,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useLogStore} from '../stores/useLogStore';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {useHintsStore} from '../stores/useHintsStore';
import {useOnboardingStore} from '../stores/useOnboardingStore';
import {storage} from '../storage/mmkv';
import {Haptics} from '../utils/haptics';
import {MOODS} from '../utils/moods';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const logs = useLogStore(state => state.logs);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const [showSadMood, setShowSadMood] = useState(false);
  
  const {isPro, totalLogCount, restorePurchases, setPro} = useSubscriptionStore();
  const {hasSeenWidgetHint, markWidgetHintSeen} = useHintsStore();
  const {resetOnboarding} = useOnboardingStore();
  
  const showWidgetHint = logs.length >= 3 && !hasSeenWidgetHint;

  const handleExportLogs = async () => {
    try {
      const exportData = {
        logs,
        exportedAt: new Date().toISOString(),
        version: '1.0.3',
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const shareResult = await Share.share({
        message: jsonString,
        title: 'Instalog Export',
      });

      if (shareResult.action === Share.sharedAction) {
        Haptics.success();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export logs');
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your logs. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            storage.clearAll();
            refreshLogs();
            Haptics.warning();
            Alert.alert('Done', 'All data has been cleared');
            setShowSadMood(true);
            setTimeout(() => setShowSadMood(false), 2500);
          },
        },
      ],
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
      <ImageBackground
        source={require('../../assets/logonobg.png')}
        style={{flex: 1}}
        imageStyle={{opacity: 0.03, resizeMode: 'center'}}
        resizeMode="center">
        {/* Header */}
        <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16}}>
        <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>
          Settings
        </Text>
      </View>

      <ScrollView style={{flex: 1}} contentContainerStyle={{paddingHorizontal: 24}}>
        {/* Widget Config */}
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('Widget');
            Haptics.light();
          }}
          style={{
            backgroundColor: '#141821',
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
          <View style={{flex: 1}}>
            <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 4}}>
              📲  Widget Config
            </Text>
            <Text style={{color: '#9AA0A6', fontSize: 14}}>
              Quick-log buttons for your home screen
            </Text>
          </View>
          <Text style={{color: '#9AA0A6', fontSize: 18}}>›</Text>
        </TouchableOpacity>

        {/* Subscription Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
            <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600'}}>
              Subscription
            </Text>
            {isPro && (
              <View style={{backgroundColor: '#6E6AF2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6}}>
                <Text style={{color: '#FFFFFF', fontSize: 12, fontWeight: '700'}}>PRO</Text>
              </View>
            )}
          </View>
          
          {isPro ? (
            <>
              <Text style={{color: '#9AA0A6', fontSize: 15, lineHeight: 22, marginBottom: 16}}>
                You have unlimited logs and sync across all your devices.
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
                style={{paddingVertical: 12}}
              >
                <Text style={{color: '#6E6AF2', fontSize: 15, fontWeight: '500'}}>
                  Manage Subscription
                </Text>
              </TouchableOpacity>
              
              {/* DEV ONLY: Toggle Pro */}
              {__DEV__ && (
                <TouchableOpacity
                  onPress={() => {
                    setPro(!isPro);
                    Haptics.success();
                  }}
                  style={{alignItems: 'center', paddingVertical: 8, marginTop: 12, backgroundColor: '#FFA50033', paddingHorizontal: 16, borderRadius: 8}}
                >
                  <Text style={{color: '#FFA500', fontSize: 13, fontWeight: '600'}}>
                    [DEV] Toggle Pro: {isPro ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={{color: '#9AA0A6', fontSize: 15, lineHeight: 22, marginBottom: 8}}>
                Upgrade to Pro for clock view, reminders, insights, and export.
              </Text>
              <Text style={{color: '#6B7280', fontSize: 13, marginBottom: 16}}>
                Logging and basic tasks are always free.
              </Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Paywall')}
                style={{
                  backgroundColor: '#6E6AF2',
                  paddingVertical: 14,
                  borderRadius: 10,
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '600'}}>
                  Upgrade to Pro
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  Haptics.light();
                  const restored = await restorePurchases();
                  if (!restored) {
                    Alert.alert('No Subscription Found', 'We couldn\'t find an active subscription for your Apple ID.');
                  }
                }}
                style={{alignItems: 'center', paddingVertical: 8}}
              >
                <Text style={{color: '#9AA0A6', fontSize: 14}}>
                  Restore Purchases
                </Text>
              </TouchableOpacity>
              
              {/* DEV ONLY: Toggle Pro */}
              {__DEV__ && (
                <TouchableOpacity
                  onPress={() => {
                    setPro(!isPro);
                    Haptics.success();
                  }}
                  style={{alignItems: 'center', paddingVertical: 8, marginTop: 12, backgroundColor: '#FFA50033', paddingHorizontal: 16, borderRadius: 8}}
                >
                  <Text style={{color: '#FFA500', fontSize: 13, fontWeight: '600'}}>
                    [DEV] Toggle Pro: {isPro ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              )}
              
              {/* DEV ONLY: Reset Onboarding */}
              {__DEV__ && (
                <TouchableOpacity
                  onPress={() => {
                    resetOnboarding();
                    Haptics.warning();
                  }}
                  style={{alignItems: 'center', paddingVertical: 8, marginTop: 8, backgroundColor: '#FF634733', paddingHorizontal: 16, borderRadius: 8}}
                >
                  <Text style={{color: '#FF6347', fontSize: 13, fontWeight: '600'}}>
                    [DEV] Reset Onboarding
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* How It Works Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            How It Works
          </Text>
          
          <View style={{marginBottom: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12}}>
              <Text style={{fontSize: 16, marginRight: 12}}>⚡</Text>
              <View style={{flex: 1}}>
                <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600', marginBottom: 4}}>
                  Tap to capture
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 20}}>
                  Hit the big button and your log is saved instantly. No decisions needed.
                </Text>
              </View>
            </View>
            
            <View style={{flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12}}>
              <Text style={{fontSize: 16, marginRight: 12}}>📥</Text>
              <View style={{flex: 1}}>
                <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600', marginBottom: 4}}>
                  Review in Wrap Up
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 20}}>
                  At the end of the day, see everything you captured and process it at your own pace.
                </Text>
              </View>
            </View>
            
            <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
              <Text style={{fontSize: 16, marginRight: 12}}>🔁</Text>
              <View style={{flex: 1}}>
                <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600', marginBottom: 4}}>
                  Reflect in Review
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 20}}>
                  Look back at patterns, notes, and momentum over time.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* About Section with Logo */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          {/* Widget hint */}
          {showWidgetHint && (
            <TouchableOpacity
              onPress={() => {
                markWidgetHintSeen();
                navigation.navigate('Widget');
                Haptics.light();
              }}
              style={{
                backgroundColor: '#6E6AF2',
                paddingVertical: 12,
                paddingHorizontal: 16,
                borderRadius: 12,
                marginBottom: 20,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
              <View style={{flex: 1}}>
                <Text style={{color: '#FFFFFF', fontSize: 15, fontWeight: '600', marginBottom: 4}}>
                  ✨ Customize your widgets
                </Text>
                <Text style={{color: '#FFFFFF', opacity: 0.9, fontSize: 13}}>
                  Add quick-log buttons to your home screen
                </Text>
              </View>
              <Text style={{color: '#FFFFFF', fontSize: 20}}>→</Text>
            </TouchableOpacity>
          )}
          
          <View style={{alignItems: 'center', marginBottom: 24}}>
            <Image
              source={require('../../assets/logonobg.png')}
              style={{width: 160, height: 160, marginBottom: 16}}
              resizeMode="contain"
            />
          </View>
          
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            About
          </Text>
          <View style={{marginBottom: 12}}>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>App</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16}}>Instalog</Text>
          </View>
          <View style={{marginBottom: 12}}>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>Version</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16}}>1.0.0</Text>
          </View>
          <View>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>Philosophy</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16, lineHeight: 24}}>
              Momentum preservation - instantly log accomplishments without stopping your day.
            </Text>
          </View>
        </View>

        {/* Data Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            Data
          </Text>
          <View style={{marginBottom: 12}}>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>Total Logs</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16}}>{logs.length}</Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 32}}>
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            Actions
          </Text>

          {/* Export Button — Pro only */}
          <TouchableOpacity
            onPress={() => {
              if (!isPro) {
                navigation.navigate('Paywall');
                return;
              }
              handleExportLogs();
            }}
            style={{backgroundColor: '#6E6AF2', paddingVertical: 14, borderRadius: 12, marginBottom: 12}}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Export all data"
            accessibilityHint="Shares all your logs and buckets as a JSON file">
            <View style={{flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8}}>
              <Text style={{color: '#EDEEF0', textAlign: 'center', fontSize: 16, fontWeight: '600'}}>
                Export All Data
              </Text>
              {!isPro && <Text style={{fontSize: 12}}>⭐</Text>}
            </View>
          </TouchableOpacity>

          {/* Clear Data Button */}
          <TouchableOpacity
            onPress={handleClearAllData}
            style={{backgroundColor: '#0B0D10', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#EF4444'}}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Clear all data"
            accessibilityHint="Permanently deletes all logs and buckets. This action cannot be undone.">
            <Text style={{color: '#EF4444', textAlign: 'center', fontSize: 16, fontWeight: '600'}}>
              Clear All Data
            </Text>
          </TouchableOpacity>

          {/* Sad mood after clearing */}
          {showSadMood && (
            <View style={{alignItems: 'center', marginTop: 16}}>
              <Image
                source={MOODS.sad}
                style={{width: 60, height: 60}}
                resizeMode="contain"
              />
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={{paddingVertical: 32, alignItems: 'center'}}>
          <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 16}}>
            Made with focus{'\n'}
            Zero analytics • No cloud • Your data stays yours
          </Text>
          
          {/* Legal Links - Required for App Store */}
          <View style={{flexDirection: 'row', gap: 16, marginBottom: 12}}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.code-werx.com/instalog-privacy')}
              accessible={true}
              accessibilityRole="link">
              <Text style={{color: '#6E6AF2', fontSize: 14}}>Privacy Policy</Text>
            </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
              accessible={true}
              accessibilityRole="link">
              <Text style={{color: '#6E6AF2', fontSize: 14}}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{alignItems: 'center'}}>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:admin@code-wrx.com')}
              accessible={true}
              accessibilityRole="link">
              <Text style={{color: '#6E6AF2', fontSize: 14}}>Contact Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default SettingsScreen;
