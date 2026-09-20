import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/useUIStore';

export default function CalendarScreen() {
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const insets = useSafeAreaInsets();

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        className="flex-1 px-5 pt-3"
        contentContainerStyle={{ paddingBottom: bottomScrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with insets.top clearance */}
        <View className="mb-6">
          <Text className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            Sunday, September 20, 2026
          </Text>
          <Text className="text-2xl font-medium text-text">Calendar & Timeline</Text>
        </View>

        {/* Foundation Status Card */}
        <Card module="calendar" className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-medium text-text">Day View (Foundation)</Text>
            <Chip label="Home" variant="primary" size="sm" />
          </View>
          <Text className="text-sm text-text-muted leading-5 mb-4">
            Unified day view displaying calendar events, tasks, and spending together along an
            unbroken vertical timeline spine.
          </Text>
          <Button
            title="+ Quick Add Entry"
            variant="primary"
            size="sm"
            onPress={() => openAddSheet('event')}
          />
        </Card>

        {/* Architecture Note Card */}
        <Card className="mb-4">
          <Text className="text-sm font-medium text-text mb-1">Local-Only Sanctuary</Text>
          <Text className="text-xs text-text-muted leading-5">
            Single-user SQLite database with Drizzle ORM. No external server, no account creation,
            and zero telemetry.
          </Text>
        </Card>
      </ScrollView>
    </View>
  );
}
