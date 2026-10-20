import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React from 'react';
import { Pressable, View, Text, StyleProp, ViewStyle, Animated } from 'react-native';
import { Check } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export interface CheckboxProps {
  checked: boolean;
  onToggle: (nextState: boolean) => void;
  label?: string;
  onLabelPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

export function Checkbox({
  checked,
  onToggle,
  label,
  onLabelPress,
  disabled = false,
  accessibilityLabel,
  style,
}: CheckboxProps) {
  useThemeRefresh();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const triggerAnim = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, { toValue: 0.8, duration: 70, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 220, useNativeDriver: true }),
    ]).start();
  };

  const handleBoxPress = () => {
    if (!disabled) {
      triggerAnim();
      onToggle(!checked);
    }
  };

  const handleLabelPress = () => {
    if (!disabled) {
      triggerAnim();
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
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ checked, disabled }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Animated.View
          style={{ transform: [{ scale: scaleAnim }] }}
          className={`w-5 h-5 rounded-full items-center justify-center ${
            checked
              ? 'bg-tasks border border-tasks'
              : 'bg-transparent border-[1.5px] border-border'
          } ${disabled ? 'opacity-50' : ''}`}
        >
          {checked && <Check size={12} color={colors['on-tasks']} strokeWidth={2.5} />}
        </Animated.View>
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
