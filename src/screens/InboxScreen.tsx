/**
 * Inbox Screen - Unsorted Logs
 *
 * Purpose: Display quick logs before they are organized
 * Dark list with timestamps and accent indicators
 * Swipe left to delete
 */

import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  Vibration,
  Image,
  RefreshControl,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useLogStore} from '../stores/useLogStore';
import {LogEntry, formatTime} from '../models/types';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

interface LogItemProps {
  item: LogEntry;
  onDelete: () => void;
}

const LogItem: React.FC<LogItemProps> = ({item, onDelete}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDeleting, setIsDeleting] = React.useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 && Math.abs(gestureState.dy) < 20;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < 0) {
          pan.setValue({x: gestureState.dx, y: 0});
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left to delete
          setIsDeleting(true);
          Vibration.vibrate(50);
          Animated.timing(pan, {
            toValue: {x: -SCREEN_WIDTH, y: 0},
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onDelete();
          });
        } else {
          // Return to center
          Animated.spring(pan, {
            toValue: {x: 0, y: 0},
            useNativeDriver: false,
            tension: 80,
            friction: 7,
          }).start();
        }
      },
    }),
  ).current;

  const deleteOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={{position: 'relative'}}>
      {/* Delete background */}
      <View style={{position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 24}}>
        <Animated.Text
          style={{opacity: deleteOpacity, color: '#EF4444', fontWeight: '600'}}>
          Delete
        </Animated.Text>
      </View>

      {/* Swipeable content */}
      <Animated.View
        style={[
          {transform: [{translateX: pan.x}]}, 
          {opacity: isDeleting ? 0.5 : 1}
        ]}
        {...panResponder.panHandlers}>
        <View style={{
          flexDirection: 'row', 
          alignItems: 'flex-start', 
          paddingVertical: 16, 
          paddingHorizontal: 24,
          backgroundColor: '#141821',
          marginHorizontal: 16,
          marginBottom: 12,
          borderRadius: 12
        }}>
          {/* Accent dot indicator */}
          <View style={{width: 8, height: 8, borderRadius: 4, backgroundColor: '#6E6AF2', marginTop: 8, marginRight: 16}} />

          {/* Content */}
          <View style={{flex: 1}}>
            <Text style={{color: '#EDEEF0', fontSize: 16, lineHeight: 24, marginBottom: 4}}>
              {item.text || 'Logged'}
            </Text>
            <Text style={{color: '#9AA0A6', fontSize: 14}}>
              {formatTime(item.timestamp)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const InboxScreen: React.FC = () => {
  const navigation = useNavigation();
  const logs = useLogStore(state => state.logs);
  const removeLog = useLogStore(state => state.removeLog);
  const getUnsortedLogs = useLogStore(state => state.getUnsortedLogs);
  const refreshLogs = useLogStore(state => state.refreshLogs);
  const [refreshing, setRefreshing] = useState(false);
  
  const todayLogs = getUnsortedLogs();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Reload from App Group (in case widget added logs)
      const {storage} = await import('../storage/mmkv');
      await storage.reloadFromAppGroup();
      refreshLogs();
      // Small delay to show refresh animation
      await new Promise<void>(resolve => setTimeout(() => resolve(), 300));
    } catch (error) {
      console.warn('Failed to refresh:', error);
    }
    setRefreshing(false);
  };

  // Sort by most recent first
  const sortedLogs = [...todayLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const renderEmptyState = () => (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32}}>
      <Image
        source={require('../../assets/logonobg.png')}
        style={{width: 200, height: 200, opacity: 0.25, marginBottom: 32}}
        resizeMode="contain"
      />
      <Text style={{color: '#EDEEF0', fontSize: 20, fontWeight: '600', marginBottom: 8}}>
        No logs yet
      </Text>
      <Text style={{color: '#9AA0A6', fontSize: 16, textAlign: 'center'}}>
        Tap "Instalog" to capture your first moment
      </Text>
    </View>
  );

  return (
    <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
      {/* Log list */}
      {sortedLogs.length === 0 ? (
        <FlatList
          data={[]}
          ListHeaderComponent={() => (
            <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16}}>
              <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>
                Inbox
              </Text>
              <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 4}}>
                {todayLogs.length} {todayLogs.length === 1 ? 'log' : 'logs'} today
              </Text>
            </View>
          )}
          renderItem={() => null}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6E6AF2"
              titleColor="#9AA0A6"
            />
          }
        />
      ) : (
        <FlatList
          data={sortedLogs}
          keyExtractor={item => item.id}
          ListHeaderComponent={() => (
            <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16}}>
              <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>
                Inbox
              </Text>
              <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 4}}>
                {todayLogs.length} {todayLogs.length === 1 ? 'log' : 'logs'} today
              </Text>
            </View>
          )}
          renderItem={({item}) => (
            <LogItem item={item} onDelete={() => removeLog(item.id)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{paddingBottom: 120}}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#6E6AF2"
              titleColor="#9AA0A6"
            />
          }
        />
      )}

      {/* Fixed footer button */}
      {sortedLogs.length > 0 && (
        <View style={{position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 48, backgroundColor: '#0B0D10'}}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Wrap Up' as never)}
            style={{backgroundColor: '#6E6AF2', paddingVertical: 16, borderRadius: 16}}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Go to Wrap Up"
            accessibilityHint="Opens the Wrap Up screen to organize your logs">
            <Text style={{color: '#EDEEF0', textAlign: 'center', fontSize: 18, fontWeight: '600'}}>
              Wrap Up
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default InboxScreen;
