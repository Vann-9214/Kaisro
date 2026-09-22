import React, { useEffect } from 'react';
import { View, Text, Pressable, KeyboardTypeOptions } from 'react-native';
import { useLiftedInput } from './LiftedInputContext';
import { colors, layout } from '@/constants/theme';

export interface LiftedFieldProps {
  id: string;
  label: string;
  value?: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  hint?: string;
  error?: string;
  icon?: React.ReactNode;
  keyboardType?: KeyboardTypeOptions;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  prefix?: string;
  fieldOrder?: string[];
  actionLabel?: 'Done' | 'Next';
  containerClassName?: string;
}

export function LiftedField({
  id,
  label,
  value = '',
  onChangeText,
  placeholder,
  hint,
  error,
  icon,
  keyboardType = 'default',
  maxLength,
  autoCapitalize = 'sentences',
  multiline = false,
  prefix,
  fieldOrder,
  actionLabel,
  containerClassName,
}: LiftedFieldProps) {
  const { openField, registerField, unregisterField } = useLiftedInput();

  // Keep field registered with context so Next/Done can navigate to it
  useEffect(() => {
    registerField({
      id,
      label,
      value,
      onChangeText,
      placeholder,
      keyboardType,
      maxLength,
      autoCapitalize,
      multiline,
      prefix,
      fieldOrder,
      actionLabel,
    });
  }, [
    id,
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    maxLength,
    autoCapitalize,
    multiline,
    prefix,
    fieldOrder,
    actionLabel,
    registerField,
  ]);

  useEffect(() => {
    return () => unregisterField(id);
  }, [id, unregisterField]);

  const handlePress = () => {
    openField({
      id,
      label,
      value,
      onChangeText,
      placeholder,
      keyboardType,
      maxLength,
      autoCapitalize,
      multiline,
      prefix,
      fieldOrder,
      actionLabel,
    });
  };

  const displayValue = value ? (prefix ? `${prefix}${value}` : value) : '';
  const hasValue = Boolean(value);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${hasValue ? displayValue : placeholder || 'empty'}`}
      accessibilityHint="Tap to edit"
      className={`active:opacity-80 ${containerClassName ?? ''}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {icon && (
          <View
            style={{
              marginRight: layout.iconToLabelGap, // 12dp gap
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </View>
        )}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text
            numberOfLines={multiline ? 2 : 1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={layout.maxFontScale}
            className={`text-base font-medium ${
              hasValue ? 'text-text' : 'text-text-muted'
            } ${prefix ? 'text-xl font-bold' : ''}`}
          >
            {hasValue ? displayValue : placeholder}
          </Text>
        </View>
      </View>

      {Boolean(hint) && !error && (
        <Text
          maxFontSizeMultiplier={layout.maxFontScale}
          style={{
            fontSize: 11,
            color: colors['text-muted'],
            marginTop: layout.labelToValueGap, // 4dp gap
          }}
        >
          {hint}
        </Text>
      )}

      {Boolean(error) && (
        <Text
          maxFontSizeMultiplier={layout.maxFontScale}
          style={{
            fontSize: 12,
            color: colors.error,
            marginTop: layout.labelToValueGap, // 4dp gap
          }}
        >
          {error}
        </Text>
      )}
    </Pressable>
  );
}

export default LiftedField;
