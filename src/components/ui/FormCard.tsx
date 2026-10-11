import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React from 'react';
import {
  View,
  Pressable,
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
  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: layout.cardBorderWidth,
    borderRadius: layout.cardBorderRadius,
    paddingVertical: compact ? spacing.sm : layout.cardPaddingVertical,
    paddingHorizontal: layout.cardPaddingHorizontal,
    justifyContent: 'center',
    ...(compact ? { minHeight: 44 } : singleLine ? { minHeight: layout.singleLineMinHeight } : {}),
  };

  if (onPress) {
    // NativeWind merges styles as objects; a Pressable style callback loses
    // the card's padding, border and flex width during that merge.
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        style={[cardStyle, style]}
        className={`active:opacity-75 ${className}`}
        {...rest}
      >
        {children}
      </Pressable>
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
