import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColors } from '../design/theme';
import { Icon } from '../design/Icon';
import { TText } from '../design/typography';
import { HomeScreen } from '../screens/HomeScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { PlacesScreen } from '../screens/PlacesScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { ActivityScreen } from '../screens/ActivityScreen';
import { EditorScreen } from '../screens/EditorScreen';
import { StampsScreen } from '../screens/StampsScreen';
import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_DEFS: { name: keyof TabParamList; label: string; iconKey: 'home' | 'chart' | 'globe' | 'user' }[] = [
  { name: 'Home',    label: 'Home',    iconKey: 'home' },
  { name: 'Stats',   label: 'Stats',   iconKey: 'chart' },
  { name: 'Places',  label: 'Places',  iconKey: 'globe' },
  { name: 'Profile', label: 'Profile', iconKey: 'user' }
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
          const I = Icon[def.iconKey];
          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={{
                alignItems: 'center', gap: 2,
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
                backgroundColor: focused ? c.paper2 : 'transparent'
              }}
            >
              <I size={20} color={focused ? c.ink : c.ink3} />
              <TText style={{ fontSize: 10, color: focused ? c.ink : c.ink3, fontWeight: focused ? '500' : '400' }}>{def.label}</TText>
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
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="Tabs"     component={TabsNavigator} />
      <Stack.Screen name="Activity" component={ActivityScreen} options={{ presentation: 'card', animation: 'slide_from_right' }} />
      <Stack.Screen name="Editor"   component={EditorScreen}   options={{ presentation: 'modal',  animation: 'slide_from_bottom' }} />
      <Stack.Screen name="Stamps"   component={StampsScreen}   options={{ presentation: 'card', animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
