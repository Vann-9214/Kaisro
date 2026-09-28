import '../global.css';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, AppState, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
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
import { colors } from '@/constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await runMigrations();
        // Insert starter categories if empty, with no monthly cap.
        // App starts with zero events, tasks, transactions, or notes.
        await ensureDefaultCategories();
        ensureOtherCategory();
        catchUpMonthly(getDb());
      } catch (e) {
        console.error('[Kaisro Init Error]', e);
      } finally {
        setDbReady(true);
      }
    }
    prepare();
  }, []);

  useEffect(() => {
    if (!dbReady) return;
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      try { if (catchUpMonthly(getDb()) > 0) useCalendarSync.getState().triggerRefresh(); }
      catch { Alert.alert('Monthly entries could not be updated', 'Reopen the app to try again.'); }
    });
    return () => listener.remove();
  }, [dbReady]);

  if (!fontsLoaded || !dbReady) {
    return (
      <SafeAreaProvider>
        <StatusBar style="dark" />
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
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="detail" options={{ headerShown: false }} />
        <Stack.Screen name="categories" options={{ headerShown: false }} />
      </Stack>
      <QuickAddBottomSheet />
    </SafeAreaProvider>
  );
}
