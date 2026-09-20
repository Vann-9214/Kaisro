import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Checkbox } from '@/components/ui/Checkbox';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/useUIStore';

export default function TasksScreen() {
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const insets = useSafeAreaInsets();
  const [task1Done, setTask1Done] = useState(true);
  const [task2Done, setTask2Done] = useState(false);

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  const completedCount = (task1Done ? 1 : 0) + (task2Done ? 1 : 0);
  const progress = completedCount / 2;

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
            Tasks & Priorities
          </Text>
          <Text className="text-2xl font-medium text-text">Tasks</Text>
        </View>

        {/* Progress Card */}
        <Card module="tasks" className="mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-medium text-text">Daily Task Progress</Text>
            <Chip label={`${Math.round(progress * 100)}%`} variant="tasks" size="sm" />
          </View>
          <ProgressBar progress={progress} module="tasks" className="my-2" />
          <Text className="text-xs text-text-muted">
            {completedCount} of 2 tasks marked complete
          </Text>
        </Card>

        {/* Interactive Sample Tasks */}
        <Card className="mb-4">
          <Text className="text-sm font-medium text-text mb-3">Today's Focus</Text>
          <Checkbox
            checked={task1Done}
            onToggle={setTask1Done}
            label="Establish Kaisro foundational schema and migrations"
          />
          <View className="h-2" />
          <Checkbox
            checked={task2Done}
            onToggle={setTask2Done}
            label="Review Meralco electricity invoice and record expenses"
          />
        </Card>

        <Button
          title="+ Add Task"
          variant="tasks"
          size="sm"
          onPress={() => openAddSheet('task')}
        />
      </ScrollView>
    </View>
  );
}
