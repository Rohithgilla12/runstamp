import React from 'react';
import { Platform, Pressable, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useColors } from '../design/theme';
import { TText } from '../design/typography';

// Defensive requires for the optional native backdrops. require() throws at
// the native bridge level if the matching native module isn't compiled into
// the installed binary (e.g. when this JS bundle lands on an OLD app build
// via OTA before the user has installed the new TestFlight). Catching here
// means the tab bar gracefully falls back to a plain paper backdrop on
// those older binaries instead of crashing on import.
//
// Once the user installs the new EAS build that includes expo-glass-effect
// + expo-blur natives, these requires succeed and the genuine Apple
// Liquid Glass (iOS 26+) or frosted UIBlurEffect (iOS 18-25) kicks in.
const GlassView: React.ComponentType<{ style?: ViewStyle; glassEffectStyle?: 'regular' | 'clear'; tintColor?: string; children?: React.ReactNode }> | null = (() => {
  try { return require('expo-glass-effect').GlassView; } catch { return null; }
})();

const BlurView: React.ComponentType<{ style?: ViewStyle; intensity?: number; tint?: string; children?: React.ReactNode }> | null = (() => {
  try { return require('expo-blur').BlurView; } catch { return null; }
})();

function isIOS26() {
  if (Platform.OS !== 'ios') return false;
  const v = parseInt(String(Platform.Version), 10);
  return Number.isFinite(v) && v >= 26;
}

// TabBarBackdrop — three-tier visual fallback. iOS 26+ gets genuine
// Liquid Glass via UIVisualEffectView; iOS 18-25 gets a frosted
// systemThinMaterial blur (closest approximation); Android + pre-build
// binaries fall through to the original paper card with a hairline.
function TabBarBackdrop({ style, children }: { style: ViewStyle; children: React.ReactNode }) {
  if (isIOS26() && GlassView) {
    return (
      <GlassView
        // glassEffectStyle "regular" gives the standard UIKit Liquid Glass
        // material (translucent + refractive). "clear" is brighter; we
        // want the standard so the icons keep contrast against any
        // backdrop content peeking through.
        glassEffectStyle="regular"
        style={style}
      >
        {children}
      </GlassView>
    );
  }
  if (Platform.OS === 'ios' && BlurView) {
    return (
      <BlurView intensity={75} tint="systemThinMaterial" style={style}>
        {children}
      </BlurView>
    );
  }
  return <View style={style}>{children}</View>;
}
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

// CustomTabBar — memoised so a re-render of any focused screen doesn't drag
// the bar through reconciliation. State changes (focused tab index) still
// trigger a re-render because that's the input we read from.
const CustomTabBar = React.memo(function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  // When the native glass/blur is active we drop the opaque backdrop +
  // shadow so the effect can actually see through to the content behind
  // it. On a paper-fill bar that material wouldn't do anything visible.
  const hasNativeBackdrop = (isIOS26() && GlassView != null) || (Platform.OS === 'ios' && BlurView != null);
  return (
    <View style={{
      paddingBottom: Math.max(insets.bottom, 16), paddingTop: 8,
      // The outer wrapper stays opaque on platforms WITHOUT native glass
      // so the icons sit on a defined surface. With glass, the wrapper
      // is transparent and the content scrolls through.
      backgroundColor: hasNativeBackdrop ? 'transparent' : c.paper,
    }}>
      <TabBarBackdrop style={{
        marginHorizontal: 14, borderRadius: 22,
        // Glass / blur paths skip the paper fill so the effect breathes.
        // The non-glass path keeps the original card chrome.
        backgroundColor: hasNativeBackdrop ? undefined : c.paper,
        borderWidth: hasNativeBackdrop ? 0.5 : 1,
        borderColor: hasNativeBackdrop ? 'rgba(255,255,255,0.18)' : c.line,
        shadowColor: '#000',
        shadowOpacity: hasNativeBackdrop ? 0.04 : 0.08,
        shadowRadius: 24, shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        overflow: 'hidden',
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
        paddingHorizontal: 6, paddingVertical: 8,
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
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={def.label}
              hitSlop={4}
              // Press feedback was the big missing piece — taps used to land
              // with no visual ack, so the bar felt unresponsive even when
              // it wasn't. Drop opacity on press; android_ripple gives the
              // platform-native feedback on Android.
              android_ripple={{ color: c.line, borderless: false, radius: 28 }}
              style={({ pressed }) => ({
                alignItems: 'center', gap: 3,
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12,
                backgroundColor: focused ? c.paper2 : 'transparent',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              {def.icon({ size: 22, color: tint })}
              <TText style={{ fontSize: 10, color: tint, fontWeight: focused ? '600' : '400' }}>{def.label}</TText>
            </Pressable>
          );
        })}
      </TabBarBackdrop>
    </View>
  );
});

function TabsNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        // freezeOnBlur suspends an inactive tab's JS work. Without this,
        // every list update reconciles all four tabs even when only one is
        // visible — heavy on Stats which renders 12 chart cards over 561
        // activities. Stack rendering resumes on focus with state intact.
        freezeOnBlur: true,
        // Hide the tab bar when a keyboard is up (Editor / Settings text
        // fields) — otherwise it floats above the keyboard taking half the
        // screen on small devices.
        tabBarHideOnKeyboard: true,
      }}
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
