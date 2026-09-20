import React, { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { CURRENCY } from '@/constants/currency';
import { seedDatabase } from '@/db/seed';

export default function SettingsScreen() {
  const [reloading, setReloading] = useState(false);
  const insets = useSafeAreaInsets();

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  const handleReseed = async () => {
    if (!__DEV__) return;
    try {
      setReloading(true);
      await seedDatabase({ forceReset: true });
      Alert.alert('Database Re-seeded', 'September 2026 sample data has been refreshed.');
    } catch (e) {
      Alert.alert('Error', 'Failed to re-seed sample data.');
      console.error(e);
    } finally {
      setReloading(false);
    }
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
        <Card className="mb-6">
          <Text className="text-sm font-medium text-text mb-2">Local SQLite Database</Text>
          <Text className="text-xs text-text-muted leading-5 mb-4">
            Private, on-device SQLite database with Drizzle ORM. No analytics, tracking, or network
            connections.
          </Text>
          {__DEV__ && (
            <Button
              title="Reset & Re-seed September 2026 Data"
              variant="secondary"
              size="sm"
              loading={reloading}
              onPress={handleReseed}
            />
          )}
        </Card>
      </ScrollView>
    </View>
  );
}
