import React from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Receipt,
  FileText,
  X,
} from 'lucide-react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useUIStore, QuickAddType } from '@/store/useUIStore';
import { EventForm } from '@/components/events/EventForm';
import { colors } from '@/constants/theme';

const TABS: {
  type: QuickAddType;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { type: 'event', label: 'Event', icon: CalendarIcon },
  { type: 'task', label: 'Task', icon: CheckCircle2 },
  { type: 'transaction', label: 'Expense', icon: Receipt },
  { type: 'note', label: 'Note', icon: FileText },
];

export function QuickAddBottomSheet() {
  const {
    isAddSheetOpen,
    closeAddSheet,
    activeAddType,
    editingEvent,
    selectedDateContext,
  } = useUIStore();

  const titleText = editingEvent ? 'Edit Event' : 'Quick Add';

  return (
    <BottomSheet
      visible={isAddSheetOpen}
      onClose={closeAddSheet}
      title={
        <View className="flex-row items-center justify-between pb-2 border-b border-border">
          <View className="flex-row items-center">
            <Text className="text-lg font-medium text-text">{titleText}</Text>
            {selectedDateContext ? (
              <View className="ml-2.5 px-2.5 py-0.5 rounded-full bg-background border border-border">
                <Text className="text-[10px] font-medium text-text-muted">
                  {new Date(selectedDateContext + 'T00:00:00').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Close (X) circular button */}
          <Pressable
            onPress={closeAddSheet}
            className="w-7 h-7 rounded-full bg-background border border-border items-center justify-center active:bg-surface"
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X size={14} color={colors.text} />
          </Pressable>
        </View>
      }
    >
      <View className="space-y-4">
        {/* Segmented Control (Event active, others visible but disabled) */}
        {!editingEvent && (
          <View className="flex-row bg-[#FAF7F2] border border-border rounded-full p-1 items-center mb-1">
            {TABS.map((tab) => {
              const isSelected = tab.type === activeAddType;
              const isDisabled = tab.type !== 'event';
              const IconComp = tab.icon;

              return (
                <Pressable
                  key={tab.type}
                  disabled={isDisabled}
                  className={`flex-1 py-1.5 px-1.5 rounded-full flex-row items-center justify-center ${
                    isSelected ? 'bg-primary' : 'bg-transparent'
                  } ${isDisabled ? 'opacity-40' : 'opacity-100'}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                  accessibilityLabel={`${tab.label} tab${isDisabled ? ' (disabled)' : ''}`}
                >
                  <IconComp
                    size={13}
                    color={isSelected ? colors['on-primary'] : colors['text-muted']}
                  />
                  <Text
                    className={`ml-1 text-xs font-medium ${
                      isSelected ? 'text-on-primary' : 'text-text-muted'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* Event Form */}
        <EventForm onClose={closeAddSheet} />
      </View>
    </BottomSheet>
  );
}

export default QuickAddBottomSheet;
