import React from 'react';
import { View, Text, Pressable, StyleProp, ViewStyle } from 'react-native';
import { Clock, Plus } from 'lucide-react-native';
import { colors } from '@/constants/theme';

export interface EmptyStateProps {
  /**
   * 'inline': Slim ~56dp banner between week strip and timeline for Day view.
   * 'full': Centered full-screen empty state for lists/tabs.
   */
  variant?: 'inline' | 'full';
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EmptyState({
  variant = 'inline',
  title = 'Nothing planned today',
  description = 'Your canvas is completely open for focused calm.',
  actionLabel = '+ Add an event',
  onAction,
  icon,
  style,
  testID,
}: EmptyStateProps) {
  if (variant === 'inline') {
    return (
      <View
        testID={testID}
        style={[
          {
            minHeight: 56,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
          style,
        ]}
      >
        {/* Left: 28dp circular clock icon */}
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: colors.background,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          {icon ?? <Clock size={14} color={colors.primary} strokeWidth={1.75} />}
        </View>

        {/* Middle: Title + Supporting description on one line each with ellipsis */}
        <View style={{ flex: 1, marginRight: 10, justifyContent: 'center' }}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            maxFontSizeMultiplier={1.15}
            style={{
              fontSize: 12.5,
              fontWeight: '500',
              color: colors.text,
              lineHeight: 16,
            }}
          >
            {title}
          </Text>
          {description ? (
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              maxFontSizeMultiplier={1.15}
              style={{
                fontSize: 10.5,
                color: colors['text-muted'],
                lineHeight: 14,
                marginTop: 1,
              }}
            >
              {description}
            </Text>
          ) : null}
        </View>

        {/* Right: Compact ~36dp pill button */}
        {onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={({ pressed }) => ({
              height: 34,
              paddingHorizontal: 12,
              borderRadius: 9999,
              backgroundColor: colors.primary,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Plus size={13} color={colors['on-primary']} strokeWidth={2.2} />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              style={{
                fontSize: 11.5,
                fontWeight: '600',
                color: colors['on-primary'],
                marginLeft: 4,
              }}
            >
              {actionLabel.startsWith('+') ? actionLabel.slice(1).trim() : actionLabel}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  // Full-screen empty state variant
  return (
    <View
      testID={testID}
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 24,
          paddingVertical: 40,
        },
        style,
      ]}
    >
      {/* 48dp circular icon */}
      <View
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.background,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {icon ?? <Clock size={22} color={colors.primary} strokeWidth={1.75} />}
      </View>

      {/* Title */}
      <Text
        maxFontSizeMultiplier={1.2}
        style={{
          fontSize: 16,
          fontWeight: '500',
          color: colors.text,
          textAlign: 'center',
          marginBottom: 6,
        }}
      >
        {title}
      </Text>

      {/* Description */}
      {description ? (
        <Text
          maxFontSizeMultiplier={1.2}
          style={{
            fontSize: 12,
            color: colors['text-muted'],
            textAlign: 'center',
            lineHeight: 18,
            marginBottom: 20,
            maxWidth: 280,
          }}
        >
          {description}
        </Text>
      ) : null}

      {/* Action Button */}
      {onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => ({
            height: 40,
            paddingHorizontal: 20,
            borderRadius: 9999,
            backgroundColor: colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <Plus size={15} color={colors['on-primary']} strokeWidth={2.2} />
          <Text
            maxFontSizeMultiplier={1.2}
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors['on-primary'],
              marginLeft: 6,
            }}
          >
            {actionLabel.startsWith('+') ? actionLabel.slice(1).trim() : actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default EmptyState;
