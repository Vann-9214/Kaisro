import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheet } from './BottomSheet';
import { LiftedInputProvider, LiftedInputHost, useLiftedInput } from '@/components/lifted-input';
import { colors, spacing, layout } from '@/constants/theme';

function Body({ visible, title, onClose, onSave, children }: {
  visible: boolean; title: string; onClose: () => void; onSave: () => void | Promise<void>; children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { closeBar } = useLiftedInput();
  const [saving, setSaving] = React.useState(false);
  const save = async () => { if (saving) return; setSaving(true); try { await onSave(); } finally { setSaving(false); } };
  const close = () => { closeBar(); onClose(); };
  const footer = <View style={{ backgroundColor: colors['surface-raised'], borderTopWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: insets.bottom + spacing.cardGap }}>
    <Pressable onPress={save} disabled={saving} accessibilityRole="button" accessibilityLabel="Save"
      style={{ backgroundColor: colors.primary, borderRadius: layout.cardBorderRadius, height: layout.footerButtonHeight, alignItems: 'center', justifyContent: 'center' }}>
      {saving ? <ActivityIndicator color={colors['on-primary']} /> : <Text style={{ color: colors['on-primary'] }}>Save</Text>}
    </Pressable>
  </View>;
  return <BottomSheet visible={visible} onClose={close} hideDragHandle overlay={<LiftedInputHost footer={footer} />}
    header={<View style={{ padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors['surface-raised'] }}>
      <Text style={{ color: colors.text, fontSize: 18 }}>{title}</Text>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close editor"><Text style={{ color: colors['text-muted'] }}>Close</Text></Pressable>
    </View>} footer={footer}>
    <ScrollView style={{ maxHeight: height * 0.9 - 180 - insets.bottom, paddingHorizontal: spacing.lg }}
      contentContainerStyle={{ paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  </BottomSheet>;
}
export function EditorSheet(props: React.ComponentProps<typeof Body>) {
  return <LiftedInputProvider><Body {...props} /></LiftedInputProvider>;
}
