/**
 * Today Screen - Shows today's logs
 *
 * Simple list, nothing more.
 * View what you've accomplished today.
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ImageBackground,
  RefreshControl,
} from 'react-native';
import {useLogStore} from '../stores/useLogStore';
import {LogEntry, formatTime} from '../models/types';
import {storage} from '../storage/mmkv';

const LogItem: React.FC<{item: LogEntry}> = ({item}) => (
  <View style={styles.logItem}>
    <View style={styles.timeContainer}>
      <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
    </View>
    <View style={styles.logContent}>
      {item.text ? (
        <Text style={styles.logText}>{item.text}</Text>
      ) : (
        <Text style={styles.logTextEmpty}>Logged</Text>
      )}
      {item.bucketId && (
        <View style={styles.bucketBadge}>
          <Text style={styles.bucketText}>Sorted</Text>
        </View>
      )}
    </View>
  </View>
);

const TodayScreen: React.FC = () => {
  const getTodayLogs = useLogStore(state => state.getTodayLogs);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const [refreshing, setRefreshing] = useState(false);
  const todayLogs = getTodayLogs();

  const onRefresh = async () => {
    setRefreshing(true);
    // First reload from App Group (widget may have added logs)
    await storage.reloadFromAppGroup();
    refreshLogs();
    setTimeout(() => setRefreshing(false), 300);
  };

  // Sort by most recent first
  const sortedLogs = [...todayLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No logs yet</Text>
      <Text style={styles.emptySubtitle}>
        Tap "Instalog" to capture your first moment
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require('../../assets/logonobg.png')}
        style={{flex: 1}}
        imageStyle={{opacity: 0.03, resizeMode: 'center'}}
        resizeMode="center">
        <View style={styles.header}>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.count}>
            {todayLogs.length} {todayLogs.length === 1 ? 'log' : 'logs'}
          </Text>
        </View>

        <FlatList
          data={sortedLogs}
          keyExtractor={item => item.id}
          renderItem={({item}) => <LogItem item={item} />}
          contentContainerStyle={
            sortedLogs.length === 0 ? styles.emptyList : styles.list
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6E6AF2"
            />
          }
          />
      </ImageBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  count: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyList: {
    flex: 1,
  },
  logItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  timeContainer: {
    marginRight: 12,
  },
  time: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  logContent: {
    flex: 1,
  },
  logText: {
    fontSize: 16,
    color: '#1A1A1A',
    lineHeight: 22,
  },
  logTextEmpty: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  bucketBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  bucketText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default TodayScreen;
