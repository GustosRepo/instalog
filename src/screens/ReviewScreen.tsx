/**
 * Review Screen - Calm Reflection
 *
 * Purpose: Passive, optional metrics for reflection
 * NO streaks, NO goals, NO pressure
 */

import React, {useState, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ImageBackground,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useLogStore} from '../stores/useLogStore';
import {useTaskStore} from '../stores/useTaskStore';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {useMoodStore} from '../stores/useMoodStore';
import {LogEntry, Task, formatTime} from '../models/types';
import {storage} from '../storage/mmkv';
import {MOODS} from '../utils/moods';
import {MOOD_META, MOOD_ORDER, getMoodStats, getMoodHistory} from '../utils/mood';
import {useTranslation} from 'react-i18next';

// Helper: Group logs by YYYY-MM-DD
const groupLogsByDay = (logs: LogEntry[]): Record<string, LogEntry[]> => {
  return logs.reduce((acc, log) => {
    const dateKey = log.dateKey;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(log);
    return acc;
  }, {} as Record<string, LogEntry[]>);
};

// Helper: Calculate intensity level (0-4)
const getIntensityLevel = (count: number): number => {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 6) return 3;
  return 4;
};

// Helper: Get color for intensity level
const getIntensityColor = (level: number): string => {
  const colors = [
    'rgba(110, 106, 242, 0.1)', // 0 logs - very subtle
    'rgba(110, 106, 242, 0.25)', // 1 log
    'rgba(110, 106, 242, 0.45)', // 2-3 logs
    'rgba(110, 106, 242, 0.65)', // 4-6 logs
    'rgba(110, 106, 242, 0.85)', // 7+ logs
  ];
  return colors[level];
};

// Helper: Build month grid for current month
const buildMonthGrid = (year: number, month: number): Array<{date: Date | null; dateKey: string | null}> => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDayOfWeek = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = lastDay.getDate();

  const grid: Array<{date: Date | null; dateKey: string | null}> = [];

  // Add leading empty cells
  for (let i = 0; i < startDayOfWeek; i++) {
    grid.push({date: null, dateKey: null});
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dateKey = date.toISOString().split('T')[0];
    grid.push({date, dateKey});
  }

  return grid;
};

// Day Detail Modal
interface DayDetailProps {
  visible: boolean;
  onClose: () => void;
  dateKey: string;
  logs: LogEntry[];
  tasks: Task[];
}

const DayDetailModal: React.FC<DayDetailProps> = ({visible, onClose, dateKey, logs, tasks}) => {
  const {t} = useTranslation();
  const date = new Date(dateKey);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateDisplay = `${monthNames[date.getMonth()]} ${date.getDate()}`;
  const totalItems = logs.length + tasks.length;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)'}}>
        <TouchableOpacity
          style={{flex: 1}}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={{backgroundColor: '#141821', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, maxHeight: '80%'}}>
          {/* Header */}
          <View style={{paddingHorizontal: 24, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(154, 160, 166, 0.1)'}}>
            <Text style={{color: '#EDEEF0', fontSize: 20, fontWeight: '700'}}>
              {dateDisplay} — {totalItems} {totalItems === 1 ? t('review.dayDetailItem') : t('review.dayDetailItems')}
            </Text>
          </View>

          {/* Items */}
          <ScrollView 
            style={{paddingHorizontal: 24, paddingTop: 16}}
            showsVerticalScrollIndicator={true}>
            {logs.map(log => (
              <View
                key={log.id}
                style={{backgroundColor: '#0B0D10', borderRadius: 12, padding: 16, marginBottom: 12}}>
                <Text style={{color: '#EDEEF0', fontSize: 16, lineHeight: 24}} numberOfLines={2}>
                  {log.text || 'Logged'}
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 8}}>
                  {formatTime(log.timestamp)}
                </Text>
              </View>
            ))}
            {tasks.map(task => (
              <View
                key={task.id}
                style={{backgroundColor: '#0B0D10', borderRadius: 12, padding: 16, marginBottom: 12}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <Text style={{color: '#6E6AF2', fontSize: 12, marginRight: 8}}>✓</Text>
                  <Text style={{color: '#EDEEF0', fontSize: 16, lineHeight: 24, flex: 1}} numberOfLines={2}>
                    {task.text}
                  </Text>
                </View>
                {task.completedAt && (
                  <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 8}}>
                    {t('review.taskCompletedAt', {time: formatTime(task.completedAt)})}
                  </Text>
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Activity Heatmap Component
const ActivityHeatmap: React.FC<{logsByDay: Record<string, LogEntry[]>; tasksByDay: Record<string, Task[]>}> = ({logsByDay, tasksByDay}) => {
  const {t, i18n} = useTranslation();
  const [selectedDay, setSelectedDay] = useState<{dateKey: string; logs: LogEntry[]; tasks: Task[]} | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthGrid = buildMonthGrid(currentYear, currentMonth);
  const monthLabel = new Date(currentYear, currentMonth, 1).toLocaleString(i18n.language, {month: 'long', year: 'numeric'});

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
      <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
        {t('review.activitySectionTitle')}
      </Text>
      <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 12}}>
        {monthLabel}
      </Text>

      {/* Weekday headers */}
      <View style={{flexDirection: 'row', marginBottom: 12, alignSelf: 'center'}}>
        {weekDays.map((day, i) => (
          <View key={i} style={{width: 40, height: 24, marginHorizontal: 4, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{color: '#9AA0A6', fontSize: 13, fontWeight: '500'}}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={{flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center', width: 7 * 48}}>
        {monthGrid.map((cell, index) => {
          if (!cell.dateKey) {
            return <View key={`empty-${index}`} style={{width: 40, height: 40, margin: 4}} />;
          }

          const count = (logsByDay[cell.dateKey]?.length || 0) + (tasksByDay[cell.dateKey]?.length || 0);
          const level = getIntensityLevel(count);
          const color = getIntensityColor(level);

          return (
            <TouchableOpacity
              key={cell.dateKey}
              onPress={() => {
                if (count > 0) {
                  setSelectedDay({
                    dateKey: cell.dateKey!,
                    logs: logsByDay[cell.dateKey!] || [],
                    tasks: tasksByDay[cell.dateKey!] || [],
                  });
                }
              }}
              style={{
                width: 40,
                height: 40,
                margin: 4,
                backgroundColor: color,
                borderRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{color: level > 1 ? '#EDEEF0' : '#9AA0A6', fontSize: 13, fontWeight: '500'}}>
                {cell.date!.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Day detail modal */}
      {selectedDay && (
        <DayDetailModal
          visible={true}
          onClose={() => setSelectedDay(null)}
          dateKey={selectedDay.dateKey}
          logs={selectedDay.logs}
          tasks={selectedDay.tasks}
        />
      )}
    </View>
  );
};

// Search Component
const SearchSection: React.FC<{logs: LogEntry[]}> = ({logs}) => {
  const {t} = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    return logs
      .filter(log => log.text?.toLowerCase().includes(query))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);
  }, [logs, searchQuery]);

  return (
    <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20}}>
      <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
        {t('review.searchSectionTitle')}
      </Text>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder={t('review.searchPlaceholder')}
        placeholderTextColor="#9AA0A6"
        style={{
          backgroundColor: '#0B0D10',
          color: '#EDEEF0',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderRadius: 12,
          fontSize: 16,
          marginBottom: 16,
        }}
      />

      {searchQuery.trim() && (
        <View>
          {searchResults.length === 0 ? (
            <View style={{alignItems: 'center', paddingVertical: 24}}>
              <Image
                source={MOODS.confused}
                style={{width: 60, height: 60, marginBottom: 8}}
                resizeMode="contain"
              />
              <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center'}}>
                {t('review.searchNoResults')}
              </Text>
            </View>
          ) : (
            <View>
              <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 12}}>
                {t('review.searchResultCount', {count: searchResults.length})}
              </Text>
              {searchResults.map(log => (
                <View
                  key={log.id}
                  style={{backgroundColor: '#0B0D10', borderRadius: 12, padding: 16, marginBottom: 12}}>
                  <Text style={{color: '#EDEEF0', fontSize: 16, lineHeight: 24}} numberOfLines={2}>
                    {log.text || 'Logged'}
                  </Text>
                  <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 8}}>
                    {new Date(log.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    • {formatTime(log.timestamp)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

// Mood Insights Component
const MoodInsights: React.FC = () => {
  const {t} = useTranslation();
  const entries = useMoodStore(state => state.entries);
  const stats7 = useMemo(() => getMoodStats(entries, 7), [entries]);
  const stats30 = useMemo(() => getMoodStats(entries, 30), [entries]);
  const history = useMemo(() => getMoodHistory(entries, 7), [entries]);
  const [view, setView] = useState<'7d' | '30d'>('7d');

  const stats = view === '7d' ? stats7 : stats30;
  const total = stats.reduce((sum, s) => sum + s.count, 0);
  const max = Math.max(...stats.map(s => s.count), 1);

  if (entries.length === 0) {
    return (
      <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
        <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 8}}>
          {t('review.brainMoodTitle')}
        </Text>
        <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center', paddingVertical: 20}}>
          {t('review.brainMoodEmptyState')}
        </Text>
      </View>
    );
  }

  return (
    <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
      {/* Header row */}
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16}}>
        <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600'}}>{ t('review.brainMoodTitle')}</Text>
        <View style={{flexDirection: 'row', gap: 4}}>
          {(['7d', '30d'] as const).map(v => (
            <TouchableOpacity
              key={v}
              onPress={() => setView(v)}
              style={{
                paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
                backgroundColor: view === v ? '#6E6AF222' : 'transparent',
                borderWidth: 1, borderColor: view === v ? '#6E6AF2' : '#1F2330',
              }}>
              <Text style={{color: view === v ? '#6E6AF2' : '#4B5563', fontSize: 12, fontWeight: '600'}}>
                {v === '7d' ? t('review.moodPeriod7d') : t('review.moodPeriod30d')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Mood bars */}
      {total === 0 ? (
        <Text style={{color: '#4B5563', fontSize: 13, textAlign: 'center', paddingVertical: 8}}>
          {t('review.moodNoLogged')}
        </Text>
      ) : (
        stats.map(s => (
          <View key={s.mood} style={{flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10}}>
            <Image source={s.mascot} style={{width: 24, height: 24}} resizeMode="contain" />
            <Text style={{color: '#9AA0A6', fontSize: 12, width: 72}}>{s.label}</Text>
            <View style={{flex: 1, height: 8, backgroundColor: '#0B0D10', borderRadius: 4, overflow: 'hidden'}}>
              <View style={{
                width: `${(s.count / max) * 100}%`,
                height: '100%',
                backgroundColor: s.color,
                borderRadius: 4,
              }} />
            </View>
            <Text style={{color: s.count > 0 ? s.color : '#4B5563', fontSize: 13, fontWeight: '600', width: 16, textAlign: 'right'}}>
              {s.count}
            </Text>
          </View>
        ))
      )}

      {/* Recent history row */}
      {history.length > 0 && (
        <>
          <View style={{height: 1, backgroundColor: '#1F2330', marginVertical: 14}} />
          <Text style={{color: '#4B5563', fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginBottom: 10}}>
            {t('review.moodRecentLabel')}
          </Text>
          <View style={{flexDirection: 'row', gap: 6}}>
            {history.map(entry => (
              <View
                key={entry.id}
                style={{
                  flex: 1, alignItems: 'center', gap: 4,
                  backgroundColor: `${MOOD_META[entry.mood].color}14`,
                  borderRadius: 10, paddingVertical: 8,
                  borderWidth: 1, borderColor: `${MOOD_META[entry.mood].color}33`,
                }}>
                <Image source={MOOD_META[entry.mood].mascot} style={{width: 28, height: 28}} resizeMode="contain" />
                <Text style={{color: '#4B5563', fontSize: 9}}>
                  {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

// Pro Upsell Banner
const ProUpsell: React.FC<{feature: string; onUpgrade: () => void}> = ({feature, onUpgrade}) => {
  const {t} = useTranslation();
  return (
  <TouchableOpacity
    onPress={onUpgrade}
    style={{
      backgroundColor: '#141821',
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#6E6AF2',
      borderStyle: 'dashed',
    }}>
    <Text style={{color: '#EDEEF0', fontSize: 16, fontWeight: '600', marginBottom: 4}}>
      {feature}
    </Text>
    <Text style={{color: '#9AA0A6', fontSize: 13, textAlign: 'center'}}>
      {t('review.proUpsellSubtitle')}
    </Text>
  </TouchableOpacity>
  );
};

// Main Review Screen
const ReviewScreen: React.FC = () => {
  const {t} = useTranslation();
  const logs = useLogStore(state => state.logs); // subscribe to trigger re-renders
  const getProcessedItems = useLogStore(state => state.getProcessedItems);
  const allLogs = useMemo(() => getProcessedItems(), [logs]); // only processed items
  const allTasks = useTaskStore(state => state.tasks);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const refreshTasks = useTaskStore(state => state.refreshTasks);
  const isPro = useSubscriptionStore(state => state.isPro);
  const navigation = useNavigation<any>();
  const [refreshing, setRefreshing] = useState(false);

  const logsByDay = useMemo(() => groupLogsByDay(allLogs), [allLogs]);

  // Group completed tasks by completion date
  const completedTasksByDay = useMemo(() => {
    return allTasks
      .filter(t => t.completedAt)
      .reduce((acc, task) => {
        const dateKey = task.completedAt!.split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(task);
        return acc;
      }, {} as Record<string, Task[]>);
  }, [allTasks]);

  const completedTasks = useMemo(() => {
    return allTasks
      .filter(t => t.completedAt)
      .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
  }, [allTasks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await storage.reloadFromAppGroup();
    refreshLogs();
    refreshTasks();
    setTimeout(() => setRefreshing(false), 300);
  };

  if (allLogs.length === 0 && completedTasks.length === 0) {
    return (
      <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
        <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>{t('review.screenTitle')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={{fontSize: 20, opacity: 0.7}}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32}}>
          <Image
            source={MOODS.chill}
            style={{width: 100, height: 100, marginBottom: 16}}
            resizeMode="contain"
          />
          <Text style={{color: '#9AA0A6', fontSize: 16, textAlign: 'center'}}>
            {t('review.emptyState')}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{flex: 1, backgroundColor: '#0B0D10'}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ImageBackground
        source={require('../../assets/logonobg.png')}
        style={{flex: 1}}
        imageStyle={{opacity: 0.03, resizeMode: 'center'}}
        resizeMode="center">
        {/* Header */}
        <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>{t('review.screenTitle')}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={{fontSize: 20, opacity: 0.7}}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

      {/* Scrollable content */}
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{paddingHorizontal: 24, paddingBottom: 32}}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6E6AF2"
          />
        }>
        {isPro ? (
          <ActivityHeatmap logsByDay={logsByDay} tasksByDay={completedTasksByDay} />
        ) : (
          <ProUpsell feature={t('review.heatmapProUpsellTitle')} onUpgrade={() => navigation.navigate('Paywall')} />
        )}
        <MoodInsights />
        {completedTasks.length > 0 && (
          <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
            <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
              {t('review.tasksCompletedTitle')}
            </Text>
            <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 16}}>
              {t('review.tasksCompletedCount', {count: completedTasks.length})}
            </Text>
            {completedTasks.slice(0, 10).map(task => (
              <View
                key={task.id}
                style={{backgroundColor: '#0B0D10', borderRadius: 12, padding: 16, marginBottom: 10}}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                  <View style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#6E6AF2',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 12,
                  }}>
                    <Text style={{color: '#FFFFFF', fontSize: 11, fontWeight: '700'}}>✓</Text>
                  </View>
                  <Text style={{color: '#EDEEF0', fontSize: 16, flex: 1}} numberOfLines={1}>
                    {task.text}
                  </Text>
                </View>
                <Text style={{color: '#9AA0A6', fontSize: 13, marginTop: 8, marginLeft: 32}}>
                  {new Date(task.completedAt!).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}{' '}
                  • {formatTime(task.completedAt!)}
                </Text>
              </View>
            ))}
          </View>
        )}
        {isPro ? (
          <SearchSection logs={allLogs} />
        ) : (
          <ProUpsell feature={t('review.searchProUpsellTitle')} onUpgrade={() => navigation.navigate('Paywall')} />
        )}
      </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

export default ReviewScreen;
