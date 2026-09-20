import React from 'react';
import { View, Pressable, ViewProps, StyleProp, ViewStyle } from 'react-native';

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
  let cardClasses = `bg-surface border border-border rounded p-3.5 ${
    elevated ? 'bg-surface-raised' : ''
  }`;

  // Optional module left accent line (3px)
  if (module === 'calendar') {
    cardClasses += ' border-l-4 border-l-primary';
  } else if (module === 'tasks') {
    cardClasses += ' border-l-4 border-l-tasks';
  } else if (module === 'money') {
    cardClasses += ' border-l-4 border-l-money';
  }

  if (className) {
    cardClasses += ` ${className}`;
  }

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className={cardClasses}
        style={style}
        accessibilityRole="button"
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={cardClasses} style={style} {...rest}>
      {children}
    </View>
  );
}

export default Card;
