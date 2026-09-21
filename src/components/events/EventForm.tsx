import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Switch,
  ScrollView,
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
  useCalendarDay,
  createEvent,
  updateEvent,
  deleteEvent,
} from '@/hooks/useCalendarDay';
import { Event, NewEvent } from '@/db/schema';
import {
  shiftEndDatePreservingDuration,
  formatReminderLabel,
  RECURRENCE_OPTIONS,
  REMINDER_OPTIONS,
  RecurrenceFrequency,
} from '@/utils/recurrence';
import { formatTimeDisplay } from '@/utils/timelineLayout';
import { colors } from '@/constants/theme';

interface EventFormProps {
  onClose: () => void;
}

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
    start.setHours(9, 0, 0, 0); // 9:00 AM default for non-today dates
  }

  const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour later
  return { start, end };
}

export function EventForm({ onClose }: EventFormProps) {
  const { editingEvent, selectedDateContext } = useUIStore();
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

  const scrollViewRef = useRef<ScrollView>(null);

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
    setActivePickerTarget(target);
    setPickerStep('date');
    setTempDate(null);
  };

  const onDateChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      // User canceled at date step: keep previous value
      setActivePickerTarget(null);
      setPickerStep(null);
      setTempDate(null);
      return;
    }

    const currentBase = activePickerTarget === 'start' ? startDate : endDate;
    // Combine selected date with current time
    const updated = new Date(selected);
    updated.setHours(currentBase.getHours(), currentBase.getMinutes(), 0, 0);

    if (allDay) {
      // All-day: only date is needed
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

    // Timed: proceed to time step
    setTempDate(updated);
    if (Platform.OS === 'android') {
      // On Android, date picker dismissed itself; open time picker
      setPickerStep('time');
    } else {
      setPickerStep('time');
    }
  };

  const onTimeChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      // User canceled at time step: keep new date with previous time
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

  // Format Helper for Card Display
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
    // Validate end >= start
    if (data.endDate.getTime() < data.startDate.getTime()) {
      setError('endDate', { message: 'End time must be after start time' });
      scrollViewRef.current?.scrollTo({ y: 120, animated: true });
      return;
    }

    try {
      // Format start and end strings
      let startStr: string;
      let endStr: string | null = null;

      if (data.allDay) {
        // Date-only YYYY-MM-DD so timezone conversions never shift days
        const sy = data.startDate.getFullYear();
        const sm = (data.startDate.getMonth() + 1).toString().padStart(2, '0');
        const sd = data.startDate.getDate().toString().padStart(2, '0');
        startStr = `${sy}-${sm}-${sd}`;

        const ey = data.endDate.getFullYear();
        const em = (data.endDate.getMonth() + 1).toString().padStart(2, '0');
        const ed = data.endDate.getDate().toString().padStart(2, '0');
        endStr = `${ey}-${em}-${ed}`;
      } else {
        // Local ISO format YYYY-MM-DDTHH:mm:ss
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
    }
  };

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
    <ScrollView
      ref={scrollViewRef}
      className="space-y-3"
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* 1. Title Input Card */}
      <View className="bg-[#FAF7F2] border border-border rounded-xl p-3">
        <View className="flex-row items-center mb-1">
          <View className="w-2 h-2 rounded-full bg-primary mr-2" />
          <Controller
            control={control}
            name="title"
            rules={{ required: 'Title is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                placeholder="Event title (e.g. Design Review)"
                placeholderTextColor={colors['text-muted']}
                value={value}
                onChangeText={(val) => {
                  onChange(val);
                  if (val.trim()) clearErrors('title');
                }}
                onBlur={onBlur}
                className="text-base font-medium text-text flex-1"
                autoFocus={!isEditMode}
              />
            )}
          />
        </View>
        <Text className="text-[11px] text-text-muted pl-4">
          Press enter to configure or tap save below
        </Text>
        {errors.title && (
          <Text className="text-xs text-[#B85D5D] mt-1 pl-4">
            {errors.title.message}
          </Text>
        )}
      </View>

      {/* 2. All-Day Toggle Row */}
      <View className="bg-[#FAF7F2] border border-border rounded-xl px-3.5 py-2.5 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Sun size={16} color={colors['text-muted']} />
          <Text className="ml-2.5 text-sm font-medium text-text">All-day</Text>
        </View>
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
      </View>

      {/* 3. Starts & Ends Cards */}
      <View className="flex-row items-center justify-between">
        {/* STARTS Card */}
        <Pressable
          onPress={() => handleOpenPicker('start')}
          className="flex-1 mr-1.5 bg-[#FAF7F2] border border-border rounded-xl p-3 active:bg-surface"
          accessibilityRole="button"
          accessibilityLabel="Select start date and time"
        >
          <View className="flex-row items-center mb-1">
            <Clock size={12} color={colors['text-muted']} />
            <Text className="ml-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              STARTS
            </Text>
          </View>
          <Text className="text-xs font-medium text-text">
            {formatCardDate(startDate)}
          </Text>
          {!allDay && (
            <Text className="text-xs text-text-muted mt-0.5 tabular-nums">
              {formatCardTime(startDate)}
            </Text>
          )}
        </Pressable>

        {/* ENDS Card */}
        <Pressable
          onPress={() => handleOpenPicker('end')}
          className="flex-1 ml-1.5 bg-[#FAF7F2] border border-border rounded-xl p-3 active:bg-surface"
          accessibilityRole="button"
          accessibilityLabel="Select end date and time"
        >
          <View className="flex-row items-center mb-1">
            <Clock size={12} color={colors['text-muted']} />
            <Text className="ml-1 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              ENDS
            </Text>
          </View>
          <Text className="text-xs font-medium text-text">
            {formatCardDate(endDate)}
          </Text>
          {!allDay && (
            <Text className="text-xs text-text-muted mt-0.5 tabular-nums">
              {formatCardTime(endDate)}
            </Text>
          )}
        </Pressable>
      </View>
      {errors.endDate && (
        <Text className="text-xs text-[#B85D5D] px-1">
          {errors.endDate.message}
        </Text>
      )}

      {/* 4. Location Row */}
      <View className="bg-[#FAF7F2] border border-border rounded-xl px-3.5 py-2 flex-row items-center">
        <MapPin size={16} color={colors['text-muted']} />
        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Add location (e.g. Studio B)"
              placeholderTextColor={colors['text-muted']}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              className="ml-2.5 text-sm text-text flex-1 py-1"
            />
          )}
        />
      </View>

      {/* 5. Repeats Row */}
      <Pressable
        onPress={() => setIsRecurrenceModalOpen(true)}
        className="bg-[#FAF7F2] border border-border rounded-xl px-3.5 py-3 flex-row items-center justify-between active:bg-surface"
        accessibilityRole="button"
        accessibilityLabel="Select recurrence"
      >
        <View className="flex-row items-center">
          <Repeat size={16} color={colors['text-muted']} />
          <Text className="ml-2.5 text-sm font-medium text-text">Repeats</Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs text-text-muted mr-1">
            {RECURRENCE_OPTIONS.find((o) => o.value === recurrence)?.label || 'Does not repeat'}
          </Text>
          <ChevronRight size={14} color={colors['text-muted']} />
        </View>
      </Pressable>

      {/* 6. Reminder Row */}
      <View className="bg-[#FAF7F2] border border-border rounded-xl px-3.5 py-2.5 flex-row items-center justify-between">
        <Pressable
          disabled={!hasReminder}
          onPress={() => setIsReminderModalOpen(true)}
          className="flex-1 flex-row items-center mr-2"
        >
          <Bell size={16} color={colors['text-muted']} />
          <View className="ml-2.5">
            <Text className="text-sm font-medium text-text">Reminder</Text>
            {hasReminder && (
              <Text className="text-[11px] text-primary mt-0.5">
                {formatReminderLabel(reminderMinutes)}
              </Text>
            )}
          </View>
        </Pressable>
        <Controller
          control={control}
          name="hasReminder"
          render={({ field: { onChange, value } }) => (
            <Switch
              value={value}
              onValueChange={onChange}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.surface}
            />
          )}
        />
      </View>

      {/* 7. Save Event Button */}
      <View className="pt-2">
        <Pressable
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting}
          className="bg-primary rounded-xl py-3.5 items-center justify-center flex-row active:opacity-90"
          accessibilityRole="button"
          accessibilityLabel={isEditMode ? 'Save changes' : 'Save Event'}
        >
          <Check size={18} color={colors['on-primary']} strokeWidth={2.5} />
          <Text className="ml-2 text-sm font-medium text-on-primary">
            {isEditMode ? 'Save changes' : 'Save Event'}
          </Text>
        </Pressable>
      </View>

      {/* 8. Delete Button in Edit Mode */}
      {isEditMode && (
        <Pressable
          onPress={handleDelete}
          className="py-2.5 items-center justify-center active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Delete event"
        >
          <Text className="text-xs font-medium text-[#B85D5D]">
            Delete event
          </Text>
        </Pressable>
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
      >
        <Pressable
          onPress={() => setIsRecurrenceModalOpen(false)}
          className="flex-1 bg-black/40 justify-center items-center px-6"
        >
          <View className="bg-surface w-full rounded-2xl p-4 border border-border shadow-lg">
            <View className="flex-row items-center justify-between pb-3 border-b border-border mb-2">
              <Text className="text-base font-medium text-text">Recurrence</Text>
              <Pressable
                onPress={() => setIsRecurrenceModalOpen(false)}
                className="p-1 rounded-full active:bg-background"
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
                  className={`py-3 px-3 rounded-lg flex-row items-center justify-between ${
                    isSelected ? 'bg-background' : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isSelected ? 'font-medium text-primary' : 'text-text'
                    }`}
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
      >
        <Pressable
          onPress={() => setIsReminderModalOpen(false)}
          className="flex-1 bg-black/40 justify-center items-center px-6"
        >
          <View className="bg-surface w-full rounded-2xl p-4 border border-border shadow-lg">
            <View className="flex-row items-center justify-between pb-3 border-b border-border mb-2">
              <Text className="text-base font-medium text-text">Reminder Time</Text>
              <Pressable
                onPress={() => setIsReminderModalOpen(false)}
                className="p-1 rounded-full active:bg-background"
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
                  className={`py-2.5 px-3 rounded-lg flex-row items-center justify-between ${
                    isSelected ? 'bg-background' : 'bg-transparent'
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isSelected ? 'font-medium text-primary' : 'text-text'
                    }`}
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
    </ScrollView>
  );
}

export default EventForm;
