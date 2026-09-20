import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  PressableProps,
  StyleProp,
  ViewStyle,
  Animated,
} from 'react-native';
import { colors } from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'tasks' | 'money' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  fullWidth = false,
  ...rest
}: ButtonProps) {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  // Base and variant styles using Tailwind classes without hardcoded hex
  let containerClasses = 'flex-row items-center justify-center rounded';
  let textClasses = 'font-medium tracking-tight';

  // Sizing
  if (size === 'sm') {
    containerClasses += ' h-9 px-3';
    textClasses += ' text-xs';
  } else if (size === 'lg') {
    containerClasses += ' h-12 px-6';
    textClasses += ' text-base';
  } else {
    // Default md matches Stitch height 44px
    containerClasses += ' h-11 px-4';
    textClasses += ' text-sm';
  }

  // Variant classes
  if (variant === 'primary') {
    containerClasses += ' bg-primary';
    textClasses += ' text-on-primary';
  } else if (variant === 'secondary') {
    containerClasses += ' bg-transparent border border-border';
    textClasses += ' text-text';
  } else if (variant === 'tasks') {
    containerClasses += ' bg-tasks';
    textClasses += ' text-on-tasks';
  } else if (variant === 'money') {
    containerClasses += ' bg-money';
    textClasses += ' text-on-money';
  } else if (variant === 'ghost') {
    containerClasses += ' bg-transparent';
    textClasses += ' text-text-muted';
  }

  if (disabled) {
    containerClasses += ' opacity-50';
  }

  if (fullWidth) {
    containerClasses += ' w-full';
  }

  const spinnerColor =
    variant === 'primary'
      ? colors['on-primary']
      : variant === 'tasks'
      ? colors['on-tasks']
      : variant === 'money'
      ? colors['on-money']
      : colors.text;

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, fullWidth && { width: '100%' }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled || loading) }}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        className={containerClasses}
        style={style}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : (
          <>
            {leftIcon && <>{leftIcon}</>}
            <Text className={`${textClasses} ${leftIcon ? 'ml-2' : ''} ${rightIcon ? 'mr-2' : ''}`}>
              {title}
            </Text>
            {rightIcon && <>{rightIcon}</>}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

export default Button;
