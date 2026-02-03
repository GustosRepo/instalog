/**
 * Widget Configuration Screen
 * Configure up to 3 quick-log preset buttons for the iOS widget
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  NativeModules,
  ImageBackground,
} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import {Haptics} from '../utils/haptics';
import {useLogStore} from '../stores/useLogStore';
import {useSubscriptionStore, FREE_WIDGET_PRESET_LIMIT} from '../stores/useSubscriptionStore';

const {WidgetPresetsModule} = NativeModules;

interface WidgetPreset {
  id: string;
  label: string;
  text: string;
  icon: string;
  bucketId?: string | null;
}

const DEFAULT_ICONS = ['plus.circle', 'note.text', 'dumbbell', 'sparkles', 'star.fill', 'drop.fill'];

const WidgetConfigScreen: React.FC = () => {
  const navigation = useNavigation();
  const [presets, setPresets] = useState<WidgetPreset[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Get buckets directly from the store (source of truth)
  const buckets = useLogStore(state => state.buckets);
  const refreshBuckets = useLogStore(state => state.refreshBuckets);
  const isPro = useSubscriptionStore(state => state.isPro);

  useEffect(() => {
    // Load saved presets from native side
    loadPresets();
    
    // Debug: Check if native module is available
    if (!WidgetPresetsModule) {
      console.warn('WidgetPresetsModule not found - native files not linked in Xcode');
    } else {
      console.log('✅ WidgetPresetsModule loaded');
    }
  }, []);

  // Reload buckets every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshBuckets();
    }, [refreshBuckets])
  );

  const loadPresets = async () => {
    if (!WidgetPresetsModule) {
      setPresets([]);
      return;
    }

    try {
      const presetsJson = await WidgetPresetsModule.loadPresets();
      if (presetsJson && presetsJson !== '[]') {
        const loadedPresets = JSON.parse(presetsJson);
        setPresets(loadedPresets);
      } else {
        setPresets([]);
      }
    } catch (error) {
      console.warn('Failed to load presets from App Group:', error);
      setPresets([]);
    }
  };

  const savePresets = async () => {
    if (!WidgetPresetsModule) {
      Alert.alert('Error', 'Widget configuration is only available on iOS');
      return;
    }

    try {
      const presetsJson = JSON.stringify(presets);
      await WidgetPresetsModule.setWidgetPresets(presetsJson);
      Haptics.success();
      Alert.alert('Success', 'Widget presets saved! Your home screen widget will update.');
    } catch (error) {
      Alert.alert('Error', 'Failed to save widget presets');
    }
  };

  const addPreset = () => {
    // Check limit based on subscription tier
    const limit = isPro ? 10 : FREE_WIDGET_PRESET_LIMIT; // Max 10 even for Pro (UI constraint)
    
    if (presets.length >= limit) {
      if (!isPro) {
        (navigation as any).navigate('Paywall');
        return;
      }
      Alert.alert('Limit Reached', 'Maximum widget presets reached');
      return;
    }

    const newPreset: WidgetPreset = {
      id: `preset-${Date.now()}`,
      label: 'Quick Log',
      text: '',
      icon: DEFAULT_ICONS[presets.length] || 'plus.circle',
      bucketId: null,
    };

    setPresets([...presets, newPreset]);
    setEditingId(newPreset.id);
    Haptics.light();
  };

  const removePreset = (id: string) => {
    Alert.alert('Remove Preset', 'Remove this widget button?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updatedPresets = presets.filter(p => p.id !== id);
          setPresets(updatedPresets);
          Haptics.warning();
          
          // Auto-save to widget after deletion
          if (WidgetPresetsModule) {
            try {
              const presetsJson = JSON.stringify(updatedPresets);
              await WidgetPresetsModule.setWidgetPresets(presetsJson);
            } catch (error) {
              console.warn('Failed to update widget after deletion', error);
            }
          }
        },
      },
    ]);
  };

  const updatePreset = (id: string, updates: Partial<WidgetPreset>) => {
    setPresets(presets.map(p => (p.id === id ? {...p, ...updates} : p)));
  };

  const movePreset = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= presets.length) return;

    const newPresets = [...presets];
    [newPresets[index], newPresets[newIndex]] = [newPresets[newIndex], newPresets[index]];
    setPresets(newPresets);
    Haptics.selection();
  };

  return (
    <View style={{flex: 1, backgroundColor: '#0B0D10'}}>
      <ImageBackground
        source={require('../../assets/logonobg.png')}
        style={{flex: 1}}
        imageStyle={{opacity: 0.03, resizeMode: 'center'}}
        resizeMode="center">
        {/* Header */}
        <View style={{paddingHorizontal: 24, paddingTop: 64, paddingBottom: 16}}>
        <Text style={{color: '#EDEEF0', fontSize: 28, fontWeight: '700'}}>
          Widget Config
        </Text>
        <Text style={{color: '#9AA0A6', fontSize: 14, marginTop: 4}}>
          Quick-log buttons for your home screen
        </Text>
      </View>

      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{paddingHorizontal: 24, paddingBottom: 32}}
        showsVerticalScrollIndicator={false}>
        
        {/* Info Card */}
        <View style={{backgroundColor: '#141821', borderRadius: 16, padding: 20, marginBottom: 20}}>
          <Text style={{color: '#6E6AF2', fontSize: 16, fontWeight: '600', marginBottom: 8}}>
            iOS 17+ Interactive Widget
          </Text>
          <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 20}}>
            Configure up to 3 buttons that log instantly from your home screen without opening the app.
          </Text>
        </View>

        {/* Presets List */}
        {presets.map((preset, index) => (
          <View
            key={preset.id}
            style={{
              backgroundColor: '#141821',
              borderRadius: 16,
              padding: 20,
              marginBottom: 16,
              borderWidth: editingId === preset.id ? 2 : 0,
              borderColor: '#6E6AF2',
            }}>
            
            {/* Header with reorder buttons */}
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 12}}>
              <Text style={{color: '#9AA0A6', fontSize: 14, flex: 1}}>
                Button {index + 1}
              </Text>
              
              {/* Reorder buttons */}
              <View style={{flexDirection: 'row'}}>
                {index > 0 && (
                  <TouchableOpacity
                    onPress={() => movePreset(index, 'up')}
                    style={{padding: 8, marginRight: 4}}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Move up">
                    <Text style={{color: '#6E6AF2', fontSize: 18}}>↑</Text>
                  </TouchableOpacity>
                )}
                {index < presets.length - 1 && (
                  <TouchableOpacity
                    onPress={() => movePreset(index, 'down')}
                    style={{padding: 8, marginRight: 4}}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel="Move down">
                    <Text style={{color: '#6E6AF2', fontSize: 18}}>↓</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => removePreset(preset.id)}
                  style={{padding: 8}}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Remove preset">
                  <Text style={{color: '#EF4444', fontSize: 18}}>×</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Label Input */}
            <Text style={{color: '#9AA0A6', fontSize: 12, marginBottom: 6}}>
              Button Label
            </Text>
            <TextInput
              value={preset.label}
              onChangeText={text => updatePreset(preset.id, {label: text})}
              placeholder="e.g., Workout, Note, Idea"
              placeholderTextColor="#9AA0A6"
              maxLength={15}
              style={{
                backgroundColor: '#0B0D10',
                color: '#EDEEF0',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                fontSize: 16,
                marginBottom: 16,
              }}
              onFocus={() => setEditingId(preset.id)}
              accessible={true}
              accessibilityLabel="Button label"
            />

            {/* Log Text Input */}
            <Text style={{color: '#9AA0A6', fontSize: 12, marginBottom: 6}}>
              Log Text (what gets saved)
            </Text>
            <TextInput
              value={preset.text}
              onChangeText={text => updatePreset(preset.id, {text})}
              placeholder="e.g., Workout completed, Quick note"
              placeholderTextColor="#9AA0A6"
              maxLength={100}
              multiline
              style={{
                backgroundColor: '#0B0D10',
                color: '#EDEEF0',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderRadius: 12,
                fontSize: 16,
                minHeight: 60,
                marginBottom: 16,
              }}
              onFocus={() => setEditingId(preset.id)}
              accessible={true}
              accessibilityLabel="Log text"
            />

            {/* Bucket Selector */}
            <Text style={{color: '#9AA0A6', fontSize: 12, marginBottom: 8}}>
              Auto-assign to Bucket (optional)
            </Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16}}>
              <TouchableOpacity
                onPress={() => {
                  updatePreset(preset.id, {bucketId: null});
                  Haptics.selection();
                }}
                style={{
                  backgroundColor: !preset.bucketId ? '#6E6AF2' : '#0B0D10',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: 8,
                  marginRight: 8,
                  marginBottom: 8,
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="No bucket">
                <Text style={{color: '#EDEEF0', fontSize: 14}}>
                  None
                </Text>
              </TouchableOpacity>
              {buckets.map(bucket => (
                <TouchableOpacity
                  key={bucket.id}
                  onPress={() => {
                    updatePreset(preset.id, {bucketId: bucket.id});
                    Haptics.selection();
                  }}
                  style={{
                    backgroundColor: preset.bucketId === bucket.id ? '#6E6AF2' : '#0B0D10',
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 8,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Bucket ${bucket.name}`}>
                  <Text style={{color: '#EDEEF0', fontSize: 14}}>
                    {bucket.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Icon Selector */}
            <Text style={{color: '#9AA0A6', fontSize: 12, marginBottom: 8}}>
              Icon
            </Text>
            <View style={{flexDirection: 'row', flexWrap: 'wrap'}}>
              {DEFAULT_ICONS.map(icon => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => {
                    updatePreset(preset.id, {icon});
                    Haptics.selection();
                  }}
                  style={{
                    backgroundColor: preset.icon === icon ? '#6E6AF2' : '#0B0D10',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    marginRight: 8,
                    marginBottom: 8,
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Icon ${icon}`}>
                  <Text style={{color: '#EDEEF0', fontSize: 14}}>
                    {icon.split('.')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Add Preset Button */}
        {presets.length < 3 && (
          <TouchableOpacity
            onPress={addPreset}
            style={{
              backgroundColor: '#141821',
              borderWidth: 2,
              borderColor: '#6E6AF2',
              borderStyle: 'dashed',
              borderRadius: 16,
              paddingVertical: 20,
              alignItems: 'center',
              marginBottom: 20,
            }}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Add preset button">
            <Text style={{color: '#6E6AF2', fontSize: 16, fontWeight: '600'}}>
              + Add Button ({presets.length}/3)
            </Text>
          </TouchableOpacity>
        )}

        {/* Save Button */}
        {presets.length > 0 && (
          <TouchableOpacity
            onPress={savePresets}
            style={{
              backgroundColor: '#6E6AF2',
              paddingVertical: 16,
              borderRadius: 16,
              marginBottom: 20,
            }}
            activeOpacity={0.8}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Save widget configuration">
            <Text style={{color: '#EDEEF0', textAlign: 'center', fontSize: 18, fontWeight: '600'}}>
              Save & Update Widget
            </Text>
          </TouchableOpacity>
        )}

        {/* Help Text */}
        <View style={{paddingVertical: 20}}>
          <Text style={{color: '#9AA0A6', fontSize: 14, lineHeight: 20, textAlign: 'center'}}>
            After saving, long-press your home screen to add the Instalog widget. Tap any button to log instantly!
          </Text>
        </View>
      </ScrollView>
      </ImageBackground>
    </View>
  );
};

export default WidgetConfigScreen;
