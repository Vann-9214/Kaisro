import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiftedInput } from './LiftedInputContext';
import { useKeyboardInsets } from '@/hooks/useKeyboardInsets';
import { calculateLiftedBarPosition, getFieldNavigation } from '@/utils/keyboardLayout';
import { colors, spacing, layout } from '@/constants/theme';

export function LiftedInputHost({ footer, keyboardGap = 0 }: { footer?: React.ReactNode; keyboardGap?: number }) {
  const insets = useSafeAreaInsets();
  const { activeField, closeBar, handleNextOrDone, changeActiveFieldText, isReduceMotion } = useLiftedInput();
  const {
    keyboardScreenY,
    keyboardHeight,
    initialWindowHeight,
    currentWindowHeight,
    isKeyboardVisible,
  } = useKeyboardInsets();

  const inputRef = useRef<TextInput>(null);
  const viewportRef = useRef<View>(null);
  const [viewport, setViewport] = useState<{ screenY: number; height: number }>();
  const measureViewport = useCallback(() => {
    viewportRef.current?.measureInWindow((_x, screenY, _width, height) => {
      if (height > 0) setViewport(previous =>
        previous?.screenY === screenY && previous.height === height ? previous : { screenY, height });
    });
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(measureViewport);
    return () => cancelAnimationFrame(frame);
  }, [activeField?.id, keyboardScreenY, currentWindowHeight, measureViewport]);
  const entrance = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    entrance.setValue(0);
    if (activeField) Animated.timing(entrance, { toValue: 1, duration: isReduceMotion ? 0 : 160, useNativeDriver: true }).start();
  }, [activeField?.id, entrance, isReduceMotion]);

  // Focus input on active field change
  useEffect(() => {
    if (activeField) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [activeField?.id]);

  if (!activeField) {
    return null;
  }

  // Base position comes from the actual modal and keyboard bounds.
  const { bottomOffset } = calculateLiftedBarPosition({
    initialWindowHeight,
    currentWindowHeight,
    keyboardScreenY,
    keyboardHeight,
    bottomInset: insets.bottom,
    viewport,
  });

  // Navigation order
  const order = activeField.fieldOrder || [];
  const nav = getFieldNavigation(order, activeField.id);
  const isLast = activeField.actionLabel === 'Done' || nav.isLastField;
  const actionButtonText = activeField.actionLabel || (isLast ? 'Done' : 'Next');
  const dockOffset = isKeyboardVisible ? bottomOffset : insets.bottom;
  const keyboardClearance = isKeyboardVisible ? keyboardGap : 0;
  const availableHeight = (viewport?.height ?? currentWindowHeight) - dockOffset - keyboardClearance - insets.top - spacing.sm;
  const inputMaxHeight = Math.max(44, Math.min(110, availableHeight - 164));

  return (
    <View ref={viewportRef} collapsable={false} onLayout={measureViewport} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dimmed scrim overlay over the rest of the sheet - instant, no animation */}
      <Pressable
        onPress={closeBar}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.overlay,
          },
        ]}
      />

      {/* Floating lifted input card above the keyboard */}
      <Animated.View
        style={{
          position: 'absolute',
          left: layout.sheetHorizontalPadding,
          right: layout.sheetHorizontalPadding,
          bottom: dockOffset + keyboardClearance,
          maxHeight: Math.max(160, availableHeight),
          opacity: entrance,
          transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [spacing.sm, 0] }) }],
          backgroundColor: colors['surface-raised'],
          borderRadius: layout.cardBorderRadius,
          borderWidth: layout.cardBorderWidth,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {footer}
        <View
          style={{
            backgroundColor: colors['surface-raised'],
            paddingHorizontal: spacing.base, // 16dp horizontal
            paddingVertical: spacing.cardGap, // 12dp vertical
          }}
        >
          {/* Header Row: Field label on left, Next/Done on right (8dp gap below to input) */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm, // 8dp gap
            }}
          >
            <Text
              maxFontSizeMultiplier={layout.maxFontScale}
              className="text-[11px] font-semibold uppercase tracking-wider text-text-muted"
            >
              {activeField.label}
            </Text>

            <Pressable
              onPress={handleNextOrDone}
              style={{ minHeight: 44, minWidth: 44, paddingHorizontal: spacing.md, alignItems: 'center', justifyContent: 'center', borderRadius: layout.cardBorderRadius, backgroundColor: colors.primary }}
              accessibilityRole="button"
              accessibilityLabel={actionButtonText}
            >
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                className="text-xs font-semibold text-on-primary"
              >
                {actionButtonText}
              </Text>
            </Pressable>
          </View>

          {/* Input Row: generous min-height and clear visual borders */}
          <View className="flex-row items-center bg-background border border-border rounded-xl px-3 py-2">
            {Boolean(activeField.prefix) && (
              <Text
                maxFontSizeMultiplier={layout.maxFontScale}
                className="text-xl font-bold text-text mr-1.5"
              >
                {activeField.prefix}
              </Text>
            )}

            {activeField.multiline ? (
              <ScrollView
                style={{ flex: 1, maxHeight: inputMaxHeight }}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  ref={inputRef}
                  value={activeField.value}
                  onChangeText={changeActiveFieldText}
                  placeholder={activeField.placeholder}
                  placeholderTextColor={colors['text-muted']}
                  keyboardType={activeField.keyboardType || 'default'}
                  maxLength={activeField.maxLength}
                  autoCapitalize={activeField.autoCapitalize || 'sentences'}
                  multiline
                  textAlignVertical="top"
                  maxFontSizeMultiplier={layout.maxFontScale}
                  accessibilityLabel={activeField.label}
                  style={{ minHeight: 44 }}
                  className="text-base text-text leading-5 flex-1"
                />
              </ScrollView>
            ) : (
              <TextInput
                ref={inputRef}
                value={activeField.value}
                onChangeText={changeActiveFieldText}
                placeholder={activeField.placeholder}
                placeholderTextColor={colors['text-muted']}
                keyboardType={activeField.keyboardType || 'default'}
                maxLength={activeField.maxLength}
                autoCapitalize={activeField.autoCapitalize || 'sentences'}
                returnKeyType={isLast ? 'done' : 'next'}
                blurOnSubmit={false}
                onSubmitEditing={handleNextOrDone}
                maxFontSizeMultiplier={layout.maxFontScale}
                accessibilityLabel={activeField.label}
                className={`text-base font-medium text-text flex-1 min-h-[44px] ${
                  activeField.prefix ? 'text-xl font-bold' : ''
                }`}
              />
            )}
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

export default LiftedInputHost;
