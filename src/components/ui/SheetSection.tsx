import React from 'react';
import { View, type ViewProps } from 'react-native';
import { spacing } from '@/constants/theme';

/** Shared vertical section rhythm for forms and lists. */
export function SheetSection({ gap = 'cardGap', style, ...props }: ViewProps & { gap?: keyof typeof spacing }) {
  return <View style={[{ gap: spacing[gap] }, style]} {...props} />;
}
