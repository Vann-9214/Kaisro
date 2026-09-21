import React from 'react';
import {
  View,
  Text,
  Platform,
  StatusBar,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

export interface TopBarProps {
  featureName: string;
  rightAction?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Reusable TopBar component matching the Kaisro design system.
 *
 * Displays:
 * - "Kaisro" in Archival Ink Blue (primary)
 * - " / " separator in text-muted
 * - Feature title (e.g. "Calendar") in standard text color
 * - Optional right-side slot (defaults to null, reserved for future search button)
 *
 * Status Bar Clearance:
 * - Container uses paddingTop equal to the top safe-area inset.
 * - If top inset is 0 on Android (edge-to-edge/translucent), falls back to StatusBar.currentHeight.
 * - Background is solid colors.background and extends behind the status bar so scrolling content never shows through.
 */
export function TopBar({ featureName, rightAction, style }: TopBarProps) {
  const insets = useSafeAreaInsets();
  const topInset =
    insets.top > 0
      ? insets.top
      : Platform.OS === 'android'
      ? StatusBar.currentHeight ?? 0
      : 0;

  return (
    <View
      style={[{ paddingTop: topInset, backgroundColor: colors.background }, style]}
    >
      <View className="px-5 pt-2 pb-2.5 flex-row items-center justify-between">
        {/* App Branding & Feature Title */}
        <View className="flex-row items-center">
          <Text className="text-xl font-semibold text-primary tracking-tight">
            Kaisro
          </Text>
          <Text className="text-xl font-light text-text-muted mx-2">/</Text>
          <Text className="text-xl font-medium text-text">{featureName}</Text>
        </View>

        {/* Optional Right Action Slot (empty by default) */}
        {rightAction ? (
          <View className="flex-row items-center">{rightAction}</View>
        ) : null}
      </View>
    </View>
  );
}

export default TopBar;
