import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { colors, layout, spacing } from '@/constants/theme';

export function SheetSaveFooter({ label = 'Save', onPress, saving = false }: {
  label?: string; onPress: () => void | Promise<void>; saving?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return <View style={{
    paddingTop: layout.footerTopPadding,
    paddingHorizontal: layout.sheetHorizontalPadding,
    paddingBottom: insets.bottom + layout.footerBottomExtraPadding,
    borderTopWidth: layout.cardBorderWidth,
    borderTopColor: colors.border,
    backgroundColor: colors['surface-raised'],
  }}>
    <Pressable onPress={onPress} disabled={saving} accessibilityRole="button" accessibilityLabel={label}
      style={{ minHeight: layout.footerButtonHeight, backgroundColor: colors.primary,
        borderRadius: layout.cardBorderRadius, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', opacity: saving ? 0.85 : 1 }}>
      {saving ? <ActivityIndicator size="small" color={colors['on-primary']} /> : <>
        <Check size={18} color={colors['on-primary']} strokeWidth={2.5} />
        <Text maxFontSizeMultiplier={layout.maxFontScale} style={{ marginLeft: spacing.sm, fontSize: 14, fontWeight: '600', color: colors['on-primary'] }}>{label}</Text>
      </>}
    </Pressable>
  </View>;
}
