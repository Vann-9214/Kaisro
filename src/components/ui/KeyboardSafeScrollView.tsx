import React, { useRef } from 'react';
import {
  ScrollView,
  ScrollViewProps,
  StyleProp,
  ViewStyle,
  Animated,
  Platform,
} from 'react-native';
import { useKeyboardInsets } from '@/hooks/useKeyboardInsets';
import { useScrollToField } from '@/hooks/useScrollToField';

export interface KeyboardSafeScrollViewProps extends ScrollViewProps {
  children: React.ReactNode;
  extraScrollPadding?: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

/**
 * Reusable keyboard-safe ScrollView component.
 * Automatically adapts content padding for keyboard overlap using the shared
 * keyboard insets hook and provides scroll-to-focus support for any text input.
 */
export function KeyboardSafeScrollView({
  children,
  extraScrollPadding = 24,
  style,
  contentContainerStyle,
  ...rest
}: KeyboardSafeScrollViewProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { keyboardHeight, isKeyboardVisible } = useKeyboardInsets();
  const { handleScrollViewLayout } = useScrollToField(scrollViewRef);

  return (
    <ScrollView
      ref={scrollViewRef}
      style={style}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      onLayout={(e) => handleScrollViewLayout(e.nativeEvent.layout.height)}
      contentContainerStyle={[
        contentContainerStyle,
        {
          paddingBottom: isKeyboardVisible
            ? keyboardHeight + extraScrollPadding
            : extraScrollPadding,
        },
      ]}
      {...rest}
    >
      {children}
    </ScrollView>
  );
}

export default KeyboardSafeScrollView;
