import React from 'react';
import { Pressable, Text, View, StyleProp, ViewStyle } from 'react-native';

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
      <Text className={textClasses}>{label}</Text>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={containerClasses}
        style={style}
        accessibilityRole="button"
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View className={containerClasses} style={style}>
      {content}
    </View>
  );
}

export default Chip;
