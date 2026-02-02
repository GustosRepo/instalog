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
} from 'react-native';
import {useLogStore} from '../stores/useLogStore';
import {Haptics} from '../utils/haptics';

const InstalogScreen: React.FC = () => {
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const instalog = useLogStore(state => state.instalog);

  useEffect(() => {
    // Auto-focus keyboard on mount
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleLog = useCallback(() => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Save the log
    instalog({text: trimmedText});

    // Success haptic feedback
    Haptics.success();

    // Clear input
    setText('');

    // Keep keyboard open for next entry
    inputRef.current?.focus();
  }, [text, instalog]);

  return (
    <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
      <ImageBackground
        source={require('../../assets/logonobg.png')}
        style={{flex: 1}}
        imageStyle={{opacity: 0.03, resizeMode: 'center'}}
        resizeMode="center">
        
        {/* Subtle branding header */}
        <View style={{position: 'absolute', top: 60, left: 24, zIndex: 1}}>
          <Text style={{color: '#9AA0A6', fontSize: 16, opacity: 0.7, fontWeight: '600'}}>
            Instalog
          </Text>
        </View>

      {/* Main content area */}
      <View style={{flex: 1, justifyContent: 'center', paddingHorizontal: 24}}>
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
          blurOnSubmit={false}
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
    </View>
  );
};

export default InstalogScreen;
