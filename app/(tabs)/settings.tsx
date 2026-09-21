import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sql } from 'drizzle-orm';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { CURRENCY } from '@/constants/currency';
import { seedDatabase } from '@/db/seed';
import { clearAllDataAndReset } from '@/db/defaultCategories';
import { useUIStore } from '@/store/useUIStore';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { getDb } from '@/db';
import * as schema from '@/db/schema';

export default function SettingsScreen() {
  const [loadingSample, setLoadingSample] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const insets = useSafeAreaInsets();

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  const handleLoadSampleData = async () => {
    if (!__DEV__) return;
    try {
      const db = getDb();
      // Check if user already has records
      const [evCount, taskCount, txCount, noteCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(schema.events),
        db.select({ count: sql<number>`count(*)` }).from(schema.tasks),
        db.select({ count: sql<number>`count(*)` }).from(schema.transactions),
        db.select({ count: sql<number>`count(*)` }).from(schema.notes),
      ]);
      const totalUserRows =
        (evCount[0]?.count ?? 0) +
        (taskCount[0]?.count ?? 0) +
        (txCount[0]?.count ?? 0) +
        (noteCount[0]?.count ?? 0);

      const executeSeed = async () => {
        setLoadingSample(true);
        try {
          await seedDatabase({ forceReset: true });
          useCalendarSync.getState().triggerRefresh();
          Alert.alert(
            'Sample Data Loaded',
            'September 2026 sample data has been loaded into your database.'
          );
        } catch (e) {
          Alert.alert('Error', 'Failed to load sample data.');
          console.error(e);
        } finally {
          setLoadingSample(false);
        }
      };

      if (totalUserRows > 0) {
        Alert.alert(
          'Load Sample Data?',
          'The database already contains records. Loading sample data will replace your current entries with September 2026 sample data.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Load Sample Data',
              style: 'destructive',
              onPress: executeSeed,
            },
          ]
        );
      } else {
        await executeSeed();
      }
    } catch (e) {
      console.error('[Load Sample Data Error]', e);
    }
  };

  const handleClearAllData = () => {
    if (!__DEV__) return;
    Alert.alert(
      'Clear All Data?',
      'This will delete every event, task, transaction, and note from the database, and restore the default starter categories. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            setClearingData(true);
            try {
              await clearAllDataAndReset();
              useUIStore.getState().closeAddSheet();
              useCalendarSync.getState().triggerRefresh();
              Alert.alert(
                'All Data Cleared',
                'Your database is now empty. Default starter categories have been restored.'
              );
            } catch (e) {
              Alert.alert('Error', 'Failed to clear database records.');
              console.error(e);
            } finally {
              setClearingData(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: bottomScrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            Preferences & Storage
          </Text>
          <Text className="text-2xl font-medium text-text">Settings</Text>
        </View>

        {/* Currency Card */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-text">Active Currency</Text>
            <Chip label={`${CURRENCY.symbol} (${CURRENCY.code})`} variant="money" size="sm" />
          </View>
          <Text className="text-xs text-text-muted leading-5">
            Configured globally as a single constant ({CURRENCY.name}). Stored in integer centavos to
            prevent floating-point roundoff issues.
          </Text>
        </Card>

        {/* Theming Information */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-text">Design System</Text>
            <Chip label="Stitch Light" variant="primary" size="sm" />
          </View>
          <Text className="text-xs text-text-muted leading-5 mb-2">
            Serene Editorial Minimal palette with Archival Ink Blue, Soft Teal, and Warm Sand. Dark
            mode ("Nocturne Focus") tokens are structured as placeholders falling back to light.
          </Text>
        </Card>

        {/* Database & Privacy Card */}
        <Card className="mb-4">
          <Text className="text-sm font-medium text-text mb-2">Local SQLite Database</Text>
          <Text className="text-xs text-text-muted leading-5">
            Private, on-device SQLite database with Drizzle ORM. No analytics, tracking, or network
            connections.
          </Text>
        </Card>

        {/* Developer Tools Section - Visible strictly in __DEV__ */}
        {Boolean(__DEV__) && (
          <Card className="mb-6">
            <Text className="text-sm font-medium text-text mb-1">Developer tools</Text>
            <Text className="text-xs text-text-muted leading-5 mb-4">
              Local testing utilities for development builds. Wipe all user records to test empty states, or populate realistic sample data.
            </Text>
            <View className="space-y-3">
              <Button
                title="Load sample data"
                variant="primary"
                size="sm"
                loading={loadingSample}
                onPress={handleLoadSampleData}
              />
              <View className="h-1" />
              <Button
                title="Clear all data"
                variant="secondary"
                size="sm"
                loading={clearingData}
                onPress={handleClearAllData}
              />
            </View>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}
