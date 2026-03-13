/**
 * Widget Configuration Screen — Quick Capture Setup
 *
 * Redesign: widget as a fast extension of Brain Dump.
 * Capture first, organize later.
 */

import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  NativeModules,
  Switch,
  Modal,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Haptics} from '../utils/haptics';
import {WidgetActionType, WidgetActionConfig, WidgetConfigState} from '../models/types';
import {useSubscriptionStore} from '../stores/useSubscriptionStore';
import {useTranslation} from 'react-i18next';

const {WidgetPresetsModule} = NativeModules;

// ─── Action type metadata ──────────────────────────────────────────────────────

interface ActionMeta {
  emoji: string;
  label: string;
  description: string;
  icon: string;       // SF Symbol name passed to the iOS widget
  color: string;
  deepLink: boolean;  // true = Link(url), false = AppIntent
  defaultLabel: string;
}

const ACTION_META: Record<WidgetActionType, ActionMeta> = {
  thought: {
    emoji: '💭',
    label: 'Quick Thought',
    description: 'Saves a thought instantly to Brain Dump',
    icon: 'bubble.left.fill',
    color: '#6E6AF2',
    deepLink: false,
    defaultLabel: 'Thought',
  },
  task: {
    emoji: '✅',
    label: 'Quick Task',
    description: 'Creates a task to process later in Inbox',
    icon: 'checkmark.circle.fill',
    color: '#6EF2A8',
    deepLink: false,
    defaultLabel: 'Task',
  },
  idea: {
    emoji: '💡',
    label: 'Quick Idea',
    description: 'Captures an idea to explore later',
    icon: 'lightbulb.fill',
    color: '#F2E06E',
    deepLink: false,
    defaultLabel: 'Idea',
  },
  mood: {
    emoji: '🙂',
    label: 'Mood Check',
    description: 'Opens the mood picker in Brain Dump',
    icon: 'face.smiling.fill',
    color: '#F29B6E',
    deepLink: true,
    defaultLabel: 'Mood',
  },
  brainDump: {
    emoji: '🧠',
    label: 'Brain Dump',
    description: 'Opens Brain Dump screen directly',
    icon: 'square.and.pencil',
    color: '#6EE0F2',
    deepLink: true,
    defaultLabel: 'Brain Dump',
  },
};

const ALL_ACTION_TYPES: WidgetActionType[] = ['thought', 'task', 'idea', 'mood', 'brainDump'];

// ─── Helpers ───────────────────────────────────────────────────────────────────

const createAction = (type: WidgetActionType): WidgetActionConfig => ({
  id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  label: ACTION_META[type].defaultLabel,
  icon: ACTION_META[type].icon,
  defaultBucketId: null,
  saveInstantly: !ACTION_META[type].deepLink,
  openAppAfterTap: ACTION_META[type].deepLink,
});

const DEFAULT_CONFIG: WidgetConfigState = {
  layout: 'multi',
  actions: [
    {...createAction('thought'), id: 'default-thought'},
    {...createAction('task'),    id: 'default-task'},
    {...createAction('idea'),    id: 'default-idea'},
    {...createAction('mood'),    id: 'default-mood'},
  ],
  sendToInboxByDefault: true,
  showUnprocessedCount: true,
  showTodayMood: false,
};

// ─── Screen ────────────────────────────────────────────────────────────────────

const WidgetConfigScreen: React.FC = () => {
  const {t} = useTranslation();
  const navigation = useNavigation();
  const isPro = useSubscriptionStore(state => state.isPro);

  const getActionLabel = (type: WidgetActionType) => {
    const map: Record<WidgetActionType, string> = {
      thought: t('widgetConfig.actionThoughtLabel'),
      task: t('widgetConfig.actionTaskLabel'),
      idea: t('widgetConfig.actionIdeaLabel'),
      mood: t('widgetConfig.actionMoodLabel'),
      brainDump: t('widgetConfig.actionBrainDumpLabel'),
    };
    return map[type];
  };

  const getActionDescription = (type: WidgetActionType) => {
    const map: Record<WidgetActionType, string> = {
      thought: t('widgetConfig.actionThoughtDescription'),
      task: t('widgetConfig.actionTaskDescription'),
      idea: t('widgetConfig.actionIdeaDescription'),
      mood: t('widgetConfig.actionMoodDescription'),
      brainDump: t('widgetConfig.actionBrainDumpDescription'),
    };
    return map[type];
  };

  const getActionDefaultLabel = (type: WidgetActionType) => {
    const map: Record<WidgetActionType, string> = {
      thought: t('widgetConfig.actionThoughtDefaultLabel'),
      task: t('widgetConfig.actionTaskDefaultLabel'),
      idea: t('widgetConfig.actionIdeaDefaultLabel'),
      mood: t('widgetConfig.actionMoodDefaultLabel'),
      brainDump: t('widgetConfig.actionBrainDumpDefaultLabel'),
    };
    return map[type];
  };
  const [config, setConfig] = useState<WidgetConfigState>(DEFAULT_CONFIG);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showActionPicker, setShowActionPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadConfig();
    }, []),
  );

  const loadConfig = async () => {
    if (!WidgetPresetsModule) return;
    try {
      // Try new config key first
      const json: string | null = await WidgetPresetsModule.loadWidgetConfig?.();
      if (json && json !== '{}' && json !== 'null') {
        const loaded = JSON.parse(json) as Partial<WidgetConfigState>;
        if (loaded?.actions?.length) {
          // Free users: clamp to single layout + 1 action
          if (!isPro) {
            setConfig({...(loaded as WidgetConfigState), layout: 'single', actions: loaded.actions.slice(0, 1)});
          } else {
            setConfig(loaded as WidgetConfigState);
          }
          return;
        }
      }
      // Fall back to legacy presets → convert to new format
      const legacyJson: string = await WidgetPresetsModule.loadPresets();
      if (legacyJson && legacyJson !== '[]') {
        const legacy = JSON.parse(legacyJson) as any[];
        if (legacy.length > 0) {
          const converted: WidgetActionConfig[] = legacy.map((p: any) => ({
            id: p.id,
            type: 'thought' as WidgetActionType,
            label: p.label || 'Thought',
            icon: p.icon || 'bubble.left.fill',
            defaultBucketId: p.bucketId ?? null,
            saveInstantly: true,
            openAppAfterTap: false,
          }));
          const actions = isPro ? converted : converted.slice(0, 1);
          setConfig({...DEFAULT_CONFIG, layout: isPro ? DEFAULT_CONFIG.layout : 'single', actions});
        }
      }
    } catch (e) {
      console.warn('Failed to load widget config', e);
    }
  };

  const saveConfig = async () => {
    if (!WidgetPresetsModule) {
      Alert.alert(t('widgetConfig.errorTitle'), t('widgetConfig.errorIOSOnly'));
      return;
    }
    const maxActions = !isPro ? 1 : config.layout === 'single' ? 1 : 4;
    const trimmed: WidgetConfigState = {
      ...config,
      actions: config.actions.slice(0, maxActions),
    };
    if (!WidgetPresetsModule.setWidgetConfig) {
      Alert.alert(t('widgetConfig.errorTitle'), t('widgetConfig.errorRebuildRequired'));
      return;
    }
    try {
      await WidgetPresetsModule.setWidgetConfig(JSON.stringify(trimmed));
      Haptics.success();
      Alert.alert(t('widgetConfig.savedAlertTitle'), t('widgetConfig.savedAlertMessage'));
    } catch (e: any) {
      Alert.alert(t('widgetConfig.errorTitle'), `Failed to save widget config: ${e?.message ?? String(e)}`);
    }
  };

  const maxActions = !isPro ? 1 : config.layout === 'single' ? 1 : 4;

  const addAction = (type: WidgetActionType) => {
    if (config.actions.length >= maxActions) return;
    const action = createAction(type);
    setConfig(c => ({...c, actions: [...c.actions, action]}));
    setExpandedId(action.id);
    setShowActionPicker(false);
    Haptics.light();
  };

  const removeAction = (id: string) => {
    setConfig(c => ({...c, actions: c.actions.filter(a => a.id !== id)}));
    Haptics.warning();
  };

  const updateAction = (id: string, updates: Partial<WidgetActionConfig>) => {
    setConfig(c => ({
      ...c,
      actions: c.actions.map(a => (a.id === id ? {...a, ...updates} : a)),
    }));
  };

  return (
    <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
      {/* Header */}
      <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 4}}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{marginBottom: 16}}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <Text style={{color: '#6E6AF2', fontSize: 16}}>{t('widgetConfig.backButton')}</Text>
        </TouchableOpacity>
        <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>
          {t('widgetConfig.screenTitle')}
        </Text>
        <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 4, marginBottom: 24}}>
          {t('widgetConfig.screenSubtitle')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={{paddingHorizontal: 24, paddingBottom: 48}}
        showsVerticalScrollIndicator={false}>

        {/* ─── Layout ─── */}
        <SectionLabel>{t('widgetConfig.layoutSectionLabel')}</SectionLabel>
        <View style={{flexDirection: 'row', gap: 10, marginBottom: 28}}>
          {(['single', 'multi'] as const).map(l => {
            const isLocked = l === 'multi' && !isPro;
            return (
            <TouchableOpacity
              key={l}
              onPress={() => {
                if (isLocked) {
                  navigation.navigate('Paywall', {feature: t('settings.widgetConfigTitle')} as never);
                  return;
                }
                setConfig(c => ({...c, layout: l}));
                Haptics.selection();
              }}
              style={{
                flex: 1, padding: 16, borderRadius: 14, alignItems: 'center', gap: 6,
                backgroundColor: config.layout === l ? '#6E6AF222' : '#141821',
                borderWidth: 2,
                borderColor: config.layout === l ? '#6E6AF2' : '#1F2330',
                opacity: isLocked ? 0.6 : 1,
              }}>
              <Text style={{fontSize: 22}}>{l === 'single' ? '□' : '⊞'}</Text>
              <Text style={{
                color: config.layout === l ? '#EDEEF0' : '#9AA0A6',
                fontSize: 14, fontWeight: '600',
              }}>
                {l === 'single' ? t('widgetConfig.layoutSingle') : t('widgetConfig.layoutMulti')}{isLocked ? ' ⭐' : ''}
              </Text>
              <Text style={{color: '#4B5563', fontSize: 11, textAlign: 'center'}}>
                {l === 'single' ? t('widgetConfig.layoutSingleDescription') : t('widgetConfig.layoutMultiDescription')}
              </Text>
            </TouchableOpacity>
          );
          })}
        </View>

        {/* ─── Actions ─── */}
        <SectionLabel>{`ACTIONS (${config.actions.length}/${maxActions})`}</SectionLabel>

        {config.actions.map(action => {
          const meta = ACTION_META[action.type];
          const isExpanded = expandedId === action.id;
          return (
            <View
              key={action.id}
              style={{
                backgroundColor: '#141821', borderRadius: 14, marginBottom: 10,
                borderWidth: 1,
                borderColor: isExpanded ? meta.color + '55' : '#1F2330',
                overflow: 'hidden',
              }}>
              {/* Action row header */}
              <TouchableOpacity
                onPress={() => {
                  setExpandedId(isExpanded ? null : action.id);
                  Haptics.selection();
                }}
                style={{flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12}}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18,
                  backgroundColor: meta.color + '22',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{fontSize: 17}}>{meta.emoji}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600'}}>
                    {action.label}
                  </Text>
                  <Text style={{color: '#4B5563', fontSize: 11, marginTop: 1}}>
                    {getActionLabel(action.type)}{meta.deepLink ? ` · ${t('widgetConfig.sublabelOpensApp')}` : ` · ${t('widgetConfig.sublabelSavesInstantly')}`}
                  </Text>
                </View>
                {config.actions.length > 1 && (
                  <TouchableOpacity
                    onPress={() => removeAction(action.id)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
                    style={{padding: 4}}>
                    <Text style={{color: '#EF4444', fontSize: 20, lineHeight: 22}}>×</Text>
                  </TouchableOpacity>
                )}
                <Text style={{color: '#4B5563', fontSize: 11}}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {/* Expanded config */}
              {isExpanded && (
                <View style={{
                  paddingHorizontal: 14, paddingBottom: 16,
                  borderTopWidth: 1, borderTopColor: '#1F2330', paddingTop: 14, gap: 16,
                }}>
                  {/* Action type */}
                  <View>
                    <Text style={{color: '#9AA0A6', fontSize: 12, marginBottom: 8}}>
                      {t('widgetConfig.actionTypeFieldLabel')}
                    </Text>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                      {ALL_ACTION_TYPES.map(actionType => {
                        const m = ACTION_META[actionType];
                        const selected = action.type === actionType;
                        return (
                          <TouchableOpacity
                            key={actionType}
                            onPress={() => {
                              updateAction(action.id, {
                                type: actionType,
                                icon: m.icon,
                                saveInstantly: !m.deepLink,
                                openAppAfterTap: m.deepLink,
                              });
                              Haptics.selection();
                            }}
                            style={{
                              paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
                              backgroundColor: selected ? m.color + '22' : '#0B0D10',
                              borderWidth: 1,
                              borderColor: selected ? m.color : '#1F2330',
                              flexDirection: 'row', alignItems: 'center', gap: 5,
                            }}>
                            <Text style={{fontSize: 12}}>{m.emoji}</Text>
                            <Text style={{color: selected ? m.color : '#9AA0A6', fontSize: 12}}>
                              {getActionLabel(actionType)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* Custom label */}
                  <View>
                    <Text style={{color: '#9AA0A6', fontSize: 12, marginBottom: 6}}>
                      {t('widgetConfig.buttonLabelFieldLabel')}
                    </Text>
                    <TextInput
                      value={action.label}
                      onChangeText={actionType => updateAction(action.id, {label: actionType})}
                      placeholder={getActionDefaultLabel(action.type)}
                      placeholderTextColor="#4B5563"
                      maxLength={16}
                      style={{
                        backgroundColor: '#0B0D10', color: '#EDEEF0',
                        paddingHorizontal: 14, paddingVertical: 10,
                        borderRadius: 10, fontSize: 15,
                      }}
                    />
                  </View>


                </View>
              )}
            </View>
          );
        })}

        {/* Add action */}
        {config.actions.length < maxActions && (
          <TouchableOpacity
            onPress={() => setShowActionPicker(true)}
            style={{
              borderWidth: 2, borderColor: '#6E6AF244', borderStyle: 'dashed',
              borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 28,
            }}>
            <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600'}}>
              {t('widgetConfig.addActionButton')}
            </Text>
          </TouchableOpacity>
        )}

        {/* ─── Display Settings ─── */}
        <View style={{flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10}}>
          <Text style={{color: '#4B5563', fontSize: 11, fontWeight: '600', letterSpacing: 0.6}}>
            {t('widgetConfig.displaySettingsLabel')}
          </Text>
          {!isPro && <Text style={{color: '#F59E0B', fontSize: 11, fontWeight: '700'}}>{t('widgetConfig.proBadge')}</Text>}
        </View>
        <TouchableOpacity
          activeOpacity={isPro ? 1 : 0.85}
          disabled={isPro}
          onPress={() => navigation.navigate('Paywall', {feature: t('widgetConfig.displaySettingsLabel')} as never)}>
          <View
            pointerEvents={isPro ? 'auto' : 'none'}
            style={{opacity: isPro ? 1 : 0.4, backgroundColor: '#141821', borderRadius: 14, overflow: 'hidden', marginBottom: 28}}>
            <ToggleRow
              label={t('widgetConfig.toggleUnprocessedCountLabel')}
              sublabel={t('widgetConfig.toggleUnprocessedCountSublabel')}
              value={config.showUnprocessedCount}
              onChange={v => setConfig(c => ({...c, showUnprocessedCount: v}))}
              padded
            />
            <View style={{height: 1, backgroundColor: '#1F2330'}} />
            <ToggleRow
              label={t('widgetConfig.toggleTodayMoodLabel')}
              sublabel={t('widgetConfig.toggleTodayMoodSublabel')}
              value={config.showTodayMood}
              onChange={v => setConfig(c => ({...c, showTodayMood: v}))}
              padded
            />
          </View>
        </TouchableOpacity>

        {/* Save */}
        <TouchableOpacity
          onPress={saveConfig}
          style={{
            backgroundColor: '#6E6AF2', paddingVertical: 17,
            borderRadius: 14, alignItems: 'center', marginBottom: 16,
          }}
          activeOpacity={0.8}>
          <Text style={{color: '#EDEEF0', fontSize: 17, fontWeight: '600'}}>
            {t('widgetConfig.saveButton')}
          </Text>
        </TouchableOpacity>

        <Text style={{color: '#4B5563', fontSize: 13, textAlign: 'center', lineHeight: 18}}>
          {t('widgetConfig.homeScreenInstruction')}
        </Text>
      </ScrollView>

      {/* ─── Action Picker Modal ─── */}
      <Modal visible={showActionPicker} transparent animationType="slide">
        <TouchableOpacity
          style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end'}}
          onPress={() => setShowActionPicker(false)}
          activeOpacity={1}>
          <View
            style={{
              backgroundColor: '#141821',
              borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: 24,
            }}
            onStartShouldSetResponder={() => true}>
            <Text style={{color: '#EDEEF0', fontSize: 18, fontWeight: '700', marginBottom: 4}}>
              {t('widgetConfig.addActionModalTitle')}
            </Text>
            <Text style={{color: '#9AA0A6', fontSize: 13, marginBottom: 20}}>
              {t('widgetConfig.addActionModalSubtitle')}
            </Text>
            {ALL_ACTION_TYPES.map(actionType => {
              const m = ACTION_META[actionType];
              const added = config.actions.some(a => a.type === actionType);
              return (
                <TouchableOpacity
                  key={actionType}
                  onPress={() => !added && addAction(actionType)}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: 14,
                    paddingVertical: 14,
                    borderBottomWidth: 1, borderBottomColor: '#1F2330',
                    opacity: added ? 0.38 : 1,
                  }}>
                  <View style={{
                    width: 42, height: 42, borderRadius: 21,
                    backgroundColor: m.color + '22',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Text style={{fontSize: 20}}>{m.emoji}</Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={{color: '#EDEEF0', fontSize: 15, fontWeight: '600'}}>
                      {getActionLabel(actionType)}
                    </Text>
                    <Text style={{color: '#4B5563', fontSize: 12, marginTop: 2}}>
                      {getActionDescription(actionType)}
                    </Text>
                  </View>
                  <Text style={{color: added ? '#4B5563' : m.color, fontSize: added ? 12 : 22}}>
                    {added ? t('widgetConfig.addActionAddedLabel') : '+'}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              onPress={() => setShowActionPicker(false)}
              style={{
                marginTop: 20, paddingVertical: 14, alignItems: 'center',
                backgroundColor: '#0B0D10', borderRadius: 14,
              }}>
              <Text style={{color: '#9AA0A6', fontSize: 16}}>{t('widgetConfig.addActionCancelButton')}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{children: string}> = ({children}) => (
  <Text style={{
    color: '#4B5563', fontSize: 11, fontWeight: '600',
    letterSpacing: 0.6, marginBottom: 10,
  }}>
    {children}
  </Text>
);

const ToggleRow: React.FC<{
  label: string;
  sublabel: string;
  value: boolean;
  onChange: (v: boolean) => void;
  padded?: boolean;
}> = ({label, sublabel, value, onChange, padded = false}) => (
  <View style={{
    flexDirection: 'row', alignItems: 'center', gap: 12,
    ...(padded ? {paddingHorizontal: 16, paddingVertical: 14} : {}),
  }}>
    <View style={{flex: 1}}>
      <Text style={{color: '#EDEEF0', fontSize: 15}}>{label}</Text>
      <Text style={{color: '#4B5563', fontSize: 12, marginTop: 1}}>{sublabel}</Text>
    </View>
    <Switch
      value={value}
      onValueChange={v => { onChange(v); Haptics.selection(); }}
      trackColor={{false: '#1F2330', true: '#6E6AF244'}}
      thumbColor={value ? '#6E6AF2' : '#4B5563'}
    />
  </View>
);

export default WidgetConfigScreen;
