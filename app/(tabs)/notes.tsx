import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/useUIStore';

export default function NotesScreen() {
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
        {/* Header */}
        <View className="mb-6">
          <Text className="text-xs font-medium text-text-muted uppercase tracking-wider mb-1">
            Reflections & Context
          </Text>
          <Text className="text-2xl font-medium text-text">Notes</Text>
        </View>

        {/* Note Cards */}
        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-medium text-text">Kaisro Architectural Intentions</Text>
            <Chip label="Architecture" size="sm" />
          </View>
          <Text className="text-xs text-text-muted leading-5 mb-3">
            Private, local-first single user daily planner. Unified timeline combining calendar
            events, tasks, and financial transactions into one tranquil interface.
          </Text>
          <View className="flex-row items-center gap-2">
            <Chip label="Linked: Architecture Sync" variant="primary" size="sm" />
          </View>
        </Card>

        <Card className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-base font-medium text-text">September Budget Checkpoint</Text>
            <Chip label="Finance" variant="money" size="sm" />
          </View>
          <Text className="text-xs text-text-muted leading-5 mb-3">
            Dining out stayed nicely within cap despite two weekend gatherings. Utilities slightly
            lower due to cooler rainy weather.
          </Text>
          <View className="flex-row items-center gap-2">
            <Chip label="Linked: Meralco Bill" variant="money" size="sm" />
          </View>
        </Card>

        <Button
          title="+ Add Note"
          variant="secondary"
          size="sm"
          onPress={() => openAddSheet('note')}
        />
      </ScrollView>
    </View>
  );
}
