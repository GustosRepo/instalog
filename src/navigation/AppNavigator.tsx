/**
 * App Navigation - Bottom tabs with modal stack
 * Dark-first design with 3 core screens
 */

import React, {useEffect, useRef} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {Text, View, ActivityIndicator, Animated} from 'react-native';

import {InstalogScreen, InboxScreen, WrapUpScreen, ReviewScreen, SettingsScreen, TasksScreen} from '../screens';
import WidgetConfigScreen from '../screens/WidgetConfigScreen';
import PaywallScreen from '../screens/PaywallScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import {useOnboardingStore} from '../stores/useOnboardingStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Animated tab icon with spring bounce
const TabIcon: React.FC<{label: string; focused: boolean}> = ({label, focused}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (focused) {
      // Bounce animation when tab becomes focused
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);
  
  return (
    <Animated.Text 
      style={{
        fontSize: 20, 
        opacity: focused ? 1 : 0.4,
        transform: [{scale: scaleAnim}],
      }}
    >
      {label}
    </Animated.Text>
  );
};

const TabNavigator: React.FC = () => {
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
          name="Tasks"
          component={TasksScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon label="📋" focused={focused} />,
          }}
        />
        <Tab.Screen
          name="Review"
          component={ReviewScreen}
          options={{
            tabBarIcon: ({focused}) => <TabIcon label="◐" focused={focused} />,
          }}
        />
      </Tab.Navigator>
  );
};

const AppNavigator: React.FC = () => {
  const {hasSeenOnboarding, isLoading, loadOnboardingState} = useOnboardingStore();
  
  useEffect(() => {
    loadOnboardingState();
  }, []);
  
  // Show loading while checking onboarding state
  if (isLoading) {
    return (
      <View style={{flex: 1, backgroundColor: '#0B0D10', justifyContent: 'center', alignItems: 'center'}}>
        <ActivityIndicator size="large" color="#6E6AF2" />
      </View>
    );
  }
  
  // Show onboarding for new users
  if (!hasSeenOnboarding) {
    return <OnboardingScreen />;
  }
  
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
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="Settings" 
          component={SettingsScreen}
          options={{
            presentation: 'modal',
            gestureEnabled: true,
          }}
        />
        <Stack.Screen 
          name="Widget" 
          component={WidgetConfigScreen}
          options={{
            presentation: 'modal',
            gestureEnabled: true,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
