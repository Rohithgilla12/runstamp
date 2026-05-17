import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColors } from '../design/theme';
import { TText } from '../design/typography';
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

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

// Tab icons inlined as raw SVG so a bug in the Icon stroke helper or an
// Icon[key] lookup miss can never silently produce a blank tab bar.
const TAB_DEFS: { name: keyof TabParamList; label: string; icon: (props: { size: number; color: string }) => React.ReactElement }[] = [
  {
    name: 'Home',
    label: 'Home',
    icon: ({ size, color }) => (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M3 11.5L12 4l9 7.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5 10v10h14V10" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    name: 'Stats',
    label: 'Stats',
    icon: ({ size, color }) => (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 20V8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M10 20V4" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M16 20v-8" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M2 20h20" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    name: 'Places',
    label: 'Places',
    icon: ({ size, color }) => (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={1.8} />
        <Path d="M3 12h18" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
        <Path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
  {
    name: 'Profile',
    label: 'Profile',
    icon: ({ size, color }) => (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={1.8} />
        <Path d="M4 21c1-4 4.5-6 8-6s7 2 8 6" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    ),
  },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      paddingBottom: Math.max(insets.bottom, 16), paddingTop: 8,
      backgroundColor: c.paper
    }}>
      <View style={{
        marginHorizontal: 14, borderRadius: 18,
        backgroundColor: c.paper,
        borderWidth: 1, borderColor: c.line,
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        paddingHorizontal: 6, paddingVertical: 8
      }}>
        {state.routes.map((route, idx) => {
          const def = TAB_DEFS.find((d) => d.name === route.name);
          if (!def) return null;
          const focused = state.index === idx;
          const tint = focused ? c.ink : c.ink3;
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={{
                alignItems: 'center', gap: 3,
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
                backgroundColor: focused ? c.paper2 : 'transparent'
              }}
            >
              {def.icon({ size: 22, color: tint })}
              <TText style={{ fontSize: 10, color: tint, fontWeight: focused ? '500' : '400' }}>{def.label}</TText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TabsNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home"    component={HomeScreen} />
      <Tab.Screen name="Stats"   component={AnalyticsScreen} />
      <Tab.Screen name="Places"  component={PlacesScreen} />
      <Tab.Screen name="Profile" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  useStampNotificationTap();
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="Tabs"     component={TabsNavigator} />
      <Stack.Screen name="Activity"   component={ActivityScreen}   options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="Editor"   component={EditorScreen}   options={{ presentation: 'modal',  animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Stamps"       component={StampsScreen}       options={{ presentation: 'card',  animation: 'slide_from_right' }} />
      <Stack.Screen name="YearInStamps" component={YearInStampsScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
      <Stack.Screen name="HealthRuns"   component={HealthRunsScreen}   options={{ presentation: 'card',  animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
