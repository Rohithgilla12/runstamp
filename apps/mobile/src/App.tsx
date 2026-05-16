import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, type Theme as NavTheme, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppStateProvider, useAppState } from './state/AppState';
import { AuthProvider, useAuth } from './state/AuthContext';
import { AccountProvider } from './state/useAccount';
import { HealthProvider } from './state/HealthContext';
import { ThemeCtx, paletteFor } from './design/theme';
import { useAppFonts } from './design/fonts';
import { RootNavigator } from './nav/RootNavigator';
import { OnboardingScreen } from './screens/OnboardingScreen';

export default function App() {
  const fontsLoaded = useAppFonts();
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3ede2' }}>
        <ActivityIndicator color="#e85d2f" />
      </View>
    );
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppStateProvider>
          <AuthProvider>
            <AccountProvider>
              <HealthProvider>
                <Shell />
              </HealthProvider>
            </AccountProvider>
          </AuthProvider>
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const { dark, accent, units, hasOnboarded } = useAppState();
  const { status } = useAuth();
  const palette = paletteFor({ dark, accent, units });
  const navTheme: NavTheme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme.colors : DefaultTheme.colors),
      background: palette.paper,
      card: palette.paper,
      text: palette.ink,
      border: palette.line,
      primary: palette.accent,
      notification: palette.accent
    }
  };

  const showSplash = status === 'loading';
  const showOnboarding = status === 'signed-out' || (status === 'signed-in' && !hasOnboarded);
  const showApp = status === 'signed-in' && hasOnboarded;

  return (
    <ThemeCtx.Provider value={{ dark, accent, units }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {showSplash && (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.paper }}>
          <ActivityIndicator color={palette.accent} />
        </View>
      )}
      {showOnboarding && <OnboardingScreen />}
      {showApp && (
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      )}
    </ThemeCtx.Provider>
  );
}
