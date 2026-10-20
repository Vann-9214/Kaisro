import React, { useEffect, useRef } from 'react';
import { View, Animated, Easing, StyleProp, ViewStyle } from 'react-native';

export type ProgressBarModule = 'tasks' | 'primary' | 'money' | 'error';

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

  const animProgress = useRef(new Animated.Value(normalizedProgress)).current;

  useEffect(() => {
    Animated.timing(animProgress, {
      toValue: normalizedProgress,
      duration: 350,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [normalizedProgress, animProgress]);

  let fillClasses = 'h-full rounded-full';
  if (module === 'tasks') {
    fillClasses += ' bg-tasks';
  } else if (module === 'money') {
    fillClasses += ' bg-money';
  } else if (module === 'error') {
    fillClasses += ' bg-error';
  } else {
    fillClasses += ' bg-primary';
  }

  const widthInterpolation = animProgress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      className={`w-full bg-border rounded-full overflow-hidden ${className}`}
      style={[{ height }, style]}
    >
      <Animated.View className={fillClasses} style={{ width: widthInterpolation }} />
    </View>
  );
}

export default ProgressBar;
