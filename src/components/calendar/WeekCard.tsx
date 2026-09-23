import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown, ChevronUp, MapPin } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { formatCurrency } from '@/constants/currency';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { WeekData, WeekItemRow } from '@/hooks/useCalendarWeekView';
import { Event, Task, Transaction } from '@/db/schema';
import { parseISODate } from '@/utils/dateUtils';

interface WeekCardProps {
  week: WeekData;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onPressDay: (dateStr: string) => void;
  onToggleTask: (taskId: number, currentDone: boolean) => void;
  onPressEvent: (event: Event, dateStr: string) => void;
  onPressTask: (task: Task) => void;
  onPressExpense: (tx: Transaction) => void;
}

const FULL_DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function formatDayHeader(dateStr: string): string {
  const d = parseISODate(dateStr);
  const dayName = FULL_DAY_NAMES[d.getDay()] ?? '';
  const monthName = SHORT_MONTHS[d.getMonth()] ?? '';
  return `${dayName}, ${monthName} ${d.getDate()}`;
}

export function WeekCard({
  week,
  isExpanded,
  onToggleExpand,
  onPressDay,
  onToggleTask,
  onPressEvent,
  onPressTask,
  onPressExpense,
}: WeekCardProps) {
  const [showAllItems, setShowAllItems] = useState<boolean>(false);

  const { info, eventsCount, tasksDoneCount, tasksTotalCount, totalSpentCentavos, items } = week;
  const isCurrent = info.isCurrentWeek;
  const isPast = info.isPastWeek;
  const isWeekEmpty = items.length === 0;

  // Group items by dayStr
  const itemsByDay = React.useMemo(() => {
    const grouped = new Map<string, WeekItemRow[]>();
    for (const item of items) {
      const existing = grouped.get(item.dayStr) ?? [];
      existing.push(item);
      grouped.set(item.dayStr, existing);
    }
    return grouped;
  }, [items]);

  // Collapsed preview copy: first 2 item titles and "+N more"
  const collapsedPreview = React.useMemo(() => {
    if (isWeekEmpty) return 'Nothing planned';
    const firstTwo = items.slice(0, 2).map((i) => i.title);
    const remainingCount = items.length - firstTwo.length;
    if (remainingCount > 0) {
      return `${firstTwo.join(', ')} · +${remainingCount} more`;
    }
    return firstTwo.join(', ');
  }, [items, isWeekEmpty]);

  // Displayed items count (cap at 6 unless showAllItems is true)
  const displayedItems = showAllItems ? items : items.slice(0, 6);
  const remainingHiddenCount = Math.max(0, items.length - 6);

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderColor: isCurrent ? colors.primary : colors.border,
        borderWidth: 1,
        borderRadius: 14,
        marginBottom: 12,
        opacity: isPast ? 0.85 : 1,
        overflow: 'hidden',
      }}
      accessibilityRole="none"
      accessibilityLabel={`${info.isoWeekLabel}, ${info.dateRangeLabel}`}
    >
      {/* 1. Week Card Header: week number, date range, "This week" badge, chevron */}
      <Pressable
        onPress={onToggleExpand}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 8,
        }}
        accessibilityRole="button"
        accessibilityLabel={`Toggle ${info.isoWeekLabel} expansion`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', flex: 1, marginRight: 8 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: isCurrent ? '700' : '600',
              color: isCurrent ? colors.primary : colors.text,
              marginRight: 6,
            }}
          >
            {info.isoWeekLabel}
          </Text>

          <Text
            style={{
              fontSize: 12,
              color: colors['text-muted'],
              marginRight: 8,
              fontVariant: ['tabular-nums'],
            }}
          >
            {info.dateRangeLabel}
          </Text>

          {isCurrent && (
            <Chip label="This week" variant="primary" size="sm" />
          )}
        </View>

        {/* Chevron icon */}
        <View style={{ padding: 4 }}>
          {isExpanded ? (
            <ChevronUp size={18} color={colors['text-muted']} />
          ) : (
            <ChevronDown size={18} color={colors['text-muted']} />
          )}
        </View>
      </Pressable>

      {/* 2. Stats Row: events, tasks done/total, spending */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 14,
          paddingBottom: 10,
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        {/* Events Stat */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.primary,
              marginRight: 4,
            }}
          />
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: '600',
              color: colors.text,
              fontVariant: ['tabular-nums'],
            }}
          >
            {eventsCount} {eventsCount === 1 ? 'event' : 'events'}
          </Text>
        </View>

        <Text style={{ fontSize: 11, color: colors['text-muted'] }}>·</Text>

        {/* Tasks Stat with Mini Progress Bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.tasks,
              marginRight: 4,
            }}
          />
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: '600',
              color: colors.text,
              fontVariant: ['tabular-nums'],
            }}
          >
            {tasksDoneCount}/{tasksTotalCount} tasks
          </Text>
          <View style={{ width: 34, marginLeft: 5 }}>
            <ProgressBar
              progress={tasksTotalCount > 0 ? tasksDoneCount / tasksTotalCount : 0}
              module="tasks"
              height={4}
            />
          </View>
        </View>

        <Text style={{ fontSize: 11, color: colors['text-muted'] }}>·</Text>

        {/* Spending Stat (expenses only) */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors['on-money'],
              marginRight: 4,
            }}
          />
          <Text
            style={{
              fontSize: 11.5,
              fontWeight: '600',
              color: colors.text,
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatCurrency(totalSpentCentavos, totalSpentCentavos % 100 !== 0)} spent
          </Text>
        </View>
      </View>

      {/* 3. Mini Day Strip: 7 cells (M, T, W, T, F, S, S) */}
      <View
        style={{
          borderTopWidth: 1,
          borderBottomWidth: isExpanded ? 1 : 0,
          borderColor: colors.border,
          backgroundColor: colors.background,
          flexDirection: 'row',
          paddingVertical: 6,
          paddingHorizontal: 6,
        }}
      >
        {info.days.map((dayItem, dIdx) => {
          const isToday = dayItem.isToday;
          const isBusiest = dIdx === week.busiestDayIndex;
          const isGhost = dayItem.isGhost;
          const dots = week.dotsMap[dayItem.dateStr];
          const hasAnyDots = !isGhost && dots && (dots.hasEvents || dots.hasTasks || dots.hasExpenses);

          return (
            <Pressable
              key={`mini-day-${dayItem.dateStr}-${dIdx}`}
              onPress={() => onPressDay(dayItem.dateStr)}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: isBusiest ? 'rgba(58, 74, 122, 0.08)' : 'transparent',
                opacity: isGhost ? 0.35 : 1,
              }}
              accessibilityRole="button"
              accessibilityLabel={`${dayItem.dayLetter}, ${dayItem.dayNum}`}
            >
              {/* Weekday Letter */}
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: isToday ? colors.primary : colors['text-muted'],
                  marginBottom: 2,
                }}
              >
                {dayItem.dayLetter}
              </Text>

              {/* Day Number */}
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: isToday ? 1.5 : 0,
                  borderColor: isToday ? colors.primary : 'transparent',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: isToday ? '700' : '500',
                    color: isToday ? colors.primary : colors.text,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {dayItem.dayNum}
                </Text>
              </View>

              {/* Indicator Dots (up to 3 dots: events, tasks, expenses) */}
              <View
                style={{
                  height: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  marginTop: 2,
                }}
              >
                {hasAnyDots ? (
                  <>
                    {dots.hasEvents && (
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: colors.primary,
                        }}
                      />
                    )}
                    {dots.hasTasks && (
                      <View
                        style={{
                          width: 4,
                          height: 4,
                          borderRadius: 2,
                          backgroundColor: colors.tasks,
                        }}
                      />
                    )}
                    {dots.hasExpenses && (
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
        })}
      </View>

      {/* 4. Collapsed preview row (if not expanded) */}
      {!isExpanded && (
        <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 11.5,
              color: isWeekEmpty ? colors['text-muted'] : colors.text,
              fontStyle: isWeekEmpty ? 'italic' : 'normal',
            }}
          >
            {collapsedPreview}
          </Text>
        </View>
      )}

      {/* 5. Expanded "What's inside" Section */}
      {isExpanded && (
        <View style={{ padding: 14 }}>
          {isWeekEmpty ? (
            <Text
              style={{
                fontSize: 12,
                color: colors['text-muted'],
                fontStyle: 'italic',
                paddingVertical: 6,
              }}
            >
              Nothing planned
            </Text>
          ) : (
            <View>
              {/* Group items by day */}
              {Array.from(itemsByDay.keys()).map((dayStr) => {
                const dayItems = itemsByDay.get(dayStr) ?? [];
                // Filter to only items that are in the displayed set
                const visibleDayItems = dayItems.filter((it) =>
                  displayedItems.some((displayed) => displayed.id === it.id)
                );

                if (visibleDayItems.length === 0) return null;

                return (
                  <View key={`group-${dayStr}`} style={{ marginBottom: 10 }}>
                    {/* Day Group Header */}
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '600',
                        color: colors['text-muted'],
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        marginBottom: 6,
                      }}
                    >
                      {formatDayHeader(dayStr)}
                    </Text>

                    {/* Item Rows */}
                    {visibleDayItems.map((item) => {
                      // 5A. Event Row
                      if (item.type === 'event' && item.event) {
                        const ev = item.event;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => onPressEvent(ev, item.dayStr)}
                            style={{
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderWidth: 1,
                              borderLeftWidth: 4,
                              borderLeftColor: colors.primary,
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              marginBottom: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Event: ${item.title}`}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text
                                numberOfLines={1}
                                style={{ fontSize: 12, fontWeight: '500', color: colors.text }}
                              >
                                {item.title}
                              </Text>
                              {item.subtitle ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                  <MapPin size={10} color={colors['text-muted']} />
                                  <Text
                                    numberOfLines={1}
                                    style={{
                                      fontSize: 10,
                                      color: colors['text-muted'],
                                      marginLeft: 3,
                                    }}
                                  >
                                    {item.subtitle}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            {item.isAllDay ? (
                              <Chip label="All day" variant="primary" size="sm" />
                            ) : null}
                          </Pressable>
                        );
                      }

                      // 5B. Task Row
                      if (item.type === 'task' && item.task) {
                        const tsk = item.task;
                        return (
                          <View
                            key={item.id}
                            style={{
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderWidth: 1,
                              borderLeftWidth: 4,
                              borderLeftColor: colors.tasks,
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                              marginBottom: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Checkbox
                                checked={Boolean(tsk.done)}
                                onToggle={() => onToggleTask(tsk.id, Boolean(tsk.done))}
                                onLabelPress={() => onPressTask(tsk)}
                                label={tsk.title}
                              />
                              {item.subtitle ? (
                                <Text
                                  style={{
                                    fontSize: 10,
                                    color: colors['text-muted'],
                                    marginLeft: 28,
                                    marginTop: -2,
                                  }}
                                >
                                  {item.subtitle}
                                </Text>
                              ) : null}
                            </View>
                            {tsk.priority === 'urgent' && (
                              <Chip label="Urgent" variant="tasks" size="sm" />
                            )}
                            {tsk.priority === 'high' && (
                              <Chip label="High" variant="tasks" size="sm" />
                            )}
                          </View>
                        );
                      }

                      // 5C. Expense Row
                      if (item.type === 'expense' && item.transaction) {
                        const tx = item.transaction;
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => onPressExpense(tx)}
                            style={{
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderWidth: 1,
                              borderLeftWidth: 4,
                              borderLeftColor: colors.money,
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 8,
                              marginBottom: 6,
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={`Expense: ${formatCurrency(tx.amount)}`}
                          >
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <Text
                                numberOfLines={1}
                                style={{ fontSize: 12, fontWeight: '500', color: colors.text }}
                              >
                                {item.title}
                              </Text>
                              <Text
                                numberOfLines={1}
                                style={{ fontSize: 10, color: colors['text-muted'], marginTop: 2 }}
                              >
                                {item.subtitle}
                              </Text>
                            </View>

                            {/* Money Pill */}
                            <View
                              style={{
                                backgroundColor: colors.money,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 9999,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
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
                      }

                      return null;
                    })}
                  </View>
                );
              })}

              {/* "+N more" button if there are hidden items */}
              {!showAllItems && remainingHiddenCount > 0 && (
                <Pressable
                  onPress={() => setShowAllItems(true)}
                  style={{
                    paddingVertical: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.background,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    marginTop: 4,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Show ${remainingHiddenCount} more items`}
                >
                  <Text
                    style={{
                      fontSize: 11.5,
                      fontWeight: '600',
                      color: colors.primary,
                    }}
                  >
                    +{remainingHiddenCount} more
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default WeekCard;
