import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { colors } from '@/constants/theme';
import { WeekData } from '@/hooks/useCalendarWeekView';

interface WeekOverviewStripProps {
  weeks: WeekData[];
  onSelectWeek: (index: number) => void;
}

const MAX_BAR_HEIGHT = 36;
const MIN_BAR_HEIGHT = 8;

export function WeekOverviewStrip({ weeks, onSelectWeek }: WeekOverviewStripProps) {
  if (!weeks || weeks.length === 0) return null;

  // Find maximum activity across all weeks for proportional bar calculation
  const maxActivity = Math.max(
    1,
    ...weeks.map((w) => w.eventsCount + w.tasksTotalCount)
  );

  return (
    <View
      className="bg-surface border border-border rounded-xl p-3 mb-3"
      accessibilityRole="summary"
      accessibilityLabel="Weeks overview activity strip"
    >
      <View className="flex-row items-end justify-between">
        {weeks.map((week, idx) => {
          const totalActivity = week.eventsCount + week.tasksTotalCount;
          const isCurrent = week.info.isCurrentWeek;

          // Bar height calculation: proportional with min visible height for >0
          let barHeight = 0;
          if (totalActivity > 0) {
            const proportional = (totalActivity / maxActivity) * MAX_BAR_HEIGHT;
            barHeight = Math.max(MIN_BAR_HEIGHT, Math.round(proportional));
          }

          return (
            <Pressable
              key={`strip-${week.info.isoWeekNumber}-${idx}`}
              onPress={() => onSelectWeek(idx)}
              className="flex-1 items-center justify-end px-1"
              accessibilityRole="button"
              accessibilityLabel={`${week.info.shortWeekLabel}, ${totalActivity} items`}
              hitSlop={6}
            >
              {/* "Now" Marker for current week */}
              <View style={{ height: 16, justifyContent: 'center', alignItems: 'center' }}>
                {isCurrent && (
                  <View
                    style={{
                      backgroundColor: 'rgba(58, 74, 122, 0.12)',
                      paddingHorizontal: 5,
                      paddingVertical: 1,
                      borderRadius: 9999,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 9,
                        fontWeight: '700',
                        color: colors.primary,
                        letterSpacing: 0.2,
                        textTransform: 'uppercase',
                      }}
                    >
                      Now
                    </Text>
                  </View>
                )}
              </View>

              {/* Bar track container (height: MAX_BAR_HEIGHT) */}
              <View
                style={{
                  height: MAX_BAR_HEIGHT,
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginVertical: 4,
                }}
              >
                {totalActivity === 0 ? (
                  // Tiny dot for empty week
                  <View
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: 2,
                      backgroundColor: colors.border,
                      marginBottom: 2,
                    }}
                  />
                ) : (
                  // Proportional activity bar
                  <View
                    style={{
                      width: 14,
                      height: barHeight,
                      borderRadius: 4,
                      backgroundColor: isCurrent ? colors.primary : 'rgba(58, 74, 122, 0.35)',
                    }}
                  />
                )}
              </View>

              {/* Column label (W36, W37, ...) */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: isCurrent ? '700' : '500',
                  color: isCurrent ? colors.primary : colors['text-muted'],
                  marginTop: 2,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {week.info.shortWeekLabel}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default WeekOverviewStrip;
