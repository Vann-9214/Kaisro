import React from 'react';
import { View, Text, TextInput } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Button } from '@/components/ui/Button';
import { useUIStore, QuickAddType } from '@/store/useUIStore';
import { colors } from '@/constants/theme';
import { CURRENCY } from '@/constants/currency';

const TYPE_OPTIONS: { value: QuickAddType; label: string }[] = [
  { value: 'event', label: 'Event' },
  { value: 'task', label: 'Task' },
  { value: 'transaction', label: 'Expense' },
  { value: 'note', label: 'Note' },
];

export function QuickAddBottomSheet() {
  const { isAddSheetOpen, closeAddSheet, activeAddType, setActiveAddType } = useUIStore();
  const [title, setTitle] = React.useState('');

  const handleSave = () => {
    // Placeholder action for foundation phase
    console.log(`[QuickAdd] Created placeholder ${activeAddType}: ${title}`);
    setTitle('');
    closeAddSheet();
  };

  const getVariant = () => {
    switch (activeAddType) {
      case 'task':
        return 'tasks';
      case 'transaction':
        return 'money';
      default:
        return 'primary';
    }
  };

  const getPlaceholder = () => {
    switch (activeAddType) {
      case 'event':
        return 'Event title (e.g. Design Review)';
      case 'task':
        return 'Task description...';
      case 'transaction':
        return `Amount in ${CURRENCY.symbol} (e.g. 250.00)`;
      case 'note':
        return 'Quick note or reflection...';
    }
  };

  return (
    <BottomSheet
      visible={isAddSheetOpen}
      onClose={closeAddSheet}
      title={
        <View className="flex-row items-center justify-between pb-2 border-b border-border">
          <Text className="text-base font-medium text-text">Quick Add</Text>
          <Text className="text-xs text-text-muted">Local Only</Text>
        </View>
      }
    >
      <View className="space-y-4">
        {/* Segmented Type Switch */}
        <SegmentedControl
          options={TYPE_OPTIONS}
          selectedValue={activeAddType}
          onChange={(val) => setActiveAddType(val)}
        />

        {/* Input Field Placeholder */}
        <View className="bg-background border border-border rounded p-3 mt-3">
          <TextInput
            placeholder={getPlaceholder()}
            placeholderTextColor={colors['text-muted']}
            value={title}
            onChangeText={setTitle}
            className="text-sm text-text font-normal"
            autoFocus
          />
        </View>

        {/* Info hint */}
        <Text className="text-xs text-text-muted mt-2">
          {activeAddType === 'event' && 'Archival Ink Blue: Anchored to daily timeline.'}
          {activeAddType === 'task' && 'Soft Sage Teal: Trackable with serene circular checkmark.'}
          {activeAddType === 'transaction' && `Warm Sand: Recorded in integer centavos (${CURRENCY.symbol}).`}
          {activeAddType === 'note' && 'Quiet Reflection: Interconnected with events and expenses.'}
        </Text>

        {/* Action Button */}
        <View className="mt-4">
          <Button
            title={`Create ${TYPE_OPTIONS.find((t) => t.value === activeAddType)?.label}`}
            variant={getVariant()}
            onPress={handleSave}
            fullWidth
          />
        </View>
      </View>
    </BottomSheet>
  );
}

export default QuickAddBottomSheet;
