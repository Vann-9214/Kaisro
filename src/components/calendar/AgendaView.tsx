import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  ActivityIndicator,
  ViewToken,
} from 'react-native';
import { Repeat } from 'lucide-react-native';
import { colors } from '@/constants/theme';
import { formatCurrency } from '@/constants/currency';
import { Checkbox } from '@/components/ui/Checkbox';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { useUIStore } from '@/store/useUIStore';
import {
  AgendaItem,
  AgendaDaySection,
  AgendaDayCardData,
} from '@/utils/agendaUtils';
import { useCalendarAgenda } from '@/hooks/useCalendarAgenda';

interface AgendaViewProps {
  startDayStr: string;
  todayStr: string;
  onVisibleDateChange?: (dateStr: string) => void;
  sectionListRef?: React.RefObject<SectionList<AgendaDayCardData, AgendaDaySection>>;
}

export function AgendaView({
  startDayStr,
  todayStr,
  onVisibleDateChange,
  sectionListRef: externalListRef,
}: AgendaViewProps) {
  const internalListRef = useRef<SectionList<AgendaDayCardData, AgendaDaySection>>(null);
  const listRef = externalListRef ?? internalListRef;

  const openAddSheet = useUIStore((s) => s.openAddSheet);

  const {
    sections,
    isLoading,
    isLoadingMore,
    isEmpty,
    footerLabel,
    canLoadMore,
    loadMore,
    toggleTask,
  } = useCalendarAgenda(startDayStr, todayStr);

  // Notify parent of the initial visible date
  useEffect(() => {
    if (sections.length > 0 && sections[0]?.dateStr && onVisibleDateChange) {
      onVisibleDateChange(sections[0].dateStr);
    }
  }, [sections, onVisibleDateChange]);

  // Lightweight viewability callback to track the day group currently at the top of the list
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems && viewableItems.length > 0) {
        const firstVisible = viewableItems[0];
        const dateStr =
          (firstVisible?.section as AgendaDaySection | undefined)?.dateStr ??
          (firstVisible?.item as AgendaDayCardData | undefined)?.dateStr;
        if (dateStr && onVisibleDateChange) {
          onVisibleDateChange(dateStr);
        }
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 10,
  }).current;

  const handlePressRow = (item: AgendaItem) => {
    if (item.itemType === 'event') {
      openAddSheet('event', item.raw, item.dateStr);
    } else if (item.itemType === 'task') {
      openAddSheet('task', item.raw, item.dateStr);
    } else if (item.itemType === 'expense') {
      openAddSheet('transaction', item.raw, item.dateStr);
    }
  };

  // Render pinned day header
  const renderSectionHeader = ({ section }: { section: AgendaDaySection }) => {
    return (
      <View
        style={{
          backgroundColor: colors.background,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: 6,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: 14,
            fontWeight: '600',
            color: section.isToday ? colors.primary : colors.text,
            letterSpacing: -0.2,
          }}
        >
          {section.dateLabel}
        </Text>

        {section.summaryLabel ? (
          <Text
            numberOfLines={1}
            style={{
              fontSize: 12,
              fontWeight: '500',
              color: colors['text-muted'],
            }}
          >
            {section.summaryLabel}
          </Text>
        ) : null}
      </View>
    );
  };

  // Render day card containing all items of the day
  const renderItem = ({ item }: { item: AgendaDayCardData }) => {
    return (
      <View
        style={{
          marginHorizontal: 20,
          marginBottom: 10,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {item.isEmptyToday ? (
          <View style={{ paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text
              style={{
                fontSize: 13,
                color: colors['text-muted'],
                fontFamily: 'Inter_400Regular',
              }}
            >
              Nothing planned
            </Text>
          </View>
        ) : (
          item.items.map((rowItem, idx) => {
            const isLast = idx === item.items.length - 1;
            const barColor =
              rowItem.itemType === 'event'
                ? colors.primary
                : rowItem.itemType === 'task'
                ? colors.tasks
                : colors.money;

            return (
              <View
                key={rowItem.id}
                style={[
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: 11,
                    paddingHorizontal: 14,
                  },
                  !isLast
                    ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                    : undefined,
                ]}
              >
                {/* Row Content Pressable: taps title, time, bar to open edit sheet */}
                <Pressable
                  onPress={() => handlePressRow(rowItem)}
                  style={({ pressed }) => ({
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    opacity: pressed ? 0.7 : 1,
                  })}
                  accessibilityRole="button"
                  accessibilityLabel={`${rowItem.title}, ${rowItem.timeLabel}`}
                >
                  {/* Time column (fixed 62dp, tabular-nums, right-aligned) */}
                  <View style={{ width: 62, marginRight: 10, justifyContent: 'center' }}>
                    <Text
                      numberOfLines={1}
                      style={{
                        fontSize: 11.5,
                        fontWeight: '500',
                        color: colors['text-muted'],
                        textAlign: 'right',
                        fontVariant: ['tabular-nums'],
                      }}
                    >
                      {rowItem.timeLabel}
                    </Text>
                  </View>

                  {/* 3px vertical color bar */}
                  <View
                    style={{
                      width: 3,
                      height: 32,
                      borderRadius: 1.5,
                      backgroundColor: barColor,
                      marginRight: 10,
                    }}
                  />

                  {/* Title & subtitle column */}
                  <View style={{ flex: 1, marginRight: 8, justifyContent: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 13.5,
                          fontWeight: '500',
                          color:
                            rowItem.itemType === 'task' && rowItem.done
                              ? colors['text-muted']
                              : colors.text,
                          textDecorationLine:
                            rowItem.itemType === 'task' && rowItem.done
                              ? 'line-through'
                              : 'none',
                        }}
                      >
                        {rowItem.title}
                      </Text>
                      {rowItem.itemType === 'event' && rowItem.isRecurring && (
                        <Repeat
                          size={12}
                          color={colors['text-muted']}
                          strokeWidth={2}
                          style={{ marginLeft: 5 }}
                        />
                      )}
                    </View>

                    {rowItem.subtitle ? (
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          color: colors['text-muted'],
                          marginTop: 2,
                        }}
                      >
                        {rowItem.subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>

                {/* Right slot: Independent Checkbox for task, or Chip for expense */}
                {rowItem.itemType === 'task' && (
                  <View style={{ paddingLeft: 4 }}>
                    <Checkbox
                      checked={Boolean(rowItem.done)}
                      onToggle={() => toggleTask(rowItem.numericId, Boolean(rowItem.done))}
                    />
                  </View>
                )}

                {rowItem.itemType === 'expense' && (
                  <Pressable
                    onPress={() => handlePressRow(rowItem)}
                    style={{ paddingLeft: 4 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Expense: ${formatCurrency(rowItem.amountCentavos)}`}
                  >
                    <Chip
                      label={formatCurrency(rowItem.amountCentavos)}
                      variant="money"
                      size="sm"
                    />
                  </Pressable>
                )}
              </View>
            );
          })
        )}
      </View>
    );
  };

  // Footer: Quiet line + "Load more" button
  const renderFooter = () => {
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 24,
          paddingBottom: 110, // Content clears bottom tab bar and floating button
        }}
      >
        <Text
          style={{
            fontSize: 12,
            color: colors['text-muted'],
            marginBottom: 8,
          }}
        >
          {footerLabel}
        </Text>

        {canLoadMore && (
          <Pressable
            onPress={loadMore}
            disabled={isLoadingMore}
            hitSlop={8}
            style={({ pressed }) => ({
              paddingVertical: 4,
              paddingHorizontal: 12,
              opacity: pressed ? 0.7 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel="Load more"
          >
            {isLoadingMore ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.primary,
                }}
              >
                Load more
              </Text>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 }}>
        <EmptyState
          variant="full"
          title="Nothing coming up"
          description="Your canvas is completely open for focused calm."
          actionLabel="Add an event"
          onAction={() => openAddSheet('event')}
        />
      </View>
    );
  }

  return (
    <SectionList<AgendaDayCardData, AgendaDaySection>
      ref={listRef}
      style={{ flex: 1 }}
      sections={sections}
      keyExtractor={(item) => item.dateStr}
      renderSectionHeader={renderSectionHeader}
      renderItem={renderItem}
      ListFooterComponent={renderFooter}
      stickySectionHeadersEnabled={true}
      showsVerticalScrollIndicator={false}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      contentContainerStyle={{ flexGrow: 1 }}
    />
  );
}

export default AgendaView;
