/**
 * GymDeck Member Mobile - Root Layout & Provider Stack
 * 
 * Hierarchy:
 * GestureHandlerRootView
 *   ↓
 * SafeAreaProvider
 *   ↓
 * QueryClientProvider
 *   ↓
 * ThemeProvider
 *   ↓
 * StatusBar & Navigation Stack
 */

import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Slot, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient, useAuthStore } from '../src/store';
import { ThemeProvider, useTheme } from '../src/theme';
import { Logger } from '../src/observability';

const RootNavigator: React.FC = () => {
  const { mode } = useTheme();
  const initializeSession = useAuthStore((state) => state.initializeSession);

  useEffect(() => {
    Logger.info('[AppRoot] Initializing Member Mobile Application...');
    initializeSession().catch((err) => {
      Logger.error('[AppRoot] Error during session initialization', err);
    });
  }, [initializeSession]);

  return (
    <>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: mode === 'dark' ? '#090A0F' : '#F8FAFC' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen name="details" options={{ headerShown: false }} />
      </Stack>
    </>
  );
};

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
