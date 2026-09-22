import React from 'react';
import { Pressable, View, Text, StyleProp, ViewStyle } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export interface CheckboxProps {
  checked: boolean;
  onToggle: (nextState: boolean) => void;
  label?: string;
  onLabelPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Checkbox({
  checked,
  onToggle,
  label,
  onLabelPress,
  disabled = false,
  style,
}: CheckboxProps) {
  const handleBoxPress = () => {
    if (!disabled) {
      onToggle(!checked);
    }
  };

  const handleLabelPress = () => {
    if (!disabled) {
      if (onLabelPress) {
        onLabelPress();
      } else {
        onToggle(!checked);
      }
    }
  };

  return (
    <View className="flex-row items-center py-1.5" style={style}>
      <Pressable
        onPress={handleBoxPress}
        disabled={disabled}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View
          className={`w-5 h-5 rounded-full items-center justify-center ${
            checked
              ? 'bg-tasks border border-tasks'
              : 'bg-transparent border-[1.5px] border-border'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          {checked && <Check size={12} color={colors['on-tasks']} strokeWidth={2.5} />}
        </View>
      </Pressable>

      {label && (
        <Pressable
          onPress={handleLabelPress}
          disabled={disabled}
          className="ml-3 flex-1"
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <Text
            className={`text-sm ${
              checked
                ? 'text-text-muted line-through'
                : 'text-text'
            }`}
          >
            {label}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default Checkbox;
