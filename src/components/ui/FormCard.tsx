import React from 'react';
import {
  View,
  Pressable,
  ViewProps,
  PressableProps,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { colors, layout } from '@/constants/theme';

export interface FormCardProps extends Omit<ViewProps, 'style'> {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  className?: string;
  /** When true, forces minimum height of 56dp with vertically centered content */
  singleLine?: boolean;
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
  disabled = false,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  ...rest
}: FormCardProps) {
  const cardStyle: ViewStyle = {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: layout.cardBorderWidth,
    borderRadius: layout.cardBorderRadius,
    paddingVertical: layout.cardPaddingVertical,
    paddingHorizontal: layout.cardPaddingHorizontal,
    justifyContent: 'center',
    ...(singleLine ? { minHeight: layout.singleLineMinHeight } : {}),
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        accessibilityRole={accessibilityRole ?? 'button'}
        accessibilityLabel={accessibilityLabel}
        accessibilityState={accessibilityState}
        style={({ pressed }) => [
          cardStyle,
          style,
          pressed && { opacity: 0.75 },
        ]}
        className={className}
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
