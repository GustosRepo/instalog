/**
 * Inbox Screen — Confirm & Classify
 *
 * Items arrive pre-categorized from Brain Dump.
 * User confirms the suggestion or picks a different type.
 * One tap = done.
 */

import React, {useState, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useLogStore} from '../stores/useLogStore';
import {useTaskStore} from '../stores/useTaskStore';
import {LogEntry, LogItemType, formatTime} from '../models/types';
import {ConfirmableType} from '../utils/categorize';
import {Haptics} from '../utils/haptics';
import {MOODS} from '../utils/moods';
import {useTranslation} from 'react-i18next';

// ─── Type metadata ────────────────────────────────────────────────────────────

const TYPE_META: Record<ConfirmableType, {emoji: string; label: string; color: string}> = {
  task:    {emoji: '📋', label: 'Task',    color: '#6E6AF2'},
  note:    {emoji: '📝', label: 'Note',    color: '#6EE0F2'},
  idea:    {emoji: '💡', label: 'Idea',    color: '#F2E06E'},
  mood:    {emoji: '😔', label: 'Mood',    color: '#F26EAA'},
  thought: {emoji: '💭', label: 'Thought', color: '#9AA0A6'},
};

const TYPE_ORDER: ConfirmableType[] = ['task', 'note', 'idea', 'mood', 'thought'];

// ─── Item card ────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: LogEntry;
  onConfirm: (type: ConfirmableType) => void;
  onArchive: () => void;
  onDelete: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({item, onConfirm, onArchive, onDelete}) => {
  const [picking, setPicking] = useState(false);
  const {t} = useTranslation();

  const getTypeLabel = (type: ConfirmableType) => {
    const labels: Record<ConfirmableType, string> = {
      task: t('inbox.typeTask'),
      note: t('inbox.typeNote'),
      idea: t('inbox.typeIdea'),
      mood: t('inbox.typeMood'),
      thought: t('inbox.typeThought'),
    };
    return labels[type];
  };

  const suggested = (item.suggestedType ?? 'thought') as ConfirmableType;
  const meta = TYPE_META[suggested];

  return (
    <View style={{
      backgroundColor: '#141821',
      borderRadius: 14,
      marginHorizontal: 16,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#1F2330',
      overflow: 'hidden',
    }}>
      {/* Text row */}
      <View style={{flexDirection: 'row', alignItems: 'flex-start', paddingTop: 14, paddingHorizontal: 16, paddingBottom: 10}}>
        <View style={{
          width: 7, height: 7, borderRadius: 4,
          backgroundColor: meta.color,
          marginTop: 7, marginRight: 12, flexShrink: 0,
        }} />
        <Text style={{color: '#EDEEF0', fontSize: 16, lineHeight: 22, flex: 1}}>
          {item.text || '—'}
        </Text>
      </View>

      {/* Suggestion badge + time */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12,
      }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 5,
          backgroundColor: `${meta.color}18`,
          borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
          borderWidth: 1, borderColor: `${meta.color}33`,
        }}>
          <Text style={{fontSize: 12}}>{meta.emoji}</Text>
          <Text style={{color: meta.color, fontSize: 12, fontWeight: '600'}}>
            {getTypeLabel(suggested)}
          </Text>
        </View>
        <Text style={{color: '#4B5563', fontSize: 12}}>{formatTime(item.timestamp)}</Text>
      </View>

      {/* Action row or type picker */}
      <View style={{
        borderTopWidth: 1, borderTopColor: '#1F2330',
        flexDirection: 'row', padding: 10, gap: 8,
        alignItems: 'stretch',
      }}>
        {picking ? (
          <>
            {TYPE_ORDER.map(typeKey => {
              const m = TYPE_META[typeKey];
              const isActive = typeKey === suggested;
              return (
                <TouchableOpacity
                  key={typeKey}
                  onPress={() => {
                    Haptics.light();
                    setPicking(false);
                    onConfirm(typeKey);
                  }}
                  style={{
                    flex: 1, alignItems: 'center', paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: isActive ? `${m.color}22` : '#0B0D10',
                    borderWidth: 1,
                    borderColor: isActive ? m.color : '#1F2330',
                  }}>
                  <Text style={{fontSize: 14}}>{m.emoji}</Text>
                  <Text style={{color: m.color, fontSize: 9, fontWeight: '600', marginTop: 2}}>
                    {getTypeLabel(typeKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => setPicking(false)}
              style={{
                width: 34, alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#0B0D10', borderRadius: 10,
                borderWidth: 1, borderColor: '#1F2330',
              }}>
              <Text style={{color: '#4B5563', fontSize: 16}}>✕</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* Confirm */}
            <TouchableOpacity
              onPress={() => {
                Haptics.success();
                onConfirm(suggested);
              }}
              style={{
                flex: 1, flexDirection: 'row', alignItems: 'center',
                justifyContent: 'center', gap: 6,
                backgroundColor: `${meta.color}22`,
                borderRadius: 10, borderWidth: 1,
                borderColor: `${meta.color}55`,
                paddingVertical: 10,
              }}>
              <Text style={{color: meta.color, fontSize: 15, lineHeight: 18}}>✓</Text>
              <Text style={{color: meta.color, fontSize: 13, fontWeight: '600'}}>{t('inbox.confirmButton')}</Text>
            </TouchableOpacity>

            {/* Change */}
            <TouchableOpacity
              onPress={() => {
                Haptics.light();
                setPicking(true);
              }}
              style={{
                paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#1A1D24', borderRadius: 10,
                borderWidth: 1, borderColor: '#232936',
                paddingVertical: 10,
              }}>
              <Text style={{color: '#9AA0A6', fontSize: 13, fontWeight: '500'}}>{t('inbox.changeButton')}</Text>
            </TouchableOpacity>

            {/* Archive */}
            <TouchableOpacity
              onPress={() => {
                Haptics.light();
                onArchive();
              }}
              style={{
                paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#1A1D24', borderRadius: 10,
                borderWidth: 1, borderColor: '#232936',
                paddingVertical: 10,
              }}>
              <Text style={{fontSize: 16}}>🗃</Text>
            </TouchableOpacity>

            {/* Delete */}
            <TouchableOpacity
              onPress={() => {
                Haptics.light();
                onDelete();
              }}
              hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}
              style={{
                paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: '#1A1D24', borderRadius: 10,
                borderWidth: 1, borderColor: '#232936',
                paddingVertical: 10,
              }}>
              <Text style={{fontSize: 16}}>🗑</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

// ─── InboxScreen ──────────────────────────────────────────────────────────────

const InboxScreen: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const logs = useLogStore(state => state.logs);
  const processItem = useLogStore(state => state.processItem);
  const archiveItem = useLogStore(state => state.archiveItem);
  const removeLog = useLogStore(state => state.removeLog);
  const getTodayCaptureStats = useLogStore(state => state.getTodayCaptureStats);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const addTask = useTaskStore(state => state.addTask);
  const [refreshing, setRefreshing] = useState(false);

  const items = useMemo(
    () =>
      [...logs]
        .filter(l => (l.status ?? 'unprocessed') === 'unprocessed' && !l.archived)
        .reverse(),
    [logs],
  );

  const stats = getTodayCaptureStats();

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

  const handleConfirm = useCallback(
    async (item: LogEntry, type: ConfirmableType) => {
      processItem(item.id, type as LogItemType);
      if (type === 'task' && item.text) {
        await addTask(item.text);
      }
      // Navigate to the type's destination
      if (type === 'task') {
        navigation.navigate('Tasks');
      } else if (type === 'thought') {
        navigation.navigate('Library', {screen: 'Thoughts'});
      } else if (type === 'idea') {
        navigation.navigate('Library', {screen: 'Ideas'});
      } else if (type === 'note') {
        navigation.navigate('Library', {screen: 'Notes'});
      }
    },
    [processItem, addTask, navigation],
  );

  const renderEmpty = () => (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingTop: 40}}>
      <Image source={MOODS.heart} style={{width: 110, height: 110, marginBottom: 20}} resizeMode="contain" />
      <Text style={{color: '#EDEEF0', fontSize: 22, fontWeight: '700', marginBottom: 8}}>
        {t('inbox.emptyTitle')}
      </Text>
      <Text style={{color: '#9AA0A6', fontSize: 15, textAlign: 'center', lineHeight: 22}}>
        {stats.totalCaptured > 0
          ? t('inbox.emptySubtitleProcessed', {count: stats.totalProcessed})
          : t('inbox.emptySubtitleNothingCaptured')}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0B0D10'}} edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={({item}) => (
          <ItemCard
            item={item}
            onConfirm={type => handleConfirm(item, type)}
            onArchive={() => archiveItem(item.id)}
            onDelete={() => removeLog(item.id)}
          />
        )}
        ListHeaderComponent={() => (
          <View style={{paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16}}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
              <Text style={{color: '#EDEEF0', fontSize: 24, fontWeight: '700'}}>{t('inbox.screenTitle')}</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Settings')}
                hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                <Text style={{fontSize: 18, opacity: 0.6}}>⚙️</Text>
              </TouchableOpacity>
            </View>
            {items.length > 0 ? (
              <Text style={{color: '#9AA0A6', fontSize: 13, marginTop: 4}}>
                {t('inbox.subtitleWithItems', {count: items.length})}
              </Text>
            ) : (
              <Text style={{color: '#4B5563', fontSize: 13, marginTop: 4}}>
                {stats.totalCaptured > 0
                  ? t('inbox.subtitleProcessedToday', {count: stats.totalProcessed})
                  : t('inbox.subtitleNothingCaptured')}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={items.length === 0 ? {flex: 1} : {paddingBottom: 32}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6E6AF2" />
        }
      />
    </SafeAreaView>
  );
};

export default InboxScreen;
