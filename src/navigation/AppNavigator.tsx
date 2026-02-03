/**
 * App Navigation - Bottom tabs with modal stack
 * Dark-first design with 3 core screens
 */

import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Text, View} from 'react-native';

import {InstalogScreen, InboxScreen, WrapUpScreen, ReviewScreen, SettingsScreen} from '../screens';
import WidgetConfigScreen from '../screens/WidgetConfigScreen';
import PaywallScreen from '../screens/PaywallScreen';
import {useLogStore} from '../stores/useLogStore';
import {useHintsStore} from '../stores/useHintsStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Simple text-based tab icons
const TabIcon: React.FC<{label: string; focused: boolean}> = ({label, focused}) => (
  <Text style={{fontSize: 24, opacity: focused ? 1 : 0.4}}>
    {label}
  </Text>
);

const TabNavigator: React.FC = () => {
  const logs = useLogStore(state => state.logs);
  const hasSeenWidgetHint = useHintsStore(state => state.hasSeenWidgetHint);
  
  // Show badge after 3 logs if they haven't seen the widget hint
  const showSettingsBadge = logs.length >= 3 && !hasSeenWidgetHint;
  
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#141821',
          borderTopWidth: 0,
          paddingTop: 8,
          height: 85,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: '#6E6AF2',
        tabBarInactiveTintColor: '#9AA0A6',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}>
        <Tab.Screen
          name="Instalog"
          component={InstalogScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon label="+" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Inbox"
          component={InboxScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon label="📥" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Wrap Up"
          component={WrapUpScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon label="✓" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Review"
          component={ReviewScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon label="◐" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({focused}) => (
              <View>
                <TabIcon label="⚙" focused={focused} />
                {showSettingsBadge && (
                  <View style={{
                    position: 'absolute',
                    top: -2,
                    right: -6,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#6E6AF2',
                  }} />
                )}
              </View>
            ),
          }}
        />
        <Tab.Screen
          name="Widget"
          component={WidgetConfigScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon label="📲" focused={focused} />,
          }}
        />
      </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: '#6E6AF2',
          background: '#0B0D10',
          card: '#141821',
          text: '#EDEEF0',
          border: '#141821',
          notification: '#6E6AF2',
        },
        fonts: {
          regular: {
            fontFamily: 'System',
            fontWeight: '400',
          },
          medium: {
            fontFamily: 'System',
            fontWeight: '500',
          },
          bold: {
            fontFamily: 'System',
            fontWeight: '700',
          },
          heavy: {
            fontFamily: 'System',
            fontWeight: '900',
          },
        },
      }}>
      <Stack.Navigator screenOptions={{headerShown: false}}>
        <Stack.Screen name="Main" component={TabNavigator} />
        <Stack.Screen 
          name="Paywall" 
          component={PaywallScreen}
          options={{
            presentation: 'modal',
            gestureEnabled: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
