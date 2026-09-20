import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';

export type ProgressBarModule = 'tasks' | 'primary' | 'money';

export interface ProgressBarProps {
  progress: number; // 0 to 1 (or 0 to 100)
  module?: ProgressBarModule;
  height?: number;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function ProgressBar({
  progress,
  module = 'tasks',
  height = 5,
  style,
  className = '',
}: ProgressBarProps) {
  // Normalize progress to 0 - 100%
  const normalizedProgress = Math.min(
    100,
    Math.max(0, progress <= 1 ? progress * 100 : progress)
  );

  let fillClasses = 'h-full rounded-full';
  if (module === 'tasks') {
    fillClasses += ' bg-tasks';
  } else if (module === 'money') {
    fillClasses += ' bg-money';
  } else {
    fillClasses += ' bg-primary';
  }

  return (
    <View
      className={`w-full bg-border rounded-full overflow-hidden ${className}`}
      style={[{ height }, style]}
    >
      <View className={fillClasses} style={{ width: `${normalizedProgress}%` }} />
    </View>
  );
}

export default ProgressBar;
