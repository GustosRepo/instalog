/**
 * TypedFeedScreen — Shows processed log entries filtered by type
 * Shared by Thoughts, Ideas, and Notes tabs
 * Includes a compose bar to write directly into the feed
 */

import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useLogStore} from '../stores/useLogStore';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {LogItemType, formatTime} from '../models/types';

// ─── Type meta ────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, {emoji: string; color: string}> = {
  thought: {emoji: '💭', color: '#9AA0A6'},
  idea:    {emoji: '💡', color: '#F2E06E'},
  note:    {emoji: '📝', color: '#6EE0F2'},
  mood:    {emoji: '😔', color: '#F26EAA'},
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (isoString: string, yesterdayLabel: string = 'Yesterday'): string => {
  const date = new Date(isoString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return formatTime(isoString);
  if (sameDay(date, yesterday)) return `${yesterdayLabel} · ${formatTime(isoString)}`;

  const options: Intl.DateTimeFormatOptions = {month: 'short', day: 'numeric'};
  return `${date.toLocaleDateString(undefined, options)} · ${formatTime(isoString)}`;
};

// ─── Screen ───────────────────────────────────────────────────────────────────

interface TypedFeedProps {
  types?: LogItemType[];
  title?: string;
}

const TypedFeedScreen: React.FC<TypedFeedProps> = ({types: propTypes, title: propTitle}) => {
  const route = useRoute<any>();
  const types = propTypes ?? route.params?.types ?? ['thought'];
  const title = propTitle ?? route.params?.title ?? 'Items';
  const primaryType = types[0] ?? 'thought';

  const logs = useLogStore(state => state.logs);
  const quickCapture = useLogStore(state => state.quickCapture);
  const isPro = useSubscriptionStore(state => state.isPro);
  const navigation = useNavigation();

  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const {t} = useTranslation();

  const emptySubtitles: Record<string, string> = {
    thought: t('typedFeed.emptySubtitleThought'),
    idea: t('typedFeed.emptySubtitleIdea'),
    note: t('typedFeed.emptySubtitleNote'),
  };
  const composePlaceholders: Record<string, string> = {
    thought: t('typedFeed.composePlaceholderThought'),
    idea: t('typedFeed.composePlaceholderIdea'),
    note: t('typedFeed.composePlaceholderNote'),
  };
  const emptySubtitleText = emptySubtitles[primaryType] ?? t('typedFeed.emptySubtitleThought');
  const composePlaceholderText = composePlaceholders[primaryType] ?? t('typedFeed.composePlaceholderThought');

  // Show processed logs of the requested types, newest first
  const filtered = logs
    .filter(
      l =>
        (l.status ?? 'unprocessed') === 'processed' &&
        !l.archived &&
        types.includes(l.type as LogItemType),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const primaryMeta = TYPE_META[primaryType];

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    quickCapture(trimmed, primaryType as LogItemType);
    setText('');
    Keyboard.dismiss();
  };

  return (
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: '#0B0D10'}}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={140}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={
          filtered.length === 0
            ? {flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40}
            : {paddingHorizontal: 16, paddingBottom: 32}
        }
        renderItem={({item}) => {
          const meta = TYPE_META[item.type ?? types[0] ?? 'thought'] ?? primaryMeta;
          return (
            <View style={{
              backgroundColor: '#141821',
              borderRadius: 12,
              marginBottom: 8,
              padding: 14,
              borderWidth: 1,
              borderColor: '#1F2330',
              flexDirection: 'row',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <View style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: meta.color,
                marginTop: 7,
                flexShrink: 0,
              }} />
              <View style={{flex: 1}}>
                <Text style={{
                  color: '#EDEEF0',
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 4,
                }}>
                  {item.text ?? '—'}
                </Text>
                <Text style={{color: '#9AA0A6', fontSize: 11}}>
                  {formatDate(item.timestamp, t('typedFeed.dateYesterday'))}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={{alignItems: 'center', gap: 10}}>
            <Text style={{fontSize: 40}}>{primaryMeta.emoji}</Text>
            <Text style={{color: '#EDEEF0', fontSize: 17, fontWeight: '600'}}>
              {t('typedFeed.emptyTitle')}
            </Text>
            <Text style={{
              color: '#9AA0A6',
              fontSize: 13,
              textAlign: 'center',
              lineHeight: 20,
            }}>
              {emptySubtitleText}
            </Text>
          </View>
        }
      />

      {/* Compose bar — pro only */}
      {isPro ? (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          paddingBottom: 12,
          borderTopWidth: 1,
          borderTopColor: '#1F2330',
          backgroundColor: '#0B0D10',
          gap: 8,
        }}>
          <TextInput
            ref={inputRef}
            value={text}
            onChangeText={setText}
            placeholder={composePlaceholderText}
            placeholderTextColor="#6B7280"
            onSubmitEditing={handleSubmit}
            returnKeyType="send"
            blurOnSubmit={false}
            style={{
              flex: 1,
              backgroundColor: '#141821',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 10,
              color: '#EDEEF0',
              fontSize: 15,
              borderWidth: 1,
              borderColor: '#1F2330',
            }}
          />
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!text.trim()}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: text.trim() ? '#6E6AF2' : '#1F2330',
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Text style={{color: text.trim() ? '#FFFFFF' : '#6B7280', fontSize: 18}}>↑</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => (navigation as any).navigate('Paywall', {feature: t('nav.tabLibrary')})}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 12,
            paddingBottom: 14,
            borderTopWidth: 1,
            borderTopColor: '#1F2330',
            backgroundColor: '#0B0D10',
            gap: 6,
          }}>
          <Text style={{color: '#6E6AF2', fontSize: 14, fontWeight: '600'}}>{t('typedFeed.upgradePrompt')}</Text>
        </TouchableOpacity>
      )}
    </KeyboardAvoidingView>
  );
};

export default TypedFeedScreen;
