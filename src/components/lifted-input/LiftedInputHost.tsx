import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiftedInput } from './LiftedInputContext';
import { useKeyboardInsets } from '@/hooks/useKeyboardInsets';
import { calculateLiftedBarPosition, getFieldNavigation } from '@/utils/keyboardLayout';
import { colors, spacing, layout } from '@/constants/theme';

export function LiftedInputHost({ footer, keyboardGap = spacing.sm }: { footer?: React.ReactNode; keyboardGap?: number }) {
  const insets = useSafeAreaInsets();
  const {
    activeField,
    closeBar,
    forceClose,
    registerCloser,
    handleNextOrDone,
    changeActiveFieldText,
    isReduceMotion,
  } = useLiftedInput();
  const {
    keyboardScreenY,
    keyboardHeight,
    duration: keyboardDuration,
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
  }, [activeField?.id, currentWindowHeight, measureViewport]);

  const scrimOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardEntranceY = useRef(new Animated.Value(spacing.md)).current;
  const animatedDock = useRef(new Animated.Value(insets.bottom)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;

  const prevFieldIdRef = useRef<string | null>(null);
  const isClosingRef = useRef(false);

  // Focus input on active field change
  useEffect(() => {
    if (activeField) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [activeField?.id]);

  // Base position comes from the actual modal and keyboard bounds.
  const { bottomOffset } = calculateLiftedBarPosition({
    initialWindowHeight,
    currentWindowHeight,
    keyboardScreenY,
    keyboardHeight,
    bottomInset: insets.bottom,
    viewport,
  });

  const targetDock = isKeyboardVisible ? bottomOffset + keyboardGap : insets.bottom;

  // Smoothly track keyboard movement on the native thread
  useEffect(() => {
    Animated.timing(animatedDock, {
      toValue: targetDock,
      duration: isReduceMotion ? 0 : (keyboardDuration && keyboardDuration > 0 ? keyboardDuration : 200),
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [targetDock, keyboardDuration, isReduceMotion, animatedDock]);

  // Coordinated entrance and field navigation
  useEffect(() => {
    if (!activeField) {
      prevFieldIdRef.current = null;
      isClosingRef.current = false;
      return;
    }

    if (prevFieldIdRef.current === null) {
      // Initial opening of lifted input
      prevFieldIdRef.current = activeField.id;
      isClosingRef.current = false;
      scrimOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardEntranceY.setValue(spacing.md);
      contentOpacity.setValue(1);

      Animated.parallel([
        Animated.timing(scrimOpacity, {
          toValue: 1,
          duration: isReduceMotion ? 0 : 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: isReduceMotion ? 0 : 180,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.spring(cardEntranceY, {
          toValue: 0,
          tension: 70,
          friction: 9,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (prevFieldIdRef.current !== activeField.id) {
      // Navigating to next field (Next button pressed)
      prevFieldIdRef.current = activeField.id;
      contentOpacity.setValue(0.4);
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: isReduceMotion ? 0 : 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
  }, [activeField?.id, isReduceMotion, scrimOpacity, cardOpacity, cardEntranceY, contentOpacity]);

  // Coordinated exit transition
  const handleClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Keyboard.dismiss();

    Animated.parallel([
      Animated.timing(scrimOpacity, {
        toValue: 0,
        duration: isReduceMotion ? 0 : 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: isReduceMotion ? 0 : 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(cardEntranceY, {
        toValue: spacing.md,
        duration: isReduceMotion ? 0 : 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(animatedDock, {
        toValue: insets.bottom,
        duration: isReduceMotion ? 0 : 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      isClosingRef.current = false;
      prevFieldIdRef.current = null;
      forceClose();
    });
  }, [isReduceMotion, insets.bottom, scrimOpacity, cardOpacity, cardEntranceY, animatedDock, forceClose]);

  useEffect(() => {
    registerCloser(handleClose);
    return () => registerCloser(null);
  }, [handleClose, registerCloser]);

  if (!activeField) {
    return null;
  }

  // Navigation order
  const order = activeField.fieldOrder || [];
  const nav = getFieldNavigation(order, activeField.id);
  const isLast = activeField.actionLabel === 'Done' || nav.isLastField;
  const actionButtonText = activeField.actionLabel || (isLast ? 'Done' : 'Next');

  const dockTranslateY = animatedDock.interpolate({
    inputRange: [0, 1000],
    outputRange: [0, -1000],
  });
  const combinedTranslateY = Animated.add(dockTranslateY, cardEntranceY);

  const availableHeight = (viewport?.height ?? currentWindowHeight) - targetDock - insets.top - spacing.sm;
  const inputMaxHeight = Math.max(44, Math.min(110, availableHeight - 164));

  return (
    <View ref={viewportRef} collapsable={false} onLayout={measureViewport} style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dimmed scrim overlay over the rest of the sheet - smooth native fade */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: colors.overlay,
            opacity: scrimOpacity,
          },
        ]}
      >
        <Pressable
          onPress={closeBar}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Dismiss input"
        />
      </Animated.View>

      {/* Floating lifted input card above the keyboard */}
      <Animated.View
        style={{
          position: 'absolute',
          left: layout.sheetHorizontalPadding,
          right: layout.sheetHorizontalPadding,
          bottom: 0,
          maxHeight: Math.max(160, availableHeight),
          opacity: cardOpacity,
          transform: [{ translateY: combinedTranslateY }],
          backgroundColor: colors['surface-raised'],
          borderRadius: layout.cardBorderRadius,
          borderWidth: layout.cardBorderWidth,
          borderColor: colors.border,
          overflow: 'hidden',
        }}
      >
        {footer}
        <Animated.View
          style={{
            opacity: contentOpacity,
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
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export default LiftedInputHost;
