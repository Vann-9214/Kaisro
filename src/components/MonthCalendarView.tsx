import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useRouter } from 'expo-router';
import { ChevronRight, MapPin, Plus } from 'lucide-react-native';
import { useUIStore } from '@/store/useUIStore';
import { useCalendarDay } from '@/hooks/useCalendarDay';
import { useMonthDots } from '@/hooks/useMonthDots';
import { parseYearMonth, formatYearMonth } from '@/utils/monthUtils';
import { colors } from '@/constants/theme';
import { formatCurrency } from '@/constants/currency';
import {
  formatTimeRange,
  formatTimeDisplay,
  parseTimeFromISO,
} from '@/utils/timelineLayout';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';

function formatSelectedDayHeader(dateStr: string): string {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0] || '2026', 10);
  const m = parseInt(parts[1] || '1', 10) - 1;
  const d = parseInt(parts[2] || '1', 10);
  const dateObj = new Date(y, m, d);
  const dayNames = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${dayNames[dateObj.getDay()]}, ${monthNames[m]} ${d}`;
}

export interface MonthCalendarViewProps {
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  viewedDate: string;
  onViewedDateChange: (dateStr: string) => void;
  todayStr: string;
  onOpenDay: (dateStr: string) => void;
}

export function MonthCalendarView({
  selectedDate,
  onSelectDate,
  viewedDate,
  onViewedDateChange,
  todayStr,
  onOpenDay,
}: MonthCalendarViewProps) {
  const router = useRouter();
  const openAddSheet = useUIStore((s) => s.openAddSheet);

  // Parse viewed year and month from viewedDate
  const { year: viewedYear, month: viewedMonthNum } = useMemo(
    () => parseYearMonth(viewedDate),
    [viewedDate]
  );

  const currentMonthDateStr = useMemo(
    () => `${formatYearMonth(viewedYear, viewedMonthNum)}-01`,
    [viewedYear, viewedMonthNum]
  );

  // Fetch month dots for all visible dates in visible month
  const dotsMap = useMonthDots(viewedYear, viewedMonthNum);

  // Fetch items for the currently selected date
  const {
    events,
    tasks,
    transactions,
    toggleTask,
    isLoading: isDayLoading,
  } = useCalendarDay(selectedDate);

  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === 'expense'),
    [transactions]
  );

  const isDayEmpty =
    !isDayLoading &&
    events.length === 0 &&
    tasks.length === 0 &&
    expenseTransactions.length === 0;

  // Day cell press handler
  const handleDayPress = useCallback(
    (dateStr: string, isGhost: boolean, dateData: DateData) => {
      onSelectDate(dateStr);
      if (isGhost) {
        onViewedDateChange(dateData.dateString);
      }
    },
    [onSelectDate, onViewedDateChange]
  );

  // Custom Day rendering component inside react-native-calendars
  const renderDayComponent = useCallback(
    ({
      date,
      state,
    }: {
      date?: DateData;
      state?: 'selected' | 'disabled' | 'inactive' | 'today' | '';
    }) => {
      if (!date) return null;

      const dateStr = date.dateString;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedDate;
      const isGhost = state === 'disabled' || date.month !== viewedMonthNum;
      const dots = dotsMap[dateStr];
      const hasEvents = Boolean(dots?.hasEvents);
      const hasTasks = Boolean(dots?.hasTasks);
      const hasExpenses = Boolean(dots?.hasExpenses);
      const hasAnyDots = hasEvents || hasTasks || hasExpenses;

      let bgColor = 'transparent';
      let borderWidth = 0;
      let borderColor = 'transparent';
      let textColor = isGhost ? colors['text-muted'] : colors.text;
      let fontWeight: '400' | '500' | '600' = '400';

      if (isToday) {
        // Today is a filled primary circle
        bgColor = colors.primary;
        textColor = colors['on-primary'];
        fontWeight = '600';
      } else if (isSelected) {
        // Subtle primary outline for selected date
        borderWidth = 1.5;
        borderColor = colors.primary;
        textColor = colors.primary;
        fontWeight = '500';
      }

      return (
        <Pressable
          onPress={() => handleDayPress(dateStr, isGhost, date)}
          style={{
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 2,
          }}
          accessibilityRole="button"
          accessibilityLabel={`${dateStr}${isToday ? ', today' : ''}${isSelected ? ', selected' : ''}`}
          accessibilityState={{ selected: isSelected }}
        >
          {/* Circular Day Number Badge */}
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: bgColor,
              borderWidth,
              borderColor,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight,
                color: textColor,
                opacity: isGhost ? 0.35 : 1,
                fontVariant: ['tabular-nums'],
                textAlign: 'center',
              }}
            >
              {date.day}
            </Text>
          </View>

          {/* Up to 3 indicator dots: primary for events, tasks for tasks, money for spending */}
          <View
            style={{
              height: 6,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              marginTop: 2,
            }}
          >
            {!isGhost && hasAnyDots ? (
              <>
                {hasEvents && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.primary,
                    }}
                  />
                )}
                {hasTasks && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.tasks,
                    }}
                  />
                )}
                {hasExpenses && (
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors['on-money'],
                    }}
                  />
                )}
              </>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [todayStr, selectedDate, viewedMonthNum, dotsMap, handleDayPress]
  );

  return (
    <ScrollView
      className="flex-1 px-5 pt-3"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 90 }}
    >
      {/* 1. Month Calendar Grid inside a Serene Surface Card */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 8,
          marginBottom: 12,
        }}
      >
        <Calendar
          key={currentMonthDateStr}
          current={currentMonthDateStr}
          firstDay={1} // Monday-first standard
          enableSwipeMonths={true}
          hideArrows={true}
          renderHeader={() => null}
          hideExtraDays={false}
          showSixWeeks={true}
          onMonthChange={(monthData) => {
            onViewedDateChange(monthData.dateString);
          }}
          dayComponent={renderDayComponent}
          theme={{
            calendarBackground: colors.surface,
            textSectionTitleColor: colors['text-muted'],
            textDayHeaderFontSize: 11,
            textDayHeaderFontWeight: '500',
            // @ts-expect-error react-native-calendars stylesheet customization
            'stylesheet.calendar.header': {
              header: {
                height: 0,
                marginTop: 0,
                marginBottom: 0,
                paddingLeft: 0,
                paddingRight: 0,
              },
              week: {
                marginTop: 2,
                marginBottom: 6,
                flexDirection: 'row',
                justifyContent: 'space-around',
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                paddingBottom: 6,
              },
              dayHeader: {
                marginTop: 0,
                marginBottom: 0,
                width: 32,
                textAlign: 'center',
                fontSize: 11,
                fontWeight: '500',
                color: colors['text-muted'],
              },
            },
          }}
          style={{
            backgroundColor: colors.surface,
            borderRadius: 12,
          }}
        />
      </View>

      {/* 2. Selected Day Details Card below the Grid */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 12,
          padding: 14,
          marginBottom: 16,
        }}
      >
        {/* Header: Selected Date label + "Open day" button */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: colors.text,
                letterSpacing: -0.2,
              }}
              numberOfLines={1}
            >
              {formatSelectedDayHeader(selectedDate)}
            </Text>
            {selectedDate === todayStr && (
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '500',
                  color: colors.primary,
                  marginTop: 1,
                }}
              >
                Today
              </Text>
            )}
          </View>

          {/* Open day button switches to Day view on that date */}
          <Pressable
            onPress={() => onOpenDay(selectedDate)}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 9999,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={`Open day view for ${selectedDate}`}
          >
            <Text
              style={{
                fontSize: 11.5,
                fontWeight: '600',
                color: colors.primary,
              }}
            >
              Open day
            </Text>
            <ChevronRight size={13} color={colors.primary} style={{ marginLeft: 3 }} />
          </Pressable>
        </View>

        {/* Content list or compact empty state */}
        {isDayLoading ? (
          <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : isDayEmpty ? (
          <EmptyState
            variant="inline"
            title="Nothing planned"
            description="Your canvas is completely open for focused calm."
            actionLabel="+ Add an event"
            onAction={() => openAddSheet('event', null, selectedDate)}
          />
        ) : (
          <View>
            {/* Events */}
            {events.map((ev) => (
              <Pressable
                key={`event-${ev.id}`}
                onPress={() => openAddSheet('event', ev, selectedDate)}
                style={({ pressed }) => ({
                  backgroundColor: colors.background,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderLeftWidth: 3.5,
                  borderLeftColor: colors.primary,
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  marginBottom: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: pressed ? 0.85 : 1,
                })}
                accessibilityRole="button"
                accessibilityLabel={`Edit event: ${ev.title}`}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text
                    style={{
                      fontSize: 12.5,
                      fontWeight: '500',
                      color: colors.text,
                    }}
                    numberOfLines={1}
                  >
                    {ev.title}
                  </Text>
                  {ev.location ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <MapPin size={10} color={colors['text-muted']} />
                      <Text
                        style={{
                          fontSize: 10,
                          color: colors['text-muted'],
                          marginLeft: 3,
                        }}
                        numberOfLines={1}
                      >
                        {ev.location}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Chip
                  label={ev.allDay ? 'All day' : formatTimeRange(ev.start, ev.end)}
                  variant="primary"
                  size="sm"
                />
              </Pressable>
            ))}

            {/* Tasks with Serene Circular Checkbox */}
            {tasks.map((tsk) => {
              const dueTime = parseTimeFromISO(tsk.dueAt);
              const formattedDue = dueTime
                ? formatTimeDisplay(dueTime.hour, dueTime.minute)
                : '';

              return (
                <View
                  key={`task-${tsk.id}`}
                  style={{
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderLeftWidth: 3.5,
                    borderLeftColor: colors.tasks,
                    borderRadius: 8,
                    paddingVertical: 7,
                    paddingHorizontal: 10,
                    marginBottom: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      marginRight: 8,
                    }}
                  >
                    <Checkbox
                      checked={Boolean(tsk.done)}
                      onToggle={() => toggleTask(tsk.id, Boolean(tsk.done))}
                    />
                    <Pressable
                      onPress={() => openAddSheet('task', tsk)}
                      style={{ marginLeft: 8, flex: 1 }}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit task: ${tsk.title}`}
                    >
                      <Text
                        style={{
                          fontSize: 12.5,
                          fontWeight: '500',
                          color: tsk.done ? colors['text-muted'] : colors.text,
                          textDecorationLine: tsk.done ? 'line-through' : 'none',
                        }}
                        numberOfLines={1}
                      >
                        {tsk.title}
                      </Text>
                    </Pressable>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {tsk.priority === 'urgent' && (
                      <Chip label="Urgent" variant="tasks" size="sm" />
                    )}
                    {tsk.priority === 'high' && (
                      <Chip label="High" variant="tasks" size="sm" />
                    )}
                    {formattedDue ? (
                      <Text
                        style={{
                          fontSize: 10,
                          color: colors['text-muted'],
                          fontVariant: ['tabular-nums'],
                        }}
                      >
                        {formattedDue}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}

            {/* Expense Transactions */}
            {expenseTransactions.map((tx) => {
              const categoryName = tx.category?.name || tx.note || 'Expense';
              return (
                <Pressable
                  key={`expense-${tx.id}`}
                  onPress={() =>
                    router.push({
                      pathname: '/detail',
                      params: {
                        type: 'expense',
                        id: String(tx.id),
                        title: tx.note || categoryName,
                        amount: formatCurrency(tx.amount),
                        category: categoryName,
                        note: tx.note ?? '',
                      },
                    })
                  }
                  style={({ pressed }) => ({
                    backgroundColor: colors.background,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderLeftWidth: 3.5,
                    borderLeftColor: colors.money,
                    borderRadius: 8,
                    paddingVertical: 7,
                    paddingHorizontal: 10,
                    marginBottom: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    opacity: pressed ? 0.85 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={`Expense: ${formatCurrency(tx.amount)}`}
                >
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text
                      style={{
                        fontSize: 12.5,
                        fontWeight: '500',
                        color: colors.text,
                      }}
                      numberOfLines={1}
                    >
                      {tx.note || categoryName}
                    </Text>
                    {tx.category?.name && tx.note ? (
                      <Text
                        style={{
                          fontSize: 10,
                          color: colors['text-muted'],
                          marginTop: 1,
                        }}
                        numberOfLines={1}
                      >
                        {tx.category.name}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={{
                      backgroundColor: 'rgba(232, 201, 155, 0.3)',
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 9999,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: '600',
                        color: colors['on-money'],
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {formatCurrency(tx.amount)}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

export default MonthCalendarView;
