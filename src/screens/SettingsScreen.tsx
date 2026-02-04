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
import {useSubscriptionStore, FREE_LOG_LIMIT} from '../stores/useSubscriptionStore';
import {useHintsStore} from '../stores/useHintsStore';
import {storage} from '../storage/mmkv';
import {Haptics} from '../utils/haptics';

const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const logs = useLogStore(state => state.logs);
  const buckets = useLogStore(state => state.buckets);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const refreshBuckets = useLogStore(state => state.refreshBuckets);
  
  const {isPro, totalLogCount, logsRemaining, restorePurchases} = useSubscriptionStore();
  const {hasSeenWidgetHint, markWidgetHintSeen} = useHintsStore();
  
  const showWidgetHint = logs.length >= 3 && !hasSeenWidgetHint;

  const handleExportLogs = async () => {
    try {
      const exportData = {
        logs,
        buckets,
        exportedAt: new Date().toISOString(),
        version: '1.0.0',
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
      'This will permanently delete all logs and buckets. This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            storage.clearAll();
            refreshLogs();
            refreshBuckets();
            Haptics.warning();
            Alert.alert('Done', 'All data has been cleared');
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
            </>
          ) : (
            <>
              <Text style={{color: '#9AA0A6', fontSize: 15, lineHeight: 22, marginBottom: 8}}>
                {logsRemaining > 0 
                  ? `You have ${logsRemaining} free logs remaining.`
                  : 'You\'ve reached the free limit.'
                }
              </Text>
              <Text style={{color: '#6B7280', fontSize: 13, marginBottom: 16}}>
                {totalLogCount} of {FREE_LOG_LIMIT} logs used
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
            </>
          )}
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
          <View>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>Buckets</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16}}>{buckets.length}</Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 32}}>
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            Actions
          </Text>

          {/* Export Button */}
          <TouchableOpacity
            onPress={handleExportLogs}
            style={{backgroundColor: '#6E6AF2', paddingVertical: 14, borderRadius: 12, marginBottom: 12}}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Export all data"
            accessibilityHint="Shares all your logs and buckets as a JSON file">
            <Text style={{color: '#EDEEF0', textAlign: 'center', fontSize: 16, fontWeight: '600'}}>
              Export All Data
            </Text>
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
        </View>

        {/* Footer */}
        <View style={{paddingVertical: 32, alignItems: 'center'}}>
          <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center', lineHeight: 20}}>
            Made with focus{'\n'}
            Zero analytics • No cloud • Your data stays yours
          </Text>
        </View>
      </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default SettingsScreen;
