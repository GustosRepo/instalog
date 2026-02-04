/**
 * Instalog Screen - Fast Entry
 *
 * Purpose: Instantly log a short text entry with minimal steps
 * Dark-first UI, auto-focus keyboard, haptic feedback
 */

import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  Keyboard,
  ImageBackground,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useLogStore} from '../stores/useLogStore';
import {useSubscriptionStore, FREE_LOG_LIMIT} from '../stores/useSubscriptionStore';
import {useHintsStore} from '../stores/useHintsStore';
import {Haptics} from '../utils/haptics';

const InstalogScreen: React.FC = () => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const navigation = useNavigation<any>();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showIdleHint, setShowIdleHint] = useState(false);
  
  const instalog = useLogStore(state => state.instalog);
  const {canCreateLog, logsRemaining, isPro, incrementLogCount} = useSubscriptionStore();
  const {hasSeenFirstTap, markFirstTapSeen, hasSeenWrapUpToast, markWrapUpToastSeen, loadHints} = useHintsStore();

  useEffect(() => {
    loadHints();
  }, []);

  useEffect(() => {
    // Auto-focus keyboard on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Idle hint after 5 seconds
  useEffect(() => {
    if (hasSeenFirstTap) return;

    const idleTimer = setTimeout(() => {
      setShowIdleHint(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 5000);

    return () => clearTimeout(idleTimer);
  }, [hasSeenFirstTap]);

  // Hide hint on any text input
  useEffect(() => {
    if (text && showIdleHint) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowIdleHint(false));
      markFirstTapSeen();
    }
  }, [text, showIdleHint]);

  const handleLog = useCallback(() => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Check if user can create logs
    if (!canCreateLog) {
      Haptics.warning();
      navigation.navigate('Paywall');
      return;
    }

    // Save the log
    instalog({text: trimmedText});
    incrementLogCount();

    // Success haptic feedback
    Haptics.success();

    // Show Wrap Up toast after first log
    if (!hasSeenWrapUpToast) {
      setTimeout(() => {
        markWrapUpToastSeen();
        // TODO: Show toast pointing to Wrap Up tab
      }, 500);
    }

    // Clear input and dismiss keyboard
    setText('');
    Keyboard.dismiss();
  }, [text, instalog, canCreateLog, navigation, incrementLogCount, hasSeenWrapUpToast, markWrapUpToastSeen]);

  return (
    <KeyboardAvoidingView 
      style={{flex: 1, backgroundColor: '#0B0D10'}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <ImageBackground
        source={require('../../assets/logonobg.png')}
        style={{flex: 1}}
        imageStyle={{opacity: 0.03, resizeMode: 'center'}}
        resizeMode="center">
        
        {/* Subtle branding header */}
        <View style={{position: 'absolute', top: 60, left: 24, right: 24, zIndex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
          <Text style={{color: '#9AA0A6', fontSize: 16, opacity: 0.7, fontWeight: '600'}}>
            Instalog
          </Text>
          {!isPro && logsRemaining <= 20 && (
            <TouchableOpacity onPress={() => navigation.navigate('Paywall')}>
              <Text style={{color: logsRemaining <= 5 ? '#EF4444' : '#9AA0A6', fontSize: 13, fontWeight: '500'}}>
                {logsRemaining} logs left
              </Text>
            </TouchableOpacity>
          )}
        </View>

      {/* Main content area */}
      <View style={{flex: 1, justifyContent: 'center', paddingHorizontal: 24}}>
        {/* Idle hint */}
        {showIdleHint && (
          <Animated.View style={{
            opacity: fadeAnim,
            position: 'absolute',
            top: -40,
            left: 24,
            right: 24,
            alignItems: 'center',
          }}>
            <Text style={{color: '#9AA0A6', fontSize: 15, opacity: 0.6}}>
              Tap to log a moment
            </Text>
          </Animated.View>
        )}
        
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="Log anything…"
          placeholderTextColor="#9AA0A6"
          multiline
          maxLength={280}
          style={{
            color: '#EDEEF0',
            fontSize: 28,
            lineHeight: 36,
            minHeight: 200,
            textAlignVertical: 'center',
            paddingVertical: 20,
          }}
          returnKeyType="done"
          blurOnSubmit={true}
          onSubmitEditing={handleLog}
          accessible={true}
          accessibilityLabel="Log entry text field"
          accessibilityHint="Type what you want to log. Press done to save."
        />
        {text.length > 0 && (
          <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 12}}>
            {text.length}/280
          </Text>
        )}
      </View>

      {/* Fixed bottom action */}
      <View style={{paddingHorizontal: 24, paddingBottom: 48}}>
        <TouchableOpacity
          onPress={handleLog}
          disabled={!text.trim()}
          style={{
            backgroundColor: text.trim() ? '#6E6AF2' : '#141821',
            paddingVertical: 18,
            borderRadius: 16,
          }}
          activeOpacity={0.8}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Save log entry"
          accessibilityHint="Saves your log and clears the text field"
          accessibilityState={{disabled: !text.trim()}}>
          <Text
            style={{
              color: text.trim() ? '#EDEEF0' : '#9AA0A6',
              textAlign: 'center',
              fontSize: 18,
              fontWeight: '600',
            }}>
            Log
          </Text>
        </TouchableOpacity>
      </View>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
};

export default InstalogScreen;
