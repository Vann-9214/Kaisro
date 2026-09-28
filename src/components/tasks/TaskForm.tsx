import React, { useState, useImperativeHandle } from 'react';
import { View, Text, Pressable, Switch, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { eq } from 'drizzle-orm';
import { Plus, Trash2, Bell } from 'lucide-react-native';
import { getDb } from '@/db';
import { subtasks as subtaskTable } from '@/db/schema';
import { saveTask, deleteTask, type TaskDraft } from '@/db/taskActions';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { useUIStore } from '@/store/useUIStore';
import { colors, spacing } from '@/constants/theme';
import { FormCard, FormRow, SheetSection, SegmentedControl, Chip } from '@/components/ui';
import { DateTimeField } from '@/components/ui/DateTimeField';
import { LiftedField } from '@/components/lifted-input/LiftedField';
import { useLiftedInput } from '@/components/lifted-input';
import { QuickAddFormHandle, QuickAddFormProps } from '@/types/quickAdd';

export const TaskForm = React.forwardRef<QuickAddFormHandle, QuickAddFormProps>(
  function TaskForm({ onClose }, ref) {
    const { editingTask, taskDueAt, setTaskDueAt, selectedDate } = useUIStore();
    const { closeBar } = useLiftedInput();
    const [children, setChildren] = useState<TaskDraft['subtasks']>(() => editingTask
      ? getDb().select().from(subtaskTable).where(eq(subtaskTable.taskId, editingTask.id)).orderBy(subtaskTable.sortOrder).all()
      : []);
    const { control, handleSubmit, watch, setValue, formState: { errors } } = useForm<{
      title: string; priority: TaskDraft['priority']; reminder: number | null;
    }>({ defaultValues: {
      title: editingTask?.title ?? '',
      priority: editingTask?.priority === 'urgent' ? 'high' : editingTask?.priority ?? 'medium',
      reminder: editingTask?.reminderMinutes ?? null,
    } });
    const reminder = watch('reminder');
    const order = ['task-title', ...children.map((_, index) => 'subtask-' + index)];
    useImperativeHandle(ref, () => ({
      submit: async () => {
        let success = false;
        await handleSubmit(values => {
          try {
            saveTask(getDb(), { title: values.title, priority: values.priority, dueAt: taskDueAt,
              reminderMinutes: values.reminder, subtasks: children }, editingTask?.id);
            useCalendarSync.getState().triggerRefresh();
            success = true;
            onClose();
          } catch (error) { Alert.alert('Could not save task', error instanceof Error ? error.message : 'Please try again.'); }
        })();
        return success;
      },
    }));
    const remove = () => {
      if (!editingTask) return;
      closeBar();
      Alert.alert('Delete task?', 'This task and its subtasks will be removed.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete task', onPress: () => {
          try { deleteTask(getDb(), editingTask.id); useCalendarSync.getState().triggerRefresh(); onClose(); }
          catch { Alert.alert('Could not delete task', 'Please try again.'); }
        } },
      ]);
    };
    return <SheetSection>
      <FormCard><Controller control={control} name="title" rules={{ validate: value => Boolean(value.trim()) || 'Task title is required' }}
        render={({ field }) => <LiftedField id="task-title" label="Task title" placeholder="Task title" value={field.value} onChangeText={field.onChange} fieldOrder={order} error={errors.title?.message} />} /></FormCard>
      <DateTimeField value={taskDueAt} onChange={setTaskDueAt} optional fallbackDate={selectedDate} />
      <FormCard><SheetSection gap="sm"><Text style={{ color: colors['text-muted'] }}>Priority</Text>
        <SegmentedControl options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]}
          selectedValue={watch('priority')} onChange={value => setValue('priority', value)} />
      </SheetSection></FormCard>
      <FormCard><SheetSection gap="sm">
        <FormRow icon={<Bell size={16} color={colors.tasks} />} label="Reminder"
          value={reminder === null ? 'Off' : reminder === 0 ? 'At due time' : reminder + ' minutes before'}
          right={<Switch value={reminder !== null} onValueChange={enabled => setValue('reminder', enabled ? 15 : null)} trackColor={{ true: colors.tasks, false: colors.border }} />} />
        {reminder !== null && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {[0, 5, 15, 30, 60, 1440].map(offset => <Chip key={offset} label={offset === 0 ? 'At time' : offset === 1440 ? '1 day' : offset + ' min'}
            selected={offset === reminder} onPress={() => setValue('reminder', offset)} />)}
        </View>}
      </SheetSection></FormCard>
      <FormCard><SheetSection gap="sm">
        <FormRow label="Subtasks" right={<Pressable accessibilityRole="button" accessibilityLabel="Add subtask"
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => { closeBar(); setChildren(items => [...items, { title: '', done: false }]); }}><Plus size={20} color={colors.tasks} /></Pressable>} />
        {children.map((child, index) => <FormRow key={child.id ?? 'new-' + index} label="" right={
          <Pressable accessibilityRole="button" accessibilityLabel={'Remove subtask ' + (index + 1)}
            style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
            onPress={() => { closeBar(); setChildren(items => items.filter((_, i) => i !== index)); }}><Trash2 size={18} color={colors['text-muted']} /></Pressable>
        }>
          <LiftedField id={'subtask-' + index} label={'Subtask ' + (index + 1)} placeholder="Subtask"
            value={child.title} fieldOrder={order}
            onChangeText={title => setChildren(items => items.map((item, i) => i === index ? { ...item, title } : item))} />
        </FormRow>)}
      </SheetSection></FormCard>
      {editingTask && <Pressable onPress={remove} accessibilityRole="button" style={{ minHeight: 44, padding: spacing.md, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors['text-muted'] }}>Delete task</Text></Pressable>}
    </SheetSection>;
  }
);
export default TaskForm;
