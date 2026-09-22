import React, { useState, useEffect, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Pressable,
  Switch,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {
  MapPin,
  Clock,
  Repeat,
  Bell,
  Check,
  ChevronRight,
  Sun,
  X,
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
  RecurrenceFrequency,
} from '@/utils/recurrence';
import { formatTimeDisplay } from '@/utils/timelineLayout';
import { colors, spacing, layout } from '@/constants/theme';
import { FormCard, FormCardRow, FormRow } from '@/components/ui';
import { LiftedField } from '@/components/lifted-input/LiftedField';
import { useLiftedInput } from '@/components/lifted-input/LiftedInputContext';
import { QuickAddFormHandle, QuickAddFormProps } from '@/types/quickAdd';

export type EventFormProps = QuickAddFormProps;

interface FormValues {
  title: string;
  allDay: boolean;
  startDate: Date;
  endDate: Date;
  location: string;
  recurrence: RecurrenceFrequency;
  hasReminder: boolean;
  reminderMinutes: number;
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
    const { editingEvent, selectedDateContext } = useUIStore();
    const { closeBar } = useLiftedInput();
    const isEditMode = Boolean(editingEvent);

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
      allDay: Boolean(editingEvent?.allDay),
      startDate: initialStartDate,
      endDate: initialEndDate,
      location: editingEvent?.location || '',
      recurrence: ((editingEvent?.recurrence as RecurrenceFrequency) || 'none'),
      hasReminder: editingEvent
        ? editingEvent.reminderMinutes !== null && editingEvent.reminderMinutes !== undefined
        : true,
      reminderMinutes: editingEvent?.reminderMinutes ?? 15,
    },
  });

  const allDay = watch('allDay');
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const recurrence = watch('recurrence');
  const hasReminder = watch('hasReminder');
  const reminderMinutes = watch('reminderMinutes');

  // Picker State
  type PickerTarget = 'start' | 'end';
  const [activePickerTarget, setActivePickerTarget] = useState<PickerTarget | null>(null);
  const [pickerStep, setPickerStep] = useState<'date' | 'time' | null>(null);
  const [tempDate, setTempDate] = useState<Date | null>(null);

  // Modals for Recurrence and Reminder Selection
  const [isRecurrenceModalOpen, setIsRecurrenceModalOpen] = useState<boolean>(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState<boolean>(false);

  // Date and Time Picker Handlers
  const handleOpenPicker = (target: PickerTarget) => {
    closeBar();
    setActivePickerTarget(target);
    setPickerStep('date');
    setTempDate(null);
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      setActivePickerTarget(null);
      setPickerStep(null);
      setTempDate(null);
      return;
    }

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

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      if (tempDate) {
        if (activePickerTarget === 'start') {
          const shifted = shiftEndDatePreservingDuration(startDate, tempDate, endDate);
          setValue('startDate', tempDate);
          setValue('endDate', shifted);
          clearErrors('endDate');
        } else {
          if (tempDate.getTime() < startDate.getTime()) {
            setError('endDate', { message: 'End time must be after start time' });
          } else {
            clearErrors('endDate');
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
      if (updated.getTime() < startDate.getTime()) {
        setError('endDate', { message: 'End time must be after start time' });
      } else {
        clearErrors('endDate');
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

  // Submit Handler
  const onSubmit = async (data: FormValues) => {
    if (data.endDate.getTime() < data.startDate.getTime()) {
      setError('endDate', { message: 'End time must be after start time' });
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

        const ey = data.endDate.getFullYear();
        const em = (data.endDate.getMonth() + 1).toString().padStart(2, '0');
        const ed = data.endDate.getDate().toString().padStart(2, '0');
        endStr = `${ey}-${em}-${ed}`;
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
        endStr = formatLocalIso(data.endDate);
      }

      const recurrenceVal = data.recurrence === 'none' ? null : data.recurrence;
      const reminderVal = data.hasReminder ? data.reminderMinutes : null;

      if (isEditMode && editingEvent) {
        await updateEvent(editingEvent.id, {
          title: data.title.trim(),
          allDay: data.allDay,
          start: startStr,
          end: endStr,
          location: data.location.trim() || null,
          recurrence: recurrenceVal,
          reminderMinutes: reminderVal,
        });
      } else {
        await createEvent({
          title: data.title.trim(),
          allDay: data.allDay,
          start: startStr,
          end: endStr,
          location: data.location.trim() || null,
          recurrence: recurrenceVal,
          reminderMinutes: reminderVal,
        });
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
          if (data.endDate.getTime() < data.startDate.getTime()) {
            setError('endDate', { message: 'End time must be after start time' });
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
      ? 'This deletes all repeats of this event.'
      : 'Are you sure you want to delete this event?';

    Alert.alert('Delete Event', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent(editingEvent.id);
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
      <View style={{ gap: layout.cardGap }}>
        {/* 1. Title Lifted Field Card */}
        <FormCard>
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
                hint="Tap to add a title"
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

        {/* 2. All-Day Toggle Row (56dp min height, vertically centered, no extra bottom space) */}
        <FormCard singleLine>
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
                    style={Platform.OS === 'android' ? { marginVertical: -8 } : undefined}
                  />
                )}
              />
            }
          />
        </FormCard>

        {/* 3. Starts & Ends Cards (Side-by-side, 12dp gap, equal widths) */}
        <FormCardRow>
          {/* STARTS Card */}
          <FormCard
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
                  marginTop: 2,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatCardTime(startDate)}
              </Text>
            )}
          </FormCard>

          {/* ENDS Card */}
          <FormCard
            style={{ flex: 1 }}
            onPress={() => handleOpenPicker('end')}
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
                  marginTop: 2,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatCardTime(endDate)}
              </Text>
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

        {/* 4. Location Lifted Field Card */}
        <FormCard singleLine>
          <Controller
            control={control}
            name="location"
            render={({ field: { onChange, value } }) => (
              <LiftedField
                id="location"
                label="Location"
                value={value}
                onChangeText={onChange}
                placeholder="Add location (e.g. Studio B)"
                fieldOrder={['location']}
                actionLabel="Done"
                icon={<MapPin size={16} color={colors['text-muted']} />}
              />
            )}
          />
        </FormCard>

        {/* 5. Repeats Row */}
        <FormCard
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
        <FormCard>
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
                    {formatReminderLabel(reminderMinutes)}
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
                    onValueChange={onChange}
                    trackColor={{ false: colors.border, true: colors.primary }}
                    thumbColor={colors.surface}
                    style={Platform.OS === 'android' ? { marginVertical: -8 } : undefined}
                  />
                )}
              />
            }
          />
        </FormCard>
      </View>

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
            style={{ paddingVertical: spacing.xs, paddingHorizontal: spacing.base }}
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
          onChange={onDateChange}
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
          onChange={onTimeChange}
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
          className="flex-1 bg-black/40 justify-center items-center px-6"
        >
          <View
            style={{
              backgroundColor: colors.surface,
              width: '100%',
              borderRadius: 16,
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
                className="p-1 rounded-full active:bg-background"
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
                    setIsRecurrenceModalOpen(false);
                  }}
                  style={{
                    paddingVertical: layout.cardGap,
                    paddingHorizontal: spacing.base,
                    borderRadius: 8,
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
        onRequestClose={() => setIsReminderModalOpen(false)}
        statusBarTranslucent
      >
        <Pressable
          onPress={() => setIsReminderModalOpen(false)}
          className="flex-1 bg-black/40 justify-center items-center px-6"
        >
          <View
            style={{
              backgroundColor: colors.surface,
              width: '100%',
              borderRadius: 16,
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
                onPress={() => setIsReminderModalOpen(false)}
                className="p-1 rounded-full active:bg-background"
                accessibilityRole="button"
                accessibilityLabel="Close reminder picker"
              >
                <X size={18} color={colors['text-muted']} />
              </Pressable>
            </View>
            {REMINDER_OPTIONS.map((opt) => {
              const isSelected = reminderMinutes === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    setValue('reminderMinutes', opt.value);
                    setIsReminderModalOpen(false);
                  }}
                  style={{
                    paddingVertical: layout.cardGap,
                    paddingHorizontal: spacing.base,
                    borderRadius: 8,
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
    </>
  );
});

export default EventForm;
