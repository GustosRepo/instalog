/**
 * Wrap Up Screen — End-of-Day Closure
 *
 * Purpose: Calm summary of what was captured and processed.
 * Honest, gentle, no pressure.
 */

import React, {useCallback, useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useLogStore} from '../stores/useLogStore';
import {useTaskStore} from '../stores/useTaskStore';
import {useMoodStore} from '../stores/useMoodStore';
import {MOODS} from '../utils/moods';
import {MOOD_META} from '../utils/mood';
import {maybeRequestReview} from '../utils/storeReview';
import {useTranslation} from 'react-i18next';

// ─── Stat card ────────────────────────────────────────────────────────────────

const StatCard: React.FC<{
  value: number;
  label: string;
  accent?: string;
  dim?: boolean;
}> = ({value, label, accent = '#6E6AF2', dim = false}) => (
  <View style={{
    flex: 1,
    backgroundColor: '#141821',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    opacity: dim ? 0.5 : 1,
    borderWidth: 1,
    borderColor: dim ? 'transparent' : `${accent}33`,
  }}>
    <Text style={{color: accent, fontSize: 32, fontWeight: '700'}}>{value}</Text>
    <Text style={{color: '#9AA0A6', fontSize: 12, marginTop: 4, textAlign: 'center'}}>{label}</Text>
  </View>
);

// ─── WrapUpScreen ─────────────────────────────────────────────────────────────

const WrapUpScreen: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const getTodayCaptureStats = useLogStore(state => state.getTodayCaptureStats);
  const getUnprocessedItems = useLogStore(state => state.getUnprocessedItems);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const getCompletedTodayTasks = useTaskStore(state => state.getCompletedTodayTasks);
  const getTodayMood = useMoodStore(state => state.getTodayMood);
  const moodEntries = useMoodStore(state => state.entries);
  const [refreshing, setRefreshing] = useState(false);

  const stats = getTodayCaptureStats();
  const unprocessed = getUnprocessedItems();
  const completedTasks = getCompletedTodayTasks();
  const todayMood = getTodayMood();

  const allClear = unprocessed.length === 0 && stats.totalCaptured > 0;
  const nothingYet = stats.totalCaptured === 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const {storage} = await import('../storage/mmkv');
      await storage.reloadFromAppGroup();
      refreshLogs();
      await new Promise<void>(r => setTimeout(r, 300));
    } catch {}
    setRefreshing(false);
  }, [refreshLogs]);

  // Prompt for App Store review when all is clear
  React.useEffect(() => {
    if (allClear && stats.totalProcessed >= 3) {
      setTimeout(() => maybeRequestReview(), 800);
    }
  }, [allClear, stats.totalProcessed]);

  const getCopy = () => {
    if (nothingYet) {
      return {title: t('wrapUp.emptyTitle'), sub: t('wrapUp.emptySubtitle')};
    }
    if (allClear) {
      return {
        title: t('wrapUp.allClearTitle'),
        sub: t('wrapUp.allClearSubtitle', {count: stats.totalCaptured}),
      };
    }
    return {
      title: t('wrapUp.remainingTitle', {count: stats.totalUnprocessed}),
      sub: t('wrapUp.remainingSubtitle', {count: stats.totalCaptured, total: stats.totalCaptured, processed: stats.totalProcessed, unprocessed: stats.totalUnprocessed}),
    };
  };

  const {title, sub} = getCopy();
  const mascot = allClear ? MOODS.heart : nothingYet ? MOODS.chill : MOODS.confused;

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0B0D10'}} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{flexGrow: 1, paddingHorizontal: 20, paddingBottom: 48}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6E6AF2" />
        }>

        {/* Header */}
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 24}}>
          <Text style={{color: '#EDEEF0', fontSize: 24, fontWeight: '700'}}>{t('wrapUp.screenTitle')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={{fontSize: 18, opacity: 0.6}}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Mascot + headline */}
        <View style={{alignItems: 'center', marginBottom: 32}}>
          <Image source={mascot} style={{width: 110, height: 110, marginBottom: 16}} resizeMode="contain" />
          <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 8}}>
            {title}
          </Text>
          <Text style={{color: '#9AA0A6', fontSize: 15, textAlign: 'center', lineHeight: 22}}>
            {sub}
          </Text>
        </View>

        {/* Stats grid */}
        {!nothingYet && (
          <>
            {/* Today's brain mood */}
            <View style={{
              backgroundColor: '#141821',
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 1,
              borderColor: todayMood ? `${MOOD_META[todayMood].color}33` : '#1F2330',
            }}>
              <Text style={{color: '#4B5563', fontSize: 13, flex: 1}}>{t('wrapUp.moodTodayLabel')}</Text>
              {todayMood ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Image source={MOOD_META[todayMood].mascot} style={{width: 28, height: 28}} resizeMode="contain" />
                  <Text style={{color: MOOD_META[todayMood].color, fontSize: 14, fontWeight: '600'}}>
                    {MOOD_META[todayMood].label}
                  </Text>
                </View>
              ) : (
                <Text style={{color: '#4B5563', fontSize: 13}}>{t('wrapUp.moodNotSet')}</Text>
              )}
            </View>

            <View style={{marginBottom: 28}}>
              <View style={{flexDirection: 'row', gap: 10, marginBottom: 10}}>
                <StatCard value={stats.totalCaptured} label={t('wrapUp.statCaptured')} accent="#6E6AF2" />
                <StatCard value={stats.totalProcessed} label={t('wrapUp.statProcessed')} accent="#6EE0F2" />
              </View>
              <View style={{flexDirection: 'row', gap: 10}}>
                <StatCard
                  value={stats.totalUnprocessed}
                  label={t('wrapUp.statUnprocessed')}
                  accent="#F29B6E"
                  dim={stats.totalUnprocessed === 0}
                />
                <StatCard value={completedTasks.length} label={t('wrapUp.statTasksDone')} accent="#6EF2A8" dim={completedTasks.length === 0} />
              </View>
            </View>
          </>
        )}

        {/* Type breakdown */}
        {stats.totalProcessed > 0 && (
          <View style={{
            backgroundColor: '#141821',
            borderRadius: 14,
            padding: 16,
            marginBottom: 28,
          }}>
            <Text style={{color: '#4B5563', fontSize: 11, fontWeight: '600', letterSpacing: 0.8, marginBottom: 12}}>
              {t('wrapUp.processedAsLabel')}
            </Text>
            <View style={{flexDirection: 'row', gap: 8}}>
              <View style={{flex: 1, alignItems: 'center'}}>
                <Text style={{fontSize: 22, marginBottom: 4}}>📋</Text>
                <Text style={{color: '#6E6AF2', fontSize: 18, fontWeight: '700'}}>{stats.totalTasks}</Text>
                <Text style={{color: '#9AA0A6', fontSize: 11, marginTop: 2}}>{t('wrapUp.categoryTasks')}</Text>
              </View>
              <View style={{width: 1, backgroundColor: '#1F2330'}} />
              <View style={{flex: 1, alignItems: 'center'}}>
                <Text style={{fontSize: 22, marginBottom: 4}}>📝</Text>
                <Text style={{color: '#6EE0F2', fontSize: 18, fontWeight: '700'}}>{stats.totalNotes}</Text>
                <Text style={{color: '#9AA0A6', fontSize: 11, marginTop: 2}}>{t('wrapUp.categoryNotesIdeas')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* CTAs */}
        <View style={{gap: 10}}>
          {unprocessed.length > 0 && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Inbox')}
              style={{
                backgroundColor: '#6E6AF2',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              activeOpacity={0.8}>
              <Text style={{color: '#FFF', fontSize: 16, fontWeight: '600'}}>
                {t('wrapUp.ctaProcessRemaining', {count: unprocessed.length})}
              </Text>
            </TouchableOpacity>
          )}

          {nothingYet && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Instalog')}
              style={{
                backgroundColor: '#6E6AF2',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
              }}
              activeOpacity={0.8}>
              <Text style={{color: '#FFF', fontSize: 16, fontWeight: '600'}}>
                {t('wrapUp.ctaStartBrainDump')}
              </Text>
            </TouchableOpacity>
          )}

          {allClear && (
            <TouchableOpacity
              onPress={() => navigation.navigate('Review')}
              style={{
                backgroundColor: '#141821',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#2A2D34',
              }}
              activeOpacity={0.8}>
              <Text style={{color: '#9AA0A6', fontSize: 16, fontWeight: '500'}}>
                {t('wrapUp.ctaViewReview')}
              </Text>
            </TouchableOpacity>
          )}

          {!nothingYet && !allClear && (
            <TouchableOpacity
              onPress={() => {/* leave for tomorrow - just close / do nothing */}}
              style={{
                borderRadius: 14,
                paddingVertical: 14,
                alignItems: 'center',
              }}
              activeOpacity={0.7}>
              <Text style={{color: '#4B5563', fontSize: 14}}>
                {t('wrapUp.ctaLeaveForTomorrow')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default WrapUpScreen;
