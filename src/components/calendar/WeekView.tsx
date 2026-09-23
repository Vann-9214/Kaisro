import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/constants/theme';
import { formatCurrency } from '@/constants/currency';
import { EmptyState } from '@/components/ui/EmptyState';
import { useCalendarWeekView, WeekData } from '@/hooks/useCalendarWeekView';
import { WeekOverviewStrip } from '@/components/calendar/WeekOverviewStrip';
import { WeekCard } from '@/components/calendar/WeekCard';
import { useUIStore } from '@/store/useUIStore';
import { Event, Task, Transaction } from '@/db/schema';
import { formatDateToISO, parseISODate } from '@/utils/dateUtils';

interface WeekViewProps {
  year: number;
  month: number; // 0 to 11
  todayStr: string;
  onNavigateToDay: (dateStr: string) => void;
  scrollTrigger?: number; // Incremented when "today" button is pressed
}

export function WeekView({
  year,
  month,
  todayStr,
  onNavigateToDay,
  scrollTrigger = 0,
}: WeekViewProps) {
  const flatListRef = useRef<FlatList<WeekData>>(null);
  const openAddSheet = useUIStore((s) => s.openAddSheet);

  const { weeks, isLoading, isMonthEmpty, toggleTask } = useCalendarWeekView(
    year,
    month,
    todayStr
  );

  // Find index of current week (if in viewed month)
  const currentWeekIndex = useMemo(() => {
    return weeks.findIndex((w) => w.info.isCurrentWeek);
  }, [weeks]);

  // Local expansion state: Record<weekIndex, boolean>
  // Current week starts expanded (if in visible month), all others collapsed.
  // Resets when month changes.
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (weeks.length === 0) return;
    const initialExpanded: Record<number, boolean> = {};
    weeks.forEach((w, idx) => {
      // Current week starts expanded, others collapsed
      initialExpanded[idx] = w.info.isCurrentWeek;
    });
    setExpandedWeeks(initialExpanded);
  }, [year, month, weeks.length]);

  const toggleWeekExpansion = useCallback((index: number) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }, []);

  // Safe scroll to week index
  const scrollToWeek = useCallback((index: number, animated = true) => {
    if (index < 0 || index >= weeks.length) return;
    try {
      flatListRef.current?.scrollToIndex({
        index,
        animated,
        viewPosition: 0,
      });
    } catch {
      // Fallback for unmeasured layouts
      flatListRef.current?.scrollToOffset({
        offset: index * 260,
        animated,
      });
    }
  }, [weeks.length]);

  // Initial scroll position: lands on the current week's card (Week 38) when screen first opens
  const hasInitiallyScrolledRef = useRef<boolean>(false);

  useEffect(() => {
    hasInitiallyScrolledRef.current = false;
  }, [year, month]);

  useEffect(() => {
    if (!isLoading && weeks.length > 0 && !hasInitiallyScrolledRef.current) {
      hasInitiallyScrolledRef.current = true;
      if (currentWeekIndex >= 0) {
        // Small delay to ensure FlatList layout measurement
        setTimeout(() => {
          scrollToWeek(currentWeekIndex, false);
        }, 80);
      }
    }
  }, [isLoading, weeks.length, currentWeekIndex, scrollToWeek]);

  // Scroll to current week when scrollTrigger increments (e.g. today button pressed)
  useEffect(() => {
    if (scrollTrigger > 0 && currentWeekIndex >= 0) {
      scrollToWeek(currentWeekIndex, true);
    }
  }, [scrollTrigger, currentWeekIndex, scrollToWeek]);

  // Handlers for item interactions
  const handlePressDay = useCallback(
    (dateStr: string) => {
      onNavigateToDay(dateStr);
    },
    [onNavigateToDay]
  );

  const handlePressEvent = useCallback(
    (event: Event, dateStr: string) => {
      openAddSheet('event', event, dateStr);
    },
    [openAddSheet]
  );

  const handlePressTask = useCallback(
    (task: Task) => {
      openAddSheet('task', task);
    },
    [openAddSheet]
  );

  const handlePressExpense = useCallback(
    (tx: Transaction & { category?: { name?: string } | null }) => {
      const categoryName = tx.category?.name || 'Expense';
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
      });
    },
    []
  );

  // Default date for empty-month "Add an event" button:
  // Today if in month, otherwise the first day of the month
  const emptyMonthAddDateStr = useMemo(() => {
    const todayDate = parseISODate(todayStr);
    if (todayDate.getFullYear() === year && todayDate.getMonth() === month) {
      return todayStr;
    }
    const firstDay = new Date(year, month, 1);
    return formatDateToISO(firstDay);
  }, [year, month, todayStr]);

  if (isLoading && weeks.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 64 }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList<WeekData>
      ref={flatListRef}
      data={weeks}
      keyExtractor={(item) => `week-${item.info.isoWeekNumber}-${item.info.startDateStr}`}
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 110, // Clears tab bar and floating action button
      }}
      showsVerticalScrollIndicator={false}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: info.index * 260,
            animated: true,
          });
        }, 100);
      }}
      ListHeaderComponent={
        <View>
          {/* 1. Weeks Overview Activity Strip */}
          <WeekOverviewStrip weeks={weeks} onSelectWeek={(idx) => scrollToWeek(idx, true)} />

          {/* 2. Inline EmptyState Banner when whole visible month is empty */}
          {isMonthEmpty && !isLoading && (
            <EmptyState
              variant="inline"
              title="Nothing planned this month"
              description="Your schedule is completely clear for focused work."
              actionLabel="+ Add an event"
              onAction={() => openAddSheet('event', null, emptyMonthAddDateStr)}
              style={{ marginBottom: 12 }}
            />
          )}
        </View>
      }
      renderItem={({ item, index }) => (
        <WeekCard
          week={item}
          isExpanded={Boolean(expandedWeeks[index])}
          onToggleExpand={() => toggleWeekExpansion(index)}
          onPressDay={handlePressDay}
          onToggleTask={toggleTask}
          onPressEvent={handlePressEvent}
          onPressTask={handlePressTask}
          onPressExpense={handlePressExpense}
        />
      )}
    />
  );
}

export default WeekView;
