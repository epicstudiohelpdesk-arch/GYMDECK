/**
 * GymDeck Owner Mobile - Root Application Layout & Provider Boundary
 *
 * Enforces GymDeck Light-First canonical foundation.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, LogBox, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useAuthStore } from '../src/store/authStore';
import { queryClient } from '../src/services/api/queryClient';
import { ThemeProvider, useTheme } from '../src/theme';
import { AnimatedSplashScreen } from '../src/components/splash';
import { AppBottomNav } from '../src/components/navigation/AppBottomNav';
import { isDevVerificationExplicit } from '../src/utils/nativeRuntimeDiagnostic';
import { runMobileConvergenceAudit } from '../src/utils/auditConvergence';
import { SyncManager } from '../src/services/sync';
import { CoreBootstrapCoordinator } from '../src/database/bootstrap/CoreBootstrapCoordinator';
import { Logger } from '../src/observability';

// Ignore expected test outcomes and intentional rollback aborts from displaying redbox overlays
LogBox.ignoreLogs([
  'INTENTIONAL_TEST_ROLLBACK_ABORT',
  'UNIQUE constraint failed: sync_outbox.event_id',
  'not found in gym',
  'Tenant mismatch detected between auth and vault',
]);

// Keep native splash visible until the custom vector splash overlay is mounted.
// Only the state-driven splash gate (below) is allowed to reveal the final route.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Cold-start initial route is the lightweight (auth) group so the heavy
// (tabs) Dashboard never mounts during the native/custom splash phase; the
// state-driven guard migrates the authenticated user to (tabs) under the cover.
export const unstable_settings = {
  initialRouteName: '(auth)',
};

function RootNavigation() {
  const [fontsLoaded] = useFonts({
    'Ethnocentric-Regular': require('../assets/fonts/Ethnocentric-Regular.otf'),
  });

  const { status, bootstrapSession } = useAuthStore();
  const { colors, isDark } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  // The branded splash gate starts mounted and covering the whole screen.
  // It may only unmount AFTER the auth decision is final AND the router has
  // settled on the intended route for that decision AND the branded entrance
  // animation has finished its showcase.
  const [splashGone, setSplashGone] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);
  const nativeSplashHidden = useRef(false);

  useEffect(() => {
    bootstrapSession();
  }, []);

  // Hand native splash over to the custom splash overlay only after the first
  // React frame (when the AnimatedSplashScreen is mounted) has been committed.
  useEffect(() => {
    if (nativeSplashHidden.current) return;
    SplashScreen.hideAsync().catch(() => {});
    nativeSplashHidden.current = true;
    Logger.info('[AuthBootstrap] SPLASH_HIDE: native → custom splash overlay');
  }, []);

  useEffect(() => {
    if (status === 'BOOTSTRAPPING') return;

    const inAuthGroup = segments[0] === '(auth)';
    const inDevVerification = segments[0] === 'dev-verification';

    // Enforce normal Owner Mobile routing: dev-verification is DEV ONLY and NEVER startup screen
    if (inDevVerification) {
      if (!isDevVerificationExplicit()) {
        if (status === 'AUTHENTICATED') {
          router.replace('/(tabs)' as any);
        } else {
          router.replace('/(auth)/login' as any);
        }
      }
      return;
    }

    if (status !== 'AUTHENTICATED' && !inAuthGroup) {
      Logger.info('[AuthBootstrap] ROUTER_REDIRECT: /(auth)/login');
      router.replace('/(auth)/login' as any);
    } else if (status === 'AUTHENTICATED' && inAuthGroup) {
      Logger.info('[AuthBootstrap] ROUTER_REDIRECT: /(tabs)');
      router.replace('/(tabs)' as any);
    }
  }, [status, segments]);

  // Splash deactivation is STATE-DRIVEN, never time-driven:
  // splash stays fully covering until (a) bootstrap completed AND
  // (b) the router is on the route mandated by the final auth decision AND
  // (c) the branded entrance animation has finished its showcase.
  // Holding the cover through (c) guarantees the native-stack swap from the
  // default route to the final route completes invisibly underneath, so the
  // reveal is a clean crossfade with no intermediate screen glimpse.
  const authResolved = status !== 'BOOTSTRAPPING';
  const intendedSegment = status === 'AUTHENTICATED' ? '(tabs)' : '(auth)';
  const routeSettled =
    segments[0] === intendedSegment ||
    (segments[0] === 'dev-verification' && isDevVerificationExplicit());
  const splashActive = authResolved && routeSettled && entranceDone ? false : true;

  const handleEntranceComplete = () => {
    setEntranceDone(true);
    Logger.info('[AuthBootstrap] SPLASH_HIDE: entrance showcase complete (awaiting state settle)');
  };

  const handleSplashComplete = () => {
    setSplashGone(true);
    Logger.info('[AuthBootstrap] SPLASH_HIDE: overlay cleared (revealing settled route)');
  };

  // Synchronize and bootstrap lifecycle upon authenticated session
  useEffect(() => {
    if (status === 'AUTHENTICATED') {
      const sync = SyncManager.getInstance();
      sync.start();

      // Run multi-domain bootstrap followed by catch-up sync
      CoreBootstrapCoordinator.getInstance()
        .bootstrapAll()
        .then(() => {
          return sync.synchronize('session_bootstrap_catchup');
        })
        .then(() => {
          queryClient.invalidateQueries();
          return runMobileConvergenceAudit();
        })
        .catch(() => {});
    } else if (status === 'UNAUTHENTICATED' || status === 'AUTH_EXPIRED' || status === 'AUTH_ERROR') {
      SyncManager.getInstance().stop();
    }
  }, [status]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1000);
    fetch('http://127.0.0.1:8089/result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'APP_RUNTIME_STATUS',
        timestamp: new Date().toISOString(),
        authStatus: status,
        currentSegments: segments,
        isDevVerification: segments[0] === 'dev-verification',
        platform: Platform.OS,
      }),
      signal: controller.signal,
    }).catch(() => {});
    clearTimeout(timer);

    if (status !== 'BOOTSTRAPPING') {
      runMobileConvergenceAudit().catch(() => {});
    }
  }, [status, segments]);

  return (
    <View style={styles.rootContainer}>
      <StatusBar style={splashActive ? 'light' : isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="members/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="members/add" options={{ headerShown: false }} />
        <Stack.Screen name="members/edit" options={{ headerShown: false }} />
        <Stack.Screen name="notifications" options={{ headerShown: false }} />
        <Stack.Screen name="trainers" options={{ headerShown: false }} />
        <Stack.Screen name="pt" options={{ headerShown: false }} />
        <Stack.Screen name="plans" options={{ headerShown: false }} />
        <Stack.Screen name="reports" options={{ headerShown: false }} />
        <Stack.Screen name="sync" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="security" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="dev-verification" options={{ headerShown: false }} />
      </Stack>

      {splashGone && status === 'AUTHENTICATED' && segments[0] !== '(auth)' && segments[0] !== 'dev-verification' && (
        <AppBottomNav />
      )}

      {!splashGone && (
        <AnimatedSplashScreen
          active={splashActive}
          onEntranceComplete={handleEntranceComplete}
          onAnimationComplete={handleSplashComplete}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider initialMode="light">
        <RootNavigation />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
});

