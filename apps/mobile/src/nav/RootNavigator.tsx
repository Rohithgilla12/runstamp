// Native bottom tabs — wraps UITabBarController on iOS / BottomNavigationView
// on Android. On iOS 26+ this is exactly Apple's default tab bar with
// Liquid Glass applied automatically by UIKit; on iOS 18–25 it's the
// standard UITabBar; on Android it's Material Design's BottomNavigationView.
//
// Replaces the previous custom Pressable-based bar + my expo-glass-effect
// wrapper. The native tab bar handles everything the wrapper was trying
// to approximate (translucency, scroll-to-content-aware backdrop, haptics,
// SF Symbols, focus state, hide-on-scroll) — and does it the way Apple
// ships it, not the way I hand-rolled it.
//
// Per the docs, on iOS 26+ the background colour is auto-managed and
// shouldn't be overridden — we let it pick its own glass material based
// on what's scrolling behind it.

import React from 'react';
import { Platform } from 'react-native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColors } from '../design/theme';
import { HomeScreen } from '../screens/HomeScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { PlacesScreen } from '../screens/PlacesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ActivitiesScreen } from '../screens/ActivitiesScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { StampsScreen } from '../screens/StampsScreen';
import { YearInStampsScreen } from '../screens/YearInStampsScreen';
import { HealthRunsScreen } from '../screens/HealthRunsScreen';
import { useStampNotificationTap } from '../state/useStampNotificationTap';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createNativeBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// SF Symbol names. The native renderer resolves them from iOS's system
// catalogue. Android currently doesn't have Material Symbol support in
// react-native-bottom-tabs v1.2 — the library expects an
// ImageSourcePropType there — so Android tabs render with title only until
// we ship raster icons or the library adds Material support. iOS is the
// priority surface today (Android build is gated on Health Connect).
const SF_SYMBOLS = {
  Home:    'house',
  Stats:   'chart.bar.fill',
  Places:  'globe',
  Profile: 'person.crop.circle',
} as const;

function tabBarIcon(key: keyof typeof SF_SYMBOLS) {
  if (Platform.OS !== 'ios') return undefined;
  return () => ({ sfSymbol: SF_SYMBOLS[key] });
}

function TabsNavigator() {
  const c = useColors();
  return (
    <Tab.Navigator
      // No backgroundColor set on tabBarStyle — UIKit picks its own
      // material. On iOS 26+ that's the genuine Liquid Glass, refracting
      // whatever content scrolls behind. On iOS 18-25 it's the standard
      // translucent UITabBar. Setting backgroundColor=paper (as we did
      // before) tinted the glass and killed the effect.
      tabBarActiveTintColor={c.ink}
      tabBarInactiveTintColor={c.ink3}
    >
      <Tab.Screen name="Home"    component={HomeScreen}      options={{ title: 'Home',    tabBarIcon: tabBarIcon('Home')    }} />
      <Tab.Screen name="Stats"   component={AnalyticsScreen} options={{ title: 'Stats',   tabBarIcon: tabBarIcon('Stats')   }} />
      <Tab.Screen name="Places"  component={PlacesScreen}    options={{ title: 'Places',  tabBarIcon: tabBarIcon('Places')  }} />
      <Tab.Screen name="Profile" component={SettingsScreen}  options={{ title: 'Profile', tabBarIcon: tabBarIcon('Profile') }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  useStampNotificationTap();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="Tabs"         component={TabsNavigator} />
      <Stack.Screen name="Activity"     component={ActivityScreen}     options={{ presentation: 'card',  animation: 'slide_from_right' }} />
      <Stack.Screen name="Activities"   component={ActivitiesScreen}   options={{ presentation: 'card',  animation: 'slide_from_right' }} />
      <Stack.Screen name="Editor"       component={EditorScreen}       options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Stamps"       component={StampsScreen}       options={{ presentation: 'card',  animation: 'slide_from_right' }} />
      <Stack.Screen name="YearInStamps" component={YearInStampsScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HealthRuns"   component={HealthRunsScreen}   options={{ presentation: 'card',  animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
