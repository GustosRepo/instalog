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
} from 'react-native';
import {useLogStore} from '../stores/useLogStore';
import {LogEntry, formatTime} from '../models/types';
import {storage} from '../storage/mmkv';

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
}

const DayDetailModal: React.FC<DayDetailProps> = ({visible, onClose, dateKey, logs}) => {
  const date = new Date(dateKey);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateDisplay = `${monthNames[date.getMonth()]} ${date.getDate()}`;

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
              {dateDisplay} — {logs.length} {logs.length === 1 ? 'log' : 'logs'}
            </Text>
          </View>

          {/* Log previews */}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Activity Heatmap Component
const ActivityHeatmap: React.FC<{logsByDay: Record<string, LogEntry[]>}> = ({logsByDay}) => {
  const [selectedDay, setSelectedDay] = useState<{dateKey: string; logs: LogEntry[]} | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthGrid = buildMonthGrid(currentYear, currentMonth);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
      <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
        Activity
      </Text>
      <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 12}}>
        {monthNames[currentMonth]} {currentYear}
      </Text>

      {/* Weekday headers */}
      <View style={{flexDirection: 'row', marginBottom: 8}}>
        {weekDays.map((day, i) => (
          <View key={i} style={{width: 32, height: 32, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{color: '#9AA0A6', fontSize: 12}}>{day}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
        {monthGrid.map((cell, index) => {
          if (!cell.dateKey) {
            return <View key={`empty-${index}`} style={{width: 32, height: 32, margin: 2}} />;
          }

          const count = logsByDay[cell.dateKey]?.length || 0;
          const level = getIntensityLevel(count);
          const color = getIntensityColor(level);

          return (
            <TouchableOpacity
              key={cell.dateKey}
              onPress={() => {
                if (count > 0) {
                  setSelectedDay({dateKey: cell.dateKey!, logs: logsByDay[cell.dateKey!]});
                }
              }}
              style={{
                width: 32,
                height: 32,
                margin: 2,
                backgroundColor: color,
                borderRadius: 4,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{color: level > 1 ? '#EDEEF0' : '#9AA0A6', fontSize: 10}}>
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
        />
      )}
    </View>
  );
};

// Buckets Component
const BucketsSection: React.FC<{logs: LogEntry[]}> = ({logs}) => {
  const buckets = useLogStore(state => state.buckets);
  const [expandedBucket, setExpandedBucket] = useState<string | null>(null);

  // Count logs per bucket (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const bucketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach(log => {
      if (log.bucketId && new Date(log.timestamp) >= thirtyDaysAgo) {
        counts[log.bucketId] = (counts[log.bucketId] || 0) + 1;
      }
    });
    return counts;
  }, [logs]);

  const maxCount = Math.max(...Object.values(bucketCounts), 1);

  const bucketsWithCounts = buckets
    .map(bucket => ({
      ...bucket,
      count: bucketCounts[bucket.id] || 0,
    }))
    .filter(bucket => bucket.count > 0)
    .sort((a, b) => b.count - a.count);

  if (bucketsWithCounts.length === 0) {
    return (
      <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
        <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 12}}>
          Buckets
        </Text>
        <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center', paddingVertical: 24}}>
          No bucketed logs yet. Sort some in Wrap Up.
        </Text>
      </View>
    );
  }

  return (
    <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
      <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 16}}>
        Buckets
      </Text>
      <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 16}}>
        Last 30 days
      </Text>

      {bucketsWithCounts.map(bucket => {
        const widthPercentage = (bucket.count / maxCount) * 100;
        const isExpanded = expandedBucket === bucket.id;

        return (
          <TouchableOpacity
            key={bucket.id}
            onPress={() => setExpandedBucket(isExpanded ? null : bucket.id)}
            style={{marginBottom: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 8}}>
              <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#6E6AF2', marginRight: 12}} />
              <Text style={{color: '#EDEEF0', fontSize: 16, flex: 1}}>
                {bucket.name}
              </Text>
              {isExpanded && (
                <Text style={{color: '#9AA0A6', fontSize: 14}}>
                  {bucket.count}
                </Text>
              )}
            </View>
            {/* Presence bar */}
            <View style={{height: 8, backgroundColor: '#0B0D10', borderRadius: 4, overflow: 'hidden'}}>
              <View
                style={{
                  width: `${widthPercentage}%`,
                  height: '100%',
                  backgroundColor: '#6E6AF2',
                  borderRadius: 4,
                }}
              />
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Search Component
const SearchSection: React.FC<{logs: LogEntry[]}> = ({logs}) => {
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
        Search
      </Text>

      <TextInput
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search your logs…"
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
            <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center', paddingVertical: 24}}>
              No matching logs
            </Text>
          ) : (
            <View>
              <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 12}}>
                {searchResults.length} {searchResults.length === 1 ? 'result' : 'results'}
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

// Main Review Screen
const ReviewScreen: React.FC = () => {
  const allLogs = useLogStore(state => state.logs);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const [refreshing, setRefreshing] = useState(false);

  const logsByDay = useMemo(() => groupLogsByDay(allLogs), [allLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    // First reload from App Group (widget may have added logs)
    await storage.reloadFromAppGroup();
    refreshLogs();
    // Small delay for visual feedback
    setTimeout(() => setRefreshing(false), 300);
  };

  if (allLogs.length === 0) {
    return (
      <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
        <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32}}>
          <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>Review</Text>
        </View>
        <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32}}>
          <Text style={{color: '#9AA0A6', fontSize: 16, textAlign: 'center'}}>
            Nothing here yet. Your logs will show up as you use Instalog.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
      <ImageBackground
        source={require('../../assets/logonobg.png')}
        style={{flex: 1}}
        imageStyle={{opacity: 0.03, resizeMode: 'center'}}
        resizeMode="center">
        {/* Header */}
        <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16}}>
        <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>Review</Text>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{paddingHorizontal: 24, paddingBottom: 32}}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6E6AF2"
          />
        }>
        <ActivityHeatmap logsByDay={logsByDay} />
        <BucketsSection logs={allLogs} />
        <SearchSection logs={allLogs} />
      </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default ReviewScreen;
