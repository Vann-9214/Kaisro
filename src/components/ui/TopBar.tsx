import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React, { useMemo } from 'react';
import {
  View,
  Text,
  Platform,
  StatusBar,
  Pressable,
  StyleProp,
  ViewStyle,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarDays,
  CheckSquare2,
  Wallet,
  FileText,
  Sliders,
  Sparkles,
} from 'lucide-react-native';
import { colors, layout, spacing, createThemedStyles } from '@/constants/theme';

export interface TopBarProps {
  featureName: string;
  onBack?: () => void;
  backAction?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function getFeatureIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('calendar') || lower.includes('day') || lower.includes('agenda')) {
    return <CalendarDays size={13} color={colors.primary} strokeWidth={2} />;
  }
  if (lower.includes('task')) {
    return <CheckSquare2 size={13} color={colors.tasks} strokeWidth={2} />;
  }
  if (lower.includes('budget') || lower.includes('expense') || lower.includes('money')) {
    return <Wallet size={13} color={colors['on-money']} strokeWidth={2} />;
  }
  if (lower.includes('note')) {
    return <FileText size={13} color={colors.primary} strokeWidth={2} />;
  }
  if (lower.includes('setting') || lower.includes('category')) {
    return <Sliders size={13} color={colors['text-muted']} strokeWidth={2} />;
  }
  return <Sparkles size={13} color={colors.primary} strokeWidth={2} />;
}

export function TopBar({ featureName, onBack, backAction, rightAction, style }: TopBarProps) {
  useThemeRefresh();
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight ?? 0
      : 0;

  const todayBadgeText = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }, []);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: topInset, backgroundColor: colors.background, borderBottomColor: colors.border },
        style,
      ]}
    >
      <View style={styles.barContent}>
        {/* App Branding & Feature Title */}
        <View style={styles.leftGroup}>
          {onBack ? (
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={styles.backButton}
            >
              <ArrowLeft size={18} color={colors.text} strokeWidth={2} />
            </Pressable>
          ) : backAction ? (
            <View style={{ marginRight: spacing.xs }}>{backAction}</View>
          ) : (
            <View style={styles.emblemBadge}>
              <Text style={styles.emblemText}>K</Text>
            </View>
          )}

          <Text
            maxFontSizeMultiplier={layout.maxFontScale}
            numberOfLines={1}
            style={styles.brandTitle}
          >
            Kaisro
          </Text>

          <View style={styles.featurePill}>
            {getFeatureIcon(featureName)}
            <Text
              maxFontSizeMultiplier={layout.maxFontScale}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.featureText}
            >
              {featureName}
            </Text>
          </View>
        </View>

        {/* Optional Right Action Slot or Tactile Live Date Badge */}
        {rightAction ? (
          <View style={styles.rightSlot}>{rightAction}</View>
        ) : (
          <View style={styles.liveDateBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveDateText}>{todayBadgeText}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = createThemedStyles(() =>
  StyleSheet.create({
    container: {
      borderBottomWidth: 1,
    },
    barContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
      paddingBottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
    },
    leftGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
      gap: spacing.sm,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderBottomWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    emblemBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: colors.primary,
      borderWidth: 1,
      borderColor: colors.primary,
      borderBottomWidth: 2.5,
      borderBottomColor: colors.text,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.28,
      shadowRadius: 4,
      elevation: 3,
    },
    emblemText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: colors['on-primary'],
      lineHeight: 18,
    },
    brandTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 18,
      color: colors.primary,
      letterSpacing: -0.4,
    },
    featurePill: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 9999,
      borderWidth: 1,
      borderBottomWidth: 2,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1.5 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1.5,
      maxWidth: 150,
    },
    featureText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      color: colors.text,
      marginLeft: 4,
    },
    rightSlot: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.sm,
    },
    liveDateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 9999,
      borderWidth: 1,
      borderBottomWidth: 2,
      borderColor: colors.border,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      shadowColor: colors.text,
      shadowOffset: { width: 0, height: 1.5 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1.5,
    },
    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.tasks,
      marginRight: 6,
    },
    liveDateText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      color: colors['text-muted'],
      fontVariant: ['tabular-nums'],
    },
  })
);

export default TopBar;
