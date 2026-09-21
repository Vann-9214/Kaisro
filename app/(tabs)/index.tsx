import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
  LayoutChangeEvent,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Calendar as CalendarIcon,
  CalendarDays,
  Plus,
} from 'lucide-react-native';
import { useUIStore } from '@/store/useUIStore';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Checkbox } from '@/components/ui/Checkbox';
import { TopBar } from '@/components/ui/TopBar';
import { DayNumber } from '@/components/ui/DayNumber';
import { useCalendarDay } from '@/hooks/useCalendarDay';
import { useWeekDots } from '@/hooks/useWeekDots';
import {
  WEEK_STARTS_ON_MONDAY,
  formatDateToISO,
  parseISODate,
  getWeekDays,
  shiftDateByDays,
  MONTH_NAMES,
  getWeekNumberOfDate,
  getOrdinalWeekLabel,
} from '@/utils/dateUtils';
import {
  START_HOUR,
  END_HOUR,
  HOUR_HEIGHT,
  COLLISION_THRESHOLD_PX,
  isHourLabelColliding,
  computeUnifiedTimelineLayout,
  formatTimeDisplay,
  formatTimeRange,
  parseTimeFromISO,
} from '@/utils/timelineLayout';
import { useNowStore, useNowTimer } from '@/store/useNowStore';
import { formatCurrency } from '@/constants/currency';
import { colors } from '@/constants/theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { calculateTimelineScrollTarget } from '@/utils/timelineLayout';

interface NowLineProps {
  isToday: boolean;
}

/**
 * Isolated NowLine component with self-contained minute timer via useNowTimer.
 * Prevents re-rendering the entire Day View timeline every minute.
 *
 * Layout:
 * - 2dp primary line continues across timeline from pill, behind cards layer (zIndex: 5).
 * - 10dp filled primary dot with 2dp ring in background color, centered exactly on the spine (left: 60).
 * - Pill lives strictly in the left gutter (left: -12, width: 65, right-aligned to 53) at zIndex: 30.
 * - Primary text on light tint of primary (~12% opacity / rgba(58, 74, 122, 0.12)), fully rounded.
 */
const NowLine = React.memo(function NowLine({ isToday }: NowLineProps) {
  useNowTimer(isToday);

  const hours = useNowStore((s) => s.hours);
  const nowLineTop = useNowStore((s) => s.nowLineTop);
  const nowFormattedTime = useNowStore((s) => s.nowFormattedTime);

  if (!isToday) return null;
  if (hours < START_HOUR || hours >= END_HOUR) return null;

  return (
    <>
      {/* 1. 2dp Primary Line across full timeline width: behind cards layer at zIndex: 5 */}
      <View
        style={{
          position: 'absolute',
          top: nowLineTop,
          left: 60,
          right: 0,
          height: 2,
          backgroundColor: colors.primary,
          zIndex: 5,
          pointerEvents: 'none',
        }}
      />

      {/* 2. Gutter Pill and Spine Bead at zIndex: 30 */}
      <View
        style={{
          position: 'absolute',
          top: nowLineTop,
          left: 0,
          right: 0,
          zIndex: 30,
          pointerEvents: 'none',
        }}
      >
        {/* Current Time Pill: right-aligned in gutter (ends at 53px, 2px gap before spine dot at 55px) */}
        <View
          style={{
            position: 'absolute',
            left: -22,
            width: 75,
            alignItems: 'flex-end',
            justifyContent: 'center',
            top: -10,
            height: 20,
          }}
        >
          <View
            style={{
              backgroundColor: 'rgba(58, 74, 122, 0.12)',
              borderRadius: 9999,
              paddingHorizontal: 6,
              paddingVertical: 2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="clip"
              maxFontSizeMultiplier={1.1}
              style={{
                color: colors.primary,
                fontSize: 10.5,
                fontWeight: '500',
                lineHeight: 14,
                fontVariant: ['tabular-nums'],
              }}
              className="tabular-nums"
            >
              {nowFormattedTime}
            </Text>
          </View>
        </View>

        {/* 10dp filled primary dot with 2dp ring in background color, centered exactly on spine at 60 */}
        <View
          style={{
            position: 'absolute',
            left: 55,
            top: -4,
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: colors.primary,
            borderWidth: 2,
            borderColor: colors.background,
          }}
        />
      </View>
    </>
  );
});

interface TimelineHourRowProps {
  slot: { hour: number; label: string; top: number };
  isToday: boolean;
}

/**
 * Isolated hour row component.
 * Uses a fine-grained Zustand selector to detect if this specific hour label collides
 * with the live "now" indicator (distance < 16px in pixel space).
 * Re-renders ONLY when its own collision status changes, preventing timeline jitter.
 */
const TimelineHourRow = React.memo(function TimelineHourRow({
  slot,
  isToday,
}: TimelineHourRowProps) {
  const isColliding = useNowStore(
    useCallback(
      (state) =>
        isToday &&
        isHourLabelColliding(state.nowLineTop, slot.top, COLLISION_THRESHOLD_PX),
      [isToday, slot.top]
    )
  );

  return (
    <View
      style={{
        position: 'absolute',
        top: slot.top,
        left: 0,
        right: 0,
        height: HOUR_HEIGHT,
        pointerEvents: 'none',
      }}
    >
      {/* Hour Label - Hidden (opacity: 0) when within 16px of now indicator to prevent text overlap */}
      <Text
        numberOfLines={1}
        ellipsizeMode="clip"
        maxFontSizeMultiplier={1.1}
        style={{
          position: 'absolute',
          left: -18,
          top: -7,
          width: 74,
          textAlign: 'right',
          opacity: isColliding ? 0 : 1,
          fontSize: 11.5,
          color: colors['text-muted'],
          fontVariant: ['tabular-nums'],
        }}
        className="font-medium tabular-nums"
      >
        {slot.label}
      </Text>

      {/* Tick Bead on Spine at 60 */}
      <View
        style={{
          position: 'absolute',
          left: 58,
          top: 0,
          width: 5,
          height: 1,
          backgroundColor: colors.border,
        }}
      />

      {/* Horizontal Guideline */}
      <View
        style={{
          position: 'absolute',
          left: 68,
          right: 0,
          top: 0,
          height: 1,
          backgroundColor:
            slot.hour === END_HOUR
              ? colors.border
              : 'rgba(226, 222, 215, 0.4)',
        }}
      />

      {/* 30-Minute Half-Hour Ghost Line & Spine Tick */}
      {slot.hour < END_HOUR && (
        <>
          {/* Subtle Half-Hour Spine Tick */}
          <View
            style={{
              position: 'absolute',
              left: 59,
              top: Math.round(HOUR_HEIGHT / 2),
              width: 3,
              height: 1,
              backgroundColor: 'rgba(226, 222, 215, 0.45)',
            }}
          />

          {/* Half-Hour Ghost Guideline across timeline */}
          <View
            style={{
              position: 'absolute',
              left: 68,
              right: 0,
              top: Math.round(HOUR_HEIGHT / 2),
              height: 1,
              backgroundColor: 'rgba(226, 222, 215, 0.22)',
            }}
          />
        </>
      )}
    </View>
  );
});

function getTodayDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = (now.getMonth() + 1).toString().padStart(2, '0');
  const d = now.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const timelineOffsetYRef = useRef<number>(140);
  const viewportHeightRef = useRef<number>(600);
  const contentHeightRef = useRef<number>(2000);
  const hasInitialScrolledRef = useRef<boolean>(false);
  const currentScrolledDateRef = useRef<string | null>(null);

  // Today's local date string
  const todayStr = useMemo(() => getTodayDateStr(), []);

  // Selected date (the 1 true click on a date) and viewedDate (the week currently in view)
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const viewedDate = useUIStore((s) => s.viewedDate);
  const setViewedDate = useUIStore((s) => s.setViewedDate);
  const openAddSheet = useUIStore((s) => s.openAddSheet);

  // Viewed date parsed as local Date object (controls visible week strip and header month/year/week)
  const viewedDateObj = useMemo(() => parseISODate(viewedDate), [viewedDate]);

  // Initial native scroll offset (defaults to 0 so summary card and empty banner are visible on empty days)
  const [initialScrollY] = useState(0);

  // Collapsible All-day & untimed section toggle
  const [isUntimedExpanded, setIsUntimedExpanded] = useState<boolean>(true);

  // Active view switcher tab ('Day' is active, others are disabled placeholders)
  const [activeView] = useState<'Month' | 'Week' | 'Day' | 'Agenda'>('Day');

  // Generate the 7-day week strip for the currently viewed week (pure projection, Mon to Sun)
  const weekDays = useMemo(() => {
    return getWeekDays(viewedDateObj, WEEK_STARTS_ON_MONDAY, todayStr);
  }, [viewedDateObj, todayStr]);

  const weekDateStrs = useMemo(() => {
    return weekDays.map((d) => d.dateStr);
  }, [weekDays]);

  // Computed indicator dots for the 7 visible days across month boundaries
  const weekDotsMap = useWeekDots(weekDateStrs);

  // In Day View, activeDateStr is selectedDate ONLY if it falls in the viewed week.
  // There is NO fallback to today or any other day. If none is selected in this week, it is null.
  const isSelectedInViewedWeek = weekDays.some((d) => d.dateStr === selectedDate);
  const activeDateStr = isSelectedInViewedWeek ? selectedDate : null;

  const isViewingToday = activeDateStr === todayStr;

  // Hook fetching data and managing tasks in SQLite (or empty when activeDateStr is null)
  const {
    events,
    tasks,
    transactions,
    summary,
    allDayEvents,
    timedEvents,
    untimedTasks,
    timedTasks,
    timedTransactions,
    toggleTask,
    isLoading,
  } = useCalendarDay(activeDateStr);

  // Check if day is completely empty of any items
  const isDayEmpty =
    !isLoading &&
    allDayEvents.length === 0 &&
    timedEvents.length === 0 &&
    tasks.length === 0 &&
    transactions.length === 0;

  // Month Name & Year for the viewed week (guaranteed never to disappear or drift)
  const monthName = MONTH_NAMES[viewedDateObj.getMonth()] ?? 'September';
  const yearStr = String(viewedDateObj.getFullYear());

  // Ordinal week label within the month for the viewed week (e.g. "1ST WEEK", "4TH WEEK", "5TH WEEK")
  const ordinalWeekLabel = useMemo(() => {
    return getOrdinalWeekLabel(getWeekNumberOfDate(viewedDateObj, WEEK_STARTS_ON_MONDAY));
  }, [viewedDateObj]);

  // Navigate to previous week: changes viewedDate ONLY without selecting or auto-clicking any date
  const handlePrevWeek = () => {
    setViewedDate(shiftDateByDays(viewedDate, -7));
  };

  // Navigate to next week: changes viewedDate ONLY without selecting or auto-clicking any date
  const handleNextWeek = () => {
    setViewedDate(shiftDateByDays(viewedDate, 7));
  };

  // Jump to today: sets selectedDate and viewedDate to today, and scrolls timeline
  const handleJumpToToday = useCallback(() => {
    setSelectedDate(todayStr);

    const now = parseISODate(todayStr);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const targetY = calculateTimelineScrollTarget({
      dateStr: todayStr,
      todayStr,
      timelineOffsetY: timelineOffsetYRef.current,
      viewportHeight: viewportHeightRef.current,
      contentHeight: contentHeightRef.current,
      nowMinutes,
      isEmpty: isDayEmpty,
    });
    scrollViewRef.current?.scrollTo({ y: targetY, animated: true });
  }, [todayStr, isDayEmpty, setSelectedDate]);

  // Tap a day slot in the week strip: this is the 1 TRUE CLICK on a date
  const handlePressDay = (dateStr: string) => {
    setSelectedDate(dateStr);
  };

  // Compute timeline layout for timed items (events, tasks, expenses)
  const timelineItems = useMemo(() => {
    if (!activeDateStr) return [];
    return computeUnifiedTimelineLayout(
      timedEvents,
      timedTasks,
      timedTransactions,
      START_HOUR,
      HOUR_HEIGHT,
      activeDateStr
    );
  }, [timedEvents, timedTasks, timedTransactions, activeDateStr]);

  // Unified scroll target calculation & dispatch
  const applyScroll = useCallback(
    (targetDate?: string | null) => {
      const dateToScroll = targetDate ?? activeDateStr ?? todayStr;
      const earliestItemTop =
        timelineItems.length > 0
          ? Math.min(...timelineItems.map((it) => it.top))
          : null;

      const targetY = calculateTimelineScrollTarget({
        dateStr: dateToScroll,
        todayStr,
        timelineOffsetY: timelineOffsetYRef.current,
        viewportHeight: viewportHeightRef.current,
        contentHeight: contentHeightRef.current,
        earliestItemTop,
        isEmpty: activeDateStr === null || isDayEmpty,
      });

      scrollViewRef.current?.scrollTo({ y: targetY, animated: false });
      currentScrolledDateRef.current = dateToScroll;
      hasInitialScrolledRef.current = true;
    },
    [activeDateStr, todayStr, timelineItems, isDayEmpty]
  );

  // When activeDateStr changes, immediately re-align scroll target
  useEffect(() => {
    if (hasInitialScrolledRef.current && currentScrolledDateRef.current !== activeDateStr) {
      applyScroll(activeDateStr);
    }
  }, [activeDateStr, applyScroll]);

  // When day data finishes loading, apply scroll alignment
  useEffect(() => {
    if (!isLoading) {
      applyScroll(activeDateStr);
    }
  }, [isLoading, activeDateStr, applyScroll]);

  // Hours array for timeline grid (0 AM / 12:00 AM to 24 / 12:00 AM closing line)
  const timelineHours = useMemo(() => {
    const hours: { hour: number; label: string; top: number }[] = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      hours.push({
        hour: h,
        label: formatTimeDisplay(h, 0),
        top: (h - START_HOUR) * HOUR_HEIGHT,
      });
    }
    return hours;
  }, []);

  const totalTimelineHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT + 14;

  // Minimal bottom padding so scrolling stops cleanly on the 12:00 AM closing line without empty white space
  const bottomScrollPadding = 10;

  return (
    <View className="flex-1 bg-background">
      {/* 1. Reusable TopBar with Kaisro branding, separator, title and avatar button */}
      <TopBar featureName="Calendar" />

      {/* 2. Calendar Header Section: Title Row, View Switcher & Week Strip */}
      <View className="px-5 pt-1 pb-2.5 bg-background border-b border-border">
        {/* Title Row: Month & Year, Week Badge, and Navigation Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          {/* Left Title Area: Month & Year on row 1, Week Badge on row 2 to guarantee Year never clips */}
          <View style={{ flex: 1, flexShrink: 1, marginRight: 8, justifyContent: 'center' }}>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.2}
              style={{
                fontSize: 20,
                fontWeight: '600',
                color: colors.text,
                letterSpacing: -0.3,
              }}
            >
              {monthName} {yearStr}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
              <View
                style={{
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 7,
                  paddingVertical: 1.5,
                  borderRadius: 9999,
                }}
              >
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  style={{
                    fontSize: 10,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                    color: colors['text-muted'],
                    textTransform: 'uppercase',
                  }}
                >
                  {ordinalWeekLabel}
                </Text>
              </View>
            </View>
          </View>

          {/* Navigation Buttons: fixed 40dp circles, 8dp spacing, hitSlop for touch target */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* Round Today Button: jumps back to today and scrolls timeline to now (or top if empty) */}
            <Pressable
              onPress={handleJumpToToday}
              disabled={isViewingToday}
              hitSlop={6}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: isViewingToday ? 'transparent' : colors.surface,
                opacity: isViewingToday ? 0.35 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel="Jump to today"
              accessibilityState={{ disabled: isViewingToday }}
            >
              <CalendarDays
                size={18}
                color={isViewingToday ? colors['text-muted'] : colors.text}
              />
            </Pressable>

            {/* Previous Week Button */}
            <Pressable
              onPress={handlePrevWeek}
              hitSlop={6}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              }}
              accessibilityRole="button"
              accessibilityLabel="Previous week"
            >
              <ChevronLeft size={18} color={colors.text} />
            </Pressable>

            {/* Next Week Button */}
            <Pressable
              onPress={handleNextWeek}
              hitSlop={6}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
              }}
              accessibilityRole="button"
              accessibilityLabel="Next week"
            >
              <ChevronRight size={18} color={colors.text} />
            </Pressable>
          </View>
        </View>

        {/* View Switcher: Segmented Control (Month / Week / Day / Agenda) styled to Stitch */}
        <View className="flex-row bg-background border border-border rounded-full p-1 items-center mb-3">
          {(['Month', 'Week', 'Day', 'Agenda'] as const).map((viewName) => {
            const isSelected = viewName === activeView;
            return (
              <Pressable
                key={viewName}
                disabled={!isSelected}
                className={`flex-1 py-1 px-2.5 rounded-full items-center justify-center ${
                  isSelected ? 'bg-surface shadow-none' : 'bg-transparent opacity-60'
                }`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: !isSelected }}
              >
                <Text
                  className={`text-xs font-medium ${
                    isSelected ? 'text-text' : 'text-text-muted'
                  }`}
                >
                  {viewName}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Week Strip inside Rounded Surface Card */}
        <View className="bg-surface border border-border rounded-xl p-2 mb-1">
          <View className="flex-row items-center justify-between">
            {weekDays.map((item) => {
              const dayDateStr = item.dateStr;
              const isSelected = activeDateStr !== null && dayDateStr === activeDateStr;
              const dots = weekDotsMap[dayDateStr];
              const hasAnyDots = dots && (dots.hasEvents || dots.hasTasks || dots.hasExpenses);

              return (
                <Pressable
                  key={dayDateStr}
                  onPress={() => handlePressDay(dayDateStr)}
                  android_ripple={null}
                  style={{ minWidth: 44, minHeight: 44 }}
                  className="items-center justify-center flex-1 py-1"
                  accessibilityRole="button"
                  accessibilityLabel={`${item.dayAbbr}, ${item.dayNum}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  {/* Day abbreviation (Mon, Tue, ..., Sun) */}
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '500',
                      marginBottom: 4,
                      color: isSelected
                        ? colors.primary
                        : colors['text-muted'],
                      opacity: !isSelected && item.isWeekend ? 0.7 : 1,
                    }}
                  >
                    {item.dayAbbr}
                  </Text>

                  {/* Shared circular DayNumber badge */}
                  <DayNumber
                    dayNum={item.dayNum}
                    isSelected={isSelected}
                    isToday={item.isToday}
                    isWeekend={item.isWeekend}
                  />

                  {/* Up to 3 colored indicator dots (~5dp circles) */}
                  <View style={{ height: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                    {hasAnyDots ? (
                      <>
                        {dots.hasEvents && (
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 2.5,
                              backgroundColor: colors.primary,
                            }}
                          />
                        )}
                        {dots.hasTasks && (
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 2.5,
                              backgroundColor: colors.tasks,
                            }}
                          />
                        )}
                        {dots.hasExpenses && (
                          <View
                            style={{
                              width: 5,
                              height: 5,
                              borderRadius: 2.5,
                              backgroundColor: colors['on-money'],
                            }}
                          />
                        )}
                      </>
                    ) : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {/* Main Scrollable Day Canvas */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1 px-5 pt-3"
        contentOffset={{ x: 0, y: initialScrollY }}
        onLayout={(e) => {
          viewportHeightRef.current = e.nativeEvent.layout.height;
          if (!hasInitialScrolledRef.current) {
            applyScroll();
          }
        }}
        onContentSizeChange={(_w, h) => {
          contentHeightRef.current = h;
          if (!hasInitialScrolledRef.current) {
            applyScroll();
          }
        }}
        contentContainerStyle={{ paddingBottom: bottomScrollPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* 3. Day Summary Card */}
        {activeDateStr !== null && (
          <View className="bg-surface border border-border rounded-xl py-2.5 px-4 mb-3 flex-row items-center justify-center flex-wrap">
            {/* Events count preceded by primary dot */}
            <View className="flex-row items-center">
              <View
                className="w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: colors.primary }}
              />
              <Text className="text-xs font-semibold text-text tabular-nums">
                {summary.eventsCount} {summary.eventsCount === 1 ? 'event' : 'events'}
              </Text>
            </View>

            <Text className="text-xs text-text-muted mx-2">·</Text>

            {/* Tasks left count preceded by tasks dot */}
            <View className="flex-row items-center">
              <View
                className="w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: colors.tasks }}
              />
              <Text className="text-xs font-semibold text-text tabular-nums">
                {summary.totalTasksCount === 0
                  ? '0 tasks left'
                  : `${summary.tasksLeftCount} of ${summary.totalTasksCount} tasks left`}
              </Text>
            </View>

            <Text className="text-xs text-text-muted mx-2">·</Text>

            {/* Spent count preceded by deep amber dot */}
            <View className="flex-row items-center">
              <View
                className="w-2 h-2 rounded-full mr-1.5"
                style={{ backgroundColor: colors['on-money'] }}
              />
              <Text className="text-xs font-semibold text-text tabular-nums">
                {formatCurrency(summary.totalSpentCentavos, summary.totalSpentCentavos % 100 !== 0)}{' '}
                spent
              </Text>
            </View>
          </View>
        )}

        {/* 4. Collapsible "All-day & untimed" Section (shown when day has items) */}
        {activeDateStr !== null && !isDayEmpty && (
          <View className="mb-4">
            <Pressable
              onPress={() => setIsUntimedExpanded((prev) => !prev)}
              className="flex-row items-center justify-between py-1.5 mb-1.5"
              accessibilityRole="button"
              accessibilityLabel="Toggle all-day and untimed items"
            >
              <View className="flex-row items-center">
                {isUntimedExpanded ? (
                  <ChevronDown size={16} color={colors['text-muted']} />
                ) : (
                  <ChevronRight size={16} color={colors['text-muted']} />
                )}
                <Text className="ml-1.5 text-xs font-medium text-text-muted uppercase tracking-wider">
                  All-day & untimed
                </Text>
              </View>
              <Chip
                label={String(allDayEvents.length + untimedTasks.length)}
                variant="default"
                size="sm"
              />
            </Pressable>

            {isUntimedExpanded && (
              <View className="space-y-2">
                {allDayEvents.length === 0 && untimedTasks.length === 0 && (
                  <Text className="text-xs text-text-muted italic py-1">
                    No all-day or untimed items for this day
                  </Text>
                )}

                {/* All-Day Events */}
                {allDayEvents.map((ev) => (
                  <Pressable
                    key={`allday-${ev.id}`}
                    onPress={() => openAddSheet('event', ev, activeDateStr)}
                    className="bg-surface border border-border border-l-4 border-l-primary rounded-lg p-2.5 mb-1.5 flex-row items-center justify-between"
                    accessibilityRole="button"
                    accessibilityLabel={`Edit event: ${ev.title}`}
                  >
                    <View className="flex-1 mr-2">
                      <Text className="text-xs font-medium text-text leading-4">{ev.title}</Text>
                      {ev.location && (
                        <View className="flex-row items-center mt-1">
                          <MapPin size={11} color={colors['text-muted']} />
                          <Text className="ml-1 text-[10px] text-text-muted">{ev.location}</Text>
                        </View>
                      )}
                    </View>
                    <Chip label="All day" variant="primary" size="sm" />
                  </Pressable>
                ))}

                {/* Untimed Tasks */}
                {untimedTasks.map((tsk) => (
                  <View
                    key={`untimed-${tsk.id}`}
                    className="bg-surface border border-border border-l-4 border-l-tasks rounded-lg px-3 py-1.5 mb-1.5 flex-row items-center justify-between"
                  >
                    <View className="flex-1 mr-2">
                      <Checkbox
                        checked={Boolean(tsk.done)}
                        onToggle={() => toggleTask(tsk.id, Boolean(tsk.done))}
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
          </View>
        )}

        {/* 5. Inline Empty State Banner: placed between week strip and timeline as normal layout element */}
        {activeDateStr === null ? (
          <EmptyState
            variant="inline"
            title="No day selected"
            description="Select a day from the week above to view its timeline."
            actionLabel="+ Add an event"
            onAction={() => openAddSheet('event', null, weekDays[0]?.dateStr ?? todayStr)}
            style={{ marginBottom: 12 }}
          />
        ) : isDayEmpty ? (
          <EmptyState
            variant="inline"
            title="Nothing planned today"
            description="Your canvas is completely open for focused calm."
            actionLabel="+ Add an event"
            onAction={() => openAddSheet('event', null, activeDateStr)}
            style={{ marginBottom: 12 }}
          />
        ) : null}

        {/* 6. Vertical Hourly Timeline */}
        <View
          className="mb-0"
          onLayout={(e) => {
            timelineOffsetYRef.current = e.nativeEvent.layout.y;
          }}
        >
          <Text className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">
            Timeline
          </Text>

          {isLoading ? (
            <View className="py-12 items-center justify-center">
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : (
            <View style={{ height: totalTimelineHeight, position: 'relative' }}>
              {/* Unbroken Vertical Spine Track ending at midnight closing line (spine at 60) */}
              <View
                style={{
                  position: 'absolute',
                  left: 60,
                  top: 0,
                  height: (END_HOUR - START_HOUR) * HOUR_HEIGHT,
                  width: 1,
                  backgroundColor: colors.border,
                  zIndex: 0,
                }}
              />

              {/* Hourly Grid Rows and Labels (with auto-hiding colliding labels) */}
              {timelineHours.map((slot) => (
                <TimelineHourRow
                  key={slot.hour}
                  slot={slot}
                  isToday={isViewingToday}
                />
              ))}

              {/* Dynamic Live "Now" Line */}
              <NowLine isToday={isViewingToday} />

              {/* Timed Entries Layer (Events, Tasks, Expenses) */}
              <View
                style={{
                  position: 'absolute',
                  left: 70,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  zIndex: 10,
                }}
              >
                {timelineItems.map((item) => {
                  const widthPercent = 100 / item.totalCols;
                  const leftPercent = item.colIndex * widthPercent;

                  // 5A. Event Card (Primary tint with side-by-side overlap)
                  if (item.type === 'event' && item.event) {
                    const ev = item.event;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => openAddSheet('event', ev, selectedDate)}
                        style={{
                          position: 'absolute',
                          top: item.top,
                          height: item.height,
                          left: `${leftPercent}%`,
                          width: `${widthPercent - 1.5}%`,
                        }}
                        className="bg-surface border border-border border-l-4 border-l-primary rounded-lg p-2 justify-between active:opacity-90 overflow-hidden"
                        accessibilityRole="button"
                        accessibilityLabel={`Edit event: ${ev.title}`}
                      >
                        <View className="flex-1">
                          <Text
                            className="text-xs font-medium text-text leading-4"
                            numberOfLines={item.height > 50 ? 2 : 1}
                          >
                            {ev.title}
                          </Text>
                          {item.height > 44 && (
                            <Text className="text-[10px] text-text-muted tabular-nums mt-0.5">
                              {formatTimeRange(ev.start, ev.end)}
                            </Text>
                          )}
                        </View>
                        {item.height > 60 && ev.location && (
                          <View className="flex-row items-center mt-1">
                            <MapPin size={10} color={colors['text-muted']} />
                            <Text
                              className="ml-1 text-[10px] text-text-muted truncate"
                              numberOfLines={1}
                            >
                              {ev.location}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  }

                  // 5B. Timed Task (Tasks color with serene circular checkbox)
                  if (item.type === 'task' && item.task) {
                    const tsk = item.task;
                    const dueTime = parseTimeFromISO(tsk.dueAt);
                    const formattedDue = dueTime
                      ? formatTimeDisplay(dueTime.hour, dueTime.minute)
                      : '';

                    return (
                      <View
                        key={item.id}
                        style={{
                          position: 'absolute',
                          top: item.top,
                          height: item.height,
                          left: `${leftPercent}%`,
                          width: `${widthPercent - 1.5}%`,
                        }}
                        className="bg-surface border border-border border-l-4 border-l-tasks rounded-lg px-2 py-1 flex-row items-center justify-between overflow-hidden"
                      >
                        <View className="flex-1 flex-row items-center mr-1">
                          <Checkbox
                            checked={Boolean(tsk.done)}
                            onToggle={() => toggleTask(tsk.id, Boolean(tsk.done))}
                          />
                          <Text
                            className={`ml-2 text-xs font-medium ${
                              tsk.done ? 'text-text-muted line-through' : 'text-text'
                            } flex-1`}
                            numberOfLines={1}
                          >
                            {tsk.title}
                          </Text>
                        </View>
                        {formattedDue ? (
                          <Text className="text-[10px] text-text-muted tabular-nums">
                            {formattedDue}
                          </Text>
                        ) : null}
                      </View>
                    );
                  }

                  // 5C. Timed Expense (Money-color pill with amount and category)
                  if (item.type === 'expense' && item.transaction) {
                    const tx = item.transaction;
                    const txTime = parseTimeFromISO(tx.date);
                    const categoryName = tx.category?.name || tx.note || 'Expense';

                    return (
                      <Pressable
                        key={item.id}
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
                        style={{
                          position: 'absolute',
                          top: item.top,
                          height: item.height,
                          left: `${leftPercent}%`,
                          width: `${widthPercent - 1.5}%`,
                        }}
                        className="bg-surface border border-money rounded-full px-3 py-1 flex-row items-center justify-between active:opacity-90 overflow-hidden"
                        accessibilityRole="button"
                        accessibilityLabel={`Expense: ${formatCurrency(tx.amount)}`}
                      >
                        <Text className="text-xs font-semibold text-on-money tabular-nums">
                          {formatCurrency(tx.amount)}
                        </Text>
                        <Text className="text-[10px] text-text-muted truncate ml-1 flex-1 text-right" numberOfLines={1}>
                          {categoryName}
                        </Text>
                      </Pressable>
                    );
                  }

                  return null;
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
