import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, type Theme as NavTheme, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { AppStateProvider, useAppState } from './state/AppState';
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
          <Shell />
        </AppStateProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const { dark, accent, units, hasOnboarded } = useAppState();
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
  return (
    <ThemeCtx.Provider value={{ dark, accent, units }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      {hasOnboarded ? (
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
      ) : (
        <OnboardingScreen />
      )}
    </ThemeCtx.Provider>
  );
}
