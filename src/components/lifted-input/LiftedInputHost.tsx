import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLiftedInput } from './LiftedInputContext';
import { useKeyboardInsets } from '@/hooks/useKeyboardInsets';
import { calculateLiftedBarPosition, getFieldNavigation } from '@/utils/keyboardLayout';
import { colors, spacing, layout } from '@/constants/theme';

export function LiftedInputHost() {
  const insets = useSafeAreaInsets();
  const { activeField, closeBar, handleNextOrDone } = useLiftedInput();
  const {
    keyboardScreenY,
    keyboardHeight,
    initialWindowHeight,
    currentWindowHeight,
    isKeyboardVisible,
  } = useKeyboardInsets();

  const inputRef = useRef<TextInput>(null);

  // Focus input on active field change
  useEffect(() => {
    if (activeField) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 30);
    }
  }, [activeField?.id]);

  if (!activeField) {
    return null;
  }

  // Base position from keyboard height: docks flush directly on top of keyboard with no gap
  const { bottomOffset } = calculateLiftedBarPosition({
    initialWindowHeight,
    currentWindowHeight,
    keyboardScreenY,
    keyboardHeight,
    bottomInset: insets.bottom,
  });

  // Navigation order
  const order = activeField.fieldOrder || [];
  const nav = getFieldNavigation(order, activeField.id);
  const isLast = activeField.actionLabel === 'Done' || nav.isLastField;
  const actionButtonText = activeField.actionLabel || (isLast ? 'Done' : 'Next');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Dimmed scrim overlay over the rest of the sheet - instant, no animation */}
      <Pressable
        onPress={closeBar}
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: 'rgba(51, 49, 46, 0.35)',
          },
        ]}
      />

      {/* Floating lifted input card above the keyboard */}
      <View
        style={{
          position: 'absolute',
          left: layout.sheetHorizontalPadding,
          right: layout.sheetHorizontalPadding,
          bottom: bottomOffset,
        }}
      >
        <View
          style={{
            backgroundColor: colors['surface-raised'],
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.12,
            shadowRadius: 10,
            elevation: 8,
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
              className="bg-primary px-3.5 py-1.5 rounded-lg active:opacity-85"
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
                style={{ maxHeight: 110 }}
                showsVerticalScrollIndicator
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  ref={inputRef}
                  value={activeField.value}
                  onChangeText={activeField.onChangeText}
                  placeholder={activeField.placeholder}
                  placeholderTextColor={colors['text-muted']}
                  keyboardType={activeField.keyboardType || 'default'}
                  maxLength={activeField.maxLength}
                  autoCapitalize={activeField.autoCapitalize || 'sentences'}
                  multiline
                  textAlignVertical="top"
                  maxFontSizeMultiplier={layout.maxFontScale}
                  accessibilityLabel={activeField.label}
                  className="text-base text-text leading-5 flex-1 min-h-[60px]"
                />
              </ScrollView>
            ) : (
              <TextInput
                ref={inputRef}
                value={activeField.value}
                onChangeText={activeField.onChangeText}
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
      </View>
    </View>
  );
}

export default LiftedInputHost;
