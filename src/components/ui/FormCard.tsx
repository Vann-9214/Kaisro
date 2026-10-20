import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React from 'react';
import {
  View,
  Pressable,
  Animated,
  ViewProps,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { colors, layout, spacing } from '@/constants/theme';

export interface FormCardProps extends Omit<ViewProps, 'style'> {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** When true, forces minimum height of 56dp with vertically centered content */
  singleLine?: boolean;
  /** Compact quick-add cards retain a 44dp minimum touch target. */
  compact?: boolean;
  disabled?: boolean;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityLabel?: string;
  accessibilityState?: PressableProps['accessibilityState'];
}

export function FormCard({
  children,
  onPress,
  style,
  className = '',
  singleLine = false,
  compact = false,
  disabled = false,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  ...rest
}: FormCardProps) {
  useThemeRefresh();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
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

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.cardBorderWidth,
    borderBottomWidth: 2.5,
    borderRadius: layout.cardBorderRadius,
    paddingVertical: compact ? spacing.sm : layout.cardPaddingVertical,
    paddingHorizontal: layout.cardPaddingHorizontal,
    justifyContent: 'center',
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    ...(compact ? { minHeight: 44 } : singleLine ? { minHeight: layout.singleLineMinHeight } : {}),
  };

  if (onPress) {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          accessibilityRole={accessibilityRole ?? 'button'}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={accessibilityState}
          style={cardStyle}
          className={className}
          {...rest}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={[cardStyle, style]} className={className} {...rest}>
      {children}
    </View>
  );
}

export interface FormCardRowProps extends ViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Side-by-side cards row with equal-width children and standardized 12dp gap.
 */
export function FormCardRow({ children, style, ...rest }: FormCardRowProps) {
  useThemeRefresh();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'stretch',
          gap: layout.cardGap,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

export default FormCard;
