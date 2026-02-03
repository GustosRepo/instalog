/**
 * Wrap Up Screen - Cleanup Flow
 *
 * Purpose: Quickly organize or clear the day's logs
 * Card-based swipe interface with finite, satisfying UX
 * Includes bucket management
 */

import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  Dimensions,
  Vibration,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Keyboard,
  ImageBackground,
} from 'react-native';
import {useLogStore} from '../stores/useLogStore';
import {useSubscriptionStore, FREE_BUCKET_LIMIT} from '../stores/useSubscriptionStore';
import {useHintsStore} from '../stores/useHintsStore';
import {LogEntry, formatTime} from '../models/types';
import {useNavigation} from '@react-navigation/native';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface LogCardProps {
  item: LogEntry;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const LogCard: React.FC<LogCardProps> = ({item, onSwipeLeft, onSwipeRight}) => {
  const pan = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(0)).current;
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  // Entrance animation
  React.useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({x: gestureState.dx, y: 0});
        
        // Update swipe direction for visual feedback
        if (gestureState.dx > 50) {
          setSwipeDirection('right');
        } else if (gestureState.dx < -50) {
          setSwipeDirection('left');
        } else {
          setSwipeDirection(null);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swiped right - assign to bucket
          Vibration.vibrate(50);
          Animated.timing(pan, {
            toValue: {x: SCREEN_WIDTH, y: 0},
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onSwipeRight();
            pan.setValue({x: 0, y: 0});
            setSwipeDirection(null);
          });
        } else if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swiped left - archive
          Vibration.vibrate(50);
          Animated.timing(pan, {
            toValue: {x: -SCREEN_WIDTH, y: 0},
            duration: 200,
            useNativeDriver: false,
          }).start(() => {
            onSwipeLeft();
            pan.setValue({x: 0, y: 0});
            setSwipeDirection(null);
          });
        } else {
          // Return to center
          setSwipeDirection(null);
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

  const cardStyle = {
    transform: [{translateX: pan.x}, {scale}],
  };

  const leftOpacity = pan.x.interpolate({
    inputRange: [-SCREEN_WIDTH, -SWIPE_THRESHOLD, 0],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  });

  const rightOpacity = pan.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD, SCREEN_WIDTH],
    outputRange: [0, 0.8, 1],
    extrapolate: 'clamp',
  });

  return (
    <View style={{position: 'relative'}}>
      {/* Swipe action indicators */}
      <View style={{position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 32}}>
        <Animated.View style={{opacity: leftOpacity}}>
          <Text style={{color: '#9AA0A6', fontSize: 16, fontWeight: '500'}}>Archive</Text>
        </Animated.View>
        <Animated.View style={{opacity: rightOpacity}}>
          <Text style={{color: '#6E6AF2', fontSize: 16, fontWeight: '500'}}>Sort</Text>
        </Animated.View>
      </View>

      {/* Swipeable card */}
      <Animated.View
        style={[cardStyle, {backgroundColor: '#141821', borderRadius: 16, padding: 24, marginHorizontal: 24}]}
        {...panResponder.panHandlers}>
        <Text style={{color: '#9AA0A6', fontSize: 14, marginBottom: 8}}>
          {formatTime(item.timestamp)}
        </Text>
        <Text style={{color: '#EDEEF0', fontSize: 18, lineHeight: 28}}>
          {item.text || 'Logged'}
        </Text>
      </Animated.View>
    </View>
  );
};

const BucketManager: React.FC<{
  visible: boolean;
  onClose: () => void;
}> = ({visible, onClose}) => {
  const navigation = useNavigation();
  const buckets = useLogStore(state => state.buckets);
  const addBucket = useLogStore(state => state.addBucket);
  const removeBucket = useLogStore(state => state.removeBucket);
  const isPro = useSubscriptionStore(state => state.isPro);
  const [newBucketName, setNewBucketName] = useState('');

  const handleAddBucket = () => {
    const trimmed = newBucketName.trim();
    if (!trimmed) return;
    
    // Check bucket limit for free users
    if (!isPro && buckets.length >= FREE_BUCKET_LIMIT) {
      onClose();
      (navigation as any).navigate('Paywall');
      return;
    }
    
    addBucket(trimmed);
    setNewBucketName('');
    Vibration.vibrate(50);
    Keyboard.dismiss();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={{flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)'}}>
        <View style={{backgroundColor: '#141821', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32}}>
          {/* Header */}
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(154, 160, 166, 0.1)'}}>
            <Text style={{color: '#EDEEF0', fontSize: 20, fontWeight: '700'}}>
              Manage Buckets
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{color: '#6E6AF2', fontSize: 18, fontWeight: '600'}}>Done</Text>
            </TouchableOpacity>
          </View>

          {/* Add new bucket */}
          <View style={{paddingHorizontal: 24, paddingVertical: 16}}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <TextInput
                value={newBucketName}
                onChangeText={setNewBucketName}
                placeholder="New bucket name..."
                placeholderTextColor="#9AA0A6"
                style={{
                  flex: 1,
                  backgroundColor: '#0B0D10',
                  color: '#EDEEF0',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderRadius: 12,
                  marginRight: 12,
                }}
                onSubmitEditing={handleAddBucket}
                returnKeyType="done"
                maxLength={30}
              />
              <TouchableOpacity
                onPress={handleAddBucket}
                disabled={!newBucketName.trim()}
                style={{
                  backgroundColor: newBucketName.trim() ? '#6E6AF2' : '#0B0D10',
                  paddingHorizontal: 20,
                  paddingVertical: 12,
                  borderRadius: 12,
                }}>
                <Text style={{color: newBucketName.trim() ? '#EDEEF0' : '#9AA0A6', fontWeight: '600'}}>
                  Add
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bucket list */}
          <ScrollView style={{maxHeight: 320, paddingHorizontal: 24}}>
            {buckets.length === 0 ? (
              <View style={{paddingVertical: 32}}>
                <Text style={{color: '#9AA0A6', textAlign: 'center'}}>
                  No buckets yet. Add one above.
                </Text>
              </View>
            ) : (
              buckets.map(bucket => (
                <View
                  key={bucket.id}
                  style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0B0D10', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 8}}>
                  <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                    <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#6E6AF2', marginRight: 12}} />
                    <Text style={{color: '#EDEEF0', fontSize: 16}}>
                      {bucket.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      removeBucket(bucket.id);
                      Vibration.vibrate(50);
                    }}
                    style={{paddingHorizontal: 12, paddingVertical: 4}}>
                    <Text style={{color: '#EF4444', fontWeight: '500'}}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Bucket Selector Modal Component
interface BucketSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectBucket: (bucketId: string) => void;
}

const BucketSelector: React.FC<BucketSelectorProps> = ({visible, onClose, onSelectBucket}) => {
  const buckets = useLogStore(state => state.buckets);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}>
      <TouchableOpacity 
        style={{flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)'}}
        activeOpacity={1}
        onPress={onClose}>
        <View 
          style={{backgroundColor: '#141821', borderRadius: 24, marginHorizontal: 32, maxWidth: 400, width: '100%'}}
          onStartShouldSetResponder={() => true}>
          {/* Header */}
          <View style={{paddingHorizontal: 24, paddingTop: 24, paddingBottom: 16}}>
            <Text style={{color: '#EDEEF0', fontSize: 20, fontWeight: '700', marginBottom: 8}}>
              Sort into bucket
            </Text>
            <Text style={{color: '#9AA0A6', fontSize: 14}}>
              Choose a bucket for this log
            </Text>
          </View>

          {/* Bucket list */}
          <ScrollView style={{maxHeight: 400}}>
            {buckets.length === 0 ? (
              <View style={{paddingVertical: 32, paddingHorizontal: 24}}>
                <Text style={{color: '#9AA0A6', textAlign: 'center', marginBottom: 16}}>
                  No buckets yet. Create one first.
                </Text>
              </View>
            ) : (
              buckets.map(bucket => (
                <TouchableOpacity
                  key={bucket.id}
                  onPress={() => {
                    onSelectBucket(bucket.id);
                    Vibration.vibrate(50);
                  }}
                  style={{flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 1, borderTopColor: 'rgba(154, 160, 166, 0.1)'}}
                  activeOpacity={0.7}>
                  <View style={{width: 12, height: 12, borderRadius: 6, backgroundColor: '#6E6AF2', marginRight: 16}} />
                  <Text style={{color: '#EDEEF0', fontSize: 18, flex: 1}}>
                    {bucket.name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          {/* Cancel button */}
          <TouchableOpacity
            onPress={onClose}
            style={{borderTopWidth: 1, borderTopColor: 'rgba(154, 160, 166, 0.1)', paddingVertical: 16}}
            activeOpacity={0.7}>
            <Text style={{color: '#9AA0A6', textAlign: 'center', fontSize: 16, fontWeight: '600'}}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const WrapUpScreen: React.FC = () => {
  const logs = useLogStore(state => state.logs);
  const getUnsortedLogs = useLogStore(state => state.getUnsortedLogs);
  const assignBucket = useLogStore(state => state.assignBucket);
  const buckets = useLogStore(state => state.buckets);
  const {hasSeenWrapUpOverlay, markWrapUpOverlaySeen} = useHintsStore();

  const unsortedLogs = getUnsortedLogs();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBucketManager, setShowBucketManager] = useState(false);
  const [showBucketSelector, setShowBucketSelector] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showOverlayHint, setShowOverlayHint] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Show overlay hint on first visit
  useEffect(() => {
    if (!hasSeenWrapUpOverlay && unsortedLogs.length > 0) {
      setTimeout(() => {
        setShowOverlayHint(true);
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 800);
    }
  }, [hasSeenWrapUpOverlay, unsortedLogs.length]);

  const dismissOverlayHint = () => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowOverlayHint(false));
    markWrapUpOverlaySeen();
  };

  // Sort by oldest first for wrap-up flow
  const sortedLogs = [...unsortedLogs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const currentLog = sortedLogs[currentIndex];

  const showToast = (message: string) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setToastMessage(null));
  };

  const handleSwipeLeft = () => {
    // Archive - assign to special "archived" bucket
    if (currentLog) {
      assignBucket(currentLog.id, '__archived__');
      showToast('Archived');
      // The log now has a bucketId, so it will be filtered out of unsorted logs
    }
  };

  const handleSwipeRight = () => {
    // Show bucket selector
    setShowBucketSelector(true);
  };

  const handleBucketSelected = (bucketId: string) => {
    if (currentLog) {
      assignBucket(currentLog.id, bucketId);
      setShowBucketSelector(false);
      const bucket = buckets.find(b => b.id === bucketId);
      showToast(`Sorted into ${bucket?.name || 'bucket'}`);
      // Don't advance - the next log automatically takes this position
    }
  };

  const advanceToNext = () => {
    if (currentIndex < sortedLogs.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const renderAllClear = () => (
    <View style={{flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32}}>
      <Text style={{color: '#EDEEF0', fontSize: 24, fontWeight: '700', marginBottom: 8}}>
        All clear
      </Text>
      <Text style={{color: '#9AA0A6', fontSize: 16, textAlign: 'center'}}>
        Nice work! All logs have been processed.
      </Text>
    </View>
  );

  return (
    <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
      <ImageBackground
        source={require('../../assets/logonobg.png')}
        style={{flex: 1}}
        imageStyle={{opacity: 0.03, resizeMode: 'center'}}
        resizeMode="center">
        {/* Header */}
        <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 32}}>
        <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <View>
            <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>Wrap Up</Text>
            {sortedLogs.length > 0 && currentIndex < sortedLogs.length && (
              <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 4}}>
                {sortedLogs.length - currentIndex}{' '}
                {sortedLogs.length - currentIndex === 1 ? 'log' : 'logs'} left
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => setShowBucketManager(true)}
            style={{backgroundColor: '#141821', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12}}>
            <Text style={{color: '#6E6AF2', fontWeight: '600'}}>Buckets</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bucket Manager Modal */}
      <BucketManager
        visible={showBucketManager}
        onClose={() => setShowBucketManager(false)}
      />

      {/* Bucket Selector Modal */}
      <BucketSelector
        visible={showBucketSelector}
        onClose={() => setShowBucketSelector(false)}
        onSelectBucket={handleBucketSelected}
      />

      {/* Content */}
      <View style={{flex: 1, justifyContent: 'center'}}>
        {sortedLogs.length === 0 || currentIndex >= sortedLogs.length ? (
          renderAllClear()
        ) : (
          <>
            <LogCard
              item={currentLog}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
            />
            
            {/* Helper text */}
            <Text style={{color: '#9AA0A6', fontSize: 14, textAlign: 'center', marginTop: 32, paddingHorizontal: 24}}>
              Swipe left to archive • Swipe right to sort
            </Text>
          </>
        )}
      </View>

      {/* Toast notification */}
      {toastMessage && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: 120,
            left: 24,
            right: 24,
            backgroundColor: '#141821',
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 24,
            opacity: toastOpacity,
            alignItems: 'center',
          }}>
          <Text style={{color: '#EDEEF0', fontSize: 16, fontWeight: '600'}}>
            {toastMessage}
          </Text>
        </Animated.View>
      )}

      {/* Overlay hint */}
      {showOverlayHint && (
        <Animated.View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            opacity: overlayOpacity,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
          }}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={dismissOverlayHint}
            style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
            <Text style={{color: '#EDEEF0', fontSize: 24, fontWeight: '600', marginBottom: 12, textAlign: 'center'}}>
              Swipe logs into buckets
            </Text>
            <Text style={{color: '#9AA0A6', fontSize: 16, textAlign: 'center', lineHeight: 24}}>
              Swipe left to archive{'\n'}Swipe right to organize
            </Text>
            <Text style={{color: '#6E6AF2', fontSize: 14, marginTop: 32}}>
              Tap anywhere to continue
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}
      </ImageBackground>
    </View>
  );
};

export default WrapUpScreen;
