import '../global.css';
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { runMigrations } from '@/db';
import { seedDatabase } from '@/db/seed';
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
        if (__DEV__) {
          await seedDatabase();
        }
      } catch (e) {
        console.error('[Kaisro Init Error]', e);
      } finally {
        setDbReady(true);
      }
    }
    prepare();
  }, []);

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
      </Stack>
      <QuickAddBottomSheet />
    </SafeAreaProvider>
  );
}
