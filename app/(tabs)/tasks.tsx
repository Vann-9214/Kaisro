import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, ChevronDown, ChevronRight, Flag, ListChecks } from 'lucide-react-native';
import { TopBar } from '@/components/ui/TopBar';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { FormCard, FormCardRow } from '@/components/ui/FormCard';
import { FormRow } from '@/components/ui/FormRow';
import { SheetSection } from '@/components/ui/SheetSection';
import { EmptyState } from '@/components/ui/EmptyState';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useUIStore } from '@/store/useUIStore';
import { useTasksList } from '@/hooks/useTasksList';
import { getDb } from '@/db';
import { toggleTaskCompletion, toggleSubtaskCompletion } from '@/db/taskActions';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { colors, layout, spacing } from '@/constants/theme';
import { formatDateToISO } from '@/utils/dateUtils';
import { buildTaskList, formatTaskDue, type TaskListFilter, type TaskListItem, type TaskGroup } from '@/utils/taskListUtils';

const FILTERS: { value: TaskListFilter; label: string }[] = [
  { value: 'today', label: 'Today' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'all', label: 'All lists' },
];
const GROUP_HINTS: Record<TaskGroup, string> = {
  Overdue: 'Action required', Morning: 'Before 12:00 PM', Afternoon: '12:00 PM onward', Anytime: 'No strict time',
};
function toggle(id: number, subtask = false) {
  try {
    if (subtask) toggleSubtaskCompletion(getDb(), id); else toggleTaskCompletion(getDb(), id);
    useCalendarSync.getState().triggerRefresh();
  } catch { Alert.alert('Could not update task', 'Please try again.'); }
}

function TaskRow({ task, today }: { task: TaskListItem; today: string }) {
  const openAddSheet = useUIStore(s => s.openAddSheet);
  const [expanded, setExpanded] = useState(false);
  const hasSubtasks = task.subtasks.length > 0;
  const completed = task.subtasks.filter(child => child.done).length;
  const priority = task.priority === 'urgent' ? 'High' : task.priority[0].toUpperCase() + task.priority.slice(1);
  return (
    <FormCard
      style={styles.card}
    >
      <SheetSection>
        <FormRow
          icon={<Checkbox checked={task.done} onToggle={() => toggle(task.id)} accessibilityLabel={task.title} />}
          label={<Pressable onPress={() => openAddSheet('task', task)} accessibilityRole="button" accessibilityLabel={'Edit ' + task.title} style={{ minHeight: 44, justifyContent: 'center' }}><Text numberOfLines={2} maxFontSizeMultiplier={layout.maxFontScale} style={[styles.body, task.done && styles.completed]}>{task.title}</Text></Pressable>}
          value={
            <View style={styles.metadata}>
              <Chip label={formatTaskDue(task.dueAt, today)} size="sm" variant={expanded ? 'tasks' : 'default'} />
              <Chip label={priority} size="sm" icon={<Flag size={10} color={colors['text-muted']} />} />
              {hasSubtasks && <Chip label={completed + '/' + task.subtasks.length} size="sm" icon={<ListChecks size={12} color={colors['text-muted']} />} />}
            </View>
          }
          right={hasSubtasks ? <Pressable onPress={() => setExpanded(value => !value)} accessibilityRole="button" accessibilityLabel={'Subtasks for ' + task.title} accessibilityState={{ expanded }} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>{expanded ? <ChevronDown size={20} color={colors['text-muted']} /> : <ChevronRight size={20} color={colors['text-muted']} />}</Pressable> : undefined}
        />
        {expanded && (
          <SheetSection gap="xs" style={styles.subtasks}>
            {task.subtasks.map(child => (
              <FormRow key={child.id}
                icon={<Checkbox checked={child.done} onToggle={() => toggle(child.id, true)} accessibilityLabel={child.title} />}
                label={<Text style={[styles.caption, child.done && styles.completed]}>{child.title}</Text>}
              />
            ))}
          </SheetSection>
        )}
      </SheetSection>
    </FormCard>
  );
}

export default function TasksScreen() {
  const [filter, setFilter] = useState<TaskListFilter>('today');
  const [showDone, setShowDone] = useState(false);
  const { tasks, subtasks, isLoading, error, refresh } = useTasksList();
  const openAddSheet = useUIStore(s => s.openAddSheet);
  const insets = useSafeAreaInsets();
  // Today follows the device clock; calendar selection remains solely in useUIStore.
  const now = new Date();
  const today = formatDateToISO(now);
  const list = buildTaskList(tasks, subtasks, filter, now);
  const percent = Math.round(list.progress * 100);
  const title = FILTERS.find(option => option.value === filter)!.label;
  const addTask = () => openAddSheet('task', null, today);

  return (
    <View style={styles.screen}>
      <TopBar featureName="Tasks" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: layout.tabContentBottomPadding + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <SheetSection gap="lg">
          <SheetSection>
            <View>
              <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
              <Text style={styles.caption}>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
            </View>
            <SegmentedControl options={FILTERS} selectedValue={filter} onChange={value => { setFilter(value); setShowDone(false); }} />
          </SheetSection>

          {isLoading ? <ActivityIndicator accessibilityLabel="Loading tasks" color={colors.tasks} /> : error ? (
            <EmptyState variant="full" title="Couldn't load tasks" description="Try reading your tasks again." actionLabel="Try again" onAction={refresh} />
          ) : (
            <SheetSection gap="lg">
              {list.total > 0 && (
                <FormCard style={styles.card}>
                  <SheetSection gap="sm">
                    <FormRow
                      label={<Text style={styles.body}>{list.remaining} {list.remaining === 1 ? 'task' : 'tasks'} left <Text style={styles.caption}>· {list.done.length} of {list.total} done</Text></Text>}
                      right={<Text style={styles.percent}>{percent}%</Text>}
                    />
                    <View accessibilityRole="progressbar" accessibilityLabel="Task completion" accessibilityValue={{ min: 0, max: 100, now: percent }}>
                      <ProgressBar progress={list.progress} module="tasks" />
                    </View>
                    <Text style={styles.caption}>{percent}% of {filter === 'today' ? "today's focus" : 'this list'} completed with intent</Text>
                  </SheetSection>
                </FormCard>
              )}

              {list.remaining === 0 ? (
                <SheetSection>
                  <FormCard style={styles.card}>
                    <EmptyState variant="full" title="All caught up"
                      description={filter === 'today' ? 'Your agenda is clear for the day. Enjoy the quiet moment or begin something new.' : filter === 'upcoming' ? 'No unfinished tasks scheduled for the days ahead.' : 'Your task list is clear. Enjoy the quiet moment or begin something new.'}
                      actionLabel="Add a task" onAction={addTask} actionModule="tasks"
                      icon={<CheckCircle2 size={24} color={colors.tasks} strokeWidth={1.5} />}
                      style={styles.empty}
                    />
                  </FormCard>
                  <FormCardRow style={styles.summaryRow}>
                    <FormCard style={styles.summaryCard}>
                      <SheetSection gap="sm">
                        <Text style={styles.eyebrow}>COMPLETED TODAY</Text>
                        <Text style={styles.body}>{list.completedToday} {list.completedToday === 1 ? 'task' : 'tasks'}</Text>
                      </SheetSection>
                    </FormCard>
                    <FormCard style={styles.summaryCard}>
                      <SheetSection gap="sm">
                        <Text style={styles.eyebrow}>NEXT UP</Text>
                        <Text style={styles.caption}>{list.next ? formatTaskDue(list.next.dueAt, today, true) : 'Nothing scheduled'}</Text>
                      </SheetSection>
                    </FormCard>
                  </FormCardRow>
                </SheetSection>
              ) : list.groups.map(group => (
                <SheetSection key={group.title} gap="sm">
                  <View style={styles.sectionHeading}>
                    <Text accessibilityRole="header" numberOfLines={2} style={[styles.eyebrow, group.title === 'Overdue' && styles.overdue, { flexShrink: 1 }]}>{group.title.toUpperCase()} ({group.data.length})</Text>
                    <Text numberOfLines={2} style={[styles.eyebrow, { flexShrink: 1, textAlign: 'right' }]}>{GROUP_HINTS[group.title]}</Text>
                  </View>
                  <SheetSection>{group.data.map(task => <TaskRow key={task.id} task={task} today={today} />)}</SheetSection>
                </SheetSection>
              ))}

              <SheetSection gap="sm">
                <Pressable disabled={list.done.length === 0} onPress={() => setShowDone(value => !value)}
                  accessibilityRole="button" accessibilityLabel={'Done, ' + list.done.length + ' tasks'}
                  accessibilityState={{ expanded: showDone, disabled: list.done.length === 0 }}
                  style={styles.doneHeader}
                >
                  <Text style={styles.body}><Text style={styles.percent}>• </Text>Done ({list.done.length})</Text>
                  {showDone ? <ChevronDown size={18} color={colors['text-muted']} /> : <ChevronRight size={18} color={colors['text-muted']} />}
                </Pressable>
                {showDone && list.done.map(task => <TaskRow key={task.id} task={task} today={today} />)}
              </SheetSection>
            </SheetSection>
          )}
        </SheetSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  heading: { fontFamily: 'Inter_500Medium', fontSize: 24, lineHeight: 32, color: colors.text },
  body: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 22, color: colors.text },
  caption: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, color: colors['text-muted'] },
  eyebrow: { fontFamily: 'Inter_500Medium', fontSize: 10, lineHeight: 14, color: colors['text-muted'] },
  percent: { fontFamily: 'Inter_500Medium', fontSize: 14, color: colors.tasks, fontVariant: ['tabular-nums'] },
  card: { backgroundColor: colors.surface },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  completed: { color: colors['text-muted'], textDecorationLine: 'line-through' },
  subtasks: { marginLeft: spacing.lg + layout.iconToLabelGap, paddingTop: spacing.xs },
  sectionHeading: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: spacing.sm },
  overdue: { color: colors.text },
  doneHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: layout.singleLineMinHeight },
  empty: { paddingHorizontal: spacing.lg, paddingVertical: spacing['2xl'] },
  summaryRow: { gap: spacing.cardGap },
  summaryCard: { flex: 1 },
});
