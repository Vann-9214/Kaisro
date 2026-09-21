import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { sql, eq } from 'drizzle-orm';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Checkbox } from '@/components/ui/Checkbox';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/useUIStore';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { colors } from '@/constants/theme';

export default function TasksScreen() {
  const openAddSheet = useUIStore((s) => s.openAddSheet);
  const insets = useSafeAreaInsets();
  const refreshCounter = useCalendarSync((s) => s.refreshCounter);

  const [tasksList, setTasksList] = useState<schema.Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reserve space for TabBar (56 + insets.bottom) + FAB (52 + 16) + margin (24)
  const bottomScrollPadding = 56 + insets.bottom + 16 + 52 + 24;

  const fetchTasks = useCallback(async () => {
    try {
      setIsLoading(true);
      const db = getDb();
      const rows = await db
        .select()
        .from(schema.tasks)
        .orderBy(sql`${schema.tasks.done} ASC`, sql`${schema.tasks.createdAt} DESC`);
      setTasksList(rows);
    } catch (e) {
      console.error('[TasksScreen Error]', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks, refreshCounter]);

  const toggleTaskDone = async (task: schema.Task) => {
    const nextDone = !task.done;
    const now = new Date().toISOString();
    const db = getDb();
    await db
      .update(schema.tasks)
      .set({
        done: nextDone,
        doneAt: nextDone ? now : null,
        updatedAt: now,
      })
      .where(eq(schema.tasks.id, task.id));
    useCalendarSync.getState().triggerRefresh();
  };

  const totalCount = tasksList.length;
  const completedCount = tasksList.filter((t) => t.done).length;
  const progress = totalCount > 0 ? completedCount / totalCount : 0;

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
            <Chip
              label={`${Math.round(progress * 100)}%`}
              variant="tasks"
              size="sm"
            />
          </View>
          <ProgressBar progress={progress} module="tasks" className="my-2" />
          <Text className="text-xs text-text-muted">
            {completedCount} of {totalCount} tasks marked complete
          </Text>
        </Card>

        {/* Tasks List Card */}
        <Card className="mb-4">
          <Text className="text-sm font-medium text-text mb-3">Today's Focus</Text>
          {isLoading ? (
            <View className="py-4 items-center justify-center">
              <ActivityIndicator size="small" color={colors.tasks} />
            </View>
          ) : tasksList.length === 0 ? (
            <View className="py-3">
              <Text className="text-xs text-text-muted italic">
                No tasks yet. Tap "+ Add Task" to plan your work.
              </Text>
            </View>
          ) : (
            <View className="space-y-2.5">
              {tasksList.map((tsk) => (
                <View key={tsk.id} className="py-1 flex-row items-center justify-between">
                  <View className="flex-1 mr-2">
                    <Checkbox
                      checked={Boolean(tsk.done)}
                      onToggle={() => toggleTaskDone(tsk)}
                      label={tsk.title}
                    />
                  </View>
                  {tsk.priority === 'urgent' && (
                    <Chip label="Urgent" variant="tasks" size="sm" />
                  )}
                  {tsk.priority === 'high' && (
                    <Chip label="High" variant="tasks" size="sm" />
                  )}
                </View>
              ))}
            </View>
          )}
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
