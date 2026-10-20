import React, { useRef } from 'react';
import { Pressable, Text, View, Animated, StyleProp, ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';

export type ChipVariant = 'default' | 'primary' | 'tasks' | 'money';
export type ChipSize = 'sm' | 'md';

export interface ChipProps {
  label: string;
  variant?: ChipVariant;
  size?: ChipSize;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Chip({
  label,
  variant = 'default',
  size = 'md',
  selected = false,
  onPress,
  icon,
  style,
}: ChipProps) {
  const isSm = size === 'sm';
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 60,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  let containerClasses = 'rounded-full flex-row items-center justify-center';
  let textClasses = 'font-medium';

  // Sizing
  if (isSm) {
    containerClasses += ' h-5 px-2';
    textClasses += ' text-[10px] tracking-wide';
  } else {
    containerClasses += ' h-7 px-2.5';
    textClasses += ' text-xs tracking-tight';
  }

  // Variant & State
  if (selected || variant === 'primary') {
    containerClasses += ' bg-primary';
    textClasses += ' text-on-primary';
  } else if (variant === 'tasks') {
    containerClasses += ' bg-tasks';
    textClasses += ' text-on-tasks';
  } else if (variant === 'money') {
    containerClasses += ' bg-money';
    textClasses += ' text-on-money';
  } else {
    // Inactive / Default
    containerClasses += ' bg-surface border border-border';
    textClasses += ' text-text-muted';
  }

  const content = (
    <>
      {icon && <View className="mr-1.5">{icon}</View>}
      <Text numberOfLines={1} ellipsizeMode="tail" style={{ flexShrink: 1 }} className={textClasses}>{label}</Text>
    </>
  );

  const chipDepthStyle: ViewStyle = {
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1.5,
    elevation: 1,
  };

  if (onPress) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className={containerClasses}
          style={[chipDepthStyle, { minHeight: 44, maxWidth: '100%', borderRadius: 9999 }]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View className={containerClasses} style={[chipDepthStyle, { maxWidth: '100%' }, style]}>
      {content}
    </View>
  );
}

export default Chip;
