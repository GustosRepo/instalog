/**
 * Library Screen — Top swipeable tabs for Thoughts, Ideas, Notes
 * Clean container with material top tabs inside
 */

import React from 'react';
import {SafeAreaView} from 'react-native-safe-area-context';
import {createMaterialTopTabNavigator} from '@react-navigation/material-top-tabs';
import TypedFeedScreen from './TypedFeedScreen';
import {useTranslation} from 'react-i18next';

const TopTab = createMaterialTopTabNavigator();

const ThoughtsTab = () => <TypedFeedScreen types={['thought']} title="Thoughts" />;
const IdeasTab = () => <TypedFeedScreen types={['idea']} title="Ideas" />;
const NotesTab = () => <TypedFeedScreen types={['note']} title="Notes" />;

const LibraryScreen: React.FC = () => {
  const {t} = useTranslation();
  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#0B0D10'}} edges={['top']}>
      <TopTab.Navigator
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#0B0D10',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 0,
          },
          tabBarIndicatorStyle: {
            backgroundColor: '#6E6AF2',
            height: 3,
            borderRadius: 2,
          },
          tabBarActiveTintColor: '#EDEEF0',
          tabBarInactiveTintColor: '#9AA0A6',
          tabBarLabelStyle: {
            fontSize: 14,
            fontWeight: '600',
            textTransform: 'none',
          },
          tabBarPressColor: 'transparent',
          swipeEnabled: true,
          lazy: true,
        }}>
        <TopTab.Screen name="Thoughts" component={ThoughtsTab} options={{tabBarLabel: t('library.tabThoughts')}} />
        <TopTab.Screen name="Ideas" component={IdeasTab} options={{tabBarLabel: t('library.tabIdeas')}} />
        <TopTab.Screen name="Notes" component={NotesTab} options={{tabBarLabel: t('library.tabNotes')}} />
      </TopTab.Navigator>
    </SafeAreaView>
  );
};

export default LibraryScreen;
