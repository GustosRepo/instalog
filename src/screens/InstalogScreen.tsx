/**
 * Instalog Screen — Brain Dump
 *
 * Fast, chaotic, zero-friction capture.
 * Dump first, organize later.
 */

import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useLogStore} from '../stores/useLogStore';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {useHintsStore} from '../stores/useHintsStore';
import {useMoodStore} from '../stores/useMoodStore';
import {LogEntry, formatTime} from '../models/types';
import {BrainMood} from '../models/types';
import {MOOD_META, MOOD_ORDER} from '../utils/mood';
import {Haptics} from '../utils/haptics';
import {MOODS} from '../utils/moods';
import {maybeRequestReview} from '../utils/storeReview';

// ─── Mood picker ──────────────────────────────────────────────────────────────

const MoodPicker: React.FC = () => {
  const setTodayMood = useMoodStore(state => state.setTodayMood);
  const getTodayMood = useMoodStore(state => state.getTodayMood);
  const clearTodayMood = useMoodStore(state => state.clearTodayMood);
  const _moodEntries = useMoodStore(state => state.entries); // subscribe for reactivity
  const todayMood = getTodayMood();

  const handleSelect = (mood: BrainMood) => {
    Haptics.light();
    if (todayMood === mood) {
      clearTodayMood();
    } else {
      setTodayMood(mood);
    }
  };

  return (
    <View style={{
      marginHorizontal: 16,
      marginBottom: 12,
      backgroundColor: '#141821',
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: todayMood ? `${MOOD_META[todayMood].color}33` : '#1F2330',
    }}>
      {todayMood ? (
        // Selected state — compact row
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
            <Image source={MOOD_META[todayMood].mascot} style={{width: 32, height: 32}} resizeMode="contain" />
            <View>
              <Text style={{color: '#4B5563', fontSize: 11, fontWeight: '600', letterSpacing: 0.6}}>
                BRAIN TODAY
              </Text>
              <Text style={{color: MOOD_META[todayMood].color, fontSize: 14, fontWeight: '600', marginTop: 1}}>
                {MOOD_META[todayMood].label}
              </Text>
            </View>
          </View>
          {/* Tap to change chips */}
          <View style={{flexDirection: 'row', gap: 6}}>
            {MOOD_ORDER.filter(m => m !== todayMood).map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => handleSelect(m)}
                hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}
                style={{
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: '#0B0D10',
                  alignItems: 'center', justifyContent: 'center',
                  borderWidth: 1, borderColor: '#232936',
                }}>
                <Image source={MOOD_META[m].mascot} style={{width: 22, height: 22}} resizeMode="contain" />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        // Unset state — prompt
        <>
          <Text style={{color: '#4B5563', fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginBottom: 10}}>
            HOW IS YOUR BRAIN TODAY?
          </Text>
          <View style={{flexDirection: 'row', gap: 8}}>
            {MOOD_ORDER.map(m => (
              <TouchableOpacity
                key={m}
                onPress={() => handleSelect(m)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 8,
                  borderRadius: 10, backgroundColor: '#0B0D10',
                  borderWidth: 1, borderColor: '#1F2330', gap: 3,
                }}>
                <Image source={MOOD_META[m].mascot} style={{width: 36, height: 36}} resizeMode="contain" />
                <Text style={{color: '#6B7280', fontSize: 9, fontWeight: '500'}}>
                  {MOOD_META[m].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const InstalogScreen: React.FC = () => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const navigation = useNavigation<any>();
  const listRef = useRef<FlatList>(null);

  // Animations
  const flashAnim = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const [showSuccess, setShowSuccess] = useState(false);
  const [showMilestone, setShowMilestone] = useState(false);

  const instalog = useLogStore(state => state.instalog);
  const getUnprocessedItems = useLogStore(state => state.getUnprocessedItems);
  const getTodayCaptureStats = useLogStore(state => state.getTodayCaptureStats);
  const {isPro, incrementLogCount, totalLogCount} = useSubscriptionStore();
  const {loadHints} = useHintsStore();

  useEffect(() => {
    loadHints();
    // Auto-focus on mount
    const t = setTimeout(() => inputRef.current?.focus(), 300);
    return () => clearTimeout(t);
  }, []);

  const unprocessed = getUnprocessedItems();
  const stats = getTodayCaptureStats();

  const flashRow = useCallback(() => {
    flashAnim.setValue(1);
    Animated.timing(flashAnim, {
      toValue: 0,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [flashAnim]);

  const handleCapture = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    instalog({text: trimmed});
    incrementLogCount();

    const newCount = totalLogCount + 1;
    const isMilestone = [1, 10, 50, 100, 500].includes(newCount);
    setShowMilestone(isMilestone);

    if ([10, 50, 100].includes(newCount)) {
      setTimeout(() => maybeRequestReview(), 1500);
    }

    Haptics.success();
    setText('');
    flashRow();

    // Success mascot flash
    setShowSuccess(true);
    successScale.setValue(0);
    successOpacity.setValue(1);
    Animated.parallel([
      Animated.spring(successScale, {toValue: 1, friction: 4, tension: 100, useNativeDriver: true}),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(successOpacity, {toValue: 0, duration: 250, useNativeDriver: true}),
      ]),
    ]).start(() => setShowSuccess(false));

    // Auto-scroll to top after capture
    setTimeout(() => listRef.current?.scrollToOffset({offset: 0, animated: true}), 50);
  }, [text, instalog, incrementLogCount, totalLogCount, flashRow, successScale, successOpacity]);

  const renderItem = ({item, index}: {item: LogEntry; index: number}) => {
    const isNewest = index === 0;
    return (
      <Animated.View
        style={{
          opacity: isNewest ? flashAnim.interpolate({inputRange: [0, 1], outputRange: [1, 0.4]}) : 1,
          flexDirection: 'row',
          alignItems: 'flex-start',
          paddingVertical: 12,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.04)',
        }}>
        <View style={{width: 6, height: 6, borderRadius: 3, backgroundColor: '#6E6AF2', marginTop: 7, marginRight: 14, flexShrink: 0}} />
        <Text style={{color: '#EDEEF0', fontSize: 16, flex: 1, lineHeight: 22}}>
          {item.text || '—'}
        </Text>
        <Text style={{color: '#4B5563', fontSize: 12, marginLeft: 8, marginTop: 3}}>
          {formatTime(item.timestamp)}
        </Text>
      </Animated.View>
    );
  };

  const renderEmpty = () => (
    <View style={{flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80}}>
      <Image source={MOODS.chill} style={{width: 90, height: 90, marginBottom: 20}} resizeMode="contain" />
      <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '600', marginBottom: 6}}>
        Start dumping
      </Text>
      <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center', lineHeight: 20}}>
        Type anything — thoughts, tasks, ideas.{'\n'}No organizing yet.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0B0D10'}} edges={['top']}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}>

        {/* Header */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: 20,
          paddingTop: 8,
          paddingBottom: 12,
        }}>
          <View>
            <Text style={{color: '#EDEEF0', fontSize: 24, fontWeight: '700'}}>Brain Dump</Text>
            {stats.totalCaptured > 0 ? (
              <Text style={{color: '#9AA0A6', fontSize: 13, marginTop: 2}}>
                {stats.totalUnprocessed > 0
                  ? `${stats.totalUnprocessed} unprocessed · ${stats.totalProcessed} done`
                  : 'All processed ✓'}
              </Text>
            ) : (
              <Text style={{color: '#4B5563', fontSize: 13, marginTop: 2}}>
                Dump first, organize later
              </Text>
            )}
          </View>

          <View style={{flexDirection: 'row', alignItems: 'center', gap: 14}}>
            {!isPro && (
              <TouchableOpacity onPress={() => navigation.navigate('Paywall')}>
                <Text style={{color: '#6E6AF2', fontSize: 13, fontWeight: '500'}}>Go Pro</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => navigation.navigate('Settings')}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <Text style={{fontSize: 18, opacity: 0.6}}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Capture tray */}
        <FlatList
          ref={listRef}
          data={unprocessed}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={<MoodPicker />}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={unprocessed.length === 0 ? {flex: 1} : {paddingBottom: 16}}
          style={{flex: 1}}
        />

        {/* Input bar */}
        <View style={{
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.06)',
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: Platform.OS === 'ios' ? 28 : 16,
          backgroundColor: '#0B0D10',
        }}>
          {/* Success mascot */}
          {showSuccess && (
            <Animated.View style={{
              position: 'absolute',
              top: -70,
              right: 24,
              opacity: successOpacity,
              transform: [{scale: successScale}],
            }}>
              <Image
                source={showMilestone ? MOODS.shocked : MOODS.happy}
                style={{width: 56, height: 56}}
                resizeMode="contain"
              />
            </Animated.View>
          )}

          <View style={{flexDirection: 'row', alignItems: 'center', gap: 10}}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={setText}
              placeholder="What's on your mind…"
              placeholderTextColor="#4B5563"
              style={{
                flex: 1,
                backgroundColor: '#141821',
                borderRadius: 14,
                paddingHorizontal: 16,
                paddingVertical: 12,
                color: '#EDEEF0',
                fontSize: 16,
                borderWidth: 1,
                borderColor: text.length > 0 ? '#6E6AF2' : '#1F2330',
              }}
              returnKeyType="done"
              blurOnSubmit={false}
              onSubmitEditing={handleCapture}
              maxLength={280}
            />
            <TouchableOpacity
              onPress={handleCapture}
              disabled={!text.trim()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: text.trim() ? '#6E6AF2' : '#1A1D24',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
              <Text style={{
                color: text.trim() ? '#FFF' : '#4B5563',
                fontSize: 20,
                lineHeight: 22,
                textAlign: 'center',
              }}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default InstalogScreen;
