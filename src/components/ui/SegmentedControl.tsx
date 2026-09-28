import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { layout } from '@/constants/theme';

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  selectedValue: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string = string>({
  options,
  selectedValue,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View
      className="flex-row bg-background border border-border rounded-full p-1 items-center"
      style={style}
    >
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className={`flex-1 py-1.5 px-3 rounded-full items-center justify-center ${
              isSelected ? 'bg-surface' : 'bg-transparent'
            }`}
            style={{ minHeight: 44, minWidth: 0 }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={layout.maxFontScale}
              className={`text-xs font-medium ${
                isSelected ? 'text-text' : 'text-text-muted'
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default SegmentedControl;
