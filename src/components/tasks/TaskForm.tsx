import React, { useState, useEffect, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react-native';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db';
import * as schema from '@/db/schema';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { useUIStore } from '@/store/useUIStore';
import { colors, spacing, layout } from '@/constants/theme';
import { FormCard } from '@/components/ui';
import { LiftedField } from '@/components/lifted-input/LiftedField';
import { QuickAddFormHandle, QuickAddFormProps } from '@/types/quickAdd';

export type TaskFormProps = QuickAddFormProps;

interface FormValues {
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const PRIORITIES: { value: 'low' | 'medium' | 'high' | 'urgent'; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

export const TaskForm = React.forwardRef<QuickAddFormHandle, TaskFormProps>(
  function TaskForm({ onClose, scrollViewRef }, ref) {
    const { editingTask, selectedDateContext } = useUIStore();
    const isEditMode = Boolean(editingTask);
    const [subtasks, setSubtasks] = useState<string[]>(['']);

    const {
      control,
      handleSubmit,
      watch,
      setValue,
      clearErrors,
      formState: { errors },
    } = useForm<FormValues>({
      defaultValues: {
        title: editingTask?.title || '',
        priority: editingTask?.priority || 'medium',
      },
    });

    const priority = watch('priority');

    // Load initial data if editing
    useEffect(() => {
      if (editingTask) {
        setValue('title', editingTask.title);
        setValue('priority', editingTask.priority);
        (async () => {
          try {
            const db = getDb();
            const subs = await db
              .select()
              .from(schema.subtasks)
              .where(eq(schema.subtasks.taskId, editingTask.id))
              .orderBy(schema.subtasks.sortOrder);
            if (subs.length > 0) {
              setSubtasks(subs.map((s) => s.title));
            } else {
              setSubtasks(['']);
            }
          } catch (e) {
            console.error('[TaskForm] Failed to load subtasks:', e);
          }
        })();
      }
    }, [editingTask, setValue]);

    const addSubtask = () => {
      setSubtasks((prev) => [...prev, '']);
    };

    const removeSubtask = (index: number) => {
      setSubtasks((prev) => prev.filter((_, i) => i !== index));
    };

    const updateSubtask = (index: number, text: string) => {
      setSubtasks((prev) => {
        const next = [...prev];
        next[index] = text;
        return next;
      });
    };

    const taskFieldOrder = ['title', ...subtasks.map((_, i) => `subtask_${i}`)];

    const onSubmit = async (data: FormValues) => {
      try {
        const db = getDb();
        const validSubtasks = subtasks.map((s) => s.trim()).filter(Boolean);

        if (isEditMode && editingTask) {
          const now = new Date().toISOString();
          await db
            .update(schema.tasks)
            .set({
              title: data.title.trim(),
              priority: data.priority,
              updatedAt: now,
            })
            .where(eq(schema.tasks.id, editingTask.id));

          // Replace subtasks
          await db.delete(schema.subtasks).where(eq(schema.subtasks.taskId, editingTask.id));
          if (validSubtasks.length > 0) {
            for (let i = 0; i < validSubtasks.length; i++) {
              await db.insert(schema.subtasks).values({
                taskId: editingTask.id,
                title: validSubtasks[i],
                sortOrder: i,
                done: false,
              });
            }
          }
        } else {
          const [inserted] = await db
            .insert(schema.tasks)
            .values({
              title: data.title.trim(),
              priority: data.priority,
              done: false,
              dueAt: selectedDateContext || null,
            })
            .returning();

          if (validSubtasks.length > 0 && inserted) {
            for (let i = 0; i < validSubtasks.length; i++) {
              await db.insert(schema.subtasks).values({
                taskId: inserted.id,
                title: validSubtasks[i],
                sortOrder: i,
                done: false,
              });
            }
          }
        }

        useCalendarSync.getState().triggerRefresh();
        onClose();
      } catch (err) {
        console.error('[TaskForm] Failed to save task:', err);
        Alert.alert('Error', 'Failed to save task.');
        throw err;
      }
    };

    useImperativeHandle(ref, () => ({
      submit: async () => {
        let success = false;
        await handleSubmit(
          async (data) => {
            await onSubmit(data);
            success = true;
          },
          () => {
            scrollViewRef?.current?.scrollTo({ y: 0, animated: true });
            success = false;
          }
        )();
        return success;
      },
    }));

    const handleDelete = () => {
      if (!editingTask) return;
      Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getDb();
              await db.delete(schema.tasks).where(eq(schema.tasks.id, editingTask.id));
              useCalendarSync.getState().triggerRefresh();
              onClose();
            } catch (err) {
              console.error('[TaskForm] Failed to delete task:', err);
              Alert.alert('Error', 'Failed to delete task.');
            }
          },
        },
      ]);
    };

    return (
      <View style={{ gap: layout.cardGap }}>
        {/* 1. Task Title Lifted Field Card */}
        <FormCard>
          <Controller
            control={control}
            name="title"
            rules={{ required: 'Task title is required' }}
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="title"
                label="Task Title"
                value={value}
                onChangeText={(val) => {
                  onChange(val);
                  if (val.trim()) clearErrors('title');
                }}
                placeholder="Task title (e.g. Review financial report)"
                hint="Tap to add a task title"
                error={errors.title?.message}
                fieldOrder={taskFieldOrder}
                icon={<CheckCircle2 size={16} color={colors.tasks} />}
              />
            )}
          />
        </FormCard>

        {/* 2. Priority Selector Card */}
        <FormCard>
          <Text
            maxFontSizeMultiplier={layout.maxFontScale}
            style={{
              fontSize: 10,
              fontWeight: '600',
              color: colors['text-muted'],
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: spacing.sm,
            }}
          >
            Priority
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {PRIORITIES.map((p) => {
              const isSelected = priority === p.value;
              return (
                <Pressable
                  key={p.value}
                  onPress={() => setValue('priority', p.value)}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    backgroundColor: isSelected ? colors.tasks : colors.background,
                    borderColor: isSelected ? colors.tasks : colors.border,
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={{
                      fontSize: 12,
                      fontWeight: isSelected ? '600' : '500',
                      color: isSelected ? colors['on-tasks'] : colors.text,
                    }}
                  >
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormCard>

        {/* 3. Subtasks Card */}
        <FormCard>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}
          >
            <Text
              maxFontSizeMultiplier={layout.maxFontScale}
              style={{
                fontSize: 10,
                fontWeight: '600',
                color: colors['text-muted'],
                textTransform: 'uppercase',
                letterSpacing: 0.5,
              }}
            >
              Subtasks
            </Text>
            <Pressable
              onPress={addSubtask}
              style={{ flexDirection: 'row', alignItems: 'center', padding: spacing.xs }}
              accessibilityRole="button"
              accessibilityLabel="Add subtask"
            >
              <Plus size={13} color={colors.tasks} />
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{
                  fontSize: 12,
                  fontWeight: '500',
                  color: colors.tasks,
                  marginLeft: spacing.xs,
                }}
              >
                Add subtask
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: spacing.sm }}>
            {subtasks.map((sub, index) => (
              <View
                key={index}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                }}
              >
                <View style={{ flex: 1 }}>
                  <LiftedField
                    id={`subtask_${index}`}
                    label={`Subtask ${index + 1}`}
                    value={sub}
                    onChangeText={(val) => updateSubtask(index, val)}
                    placeholder={`Subtask ${index + 1}`}
                    fieldOrder={taskFieldOrder}
                    icon={
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: colors.tasks,
                        }}
                      />
                    }
                  />
                </View>
                {subtasks.length > 1 && (
                  <Pressable
                    onPress={() => removeSubtask(index)}
                    style={{ padding: spacing.xs, marginLeft: spacing.xs }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete subtask ${index + 1}`}
                  >
                    <Trash2 size={13} color={colors['text-muted']} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </FormCard>

        {/* Delete Button in Edit Mode */}
        {isEditMode && (
          <View
            style={{
              marginTop: layout.deleteButtonTopMargin,
              marginBottom: layout.deleteButtonBottomMargin,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Pressable
              onPress={handleDelete}
              style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.base }}
              accessibilityRole="button"
              accessibilityLabel="Delete task"
            >
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{
                  fontSize: 13,
                  fontWeight: '500',
                  color: colors.error,
                }}
              >
                Delete task
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }
);

export default TaskForm;
