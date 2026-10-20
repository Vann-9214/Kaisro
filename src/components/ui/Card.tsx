import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useRef } from 'react';
import { View, Pressable, Animated, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { colors, layout } from '@/constants/theme';

export type CardModule = 'default' | 'calendar' | 'tasks' | 'money';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  module?: CardModule;
  onPress?: () => void;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
  className?: string;
}

export function Card({
  children,
  module = 'default',
  onPress,
  elevated = false,
  style,
  className = '',
  ...rest
}: CardProps) {
  useThemeRefresh();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  let cardClasses = `bg-surface border border-border p-3.5 ${
    elevated ? 'bg-surface-raised' : ''
  }`;

  // Optional module left accent line (3px)
  if (module === 'calendar') {
    cardClasses += ' border-l border-l-primary';
  } else if (module === 'tasks') {
    cardClasses += ' border-l border-l-tasks';
  } else if (module === 'money') {
    cardClasses += ' border-l border-l-money';
  }

  const shadowStyle: ViewStyle = {
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  };

  if (className) {
    cardClasses += ` ${className}`;
  }

  if (onPress) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, shadowStyle, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          className={cardClasses}
          style={{
            backgroundColor: elevated ? colors['surface-raised'] : colors.surface,
            borderColor: colors.border,
            borderWidth: layout.cardBorderWidth,
            borderRadius: layout.cardBorderRadius,
            minHeight: 44,
          }}
          accessibilityRole="button"
          {...rest}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View
      className={cardClasses}
      style={[
        {
          backgroundColor: elevated ? colors['surface-raised'] : colors.surface,
          borderColor: colors.border,
          borderWidth: layout.cardBorderWidth,
          borderRadius: layout.cardBorderRadius,
        },
        shadowStyle,
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export default Card;
