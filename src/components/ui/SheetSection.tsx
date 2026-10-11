import { useThemeRefresh } from '@/hooks/useThemeRefresh';
import React from 'react';
import { View, type ViewProps } from 'react-native';
import { spacing } from '@/constants/theme';

/** Shared vertical section rhythm for forms and lists. */
export function SheetSection({ gap = 'cardGap', fill = false, style, ...props }: ViewProps & {
  gap?: keyof typeof spacing;
  /** Distribute spare body space between sections while preserving card heights. */
  fill?: boolean;
}) {
  useThemeRefresh();
  return <View style={[
    { gap: spacing[gap] },
    fill ? { flexGrow: 1, justifyContent: 'space-between' } : undefined,
    style,
  ]} {...props} />;
}
