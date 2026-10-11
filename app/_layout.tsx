import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import '../global.css';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState, Alert, Platform, Appearance } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NavigationBar, setVisibilityAsync } from 'expo-navigation-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { runMigrations, getDb } from '@/db';
import { catchUpMonthly } from '@/db/transactionActions';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { ensureDefaultCategories, ensureOtherCategory } from '@/db/defaultCategories';
import { QuickAddBottomSheet } from '@/components/QuickAddBottomSheet';
import { colors, themeVariables } from '@/constants/theme';
import { vars } from 'nativewind';
import { usePreferencesStore } from '@/store/usePreferencesStore';
import { syncNotifications } from '@/notifications/service';
import { EmptyState } from '@/components/ui/EmptyState';

export default function RootLayout() {
  useThemeRefresh();
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [dbReady, setDbReady] = useState(false);
  const [initError, setInitError] = useState(false);
  const [initAttempt, setInitAttempt] = useState(0);
  const dark = usePreferencesStore(state => state.dark);
  const preferenceVersion = usePreferencesStore(state => state.version);
  const refreshCounter = useCalendarSync(state => state.refreshCounter);
  useEffect(() => { if (dbReady) void syncNotifications(); }, [dbReady, preferenceVersion, refreshCounter]);
  useEffect(() => {
    const listener = Appearance.addChangeListener(() => usePreferencesStore.getState().refreshSystemTheme());
    return () => listener.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    // setHidden caches repeated values; reapply natively after Android reveals bars.
    const restoreNavigationBar = () => {
      void setVisibilityAsync('hidden').catch(error => {
        console.warn('[NavigationBar] Could not restore visibility:', error);
      });
    };
    NavigationBar.setHidden(true);
    const focusListener = AppState.addEventListener('focus', restoreNavigationBar);
    const stateListener = AppState.addEventListener('change', state => {
      if (state === 'active') restoreNavigationBar();
    });
    return () => {
      focusListener.remove();
      stateListener.remove();
      NavigationBar.setHidden(false);
    };
  }, []);

  useEffect(() => {
    async function prepare() {
      setInitError(false);
      try {
        await runMigrations();
        // Insert starter categories if empty, with no monthly cap.
        // App starts with zero events, tasks, transactions, or notes.
        await ensureDefaultCategories();
        ensureOtherCategory();
        catchUpMonthly(getDb());
        usePreferencesStore.getState().hydrate();
        setDbReady(true);
      } catch (e) {
        console.error('[Kaisro Init Error]', e);
        setInitError(true);
      }
    }
    prepare();
  }, [initAttempt]);

  useEffect(() => {
    if (!dbReady) return;
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      usePreferencesStore.getState().hydrate();
      void syncNotifications();
      try { if (catchUpMonthly(getDb()) > 0) useCalendarSync.getState().triggerRefresh(); }
      catch { Alert.alert('Monthly entries could not be updated', 'Reopen the app to try again.'); }
    });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void syncNotifications(); }, 60000);
    return () => { listener.remove(); clearInterval(timer); };
  }, [dbReady]);

  if (initError) return <SafeAreaProvider><View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center' }}>
    <EmptyState variant="full" title="Could not open your planner" description="Try opening your local data again." actionLabel="Retry" onAction={() => setInitAttempt(value => value + 1)} />
  </View></SafeAreaProvider>;
  if (!fontsLoaded || !dbReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <View
          style={{ backgroundColor: colors.background }}
          className="flex-1 items-center justify-center"
        >
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <View style={[{ flex: 1 }, vars(themeVariables())]}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detail" options={{ headerShown: false }} />
        <Stack.Screen name="categories" options={{ headerShown: false }} />
        <Stack.Screen name="note" options={{ headerShown: false, animation: 'slide_from_right' }} />
      </Stack>
      <QuickAddBottomSheet />
      </View>
    </SafeAreaProvider>
  );
}
