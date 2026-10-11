import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useState, useEffect, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  MapPin,
  Clock,
  Repeat,
  Bell,
  Check,
  ChevronRight,
  Sun,
  X,
  Minus,
  Plus,
} from 'lucide-react-native';
import { useUIStore } from '@/store/useUIStore';
import {
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/hooks/useCalendarDay';
import {
  shiftEndDatePreservingDuration,
  formatReminderLabel,
  RECURRENCE_OPTIONS,
  REMINDER_OPTIONS,
  DEFAULT_REMINDER_MINUTES,
  adjustReminderDuration,
  parseReminderDuration,
  RecurrenceFrequency,
} from '@/utils/recurrence';
import { formatTimeDisplay } from '@/utils/timelineLayout';
import { colors, spacing, layout } from '@/constants/theme';
import { FormCard, FormCardRow, FormRow, SheetSection, SegmentedControl, Chip } from '@/components/ui';
import { getDb } from '@/db';
import { saveScopedEvent, deleteScopedEvent, duplicateEvent, type EventScope } from '@/db/eventActions';
import { reminderOffsets } from '@/utils/recurrence';
import { useCalendarSync } from '@/hooks/useCalendarDay';
import { linkedNoteIds } from '@/db/linkActions';
import { EntityNotePicker } from '@/components/notes/LinkPicker';
import { LiftedField } from '@/components/lifted-input/LiftedField';
import { useLiftedInput } from '@/components/lifted-input/LiftedInputContext';
import { LiftedInputProvider, LiftedInputHost } from '@/components/lifted-input';
import { QuickAddFormHandle, QuickAddFormProps } from '@/types/quickAdd';

export type EventFormProps = QuickAddFormProps;

interface FormValues {
  title: string;
  allDay: boolean;
  startDate: Date;
  endDate: Date;
  location: string;
  note: string;
  colorToken: 'primary' | 'tasks' | 'money';
  recurrence: RecurrenceFrequency;
  hasReminder: boolean;
  reminderMinutes: number;
  customReminderMinutes: number;
}

function getDefaultDates(dateContext?: string) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

  const targetDateStr = dateContext || todayStr;
  const isToday = targetDateStr === todayStr;

  const parts = targetDateStr.split('-');
  const y = parseInt(parts[0] || '2026', 10);
  const m = parseInt(parts[1] || '9', 10) - 1;
  const d = parseInt(parts[2] || '20', 10);

  const start = new Date(y, m, d);
  if (isToday) {
    const nextHour = now.getHours() + 1;
    if (nextHour >= 24) {
      start.setHours(23, 0, 0, 0);
    } else {
      start.setHours(nextHour, 0, 0, 0);
    }
  } else {
    start.setHours(9, 0, 0, 0);
  }

  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start, end };
}

export const EventForm = React.forwardRef<QuickAddFormHandle, EventFormProps>(
  function EventForm({ onClose, scrollViewRef }, ref) {
  useThemeRefresh();
    const { editingEvent, selectedDateContext } = useUIStore();
    const { closeBar } = useLiftedInput();
    const insets = useSafeAreaInsets();
    const isEditMode = Boolean(editingEvent);
    const [noteIds, setNoteIds] = useState(() => linkedNoteIds(getDb(), editingEvent ? { targetType: 'event', targetId: editingEvent.id } : undefined));

  // Initialize dates
  const defaultDates = getDefaultDates(selectedDateContext);
  const initialStartDate = editingEvent
    ? new Date(
        editingEvent.start.includes('T')
          ? editingEvent.start
          : `${editingEvent.start}T09:00:00`
      )
    : defaultDates.start;

  const initialEndDate = editingEvent?.end
    ? new Date(
        editingEvent.end.includes('T')
          ? editingEvent.end
          : `${editingEvent.end}T10:00:00`
      )
    : editingEvent
    ? new Date(initialStartDate.getTime() + 60 * 60 * 1000)
    : defaultDates.end;

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: {
      title: editingEvent?.title || '',
      allDay: editingEvent ? Boolean(editingEvent.allDay) : true,
      startDate: initialStartDate,
      endDate: initialEndDate,
      location: editingEvent?.location || '',
      note: editingEvent?.note || '',
      colorToken: editingEvent?.colorToken || 'primary',
      recurrence: ((editingEvent?.recurrence as RecurrenceFrequency) || 'none'),
      hasReminder: editingEvent
        ? editingEvent.reminderMinutes !== null && editingEvent.reminderMinutes !== undefined
        : true,
      reminderMinutes: editingEvent?.reminderMinutes ?? DEFAULT_REMINDER_MINUTES,
      customReminderMinutes: editingEvent?.reminderMinutes ?? DEFAULT_REMINDER_MINUTES,
    },
  });

  const allDay = watch('allDay');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const recurrence = watch('recurrence');
  const hasReminder = watch('hasReminder');
  const [scope, setScope] = useState<EventScope>('this');
  const [extraReminders, setExtraReminders] = useState<number[]>(() => editingEvent ? reminderOffsets(editingEvent).filter(offset => offset !== editingEvent.reminderMinutes) : []);
  const reminderMinutes = watch('reminderMinutes');
  const customReminderMinutes = watch('customReminderMinutes');
  const [customHoursText, setCustomHoursText] = useState(() => String(Math.floor(customReminderMinutes / 60)));
  const [customMinutesText, setCustomMinutesText] = useState(() => String(customReminderMinutes % 60));
  const parsedCustomDuration = parseReminderDuration(customHoursText, customMinutesText);
  const updateCustomDuration = (minutes: number) => {
    setValue('customReminderMinutes', minutes);
    setCustomHoursText(String(Math.floor(minutes / 60)));
    setCustomMinutesText(String(minutes % 60));
  };
  const [isCustomReminder, setIsCustomReminder] = useState(() =>
    editingEvent?.reminderMinutes != null &&
    !REMINDER_OPTIONS.some(option => option.value === editingEvent.reminderMinutes)
  );

  // Picker State
  type PickerTarget = 'start' | 'end';
  const [activePickerTarget, setActivePickerTarget] = useState<PickerTarget | null>(null);
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  // Modals for Recurrence and Reminder Selection
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState<boolean>(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);

  const closeReminderModal = () => {
    if (isCustomReminder && parsedCustomDuration === null) return;
    Keyboard.dismiss();
    setIsReminderModalOpen(false);
  };

  // Date and Time Picker Handlers
  const handleOpenPicker = (target: PickerTarget) => {
    closeBar();
    setActivePickerTarget(target);
    setPickerStep('date');
    setTempDate(null);
  };

  const handleOpenEndPicker = () => {
    handleOpenPicker('end');
  };

  const dismissDatePicker = () => {
    setActivePickerTarget(null);
    setPickerStep(null);
    setTempDate(null);
  };

  const onDateChange = (selected: Date) => {
    const currentBase = activePickerTarget === 'start' ? startDate : endDate;
    const updated = new Date(selected);
    updated.setHours(currentBase.getHours(), currentBase.getMinutes(), 0, 0);

    if (allDay) {
      if (activePickerTarget === 'start') {
        const shifted = shiftEndDatePreservingDuration(startDate, updated, endDate);
        setValue('startDate', updated);
        setValue('endDate', shifted);
        clearErrors('endDate');
      } else {
        if (updated.getTime() < startDate.getTime()) {
          setError('endDate', { message: 'End date cannot be before start date' });
        } else {
          clearErrors('endDate');
        }
        setValue('endDate', updated);
      }
      setActivePickerTarget(null);
      setPickerStep(null);
      return;
    }

    setTempDate(updated);
    setPickerStep('time');
  };

  const onTimeChange = (selected?: Date) => {
    if (!selected) {
      if (tempDate) {
        if (activePickerTarget === 'start') {
          const shifted = shiftEndDatePreservingDuration(startDate, tempDate, endDate);
          setValue('startDate', tempDate);
          setValue('endDate', shifted);
          clearErrors('endDate');
        } else {
          {
            if (tempDate.getTime() < startDate.getTime()) {
              setError('endDate', { message: 'End time must be after start time' });
            } else {
              clearErrors('endDate');
            }
          }
          setValue('endDate', tempDate);
        }
      }
      setActivePickerTarget(null);
      setPickerStep(null);
      setTempDate(null);
      return;
    }

    const baseDate = tempDate || (activePickerTarget === 'start' ? startDate : endDate);
    const updated = new Date(baseDate);
    updated.setHours(selected.getHours(), selected.getMinutes(), 0, 0);

    if (activePickerTarget === 'start') {
      const shifted = shiftEndDatePreservingDuration(startDate, updated, endDate);
      setValue('startDate', updated);
      setValue('endDate', shifted);
      clearErrors('endDate');
    } else {
      {
        if (updated.getTime() < startDate.getTime()) {
          setError('endDate', { message: 'End time must be after start time' });
        } else {
          clearErrors('endDate');
        }
      }
      setValue('endDate', updated);
    }

    setActivePickerTarget(null);
    setPickerStep(null);
    setTempDate(null);
  };

  const formatCardDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCardTime = (d: Date) => {
    return formatTimeDisplay(d.getHours(), d.getMinutes());
  };

  const validateDates = (data: FormValues): boolean => {
    if (data.endDate.getTime() < data.startDate.getTime() || (!data.allDay && data.endDate.getTime() === data.startDate.getTime())) {
      setError('endDate', {
        message: data.allDay ? 'End date cannot be before start date' : 'End time must be after start time',
      });
      return false;
    }
    clearErrors('endDate');
    return true;
  };

  // Submit Handler
  const onSubmit = async (data: FormValues) => {
    if (!validateDates(data)) {
      return;
    }

    try {
      let startStr: string;
      let endStr: string | null = null;

      if (data.allDay) {
        const sy = data.startDate.getFullYear();
        const sm = (data.startDate.getMonth() + 1).toString().padStart(2, '0');
        const sd = data.startDate.getDate().toString().padStart(2, '0');
        startStr = `${sy}-${sm}-${sd}`;

        {
          const ey = data.endDate.getFullYear();
          const em = (data.endDate.getMonth() + 1).toString().padStart(2, '0');
          const ed = data.endDate.getDate().toString().padStart(2, '0');
          endStr = `${ey}-${em}-${ed}`;
        }
      } else {
        const formatLocalIso = (d: Date) => {
          const yr = d.getFullYear();
          const mo = (d.getMonth() + 1).toString().padStart(2, '0');
          const da = d.getDate().toString().padStart(2, '0');
          const hr = d.getHours().toString().padStart(2, '0');
          const mi = d.getMinutes().toString().padStart(2, '0');
          const se = d.getSeconds().toString().padStart(2, '0');
          return `${yr}-${mo}-${da}T${hr}:${mi}:${se}`;
        };
        startStr = formatLocalIso(data.startDate);

        {
          endStr = formatLocalIso(data.endDate);
        }
      }

      const recurrenceVal = data.recurrence === 'none' ? null : data.recurrence;
      const reminderVal = data.hasReminder
        ? isCustomReminder ? data.customReminderMinutes : data.reminderMinutes
        : null;
      const metadata = { note: data.note.trim() || null, colorToken: data.colorToken,
        reminderOffsets: JSON.stringify(data.hasReminder ? [...new Set([reminderVal!, ...extraReminders])] : []) };

      if (isEditMode && editingEvent) {
        saveScopedEvent(getDb(), editingEvent.id, editingEvent.start, {
          title: data.title.trim(),
          allDay: data.allDay,
          start: startStr,
          end: endStr,
          location: data.location.trim() || null,
          recurrence: recurrenceVal,
          reminderMinutes: reminderVal,
          ...metadata,
        }, scope, noteIds);
        useCalendarSync.getState().triggerRefresh();
      } else {
        await createEvent({
          title: data.title.trim(),
          allDay: data.allDay,
          start: startStr,
          end: endStr,
          location: data.location.trim() || null,
          recurrence: recurrenceVal,
          reminderMinutes: reminderVal,
          ...metadata,
        }, noteIds);
      }

      onClose();
    } catch (err) {
      console.error('[EventForm] Failed to save event:', err);
      Alert.alert('Error', 'Failed to save event. Please try again.');
      throw err;
    }
  };

  useImperativeHandle(ref, () => ({
    submit: async () => {
      let success = false;
      await handleSubmit(
        async (data) => {
          if (!validateDates(data)) {
            scrollViewRef?.current?.scrollTo({ y: 150, animated: true });
            success = false;
            return;
          }
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

  // Delete Handler with Confirmation
  const handleDelete = () => {
    if (!editingEvent) return;

    const isRecurring = Boolean(editingEvent.recurrence && editingEvent.recurrence !== 'none');
    const message = isRecurring
      ? `Remove ${scope === 'this' ? 'this occurrence' : scope === 'future' ? 'this and future occurrences' : 'all occurrences'}?`
      : 'Are you sure you want to delete this event?';

    Alert.alert('Delete Event', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            deleteScopedEvent(getDb(), editingEvent.id, editingEvent.start, scope);
            useCalendarSync.getState().triggerRefresh();
            onClose();
          } catch (err) {
            console.error('[EventForm] Failed to delete event:', err);
            Alert.alert('Error', 'Failed to delete event. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <>
      {/* Stacked Cards Container with standardized 12dp card gap */}
      <SheetSection fill>
        <EntityNotePicker selected={noteIds} onChange={setNoteIds} />
        {editingEvent?.recurrence && editingEvent.recurrence !== 'none' && <FormCard compact><SheetSection gap="sm">
          <Text style={{ color: colors.text }}>Apply changes or deletion to</Text>
          <SegmentedControl options={[{ value: 'this', label: 'This event' }, { value: 'future', label: 'Future' }, { value: 'all', label: 'All' }]}
            selectedValue={scope} onChange={setScope} />
        </SheetSection></FormCard>}
        {/* 1. Title Lifted Field Card */}
        <FormCard compact>
          <Controller
            control={control}
            name="title"
            rules={{ required: 'Title is required' }}
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="title"
                label="Event Title"
                value={value}
                onChangeText={(val) => {
                  onChange(val);
                  if (val.trim()) clearErrors('title');
                }}
                placeholder="Event title (e.g. Design Review)"
                error={errors.title?.message}
                fieldOrder={['title']}
                actionLabel="Done"
                icon={
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.primary,
                    }}
                  />
                }
              />
            )}
          />
        </FormCard>

        {/* 2. Optional Location Lifted Field Card */}
        <FormCard compact>
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="location"
                label="Location (optional)"
                value={value}
                onChangeText={onChange}
                placeholder="Add location"
                fieldOrder={['location']}
                actionLabel="Done"
                icon={<MapPin size={16} color={colors['text-muted']} />}
              />
            )}
          />
        </FormCard>

        <FormCard compact><Controller control={control} name="note" render={({ field }) =>
          <LiftedField id="event-note" label="Notes" placeholder="Add notes" value={field.value} onChangeText={field.onChange} multiline fieldOrder={['event-note']} />
        } /></FormCard>
        <FormCard compact><SheetSection gap="sm"><Text style={{ color: colors.text }}>Color category</Text>
          <SegmentedControl options={[{ value: 'primary', label: 'Calendar' }, { value: 'tasks', label: 'Personal' }, { value: 'money', label: 'Money' }]}
            selectedValue={watch('colorToken')} onChange={value => setValue('colorToken', value)} />
        </SheetSection></FormCard>
        {hasReminder && <FormCard compact><SheetSection gap="sm"><Text style={{ color: colors.text }}>Additional reminders</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>{REMINDER_OPTIONS.map(option => <Chip key={option.value}
            label={formatReminderLabel(option.value)} selected={extraReminders.includes(option.value)}
            onPress={() => setExtraReminders(values => values.includes(option.value) ? values.filter(value => value !== option.value) : [...values, option.value])} />)}</View>
        </SheetSection></FormCard>}
        {editingEvent && <FormCard compact onPress={() => { closeBar(); try { duplicateEvent(getDb(), editingEvent.id, editingEvent.start); useCalendarSync.getState().triggerRefresh(); onClose(); } catch { Alert.alert('Could not duplicate event', 'Please try again.'); } }}>
          <FormRow label="Duplicate event" value="Copies dates, notes, color, repeats and reminders." />
        </FormCard>}
        {/* 3. All-Day Toggle Row (56dp min height, vertically centered, no extra bottom space) */}
        <FormCard compact singleLine>
          <FormRow
            icon={<Sun size={16} color={colors['text-muted']} />}
            label="All-day"
            right={
              <Controller
                control={control}
                name="allDay"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                )}
              />
            }
          />
        </FormCard>

        {/* 4. Starts & Ends Cards (Side-by-side, 12dp gap, equal widths) */}
        <FormCardRow>
          {/* STARTS Card */}
          <FormCard
            compact
            style={{ flex: 1 }}
            onPress={() => handleOpenPicker('start')}
            accessibilityRole="button"
            accessibilityLabel="Select start date and time"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <Clock size={12} color={colors['text-muted']} style={{ marginRight: spacing.xs }} />
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
                STARTS
              </Text>
            </View>
            <Text
              maxFontSizeMultiplier={layout.maxFontScale}
              style={{ fontSize: 13, fontWeight: '500', color: colors.text }}
            >
              {formatCardDate(startDate)}
            </Text>
            {!allDay && (
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{
                  fontSize: 12,
                  color: colors['text-muted'],
                  marginTop: spacing.xs,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatCardTime(startDate)}
              </Text>
            )}
          </FormCard>

          {/* ENDS Card */}
          <FormCard
            compact
            style={{ flex: 1 }}
            onPress={handleOpenEndPicker}
            accessibilityRole="button"
            accessibilityLabel="Select end date and time"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
              <Clock size={12} color={colors['text-muted']} style={{ marginRight: spacing.xs }} />
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
                ENDS
              </Text>
            </View>
            {(
              <>
                <Text
                  maxFontSizeMultiplier={layout.maxFontScale}
                  style={{ fontSize: 13, fontWeight: '500', color: colors.text }}
                >
                  {formatCardDate(endDate)}
                </Text>
                {!allDay && (
                  <Text
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={{
                      fontSize: 12,
                      color: colors['text-muted'],
                      marginTop: spacing.xs,
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {formatCardTime(endDate)}
                  </Text>
                )}
              </>
            )}
          </FormCard>
        </FormCardRow>
        {errors.endDate && (
          <Text
            maxFontSizeMultiplier={layout.maxFontScale}
            style={{
              fontSize: 12,
              color: colors.error,
              paddingHorizontal: spacing.xs,
            }}
          >
            {errors.endDate.message}
          </Text>
        )}

        {/* 5. Repeats Row */}
        <FormCard
          compact
          singleLine
          onPress={() => {
            closeBar();
            setIsRecurrenceModalOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Select recurrence"
        >
          <FormRow
            icon={<Repeat size={16} color={colors['text-muted']} />}
            label="Repeats"
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text
                  maxFontSizeMultiplier={layout.maxFontScale}
                  style={{
                    fontSize: 13,
                    color: colors['text-muted'],
                    marginRight: spacing.xs,
                  }}
                >
                  {RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label || 'Does not repeat'}
                </Text>
                <ChevronRight size={14} color={colors['text-muted']} />
              </View>
            }
          />
        </FormCard>

        {/* 6. Reminder Row */}
        <FormCard compact>
          <FormRow
            icon={<Bell size={16} color={colors['text-muted']} />}
            label={
              <Pressable
                disabled={!hasReminder}
                onPress={() => {
                  closeBar();
                  setIsReminderModalOpen(true);
                }}
                accessibilityRole="button"
                accessibilityLabel="Select reminder offset"
              >
                <Text
                  maxFontSizeMultiplier={layout.maxFontScale}
                  style={{ fontSize: 14, fontWeight: '500', color: colors.text }}
                >
                  Reminder
                </Text>
                {hasReminder && (
                  <Text
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={{
                      fontSize: 11,
                      color: colors.primary,
                      marginTop: layout.labelToValueGap,
                    }}
                  >
                    {isCustomReminder
                      ? formatReminderLabel(customReminderMinutes)
                      : formatReminderLabel(reminderMinutes)}
                  </Text>
                )}
              </Pressable>
            }
            right={
              <Controller
                control={control}
                name="hasReminder"
                render={({ field: { onChange, value } }) => (
                  <Switch
                    value={value}
                    onValueChange={(enabled) => {
                      onChange(enabled);
                      if (!enabled) {
                        closeBar();
                      }
                    }}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                  />
                )}
              />
            }
          />
        </FormCard>
      </SheetSection>

      {/* 8. Delete Button in Edit Mode: 24dp above, centered, 16dp space below */}
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
            style={{ minHeight: 44, paddingHorizontal: spacing.base, justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Delete event"
          >
            <Text
              maxFontSizeMultiplier={layout.maxFontScale}
              style={{
                fontSize: 13,
                fontWeight: '500',
                color: colors.error,
              }}
            >
              Delete event
            </Text>
          </Pressable>
        </View>
      )}

      {/* Date / Time Picker Rendering */}
      {activePickerTarget && pickerStep === 'date' && (
        <DateTimePicker
          value={activePickerTarget === 'start' ? startDate : endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={(_event, selected) => onDateChange(selected)}
          onDismiss={dismissDatePicker}
        />
      )}

      {activePickerTarget && pickerStep === 'time' && (
        <DateTimePicker
          value={
            tempDate ||
            (activePickerTarget === 'start' ? startDate : endDate)
          }
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onValueChange={(_event, selected) => onTimeChange(selected)}
          onDismiss={() => onTimeChange()}
        />
      )}

      {/* Recurrence Selection Modal */}
      <Modal
        visible={isRecurrenceModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsRecurrenceModalOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          onPress={() => setIsRecurrenceModalOpen(false)}
          className="flex-1 justify-center items-center px-6"
          style={{ backgroundColor: colors.overlay }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              width: '100%',
              borderRadius: layout.cardBorderRadius,
              padding: spacing.base,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: layout.cardGap,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                marginBottom: spacing.sm,
              }}
            >
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{ fontSize: 16, fontWeight: '500', color: colors.text }}
              >
                Recurrence
              </Text>
              <Pressable
                onPress={() => setIsRecurrenceModalOpen(false)}
                className="rounded-full active:bg-background"
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="Close recurrence picker"
              >
                <X size={18} color={colors['text-muted']} />
              </Pressable>
            </View>
            {RECURRENCE_OPTIONS.map((opt) => {
              const isSelected = recurrence === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setValue('recurrence', opt.value);
                    if (opt.value !== 'none') {
                      const alignedEnd = new Date(startDate);
                      alignedEnd.setHours(endDate.getHours(), endDate.getMinutes(), 0, 0);
                      if (alignedEnd.getTime() <= startDate.getTime()) {
                        alignedEnd.setTime(startDate.getTime() + 60 * 60 * 1000);
                      }
                      setValue('endDate', alignedEnd);
                      clearErrors('endDate');
                    }
                    setIsRecurrenceModalOpen(false);
                  }}
                  style={{
                    paddingVertical: layout.cardGap,
                    paddingHorizontal: spacing.base,
                    borderRadius: layout.cardBorderRadius,
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? colors.background : 'transparent',
                    marginBottom: spacing.xs,
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={{
                      fontSize: 14,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? colors.primary : colors.text,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} />}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>

      {/* Reminder Offset Selection Modal */}
      <Modal
        visible={isReminderModalOpen}
        transparent
        animationType="fade"
        onRequestClose={closeReminderModal}
        statusBarTranslucent
      >
        {isReminderModalOpen && <LiftedInputProvider>
        <View style={{ flex: 1, backgroundColor: colors.overlay, paddingTop: insets.top, paddingBottom: insets.bottom }}>
          <Pressable
            onPress={closeReminderModal}
            style={StyleSheet.absoluteFill}
            accessibilityRole="button"
            accessibilityLabel="Close reminder picker"
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }}
          >
          <View
            style={{
              backgroundColor: colors.surface,
              width: '100%',
              borderRadius: layout.cardBorderRadius,
              padding: spacing.base,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: layout.cardGap,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                marginBottom: spacing.sm,
              }}
            >
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                style={{ fontSize: 16, fontWeight: '500', color: colors.text }}
              >
                Reminder Time
              </Text>
              <Pressable
                onPress={closeReminderModal}
                className="rounded-full active:bg-background"
                style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="button"
                accessibilityLabel="Close reminder picker"
              >
                <X size={18} color={colors['text-muted']} />
              </Pressable>
            </View>
            {REMINDER_OPTIONS.map((opt) => {
              const isSelected = !isCustomReminder && reminderMinutes === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setValue('reminderMinutes', opt.value);
                    updateCustomDuration(opt.value);
                    setIsCustomReminder(false);
                    setIsReminderModalOpen(false);
                  }}
                  style={{
                    paddingVertical: layout.cardGap,
                    paddingHorizontal: spacing.base,
                    borderRadius: layout.cardBorderRadius,
                    minHeight: 44,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isSelected ? colors.background : 'transparent',
                    marginBottom: spacing.xs,
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    maxFontSizeMultiplier={layout.maxFontScale}
                    style={{
                      fontSize: 14,
                      fontWeight: isSelected ? '600' : '400',
                      color: isSelected ? colors.primary : colors.text,
                    }}
                  >
                    {opt.label}
                  </Text>
                  {isSelected && <Check size={16} color={colors.primary} />}
                </Pressable>
              );
            })}
            <Pressable
              onPress={() => {
                setIsCustomReminder(true);
              }}
              className="active:opacity-80"
              style={{ minHeight: 44, paddingVertical: layout.cardGap, paddingHorizontal: spacing.base }}
              accessibilityRole="button"
              accessibilityState={{ selected: isCustomReminder }}
            >
              <FormRow
                label="Custom time…"
                right={isCustomReminder ? <Check size={16} color={colors.primary} /> :
                  <ChevronRight size={16} color={colors['text-muted']} />}
              />
            </Pressable>
            <Controller
              control={control}
              name="customReminderMinutes"
              render={({ field: { onChange, value } }) => isCustomReminder ? (
                <SheetSection>
                  <FormCardRow>
                    {(['hours', 'minutes'] as const).map(unit => {
                      const amount = unit === 'hours' ? Math.floor(value / 60) : value % 60;
                      const maximum = unit === 'hours' ? 35791393 : 59;
                      return (
                        <FormCard key={unit} compact style={{ flex: 1 }}>
                          <SheetSection>
                            <Text style={{ color: colors['text-muted'], textAlign: 'center', fontWeight: '500' }} maxFontSizeMultiplier={layout.maxFontScale}>
                              {unit === 'hours' ? 'Hours' : 'Minutes'}
                            </Text>
                            <LiftedField
                              id={`reminder-${unit}`}
                              label={unit === 'hours' ? 'Reminder hours' : 'Reminder minutes'}
                              value={unit === 'hours' ? customHoursText : customMinutesText}
                              placeholder="0"
                              keyboardType="number-pad"
                              fieldOrder={['reminder-hours', 'reminder-minutes']}
                              actionLabel="Done"
                              displayTextStyle={{ fontSize: 28, fontWeight: '600', textAlign: 'center', fontVariant: ['tabular-nums'] }}
                              onChangeText={text => {
                                if (unit === 'hours') setCustomHoursText(text);
                                else setCustomMinutesText(text);
                                const parsed = parseReminderDuration(
                                  unit === 'hours' ? text : customHoursText,
                                  unit === 'minutes' ? text : customMinutesText
                                );
                                if (parsed !== null) onChange(parsed);
                              }}
                            />
                            <FormCardRow>
                              {([-1, 1] as const).map(delta => {
                                const disabled = delta < 0 ? amount === 0 : amount >= maximum;
                                return (
                                  <Pressable
                                    key={delta}
                                    disabled={disabled}
                                    onPress={() => updateCustomDuration(adjustReminderDuration(value, unit, delta))}
                                    className="active:opacity-80"
                                    style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors['surface-raised'], borderRadius: layout.cardBorderRadius, opacity: disabled ? 0.4 : 1 }}
                                    accessibilityRole="button"
                                    accessibilityLabel={`${delta < 0 ? 'Decrease' : 'Increase'} ${unit}`}
                                    accessibilityState={{ disabled }}
                                  >
                                    {delta < 0 ? <Minus size={20} color={colors.text} /> : <Plus size={20} color={colors.text} />}
                                  </Pressable>
                                );
                              })}
                            </FormCardRow>
                          </SheetSection>
                        </FormCard>
                      );
                    })}
                  </FormCardRow>
                  <Text style={{ color: colors['text-muted'], textAlign: 'center' }} maxFontSizeMultiplier={layout.maxFontScale}>
                    {parsedCustomDuration === null
                      ? 'Use whole hours (0 or more) and minutes (0–59).'
                      : formatReminderLabel(value)}
                  </Text>
                  <Pressable
                    onPress={closeReminderModal}
                    disabled={parsedCustomDuration === null}
                    className="active:opacity-80"
                    style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: layout.cardBorderRadius, opacity: parsedCustomDuration === null ? 0.4 : 1 }}
                    accessibilityRole="button"
                    accessibilityLabel="Use custom reminder time"
                    accessibilityState={{ disabled: parsedCustomDuration === null }}
                  >
                    <Text style={{ color: colors['on-primary'], fontWeight: '600' }} maxFontSizeMultiplier={layout.maxFontScale}>Done</Text>
                  </Pressable>
                </SheetSection>
              ) : <></>}
            />
          </View>
          </ScrollView>
          <LiftedInputHost />
        </View>
        </LiftedInputProvider>}
      </Modal>
    </>
  );
});

export default EventForm;
