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
import {useTranslation} from 'react-i18next';
import {useLogStore} from '../stores/useLogStore';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {useHintsStore} from '../stores/useHintsStore';
import {useOnboardingStore} from '../stores/useOnboardingStore';
import {storage} from '../storage/mmkv';
import {Haptics} from '../utils/haptics';
import {MOODS} from '../utils/moods';
import {useLanguageStore, SUPPORTED_LANGUAGES} from '../stores/useLanguageStore';

const SettingsScreen: React.FC = () => {
  const {t} = useTranslation();
  const {language, setLanguage} = useLanguageStore();
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
      Alert.alert(t('settings.exportErrorTitle'), t('settings.exportErrorMessage'));
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      t('settings.clearAlertTitle'),
      t('settings.clearAlertMessage'),
      [
        {text: t('settings.clearAlertCancel'), style: 'cancel'},
        {
          text: t('settings.clearAlertConfirm'),
          style: 'destructive',
          onPress: () => {
            storage.clearAll();
            refreshLogs();
            Haptics.warning();
            Alert.alert(t('settings.clearDoneAlertTitle'), t('settings.clearDoneAlertMessage'));
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
          {t('settings.screenTitle')}
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
              {t('settings.widgetConfigTitle')}
            </Text>
            <Text style={{color: '#9AA0A6', fontSize: 14}}>
              {t('settings.widgetConfigSubtitle')}
            </Text>
          </View>
          <Text style={{color: '#9AA0A6', fontSize: 18}}>›</Text>
        </TouchableOpacity>

        {/* Subscription Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
            <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600'}}>
              {t('settings.subscriptionTitle')}
            </Text>
            {isPro && (
              <View style={{backgroundColor: '#6E6AF2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6}}>
                <Text style={{color: '#FFFFFF', fontSize: 12, fontWeight: '700'}}>{t('settings.proBadge')}</Text>
              </View>
            )}
          </View>
          
          {isPro ? (
            <>
              <Text style={{color: '#9AA0A6', fontSize: 15, lineHeight: 22, marginBottom: 16}}>
                {t('settings.proDescription')}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://apps.apple.com/account/subscriptions')}
                style={{paddingVertical: 12}}
              >
                <Text style={{color: '#6E6AF2', fontSize: 15, fontWeight: '500'}}>
                  {t('settings.manageSubscriptionLink')}
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
                    {t('settings.devTogglePro')}: {isPro ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <>
              <Text style={{color: '#9AA0A6', fontSize: 15, lineHeight: 22, marginBottom: 8}}>
                {t('settings.upgradeDescription')}
              </Text>
              <Text style={{color: '#6B7280', fontSize: 13, marginBottom: 16}}>
                {t('settings.freeTierNote')}
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
                  {t('settings.upgradeButton')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  Haptics.light();
                  const restored = await restorePurchases();
                  if (!restored) {
                    Alert.alert(t('settings.restoreNoSubTitle'), t('settings.restoreNoSubMessage'));
                  }
                }}
                style={{alignItems: 'center', paddingVertical: 8}}
              >
                <Text style={{color: '#9AA0A6', fontSize: 14}}>
                  {t('settings.restoreButton')}
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

        {/* Language Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            {t('settings.languageTitle')}
          </Text>
          <View style={{flexDirection: 'row', gap: 8}}>
            {SUPPORTED_LANGUAGES.map(lang => (
              <TouchableOpacity
                key={lang.code}
                onPress={() => setLanguage(lang.code)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: language === lang.code ? '#6E6AF2' : '#1F2330',
                  backgroundColor: language === lang.code ? '#6E6AF222' : 'transparent',
                  alignItems: 'center',
                }}>
                <Text style={{color: language === lang.code ? '#6E6AF2' : '#EDEEF0', fontSize: 14, fontWeight: '500'}}>
                  {lang.nativeLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* How It Works Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            {t('settings.howItWorksTitle')}
          </Text>
          
          <View style={{marginBottom: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12}}>
              <Text style={{fontSize: 16, marginRight: 12}}>⚡</Text>
              <View style={{flex: 1}}>
                <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600', marginBottom: 4}}>
                  {t('settings.step1Title')}
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 20}}>
                  {t('settings.step1Description')}
                </Text>
              </View>
            </View>
            
            <View style={{flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12}}>
              <Text style={{fontSize: 16, marginRight: 12}}>📥</Text>
              <View style={{flex: 1}}>
                <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600', marginBottom: 4}}>
                  {t('settings.step2Title')}
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 20}}>
                  {t('settings.step2Description')}
                </Text>
              </View>
            </View>
            
            <View style={{flexDirection: 'row', alignItems: 'flex-start'}}>
              <Text style={{fontSize: 16, marginRight: 12}}>🔁</Text>
              <View style={{flex: 1}}>
                <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600', marginBottom: 4}}>
                  {t('settings.step3Title')}
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 20}}>
                  {t('settings.step3Description')}
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
                  {t('settings.widgetHintTitle')}
                </Text>
                <Text style={{color: '#FFFFFF', opacity: 0.9, fontSize: 13}}>
                  {t('settings.widgetHintSubtitle')}
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
            {t('settings.aboutTitle')}
          </Text>
          <View style={{marginBottom: 12}}>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>{t('settings.aboutAppLabel')}</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16}}>{t('settings.aboutAppValue')}</Text>
          </View>
          <View style={{marginBottom: 12}}>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>{t('settings.aboutVersionLabel')}</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16}}>1.0.0</Text>
          </View>
          <View>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>{t('settings.aboutPhilosophyLabel')}</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16, lineHeight: 24}}>
              {t('settings.aboutPhilosophyValue')}
            </Text>
          </View>
        </View>

        {/* Data Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            {t('settings.dataTitle')}
          </Text>
          <View style={{marginBottom: 12}}>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 4}}>{t('settings.totalLogsLabel')}</Text>
            <Text style={{color: '#EDEEF0', fontSize: 16}}>{logs.length}</Text>
          </View>
        </View>

        {/* Actions Section */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 32}}>
          <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
            {t('settings.actionsTitle')}
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
                {t('settings.exportButton')}
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
              {t('settings.clearButton')}
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
            {t('settings.footerText')}
          </Text>
          
          {/* Legal Links - Required for App Store */}
          <View style={{flexDirection: 'row', gap: 16, marginBottom: 12}}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://www.code-werx.com/instalog-privacy')}
              accessible={true}
              accessibilityRole="link">
              <Text style={{color: '#6E6AF2', fontSize: 14}}>{t('settings.privacyPolicyLink')}</Text>
            </TouchableOpacity>
              <TouchableOpacity
                onPress={() => Linking.openURL('https://www.apple.com/legal/internet-services/itunes/dev/stdeula/')}
              accessible={true}
              accessibilityRole="link">
              <Text style={{color: '#6E6AF2', fontSize: 14}}>{t('settings.termsOfServiceLink')}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={{alignItems: 'center'}}>
            <TouchableOpacity
              onPress={() => Linking.openURL('mailto:admin@code-wrx.com')}
              accessible={true}
              accessibilityRole="link">
              <Text style={{color: '#6E6AF2', fontSize: 14}}>{t('settings.contactSupportLink')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default SettingsScreen;
