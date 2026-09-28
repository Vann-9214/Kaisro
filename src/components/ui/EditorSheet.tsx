import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { LiftedInputProvider, LiftedInputHost, useLiftedInput } from '@/components/lifted-input';
import { colors, spacing, layout } from '@/constants/theme';
import { SheetSaveFooter } from './SheetSaveFooter';

function Body({ visible, title, onClose, onSave, children }: {
  visible: boolean; title: string; onClose: () => void; onSave: () => void | Promise<void>; children: React.ReactNode;
}) {
  const { closeBar } = useLiftedInput();
  const [saving, setSaving] = React.useState(false);
  const save = async () => { if (saving) return; setSaving(true); try { await onSave(); } finally { setSaving(false); } };
  const close = () => { closeBar(); onClose(); };
  const footer = <SheetSaveFooter onPress={save} saving={saving} />;
  return <BottomSheet visible={visible} onClose={close} hideDragHandle overlay={<LiftedInputHost footer={footer} />}
    header={<View style={{ padding: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors['surface-raised'] }}>
      <Text numberOfLines={1} maxFontSizeMultiplier={layout.maxFontScale} style={{ color: colors.text, fontSize: 18, flex: 1 }}>{title}</Text>
      <Pressable onPress={close} accessibilityRole="button" accessibilityLabel="Close editor" style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}><Text style={{ color: colors['text-muted'] }}>Close</Text></Pressable>
    </View>} footer={footer}>
    <ScrollView style={{ flex: 1, paddingHorizontal: spacing.lg }}
      contentContainerStyle={{ paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
  </BottomSheet>;
}
export function EditorSheet(props: React.ComponentProps<typeof Body>) {
  return <LiftedInputProvider><Body {...props} /></LiftedInputProvider>;
}
